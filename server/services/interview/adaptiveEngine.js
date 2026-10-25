const path = require("path");
const Interview = require("../../models/Interview");
const Question = require("../../models/Question");
const Response = require("../../models/Response");
const Session = require("../../models/Session");
const Report = require("../../models/Report");
const ResumeProfile = require("../../models/ResumeProfile");
const aiService = require("../ai/aiService");
const { extractResumeText } = require("../report/resumeExtractor");
const { generateReport } = require("../report/reportGenerator");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

// Adaptive Scoring Constants
const DEFAULT_INITIAL_SCORE = 0.5;
const DEFAULT_ALPHA = 0.35;
const REVIEW_WINDOW_SECONDS = 120;
const ANSWER_TIME_LIMIT_SECONDS = 120;
const BACKEND_PROCESSING_ALLOWANCE_SECONDS = 60;

/**
 * Competency level thresholds mapping
 */
function getCompetencyLevel(score) {
  if (score < 0.25) return "Foundational";
  if (score < 0.45) return "Developing";
  if (score < 0.65) return "Intermediate";
  if (score < 0.8) return "Advanced";
  return "Expert";
}

/**
 * Update adaptive score using controlled weighted update:
 * newAdaptiveScore = clamp((1 - alpha) * previousAdaptiveScore + alpha * answerScore, 0, 1)
 */
function computeUpdatedAdaptiveScore(previousScore, answerScore, alpha = DEFAULT_ALPHA) {
  const pScore = Number.isFinite(previousScore) ? previousScore : DEFAULT_INITIAL_SCORE;
  const aScore = Number.isFinite(answerScore) ? answerScore : 0.5;
  const raw = (1 - alpha) * pScore + alpha * aScore;
  return Math.max(0, Math.min(1, Math.round(raw * 1000) / 1000));
}

/**
 * Select the most suitable project deterministically
 */
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

  // Pick project with highest detail score
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

/**
 * Formulate the dedicated first project walkthrough question from template:
 * "Please explain your project, [PROJECT_NAME], in detail. What problem does it solve, what was your role, and what technologies did you use? Walk me through its overall architecture, the responsibilities of its major components, and the complete data flow from the initial user action to the final output. Also explain the important technical decisions you made while developing it."
 */
function buildFirstQuestionText(projectName) {
  return `Please explain your project, ${projectName}, in detail. What problem does it solve, what was your role, and what technologies did you use? Walk me through its overall architecture, the responsibilities of its major components, and the complete data flow from the initial user action to the final output. Also explain the important technical decisions you made while developing it.`;
}

/**
 * Stage 1: Ingest resume and initialize candidate review window
 */
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

  // Fallback to user's saved ResumeProfile if interview upload is empty
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

  // If no projects parsed from text, check if existing ResumeProfile has projects
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

  // Ensure at least one fallback project if resume was empty or malformed
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

  // Default selected project
  const primaryProject = selectBestProject(structuredData.projects);
  structuredData.selectedProject = primaryProject.title;

  const now = new Date();
  const reviewDeadline = new Date(now.getTime() + REVIEW_WINDOW_SECONDS * 1000);

  interview.projectContext = structuredData;
  interview.reviewStatus = "in_review";
  interview.reviewStartedAt = now;
  interview.reviewDeadline = reviewDeadline;
  interview.status = "SKILL_REVIEW";
  await interview.save();

  return interview;
}

/**
 * Update candidate corrections during the 120s review window
 */
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

  if (Array.isArray(corrections.skills)) {
    currentCtx.skills = corrections.skills;
  }

  if (Array.isArray(corrections.technologies)) {
    currentCtx.technologies = corrections.technologies;
  }

  if (corrections.selectedProject) {
    currentCtx.selectedProject = corrections.selectedProject;
  }

  interview.projectContext = currentCtx;
  await interview.save();

  return interview;
}

/**
 * Start the interview (either when 120s review window expires, or candidate clicks "Start Interview" early)
 */
async function startAdaptiveInterview(interview, options = {}) {
  if (interview.status === "in_progress" || interview.status === "completed") {
    // Idempotent recovery
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
  interview.reviewStatus = "confirmed";
  interview.status = "in_progress";
  interview.startedAt = now;
  interview.interviewDeadline = interviewDeadline;
  await interview.save();

  let session = await Session.findOne({ interview: interview._id });
  if (!session) {
    session = await Session.create({ interview: interview._id, transcript: [] });
  }

  // Create First Question using dedicated template
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

/**
 * Submit and evaluate candidate answer with adaptive scoring & next question generation
 */
async function submitAdaptiveAnswer(interview, { questionId, answerText, code, language }, options = {}) {
  // Guard interview status
  if (interview.status !== "in_progress" && interview.status !== "grace_period") {
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

  // Idempotency: Prevent duplicate evaluation for same question
  const existingResponse = await Response.findOne({ interview: interview._id, question: question._id });
  if (existingResponse) {
    // Return existing evaluation and look up next question
    const sessionState = await getAdaptiveSessionState(interview._id);
    return {
      response: existingResponse,
      nextQuestion: sessionState.currentQuestion,
      isFinalQuestion: !sessionState.currentQuestion,
    };
  }

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
  const isFinalQuestion = isTimeUp || nextIndex >= maxQuestions;

  // 1. Record session transcript immediately
  const session = await Session.findOne({ interview: interview._id });
  if (session) {
    session.transcript.push({
      role: "user",
      content: (answerText || code || "").trim(),
      questionIndex: question.order,
      createdAt: new Date(),
    });
    await session.save();
  }

  // 2. Persist submitted answer record first with pending status
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
    answerSubmittedAt: new Date(),
  });

  // 3. Evaluate answer via centralized AI facade
  let evaluationResult;
  try {
    evaluationResult = await aiService.evaluateAdaptiveAnswer({
      projectContext: interview.projectContext,
      question: question.text,
      questionCategory: question.questionCategory,
      difficulty: question.difficulty,
      answer: answerText || code || "",
      currentAdaptiveScore: previousAdaptiveScore,
      providerOverride: options.providerOverride,
    });
  } catch (evalErr) {
    console.error("[adaptiveEngine] Evaluation failed:", evalErr.message);
    // Controlled fallback evaluation without discarding answer
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

  // 4. Update adaptive score only after evaluation
  const answerScore = evaluationResult.answerScore;
  const alpha = interview.scoringAlpha || DEFAULT_ALPHA;
  const newAdaptiveScore = computeUpdatedAdaptiveScore(previousAdaptiveScore, answerScore, alpha);

  interview.currentAdaptiveScore = newAdaptiveScore;
  interview.currentQuestionIndex = nextIndex;
  await interview.save();

  // 5. Update response document with evaluation
  const avgDimensionScore = Math.round(answerScore * 100);
  responseDoc.score = avgDimensionScore;
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

  // 6. Generate next question if interview is not final
  let nextQuestion = null;
  if (!isFinalQuestion) {
    const remainingSeconds = Math.max(0, (durationLimit - elapsedMinutes) * 60);

    // Alternate categories: Web Development vs System Design
    const previousQuestions = await Question.find({ interview: interview._id }).sort({ order: 1 });
    const lastCategory = question.questionCategory;
    const targetCategory =
      lastCategory === "Web Development" ? "System Design" : "Web Development";
    const competencyLevel = getCompetencyLevel(newAdaptiveScore);

    let generatedQuestionData;
    try {
      generatedQuestionData = await aiService.generateAdaptiveQuestion({
        projectContext: interview.projectContext,
        previousQuestions: previousQuestions.map((pq) => ({
          text: pq.text,
          questionCategory: pq.questionCategory,
          answerText: pq.order === question.order ? answerText : "",
        })),
        latestAnswer: answerText || code || "",
        latestEvaluation: evaluationResult,
        adaptiveScore: newAdaptiveScore,
        remainingSeconds,
        targetCategory,
        competencyLevel,
        providerOverride: options.providerOverride,
      });
    } catch (qErr) {
      console.error("[adaptiveEngine] Question generation error:", qErr.message);
      const selectedProj = selectBestProject(interview.projectContext?.projects);
      generatedQuestionData = {
        questionCategory: targetCategory,
        difficulty: competencyLevel.toLowerCase(),
        questionText: `In ${selectedProj.title}, how did you organize the ${targetCategory === "Web Development" ? "frontend component state and API integration" : "high-level component boundaries and data consistency"}?`,
        targetCompetencyLevel: competencyLevel,
        projectReference: selectedProj.title,
        rationale: "Fallback question maintaining adaptive context.",
      };
    }

    nextQuestion = await Question.create({
      interview: interview._id,
      text: generatedQuestionData.questionText,
      topic: `${generatedQuestionData.projectReference || "Project"} - ${generatedQuestionData.questionCategory}`,
      order: nextIndex,
      isCoding: false,
      questionCategory: generatedQuestionData.questionCategory,
      difficulty: generatedQuestionData.difficulty,
      projectReference: generatedQuestionData.projectReference,
      targetCompetencyLevel: generatedQuestionData.targetCompetencyLevel,
    });

    if (session) {
      session.transcript.push({
        role: "ai",
        content: nextQuestion.text,
        questionIndex: nextIndex,
        createdAt: new Date(),
      });
      await session.save();
    }
  }

  return {
    response: responseDoc,
    nextQuestion,
    isFinalQuestion,
    adaptiveScore: newAdaptiveScore,
  };
}

/**
 * Session state reader for adaptive interview
 */
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
      // Auto-start interview
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
  };
}

/**
 * Generate final report tailored for Adaptive Web Dev + System Design round
 */
async function finalizeAdaptiveReport(interviewId, options = {}) {
  const interview = await Interview.findById(interviewId);
  if (!interview) throw new Error("Interview not found");

  const existingReport = await Report.findOne({ interview: interviewId });
  if (existingReport) return existingReport;

  const [session, responses, allQuestions] = await Promise.all([
    Session.findOne({ interview: interviewId }),
    Response.find({ interview: interviewId }).populate("question").sort({ createdAt: 1 }),
    Question.find({ interview: interviewId }).sort({ order: 1 }),
  ]);

  // Record unanswered questions with score 0
  const answeredIds = new Set(responses.map((r) => String(r.question?._id || r.question)));
  const unanswered = allQuestions.filter((q) => !answeredIds.has(String(q._id)));

  for (const unans of unanswered) {
    const unansDoc = await Response.create({
      interview: interviewId,
      question: unans._id,
      answerText: "[Not Answered - Interview Concluded]",
      score: 0,
      answerScore: 0,
      previousAdaptiveScore: interview.currentAdaptiveScore ?? 0.5,
      updatedAdaptiveScore: interview.currentAdaptiveScore ?? 0.5,
      evaluationStatus: "completed",
      evaluation: {
        correctness: 0,
        clarity: 0,
        confidence: 0,
        notes: "Question was not answered before the interview ended.",
        dimensions: {
          technicalCorrectness: 0,
          conceptualUnderstanding: 0,
          projectRelevance: 0,
          depthOfExplanation: 0,
          architecturalReasoning: 0,
          practicalImplementation: 0,
          tradeoffAnalysis: 0,
        },
      },
    });
    responses.push(unansDoc);
  }

  let reportData;
  try {
    reportData = await aiService.generateAdaptiveFinalReport({
      interview,
      projectContext: interview.projectContext,
      responses,
      providerOverride: options.providerOverride,
    });
  } catch (err) {
    console.error("[adaptiveEngine] Final report AI error:", err.message);
    const validScores = responses
      .filter((r) => typeof r.score === "number")
      .map((r) => r.score);
    const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 50;
    reportData = {
      overall: avgScore,
      technical: avgScore,
      communication: avgScore,
      confidence: avgScore,
      problemSolving: avgScore,
      coding: 0,
      webDevelopment: avgScore,
      systemDesign: avgScore,
      conceptualUnderstanding: avgScore,
      technicalCorrectness: avgScore,
      projectOwnership: avgScore,
      architecturalReasoning: avgScore,
      strengths: ["Completed adaptive technical project evaluation."],
      weaknesses: [],
      knowledgeGaps: [],
      misconceptions: [],
      areasForImprovement: [],
      suggestions: ["Review architectural design trade-offs for scaling."],
      summary: "Adaptive Web Development + System Design round completed.",
      interviewerSummary: "Completed round with demonstrated project context.",
    };
  }

  const selectedProj = selectBestProject(interview.projectContext?.projects);

  const report = await Report.findOneAndUpdate(
    { interview: interviewId },
    {
      interview: interviewId,
      user: interview.user,
      scores: {
        overall: reportData.overall,
        technical: reportData.technical,
        communication: reportData.communication,
        confidence: reportData.confidence,
        problemSolving: reportData.problemSolving,
        coding: reportData.coding || 0,
        webDevelopment: reportData.webDevelopment || reportData.technical,
        systemDesign: reportData.systemDesign || reportData.problemSolving,
        conceptualUnderstanding: reportData.conceptualUnderstanding || reportData.technical,
        technicalCorrectness: reportData.technicalCorrectness || reportData.technical,
        projectOwnership: reportData.projectOwnership || reportData.confidence,
        architecturalReasoning: reportData.architecturalReasoning || reportData.problemSolving,
      },
      adaptiveDetails: {
        projectsDiscussed: [selectedProj.title],
        totalQuestionsAsked: allQuestions.length,
        evaluatedAnswersCount: responses.filter((r) => r.answerText && !r.answerText.includes("[Not Answered")).length,
        unansweredCount: unanswered.length,
        initialAdaptiveScore: interview.initialAdaptiveScore ?? DEFAULT_INITIAL_SCORE,
        finalAdaptiveScore: interview.currentAdaptiveScore ?? DEFAULT_INITIAL_SCORE,
        knowledgeGaps: reportData.knowledgeGaps || [],
        misconceptions: reportData.misconceptions || [],
        areasForImprovement: reportData.areasForImprovement || [],
        interviewerSummary: reportData.interviewerSummary || reportData.summary || "",
      },
      strengths: reportData.strengths || [],
      weaknesses: reportData.weaknesses || [],
      suggestions: reportData.suggestions || [],
      summary: reportData.summary || "",
    },
    { upsert: true, new: true }
  );

  interview.status = "completed";
  interview.completedAt = new Date();
  await interview.save();

  return report;
}

module.exports = {
  DEFAULT_INITIAL_SCORE,
  DEFAULT_ALPHA,
  REVIEW_WINDOW_SECONDS,
  ANSWER_TIME_LIMIT_SECONDS,
  BACKEND_PROCESSING_ALLOWANCE_SECONDS,
  getCompetencyLevel,
  computeUpdatedAdaptiveScore,
  selectBestProject,
  buildFirstQuestionText,
  initializeAdaptiveReview,
  updateReviewContext,
  startAdaptiveInterview,
  submitAdaptiveAnswer,
  getAdaptiveSessionState,
  finalizeAdaptiveReport,
};
