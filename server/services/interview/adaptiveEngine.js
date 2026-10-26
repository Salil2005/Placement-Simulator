const path = require("path");
const Interview = require("../../models/Interview");
const Question = require("../../models/Question");
const Response = require("../../models/Response");
const Session = require("../../models/Session");
const Report = require("../../models/Report");
const ResumeProfile = require("../../models/ResumeProfile");
const aiService = require("../ai/aiService");
const { extractResumeText } = require("../report/resumeExtractor");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

// ============================================================
// CONSTANTS (all configurable via Interview fields)
// ============================================================

const DEFAULT_INITIAL_SCORE = 0.5;
const DEFAULT_ALPHA = 0.35;
const REVIEW_WINDOW_SECONDS = 120;
const ANSWER_TIME_LIMIT_SECONDS = 120;
const BACKEND_PROCESSING_ALLOWANCE_SECONDS = 60;
const REPORT_FINALIZATION_DEADLINE_SECONDS = 60;
const MAX_CONSECUTIVE_INVALID = 2;
const MAX_FOLLOW_UP_DEPTH = 3;
const DEFAULT_QUESTIONS_PER_PROJECT = 5; // guideline, not a hard limit

// Classification values that trigger the invalid-answer policy
const INVALID_CLASSIFICATIONS = new Set(["GIBBERISH", "NON_RESPONSIVE", "ABUSIVE_OR_INAPPROPRIATE"]);

// ============================================================
// HELPERS
// ============================================================

function getCompetencyLevel(score) {
  if (score < 0.25) return "Foundational";
  if (score < 0.45) return "Developing";
  if (score < 0.65) return "Intermediate";
  if (score < 0.8) return "Advanced";
  return "Expert";
}

function computeUpdatedAdaptiveScore(previousScore, answerScore, alpha = DEFAULT_ALPHA) {
  const pScore = Number.isFinite(previousScore) ? previousScore : DEFAULT_INITIAL_SCORE;
  const aScore = Number.isFinite(answerScore) ? answerScore : 0.5;
  const raw = (1 - alpha) * pScore + alpha * aScore;
  return Math.max(0, Math.min(1, Math.round(raw * 1000) / 1000));
}

function selectBestProject(projects, preferredTitle) {
  if (!Array.isArray(projects) || projects.length === 0) {
    return {
      title: "Core Full-Stack Application",
      description: "Full-stack web application with client UI, API services, and persistent database layer.",
      technologies: ["JavaScript", "React", "Node.js", "Express", "Database"],
      source: "user_added",
    };
  }

  if (preferredTitle) {
    const found = projects.find((p) => p.title.toLowerCase() === preferredTitle.toLowerCase());
    if (found) return found;
  }

  const sorted = [...projects].sort((a, b) => {
    const scoreA =
      (a.title?.length || 0) +
      (a.description?.length || 0) +
      (a.technologies?.length || 0) * 10 +
      (a.backendArchitecture ? 20 : 0);
    const scoreB =
      (b.title?.length || 0) +
      (b.description?.length || 0) +
      (b.technologies?.length || 0) * 10 +
      (b.backendArchitecture ? 20 : 0);
    return scoreB - scoreA;
  });

  return sorted[0];
}

function buildFirstQuestionText(projectName) {
  return `Please explain your project, ${projectName}, in detail. What problem does it solve, what was your role, and what technologies did you use? Walk me through its overall architecture, the responsibilities of its major components, and the complete data flow from the initial user action to the final output. Also explain the important technical decisions you made while developing it.`;
}

/**
 * Compute how many questions have been asked about a specific project
 * in the current interview session.
 */
function countQuestionsForProject(allQuestions, projectTitle) {
  return allQuestions.filter(
    (q) => q.projectReference && q.projectReference.toLowerCase() === projectTitle.toLowerCase()
  ).length;
}

/**
 * Compute the current follow-up depth for the ongoing topic chain.
 * Follow-up depth resets when a NEW_TOPIC, SWITCH_PROJECT, or a question
 * with followUpDepth=0 appears.
 */
function computeCurrentFollowUpDepth(allQuestions) {
  if (!allQuestions.length) return 0;
  const last = allQuestions[allQuestions.length - 1];
  return last.followUpDepth || 0;
}

/**
 * Determine the next follow-up depth given the AI's chosen nextAction.
 */
function computeNextFollowUpDepth(currentDepth, nextAction) {
  if (nextAction === "FOLLOW_UP" || nextAction === "PROBE" || nextAction === "DEEPEN" || nextAction === "RETRY_SAME_CONCEPT") {
    return currentDepth + 1;
  }
  return 0; // Reset on topic/project change
}

/**
 * Select the next project to switch to, avoiding the current one.
 * Prefers projects with fewer questions already asked.
 */
function selectNextProject(allProjects, currentProjectTitle, switchToProjectHint) {
  if (!allProjects || allProjects.length <= 1) return null;

  // If the AI suggested a specific project, try to honor it
  if (switchToProjectHint) {
    const hinted = allProjects.find(
      (p) => p.title.toLowerCase() === switchToProjectHint.toLowerCase() &&
             p.title.toLowerCase() !== currentProjectTitle.toLowerCase()
    );
    if (hinted) return hinted;
  }

  // Otherwise pick the next project by order, skipping the current one
  const others = allProjects.filter(
    (p) => p.title.toLowerCase() !== currentProjectTitle.toLowerCase()
  );
  return others[0] || null;
}

// ============================================================
// STAGE 1: RESUME INGESTION + REVIEW WINDOW
// ============================================================

async function initializeAdaptiveReview(interview, options = {}) {
  interview.status = "RESUME_PROCESSING";
  await interview.save();

  let resumeText = "";
  if (interview.resumeFile) {
    try {
      const absPath = path.join(UPLOADS_DIR, path.basename(interview.resumeFile));
      resumeText = await extractResumeText(absPath);
    } catch (err) {
      console.warn("[adaptiveEngine] Resume file extraction warning:", err.message);
    }
  }

  if (!resumeText) {
    const existingProfile = await ResumeProfile.findOne({ user: interview.user });
    if (existingProfile?.rawText) {
      resumeText = existingProfile.rawText;
    }
  }

  let structuredData = { projects: [], skills: [], technologies: [] };
  if (resumeText.trim()) {
    try {
      structuredData = await aiService.parseResumeStructured({
        resumeText,
        providerOverride: options.providerOverride,
      });
    } catch (err) {
      console.error("[adaptiveEngine] AI resume structuring error:", err.message);
    }
  }

  if (!structuredData.projects || structuredData.projects.length === 0) {
    const existingProfile = await ResumeProfile.findOne({ user: interview.user });
    if (existingProfile?.projects?.length > 0) {
      structuredData.projects = existingProfile.projects.map((p) => ({
        title: p.title,
        description: p.description,
        technologies: existingProfile.programmingLanguages.concat(existingProfile.frameworks),
        databases: existingProfile.databases,
        source: "resume",
      }));
    }
  }

  if (!structuredData.projects || structuredData.projects.length === 0) {
    structuredData.projects = [
      {
        title: "Full-Stack Web Project",
        description: "Web application incorporating frontend components, backend APIs, and database interactions.",
        technologies: ["JavaScript", "React", "Node.js", "Express", "MongoDB"],
        frontendArchitecture: "Component-based architecture",
        backendArchitecture: "RESTful API services",
        databases: ["MongoDB"],
        apisAndIntegrations: ["REST API"],
        auth: "Session/Token-based authentication",
        keyDecisions: "Separation of concerns between UI client and backend service layers",
        source: "user_added",
      },
    ];
  }

  const primaryProject = selectBestProject(structuredData.projects);
  structuredData.selectedProject = primaryProject.title;

  const now = new Date();
  const reviewDeadline = new Date(now.getTime() + REVIEW_WINDOW_SECONDS * 1000);

  interview.projectContext = structuredData;
  interview.activeProjectId = primaryProject.title;
  interview.reviewStatus = "in_review";
  interview.reviewStartedAt = now;
  interview.reviewDeadline = reviewDeadline;
  interview.status = "SKILL_REVIEW";
  interview.consecutiveInvalidAnswers = 0;
  await interview.save();

  return interview;
}

// ============================================================
// UPDATE REVIEW CONTEXT (120s window)
// ============================================================

async function updateReviewContext(interview, corrections) {
  if (interview.status !== "SKILL_REVIEW" && interview.status !== "RESUME_PROCESSING") {
    const err = new Error("Review window is closed; cannot modify project details after interview starts.");
    err.statusCode = 409;
    throw err;
  }

  const currentCtx = interview.projectContext || { projects: [], skills: [], technologies: [] };

  if (Array.isArray(corrections.projects)) {
    currentCtx.projects = corrections.projects.map((p) => ({
      title: p.title || "Project",
      description: p.description || "",
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
      frontendArchitecture: p.frontendArchitecture || "",
      backendArchitecture: p.backendArchitecture || "",
      databases: Array.isArray(p.databases) ? p.databases : [],
      apisAndIntegrations: Array.isArray(p.apisAndIntegrations) ? p.apisAndIntegrations : [],
      auth: p.auth || "",
      keyDecisions: p.keyDecisions || "",
      scalabilityAndPerformance: p.scalabilityAndPerformance || "",
      source: p.source || "user_edit",
    }));
  }

  if (Array.isArray(corrections.skills)) currentCtx.skills = corrections.skills;
  if (Array.isArray(corrections.technologies)) currentCtx.technologies = corrections.technologies;
  if (corrections.selectedProject) {
    currentCtx.selectedProject = corrections.selectedProject;
    interview.activeProjectId = corrections.selectedProject;
  }

  interview.projectContext = currentCtx;
  await interview.save();

  return interview;
}

// ============================================================
// STAGE 2: START INTERVIEW
// ============================================================

async function startAdaptiveInterview(interview, options = {}) {
  if (interview.status === "in_progress" || interview.status === "completed") {
    const session = await Session.findOne({ interview: interview._id });
    const firstQ = await Question.findOne({ interview: interview._id, order: 0 });
    return { interview, question: firstQ, session };
  }

  const projects = interview.projectContext?.projects || [];
  const selectedProj = selectBestProject(projects, interview.projectContext?.selectedProject);

  const now = new Date();
  const durationMinutes = Number(interview.durationMinutes) || 15;
  const interviewDeadline = new Date(now.getTime() + durationMinutes * 60 * 1000);

  interview.initialAdaptiveScore = DEFAULT_INITIAL_SCORE;
  interview.currentAdaptiveScore = DEFAULT_INITIAL_SCORE;
  interview.consecutiveInvalidAnswers = 0;
  interview.terminationReason = null;
  interview.reviewStatus = "confirmed";
  interview.status = "in_progress";
  interview.startedAt = now;
  interview.interviewDeadline = interviewDeadline;
  interview.activeProjectId = selectedProj.title;
  await interview.save();

  let session = await Session.findOne({ interview: interview._id });
  if (!session) {
    session = await Session.create({ interview: interview._id, transcript: [] });
  }

  const questionText = buildFirstQuestionText(selectedProj.title);

  let question = await Question.findOne({ interview: interview._id, order: 0 });
  if (!question) {
    question = await Question.create({
      interview: interview._id,
      text: questionText,
      topic: `${selectedProj.title} Architecture & Walkthrough`,
      order: 0,
      isCoding: false,
      questionCategory: "Project Walkthrough",
      difficulty: "medium",
      projectReference: selectedProj.title,
      targetCompetencyLevel: "Intermediate",
      followUpDepth: 0,
      nextAction: "NEW_TOPIC",
    });

    session.transcript.push({
      role: "ai",
      content: question.text,
      questionIndex: 0,
      createdAt: now,
    });
    await session.save();
  }

  return { interview, question, session };
}

// ============================================================
// STAGE 3: SUBMIT ANSWER (core of the new logic)
// ============================================================

async function submitAdaptiveAnswer(interview, { questionId, answerText, code, language }, options = {}) {
  // ── Guard: session must be active ──────────────────────────────────────────
  const ACTIVE_STATUSES = new Set(["in_progress", "grace_period"]);
  if (!ACTIVE_STATUSES.has(interview.status)) {
    const err = new Error("This interview is not currently accepting answers.");
    err.statusCode = 409;
    throw err;
  }

  if (!questionId || !(answerText || code || "").trim()) {
    const err = new Error("Please provide an answer before submitting.");
    err.statusCode = 400;
    throw err;
  }

  const question = await Question.findOne({ _id: questionId, interview: interview._id });
  if (!question) {
    const err = new Error("Question not found for this interview session.");
    err.statusCode = 404;
    throw err;
  }

  // ── Idempotency guard ──────────────────────────────────────────────────────
  const existingResponse = await Response.findOne({ interview: interview._id, question: question._id });
  if (existingResponse) {
    const sessionState = await getAdaptiveSessionState(interview._id);
    return {
      response: existingResponse,
      nextQuestion: sessionState.currentQuestion,
      isFinalQuestion: !sessionState.currentQuestion,
      warningMessage: null,
      terminationMessage: null,
    };
  }

  // ── Time checks ────────────────────────────────────────────────────────────
  const now = Date.now();
  const startTime = interview.startedAt ? new Date(interview.startedAt).getTime() : now;
  const elapsedMinutes = (now - startTime) / (1000 * 60);
  const durationLimit = Number(interview.durationMinutes) || 15;
  const GRACE_PERIOD_MIN = 5;

  if (elapsedMinutes > durationLimit + GRACE_PERIOD_MIN) {
    const err = new Error("Interview and 5-minute grace period have concluded.");
    err.statusCode = 400;
    throw err;
  }

  const isTimeUp = elapsedMinutes >= durationLimit || interview.status === "grace_period";
  const nextIndex = question.order + 1;
  const maxQuestions = Number(interview.questionCount) || 20;

  // ── 1. Record user message in transcript ───────────────────────────────────
  const session = await Session.findOne({ interview: interview._id });
  const submittedText = (answerText || code || "").trim();
  if (session) {
    session.transcript.push({
      role: "user",
      content: submittedText,
      questionIndex: question.order,
      createdAt: new Date(),
    });
    await session.save();
  }

  // ── 2. CLASSIFICATION: detect invalid answers before full evaluation ───────
  let classification = "RELEVANT";
  let classificationReasoning = "";
  try {
    const classResult = await aiService.classifyAdaptiveAnswer({
      question: question.text,
      answer: submittedText,
      providerOverride: options.providerOverride,
    });
    classification = classResult.classification;
    classificationReasoning = classResult.reasoning;
  } catch (classErr) {
    console.warn("[adaptiveEngine] Classification error, defaulting to RELEVANT:", classErr.message);
    classification = "RELEVANT";
  }

  const isInvalidAnswer = INVALID_CLASSIFICATIONS.has(classification);

  // ── 3. Persist response record (always, even for invalid answers) ──────────
  const previousAdaptiveScore = interview.currentAdaptiveScore ?? DEFAULT_INITIAL_SCORE;

  const responseDoc = await Response.create({
    interview: interview._id,
    question: question._id,
    answerText: (answerText || "").trim(),
    code: code || "",
    language: language || "",
    evaluationStatus: "evaluating",
    previousAdaptiveScore,
    updatedAdaptiveScore: previousAdaptiveScore,
    score: 0,
    answerClassification: classification,
    isRetryQuestion: question.isRetryQuestion || false,
    projectId: question.projectReference || interview.activeProjectId || "",
    answerSubmittedAt: new Date(),
  });

  // ── 4. INVALID ANSWER BRANCH ───────────────────────────────────────────────
  if (isInvalidAnswer) {
    // Increment counter atomically via findOneAndUpdate to avoid race conditions
    const updatedInterview = await Interview.findOneAndUpdate(
      { _id: interview._id },
      { $inc: { consecutiveInvalidAnswers: 1 } },
      { new: true }
    );
    const newInvalidCount = updatedInterview.consecutiveInvalidAnswers;

    // Finalize response with score = 0 (hard rule, not AI-determined)
    responseDoc.score = 0;
    responseDoc.answerScore = 0;
    responseDoc.updatedAdaptiveScore = previousAdaptiveScore; // invalid answers don't update adaptive score
    responseDoc.evaluationStatus = "completed";
    responseDoc.evaluationCompletedAt = new Date();
    responseDoc.evaluation = {
      correctness: 0,
      clarity: 0,
      confidence: 0,
      notes: `Answer classified as ${classification}: ${classificationReasoning}`,
      dimensions: {
        technicalCorrectness: 0,
        conceptualUnderstanding: 0,
        projectRelevance: 0,
        depthOfExplanation: 0,
        architecturalReasoning: 0,
        practicalImplementation: 0,
        tradeoffAnalysis: 0,
      },
      strengths: [],
      missingConcepts: ["Unable to assess — answer was not relevant to the question."],
      technicalInaccuracies: [],
      rationale: `Answer classified as ${classification}. Score forced to 0.`,
      recommendedFollowUps: [],
    };
    await responseDoc.save();

    // ── CASE A: Second consecutive invalid → TERMINATE ─────────────────────
    if (newInvalidCount >= MAX_CONSECUTIVE_INVALID) {
      // Reload interview to update
      const finalInterview = await Interview.findById(interview._id);
      finalInterview.status = "TERMINATED_INVALID_ANSWERS";
      finalInterview.terminationReason = "Two consecutive invalid answers were submitted.";
      finalInterview.completedAt = new Date();
      await finalInterview.save();

      const terminationMessage =
        "Your last two responses were not relevant to the questions asked, so I need to end this interview. Your responses have been recorded, and the final report will summarize the interview outcome.";

      if (session) {
        session.transcript.push({ role: "ai", content: terminationMessage, questionIndex: -1, createdAt: new Date() });
        await session.save();
      }

      console.log(`[adaptiveEngine] Interview ${interview._id} terminated: two consecutive invalid answers.`);

      return {
        response: responseDoc,
        nextQuestion: null,
        isFinalQuestion: true,
        warningMessage: null,
        terminationMessage,
        terminationReason: "CONSECUTIVE_INVALID_ANSWERS",
        adaptiveScore: previousAdaptiveScore,
      };
    }

    // ── CASE B: First invalid → issue retry question on same concept ──────
    const warningMessage =
      "I couldn't identify a relevant answer to that question. Please try answering it seriously in your own words. Let's approach the same concept from a slightly different angle.";

    if (session) {
      session.transcript.push({ role: "ai", content: warningMessage, questionIndex: -1, createdAt: new Date() });
    }

    // Generate retry question testing the same concept with different wording
    const allQuestionsForRetry = await Question.find({ interview: interview._id }).sort({ order: 1 });
    const allProjects = interview.projectContext?.projects || [];
    const remainingSeconds = Math.max(0, (durationLimit - elapsedMinutes) * 60);
    const competencyLevel = getCompetencyLevel(previousAdaptiveScore);

    let retryQuestionData;
    try {
      retryQuestionData = await aiService.generateAdaptiveQuestion({
        projectContext: interview.projectContext,
        allProjects,
        previousQuestions: allQuestionsForRetry.map((pq) => ({
          text: pq.text,
          questionCategory: pq.questionCategory,
          projectReference: pq.projectReference,
          answerText: "",
        })),
        latestQuestion: question.text,
        latestAnswer: submittedText,
        latestEvaluation: { answerScore: 0, strengths: [], missingConcepts: [], technicalInaccuracies: [], recommendedFollowUps: [] },
        adaptiveScore: previousAdaptiveScore,
        remainingSeconds,
        targetCategory: question.questionCategory || "Web Development",
        competencyLevel,
        currentFollowUpDepth: question.followUpDepth || 0,
        maxFollowUpDepth: MAX_FOLLOW_UP_DEPTH,
        questionsOnCurrentProject: countQuestionsForProject(allQuestionsForRetry, interview.activeProjectId || ""),
        forceRetry: true,
        providerOverride: options.providerOverride,
      });
    } catch (retryErr) {
      console.error("[adaptiveEngine] Retry question generation error:", retryErr.message);
      const selectedProj = selectBestProject(allProjects, interview.activeProjectId);
      retryQuestionData = {
        nextAction: "RETRY_SAME_CONCEPT",
        questionCategory: question.questionCategory || "Web Development",
        difficulty: competencyLevel.toLowerCase(),
        questionText: `Let me ask this differently: in your project ${selectedProj.title}, can you walk me through a specific example of ${question.topic || "the technical concept we were just discussing"}?`,
        targetCompetencyLevel: competencyLevel,
        projectReference: selectedProj.title,
        switchToProject: null,
      };
    }

    const retryQuestion = await Question.create({
      interview: interview._id,
      text: retryQuestionData.questionText,
      topic: question.topic || `${retryQuestionData.projectReference} - ${retryQuestionData.questionCategory}`,
      order: nextIndex,
      isCoding: false,
      questionCategory: retryQuestionData.questionCategory || question.questionCategory,
      difficulty: retryQuestionData.difficulty,
      projectReference: retryQuestionData.projectReference || interview.activeProjectId,
      targetCompetencyLevel: retryQuestionData.targetCompetencyLevel,
      followUpDepth: (question.followUpDepth || 0) + 1,
      parentQuestionId: question._id,
      isRetryQuestion: true,
      nextAction: "RETRY_SAME_CONCEPT",
    });

    interview.currentQuestionIndex = nextIndex;
    await interview.save();

    if (session) {
      session.transcript.push({
        role: "ai",
        content: retryQuestion.text,
        questionIndex: nextIndex,
        createdAt: new Date(),
      });
      await session.save();
    }

    return {
      response: responseDoc,
      nextQuestion: retryQuestion,
      isFinalQuestion: false,
      warningMessage,
      terminationMessage: null,
      adaptiveScore: previousAdaptiveScore,
    };
  }

  // ── 5. VALID ANSWER: Reset consecutive invalid counter ────────────────────
  // Use atomic update to prevent race conditions
  await Interview.findOneAndUpdate(
    { _id: interview._id },
    { consecutiveInvalidAnswers: 0 },
    { new: true }
  );

  // ── 6. Full 7-dimension evaluation ────────────────────────────────────────
  let evaluationResult;
  try {
    evaluationResult = await aiService.evaluateAdaptiveAnswer({
      projectContext: interview.projectContext,
      question: question.text,
      questionCategory: question.questionCategory,
      difficulty: question.difficulty,
      answer: submittedText,
      currentAdaptiveScore: previousAdaptiveScore,
      providerOverride: options.providerOverride,
    });
  } catch (evalErr) {
    console.error("[adaptiveEngine] Evaluation failed:", evalErr.message);
    evaluationResult = {
      answerScore: 0.5,
      dimensionScores: {
        technicalCorrectness: 50,
        conceptualUnderstanding: 50,
        projectRelevance: 50,
        depthOfExplanation: 50,
        architecturalReasoning: 50,
        practicalImplementation: 50,
        tradeoffAnalysis: 50,
      },
      strengths: ["Answer submitted and recorded."],
      missingConcepts: ["Automated evaluation retry scheduled."],
      technicalInaccuracies: [],
      rationale: "Evaluation performed with fallback parameters.",
      recommendedFollowUps: [],
    };
  }

  // ── 7. Update adaptive score ───────────────────────────────────────────────
  const answerScore = evaluationResult.answerScore;
  const alpha = interview.scoringAlpha || DEFAULT_ALPHA;
  const newAdaptiveScore = computeUpdatedAdaptiveScore(previousAdaptiveScore, answerScore, alpha);

  interview.currentAdaptiveScore = newAdaptiveScore;
  interview.currentQuestionIndex = nextIndex;
  await interview.save();

  // ── 8. Persist full evaluation on response ─────────────────────────────────
  responseDoc.score = Math.round(answerScore * 100);
  responseDoc.answerScore = answerScore;
  responseDoc.updatedAdaptiveScore = newAdaptiveScore;
  responseDoc.evaluationStatus = "completed";
  responseDoc.evaluationCompletedAt = new Date();
  responseDoc.evaluation = {
    correctness: evaluationResult.dimensionScores?.technicalCorrectness || 50,
    clarity: evaluationResult.dimensionScores?.depthOfExplanation || 50,
    confidence: evaluationResult.dimensionScores?.conceptualUnderstanding || 50,
    notes: evaluationResult.rationale || "",
    dimensions: evaluationResult.dimensionScores,
    strengths: evaluationResult.strengths || [],
    missingConcepts: evaluationResult.missingConcepts || [],
    technicalInaccuracies: evaluationResult.technicalInaccuracies || [],
    rationale: evaluationResult.rationale || "",
    recommendedFollowUps: evaluationResult.recommendedFollowUps || [],
  };
  await responseDoc.save();

  // ── 9. Determine if this is the final question ─────────────────────────────
  const isFinalQuestion = isTimeUp || nextIndex >= maxQuestions;

  if (isFinalQuestion) {
    return {
      response: responseDoc,
      nextQuestion: null,
      isFinalQuestion: true,
      warningMessage: null,
      terminationMessage: null,
      adaptiveScore: newAdaptiveScore,
    };
  }

  // ── 10. Generate next contextual question ─────────────────────────────────
  const allProjects = interview.projectContext?.projects || [];
  const remainingSeconds = Math.max(0, (durationLimit - elapsedMinutes) * 60);
  const competencyLevel = getCompetencyLevel(newAdaptiveScore);
  const allQuestionsForNext = await Question.find({ interview: interview._id }).sort({ order: 1 });

  const currentFollowUpDepth = computeCurrentFollowUpDepth(allQuestionsForNext);
  const questionsOnCurrentProject = countQuestionsForProject(allQuestionsForNext, interview.activeProjectId || "");

  // Alternate categories: Web Development vs System Design
  const lastCategory = question.questionCategory;
  const targetCategory =
    lastCategory === "Web Development" ? "System Design" : "Web Development";

  let generatedQuestionData;
  try {
    generatedQuestionData = await aiService.generateAdaptiveQuestion({
      projectContext: interview.projectContext,
      allProjects,
      previousQuestions: allQuestionsForNext.map((pq) => ({
        text: pq.text,
        questionCategory: pq.questionCategory,
        projectReference: pq.projectReference,
        answerText: pq.order === question.order ? submittedText : "",
      })),
      latestQuestion: question.text,
      latestAnswer: submittedText,
      latestEvaluation: evaluationResult,
      adaptiveScore: newAdaptiveScore,
      remainingSeconds,
      targetCategory,
      competencyLevel,
      currentFollowUpDepth,
      maxFollowUpDepth: MAX_FOLLOW_UP_DEPTH,
      questionsOnCurrentProject,
      forceRetry: false,
      providerOverride: options.providerOverride,
    });
  } catch (qErr) {
    console.error("[adaptiveEngine] Question generation error:", qErr.message);
    const selectedProj = selectBestProject(allProjects, interview.activeProjectId);
    generatedQuestionData = {
      nextAction: "NEW_TOPIC",
      questionCategory: targetCategory,
      difficulty: competencyLevel.toLowerCase(),
      questionText: `In ${selectedProj.title}, how did you organize the ${
        targetCategory === "Web Development"
          ? "frontend component state and API integration"
          : "high-level component boundaries and data consistency"
      }?`,
      targetCompetencyLevel: competencyLevel,
      projectReference: selectedProj.title,
      switchToProject: null,
      rationale: "Fallback question maintaining adaptive context.",
    };
  }

  // ── 11. Handle project switch if AI decided to switch ─────────────────────
  let projectTransitionMessage = null;
  const nextAction = generatedQuestionData.nextAction || "NEW_TOPIC";

  if (nextAction === "SWITCH_PROJECT" && allProjects.length > 1) {
    const nextProject = selectNextProject(
      allProjects,
      interview.activeProjectId || "",
      generatedQuestionData.switchToProject
    );

    if (nextProject) {
      // Update interview's active project context
      interview.activeProjectId = nextProject.title;
      interview.projectContext = {
        ...interview.projectContext,
        selectedProject: nextProject.title,
      };
      await interview.save();

      projectTransitionMessage = `We've covered the key aspects of your ${
        question.projectReference || allQuestionsForNext[0]?.projectReference || "previous project"
      }. Let's now move to your project "${nextProject.title}". What was the most challenging technical decision you made while building it?`;

      // If the AI generated a generic question, use the transition message as the question
      if (!generatedQuestionData.questionText || generatedQuestionData.questionText.length < 20) {
        generatedQuestionData.questionText = projectTransitionMessage;
      }

      generatedQuestionData.projectReference = nextProject.title;
    }
  }

  // ── 12. Determine follow-up depth for the new question ────────────────────
  const nextFollowUpDepth = computeNextFollowUpDepth(currentFollowUpDepth, nextAction);
  const parentId = ["FOLLOW_UP", "PROBE", "DEEPEN", "RETRY_SAME_CONCEPT"].includes(nextAction)
    ? question._id
    : null;

  // ── 13. Persist next question ──────────────────────────────────────────────
  const nextQuestion = await Question.create({
    interview: interview._id,
    text: generatedQuestionData.questionText,
    topic: `${generatedQuestionData.projectReference || "Project"} - ${generatedQuestionData.questionCategory}`,
    order: nextIndex,
    isCoding: false,
    questionCategory: generatedQuestionData.questionCategory,
    difficulty: generatedQuestionData.difficulty,
    projectReference: generatedQuestionData.projectReference,
    targetCompetencyLevel: generatedQuestionData.targetCompetencyLevel,
    followUpDepth: nextFollowUpDepth,
    parentQuestionId: parentId,
    isRetryQuestion: false,
    nextAction,
  });

  if (session) {
    // Add project transition notice if applicable
    if (projectTransitionMessage && nextAction === "SWITCH_PROJECT") {
      session.transcript.push({
        role: "ai",
        content: projectTransitionMessage,
        questionIndex: nextIndex,
        createdAt: new Date(),
      });
    } else {
      session.transcript.push({
        role: "ai",
        content: nextQuestion.text,
        questionIndex: nextIndex,
        createdAt: new Date(),
      });
    }
    await session.save();
  }

  return {
    response: responseDoc,
    nextQuestion,
    isFinalQuestion: false,
    warningMessage: null,
    terminationMessage: null,
    projectTransitionMessage,
    nextAction,
    adaptiveScore: newAdaptiveScore,
  };
}

// ============================================================
// SESSION STATE READER
// ============================================================

async function getAdaptiveSessionState(interviewId) {
  const [interview, session, responses, allQuestions] = await Promise.all([
    Interview.findById(interviewId),
    Session.findOne({ interview: interviewId }),
    Response.find({ interview: interviewId }).populate("question").sort({ createdAt: 1 }),
    Question.find({ interview: interviewId }).sort({ order: 1 }),
  ]);

  if (!interview) return { interview: null, session: null, responses: [], currentQuestion: null };

  // Review window auto-expiry check
  if (interview.status === "SKILL_REVIEW" && interview.reviewDeadline) {
    if (Date.now() >= new Date(interview.reviewDeadline).getTime()) {
      await startAdaptiveInterview(interview);
      return getAdaptiveSessionState(interviewId);
    }
  }

  // Grace period check
  if (interview.status === "in_progress" && interview.startedAt) {
    const elapsedMinutes = (Date.now() - new Date(interview.startedAt).getTime()) / (1000 * 60);
    const durationLimit = Number(interview.durationMinutes) || 15;
    if (elapsedMinutes >= durationLimit) {
      interview.status = "grace_period";
      await interview.save();
    }
  }

  const answeredIds = new Set(responses.map((r) => String(r.question?._id || r.question)));
  const latestQuestion = allQuestions[allQuestions.length - 1] || null;
  const currentQuestion =
    latestQuestion && !answeredIds.has(String(latestQuestion._id)) ? latestQuestion : null;

  return {
    interview,
    session,
    responses,
    currentQuestion,
    allQuestions,
    adaptiveScore: interview.currentAdaptiveScore ?? DEFAULT_INITIAL_SCORE,
    competencyLevel: getCompetencyLevel(interview.currentAdaptiveScore ?? DEFAULT_INITIAL_SCORE),
    consecutiveInvalidAnswers: interview.consecutiveInvalidAnswers || 0,
    terminationReason: interview.terminationReason || null,
    activeProjectId: interview.activeProjectId || "",
  };
}

// ============================================================
// FINALIZATION: 60-second bounded deadline
// ============================================================

async function finalizeAdaptiveReport(interviewId, options = {}) {
  // ── Idempotency: return existing complete report immediately ───────────────
  const existingReport = await Report.findOne({ interview: interviewId });
  if (existingReport && ["complete", "degraded"].includes(existingReport.generationStatus)) {
    return existingReport;
  }

  const interview = await Interview.findById(interviewId);
  if (!interview) throw new Error("Interview not found");

  // ── Idempotency for finalization start ────────────────────────────────────
  // If already in FINALIZING and a report is being generated, avoid duplicate start
  if (interview.status === "FINALIZING" && interview.finalizationStartedAt) {
    const elapsed = Date.now() - new Date(interview.finalizationStartedAt).getTime();
    if (elapsed < REPORT_FINALIZATION_DEADLINE_SECONDS * 1000) {
      // Still within deadline window — check if report exists (possibly partially)
      const partialReport = await Report.findOne({ interview: interviewId });
      if (partialReport) return partialReport;
    }
  }

  // ── Mark FINALIZING if not already ───────────────────────────────────────
  const isTerminated = interview.status === "TERMINATED_INVALID_ANSWERS";
  const shouldBeCompleted = ["completed", "TERMINATED_INVALID_ANSWERS", "grace_period", "in_progress"].includes(interview.status);

  if (shouldBeCompleted) {
    const now = new Date();
    interview.status = "FINALIZING";
    interview.finalizationStartedAt = interview.finalizationStartedAt || now;
    interview.reportDeadlineAt = new Date(
      new Date(interview.finalizationStartedAt).getTime() + REPORT_FINALIZATION_DEADLINE_SECONDS * 1000
    );
    await interview.save();
  }

  const deadline = interview.reportDeadlineAt
    ? new Date(interview.reportDeadlineAt).getTime()
    : Date.now() + REPORT_FINALIZATION_DEADLINE_SECONDS * 1000;

  // ── Collect session data ──────────────────────────────────────────────────
  const [session, responses, allQuestions] = await Promise.all([
    Session.findOne({ interview: interviewId }),
    Response.find({ interview: interviewId }).populate("question").sort({ createdAt: 1 }),
    Question.find({ interview: interviewId }).sort({ order: 1 }),
  ]);

  // Record unanswered questions with score 0
  const answeredIds = new Set(responses.map((r) => String(r.question?._id || r.question)));
  const unanswered = allQuestions.filter((q) => !answeredIds.has(String(q._id)));

  for (const unans of unanswered) {
    try {
      const unansDoc = await Response.create({
        interview: interviewId,
        question: unans._id,
        answerText: "[Not Answered - Interview Concluded]",
        score: 0,
        answerScore: 0,
        answerClassification: "NON_RESPONSIVE",
        previousAdaptiveScore: interview.currentAdaptiveScore ?? 0.5,
        updatedAdaptiveScore: interview.currentAdaptiveScore ?? 0.5,
        evaluationStatus: "completed",
        evaluation: {
          correctness: 0, clarity: 0, confidence: 0,
          notes: "Question was not answered before the interview ended.",
          dimensions: {
            technicalCorrectness: 0, conceptualUnderstanding: 0, projectRelevance: 0,
            depthOfExplanation: 0, architecturalReasoning: 0, practicalImplementation: 0,
            tradeoffAnalysis: 0,
          },
        },
      });
      responses.push(unansDoc);
    } catch (dupErr) {
      // Already exists (concurrent request), ignore
      if (dupErr.code !== 11000) throw dupErr;
    }
  }

  // ── Compute deterministic score floor ────────────────────────────────────
  const allValidScores = responses
    .filter((r) => typeof r.answerScore === "number" && r.answerClassification !== "GIBBERISH" && r.answerClassification !== "NON_RESPONSIVE")
    .map((r) => r.answerScore * 100);

  const calculatedAvg =
    allValidScores.length > 0
      ? Math.round(allValidScores.reduce((a, b) => a + b, 0) / allValidScores.length)
      : 0;

  // Termination due to invalid answers = overall score 0
  const overallScoreOverride = isTerminated ? 0 : null;

  const invalidAnswerCount = responses.filter((r) =>
    INVALID_CLASSIFICATIONS.has(r.answerClassification)
  ).length;

  // ── Create/update Report in pending state ─────────────────────────────────
  const selectedProj = selectBestProject(interview.projectContext?.projects);
  const allDiscussedProjects = [...new Set(allQuestions.map((q) => q.projectReference).filter(Boolean))];

  // Upsert with generationStatus=generating to prevent duplicate AI calls
  let reportDoc = await Report.findOneAndUpdate(
    { interview: interviewId },
    {
      $setOnInsert: {
        interview: interviewId,
        user: interview.user,
        generationStatus: "generating",
        terminationReason: interview.terminationReason || null,
      },
    },
    { upsert: true, new: true }
  );

  if (reportDoc.generationStatus === "complete" || reportDoc.generationStatus === "degraded") {
    // Another concurrent call already finished it
    return reportDoc;
  }

  // ── Attempt AI report generation within 60s deadline ─────────────────────
  let reportData = null;
  let generationError = null;
  const timeRemainingMs = deadline - Date.now();

  if (timeRemainingMs > 5000 && !isTerminated) {
    // Only attempt AI generation if we have more than 5 seconds and interview was not terminated for invalid answers
    try {
      const reportPromise = aiService.generateAdaptiveFinalReport({
        interview,
        projectContext: interview.projectContext,
        responses,
        providerOverride: options.providerOverride,
      });

      // Race against the deadline
      reportData = await Promise.race([
        reportPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Report generation deadline exceeded")), timeRemainingMs - 2000)
        ),
      ]);
    } catch (err) {
      generationError = err.message;
      console.error("[adaptiveEngine] AI report generation failed:", err.message);
    }
  }

  // ── Build final report data (deterministic fallback if AI failed) ─────────
  const effectiveAvg = overallScoreOverride !== null ? overallScoreOverride : (reportData ? null : calculatedAvg);

  const finalScores = {
    overall: overallScoreOverride !== null ? 0 : (reportData?.overall ?? calculatedAvg),
    technical: overallScoreOverride !== null ? 0 : (reportData?.technical ?? calculatedAvg),
    communication: overallScoreOverride !== null ? 0 : (reportData?.communication ?? calculatedAvg),
    confidence: overallScoreOverride !== null ? 0 : (reportData?.confidence ?? calculatedAvg),
    problemSolving: overallScoreOverride !== null ? 0 : (reportData?.problemSolving ?? calculatedAvg),
    coding: 0,
    webDevelopment: overallScoreOverride !== null ? 0 : (reportData?.webDevelopment ?? calculatedAvg),
    systemDesign: overallScoreOverride !== null ? 0 : (reportData?.systemDesign ?? calculatedAvg),
    conceptualUnderstanding: overallScoreOverride !== null ? 0 : (reportData?.conceptualUnderstanding ?? calculatedAvg),
    technicalCorrectness: overallScoreOverride !== null ? 0 : (reportData?.technicalCorrectness ?? calculatedAvg),
    projectOwnership: overallScoreOverride !== null ? 0 : (reportData?.projectOwnership ?? calculatedAvg),
    architecturalReasoning: overallScoreOverride !== null ? 0 : (reportData?.architecturalReasoning ?? calculatedAvg),
  };

  const generationStatus = isTerminated
    ? "complete"
    : generationError
    ? "degraded"
    : "complete";

  const finalSummary = isTerminated
    ? "This interview was terminated because two consecutive responses were not relevant to the questions asked. No technical score could be awarded."
    : (reportData?.summary || `Adaptive Web Development + System Design round completed with an average answer score of ${calculatedAvg}/100.`);

  const finalInterviewerSummary = isTerminated
    ? "Interview terminated due to two consecutive invalid/irrelevant answers. Score set to 0 as per evaluation policy."
    : (reportData?.interviewerSummary || "Completed round with demonstrated project context.");

  // ── Persist final report ──────────────────────────────────────────────────
  reportDoc = await Report.findOneAndUpdate(
    { interview: interviewId },
    {
      interview: interviewId,
      user: interview.user,
      scores: finalScores,
      adaptiveDetails: {
        projectsDiscussed: allDiscussedProjects.length > 0 ? allDiscussedProjects : [selectedProj.title],
        totalQuestionsAsked: allQuestions.length,
        evaluatedAnswersCount: responses.filter((r) => r.answerText && !r.answerText.includes("[Not Answered")).length,
        unansweredCount: unanswered.length,
        invalidAnswerCount,
        initialAdaptiveScore: interview.initialAdaptiveScore ?? DEFAULT_INITIAL_SCORE,
        finalAdaptiveScore: isTerminated ? 0 : (interview.currentAdaptiveScore ?? DEFAULT_INITIAL_SCORE),
        knowledgeGaps: reportData?.knowledgeGaps || [],
        misconceptions: reportData?.misconceptions || [],
        areasForImprovement: reportData?.areasForImprovement || [],
        interviewerSummary: finalInterviewerSummary,
      },
      strengths: isTerminated ? [] : (reportData?.strengths || ["Provided technical explanations grounded in project context."]),
      weaknesses: reportData?.weaknesses || [],
      suggestions: isTerminated
        ? ["Ensure answers are relevant to the questions asked in future interviews."]
        : (reportData?.suggestions || ["Continue practicing structured architecture trade-off discussions."]),
      summary: finalSummary,
      generationStatus,
      generationError: generationError || null,
      generatedAt: new Date(),
      terminationReason: interview.terminationReason || null,
    },
    { upsert: true, new: true }
  );

  // ── Mark interview as completed ───────────────────────────────────────────
  await Interview.findOneAndUpdate(
    { _id: interviewId },
    {
      status: isTerminated ? "TERMINATED_INVALID_ANSWERS" : "completed",
      completedAt: new Date(),
    }
  );

  return reportDoc;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  DEFAULT_INITIAL_SCORE,
  DEFAULT_ALPHA,
  REVIEW_WINDOW_SECONDS,
  ANSWER_TIME_LIMIT_SECONDS,
  BACKEND_PROCESSING_ALLOWANCE_SECONDS,
  REPORT_FINALIZATION_DEADLINE_SECONDS,
  MAX_CONSECUTIVE_INVALID,
  MAX_FOLLOW_UP_DEPTH,
  INVALID_CLASSIFICATIONS,
  getCompetencyLevel,
  computeUpdatedAdaptiveScore,
  selectBestProject,
  selectNextProject,
  buildFirstQuestionText,
  countQuestionsForProject,
  computeCurrentFollowUpDepth,
  initializeAdaptiveReview,
  updateReviewContext,
  startAdaptiveInterview,
  submitAdaptiveAnswer,
  getAdaptiveSessionState,
  finalizeAdaptiveReport,
};
