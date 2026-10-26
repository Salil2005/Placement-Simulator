const Interview = require("../../models/Interview");
const Question = require("../../models/Question");
const Response = require("../../models/Response");
const Session = require("../../models/Session");
const aiService = require("../ai/aiService");
const { assertSufficientQuestions, selectQuestion } = require("./questionBankService");

const { getInitialAdaptiveScore, computeAdaptiveTransition, mapScoreToDifficulty } = require("./adaptiveService");

/** Starts an interview: creates the session doc and selects question #1 from the bank. */
async function startInterview(interview) {
  if (interview.status !== "not_started") {
    const err = new Error("Interview has already been started");
    err.statusCode = 409;
    throw err;
  }

  // Ensure initial adaptive score is set
  const initialAdaptiveScore = interview.initialAdaptiveScore || getInitialAdaptiveScore(interview.difficulty);
  interview.initialAdaptiveScore = initialAdaptiveScore;
  interview.currentAdaptiveScore = initialAdaptiveScore;

  // Validate before creating session state so an underfilled bank leaves the
  // interview safely startable after it has been replenished.
  await assertSufficientQuestions(interview);
  const bankQuestion = await selectQuestion(interview, initialAdaptiveScore);
  const session = await Session.create({ interview: interview._id, transcript: [] });

  const question = await Question.create({
    interview: interview._id,
    bankQuestion: bankQuestion._id,
    text: bankQuestion.text,
    topic: bankQuestion.topic,
    order: 0,
    isCoding: interview.category === "dsa",
    actualDifficulty: bankQuestion.actualDifficulty || mapScoreToDifficulty(initialAdaptiveScore),
    selectionReason: bankQuestion.selectionReason || "Initial question selected at baseline difficulty.",
    adaptiveScoreAtSelection: initialAdaptiveScore,
  });

  session.transcript.push({ role: "ai", content: question.text, questionIndex: 0 });
  await session.save();

  interview.status = "in_progress";
  interview.startedAt = new Date();
  await interview.save();

  return { interview, question, session };
}

/**
 * Formats a Response and Question doc into the standardized transparent API contract.
 */
function formatTransparentResponse(responseDoc, questionDoc, nextTargetDifficulty) {
  const evalData = responseDoc.evaluation || {};
  const adaptData = responseDoc.adaptiveScoring || {};

  return {
    _id: responseDoc._id,
    question_id: String(questionDoc?._id || responseDoc.question?._id || responseDoc.question),
    question: questionDoc?.text || "",
    topic: questionDoc?.topic || "",
    difficulty: questionDoc?.actualDifficulty || "medium",
    answer_status: responseDoc.answerStatus || "answered",
    user_answer: responseDoc.answerText || responseDoc.code || "",
    evaluation: {
      performance_score: evalData.performanceScore ?? Math.round((responseDoc.score || 0) / 10),
      max_performance_score: evalData.maxPerformanceScore || 10,
      quality: evalData.quality || "average",
      correctness: evalData.correctnessAssessment || "partially_correct",
      raw_correctness: evalData.correctness ?? 50,
      raw_clarity: evalData.clarity ?? 50,
      raw_confidence: evalData.confidence ?? 50,
      strengths: evalData.strengths || [],
      missing_points: evalData.missingPoints || [],
      important_concepts: evalData.importantConcepts || [],
      explanation: evalData.explanation || evalData.notes || "",
      improvement_suggestions: evalData.improvementSuggestions || [],
      notes: evalData.notes || "",
    },
    adaptive_scoring: {
      score_before: adaptData.scoreBefore ?? 5,
      score_change: adaptData.scoreChange ?? 0,
      score_after: adaptData.scoreAfter ?? 5,
      change_reason: adaptData.changeReason || "",
      next_target_difficulty: nextTargetDifficulty || adaptData.nextTargetDifficulty || "medium",
    },
    score: responseDoc.score,
  };
}

/**
 * Records the candidate's answer, evaluates it, stores the response,
 * updates the adaptive score, and selects the next bank question (or marks the interview ready to finish).
 */
async function submitAnswer(interview, { questionId, answerText, code, language }) {
  if (interview.status !== "in_progress" && interview.status !== "grace_period") {
    const err = new Error("This interview is not accepting answers");
    err.statusCode = 409;
    throw err;
  }
  if (!questionId || !(answerText || code || "").trim()) {
    const err = new Error("Please provide an answer before submitting");
    err.statusCode = 400;
    throw err;
  }

  const question = await Question.findOne({ _id: questionId, interview: interview._id });
  if (!question) {
    const err = new Error("Question not found for this interview");
    err.statusCode = 404;
    throw err;
  }

  // Enforce 2-minute reflection time before answering
  const questionCreated = question.createdAt ? new Date(question.createdAt).getTime() : Date.now();
  const elapsedSecSinceQuestion = (Date.now() - questionCreated) / 1000;
  if (elapsedSecSinceQuestion < 120) {
    const waitRemaining = Math.ceil(120 - elapsedSecSinceQuestion);
    const err = new Error(
      `Please take time to think. You can submit your answer in ${waitRemaining} second${waitRemaining === 1 ? "" : "s"}.`
    );
    err.statusCode = 400;
    throw err;
  }

  const alreadyAnswered = await Response.exists({ interview: interview._id, question: question._id });
  if (alreadyAnswered) {
    const err = new Error("This question has already been answered");
    err.statusCode = 409;
    throw err;
  }

  const nextIndex = question.order + 1;

  // Time-based check: standard interview duration + 5 minutes grace period
  const startTime = interview.startedAt ? new Date(interview.startedAt).getTime() : Date.now();
  const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
  const durationLimit = Number(interview.durationMinutes) || 15;
  const GRACE_PERIOD_MIN = 5;

  // If even grace period has elapsed, reject late answer submission
  if (elapsedMinutes > durationLimit + GRACE_PERIOD_MIN) {
    const err = new Error("Interview and 5-minute grace period have both expired. Concluding interview.");
    err.statusCode = 400;
    throw err;
  }

  const session = await Session.findOne({ interview: interview._id });
  if (!session) throw new Error("Interview session was not found");
  session.transcript.push({
    role: "user",
    content: answerText || code || "",
    questionIndex: question.order,
  });

  // Evaluate candidate answer using LLM evaluator with transparent dimensions
  // For DSA/coding questions, pass structured answer with code, language, and approach
  const answerPayload = (interview.category === "dsa" || question.isCoding)
    ? {
        code: code || "",
        language: language || interview.programmingLanguage || "javascript",
        approach: answerText || "",
        answerText: answerText || "",
      }
    : (answerText || code || "");

  const evaluation = await aiService.evaluateAnswer({
    interview,
    question: question.text,
    answer: answerPayload,
    topic: question.topic,
    difficulty: question.actualDifficulty,
    isCoding: question.isCoding,
  });

  // Compute adaptive transition from current interview adaptive score
  const currentAdaptive = interview.currentAdaptiveScore ?? getInitialAdaptiveScore(interview.difficulty);
  const adaptiveResult = computeAdaptiveTransition({
    currentScore: currentAdaptive,
    quality: evaluation.quality,
    isUnanswered: false,
  });

  // Performance score normalized: 0-100%
  const avgScore = Math.round(
    (evaluation.correctness + evaluation.clarity + evaluation.confidence) / 3
  );

  const responseDoc = await Response.create({
    interview: interview._id,
    question: question._id,
    answerText: answerText || "",
    code: code || "",
    language: language || "",
    score: avgScore,
    answerStatus: "answered",
    evaluation,
    adaptiveScoring: {
      scoreBefore: adaptiveResult.scoreBefore,
      scoreChange: adaptiveResult.scoreChange,
      scoreAfter: adaptiveResult.scoreAfter,
      changeReason: adaptiveResult.changeReason,
      nextTargetDifficulty: adaptiveResult.nextTargetDifficulty,
    },
  });

  // Save the updated adaptive score immediately before selecting the next question
  interview.currentAdaptiveScore = adaptiveResult.scoreAfter;
  interview.currentQuestionIndex = nextIndex;
  await interview.save();

  // Once regular duration is reached (or interview is in grace_period), this answered question is the final one
  const isTimeUp = elapsedMinutes >= durationLimit || interview.status === "grace_period";
  const isFinalQuestion = isTimeUp || nextIndex >= (interview.questionCount || 20);

  // Resolve the next database record ONLY if not the final question, using the updated adaptive score
  const nextBankQuestion = isFinalQuestion ? null : await selectQuestion(interview, interview.currentAdaptiveScore);

  let nextQuestion = null;
  if (!isFinalQuestion && nextBankQuestion) {
    nextQuestion = await Question.create({
      interview: interview._id,
      bankQuestion: nextBankQuestion._id,
      text: nextBankQuestion.text,
      topic: nextBankQuestion.topic,
      order: nextIndex,
      isCoding: interview.category === "dsa",
      isFollowUp: avgScore < 50,
      actualDifficulty: nextBankQuestion.actualDifficulty || adaptiveResult.nextTargetDifficulty,
      selectionReason: nextBankQuestion.selectionReason || `Target difficulty (${adaptiveResult.nextTargetDifficulty}) from adaptive score ${adaptiveResult.scoreAfter}.`,
      adaptiveScoreAtSelection: interview.currentAdaptiveScore,
    });

    session.transcript.push({ role: "ai", content: nextQuestion.text, questionIndex: nextIndex });
  }

  await session.save();

  const formattedResponse = formatTransparentResponse(
    responseDoc,
    question,
    adaptiveResult.nextTargetDifficulty
  );

  return {
    response: formattedResponse,
    nextQuestion,
    isFinalQuestion,
  };
}

/**
 * Resolves the question the candidate still needs to answer, i.e. the
 * most-recently created question for this interview that has no stored
 * Response yet. Returns null once every question so far has been answered
 * (e.g. the interview is complete, or hasn't started).
 */
async function getPendingQuestion(interviewId, responses) {
  const latestQuestion = await Question.findOne({ interview: interviewId }).sort({ order: -1 });
  if (!latestQuestion) return null;

  const alreadyAnswered = responses.some(
    (r) => String(r.question?._id || r.question) === String(latestQuestion._id)
  );
  return alreadyAnswered ? null : latestQuestion;
}

async function getSessionState(interviewId) {
  const [interview, session, responses] = await Promise.all([
    Interview.findById(interviewId),
    Session.findOne({ interview: interviewId }),
    Response.find({ interview: interviewId }).populate("question"),
  ]);

  if (interview && interview.status === "in_progress" && interview.startedAt) {
    const elapsedMinutes = (Date.now() - new Date(interview.startedAt).getTime()) / (1000 * 60);
    const durationLimit = Number(interview.durationMinutes) || 15;
    if (elapsedMinutes >= durationLimit) {
      interview.status = "grace_period";
      await interview.save();
    }
  }

  const currentQuestion = interview ? await getPendingQuestion(interviewId, responses) : null;

  return { interview, session, responses, currentQuestion };
}

module.exports = { startInterview, submitAnswer, getSessionState, formatTransparentResponse };
