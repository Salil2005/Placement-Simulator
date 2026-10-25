const Interview = require("../../models/Interview");
const Question = require("../../models/Question");
const Response = require("../../models/Response");
const Session = require("../../models/Session");
const aiService = require("../ai/aiService");
const { assertSufficientQuestions, selectQuestion } = require("./questionBankService");

/** Starts an interview: creates the session doc and selects question #1 from the bank. */
async function startInterview(interview) {
  if (interview.status !== "not_started") {
    const err = new Error("Interview has already been started");
    err.statusCode = 409;
    throw err;
  }

  // Validate before creating session state so an underfilled bank leaves the
  // interview safely startable after it has been replenished.
  await assertSufficientQuestions(interview);
  const bankQuestion = await selectQuestion(interview);
  const session = await Session.create({ interview: interview._id, transcript: [] });

  const question = await Question.create({
    interview: interview._id,
    bankQuestion: bankQuestion._id,
    text: bankQuestion.text,
    topic: bankQuestion.topic,
    order: 0,
    isCoding: interview.category === "dsa",
  });

  session.transcript.push({ role: "ai", content: question.text, questionIndex: 0 });
  await session.save();

  interview.status = "in_progress";
  interview.startedAt = new Date();
  await interview.save();

  return { interview, question, session };
}

/**
 * Records the candidate's answer, evaluates it, stores the response,
 * and selects the next bank question (or marks the interview ready to finish).
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

  // Once regular duration is reached (or interview is in grace_period), this answered question is the final one
  const isTimeUp = elapsedMinutes >= durationLimit || interview.status === "grace_period";
  const isFinalQuestion = isTimeUp || nextIndex >= (interview.questionCount || 20);

  // Resolve the next database record ONLY if not the final question
  const nextBankQuestion = isFinalQuestion ? null : await selectQuestion(interview);

  const session = await Session.findOne({ interview: interview._id });
  if (!session) throw new Error("Interview session was not found");
  session.transcript.push({
    role: "user",
    content: answerText || code || "",
    questionIndex: question.order,
  });

  const evaluation = await aiService.evaluateAnswer({
    interview,
    question: question.text,
    answer: answerText || code || "",
  });

  const avgScore = Math.round(
    (evaluation.correctness + evaluation.clarity + evaluation.confidence) / 3
  );

  const response = await Response.create({
    interview: interview._id,
    question: question._id,
    answerText,
    code,
    language,
    score: avgScore,
    evaluation,
  });

  let nextQuestion = null;
  if (!isFinalQuestion) {
    nextQuestion = await Question.create({
      interview: interview._id,
      bankQuestion: nextBankQuestion._id,
      text: nextBankQuestion.text,
      topic: nextBankQuestion.topic,
      order: nextIndex,
      isCoding: interview.category === "dsa",
      isFollowUp: avgScore < 50,
    });

    session.transcript.push({ role: "ai", content: nextQuestion.text, questionIndex: nextIndex });
  }

  interview.currentQuestionIndex = nextIndex;
  await interview.save();
  await session.save();

  return { response, nextQuestion, isFinalQuestion };
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

module.exports = { startInterview, submitAnswer, getSessionState };
