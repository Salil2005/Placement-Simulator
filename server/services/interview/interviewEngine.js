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

  return { question, session };
}

/**
 * Records the candidate's answer, evaluates it, stores the response,
 * and selects the next bank question (or marks the interview ready to finish).
 */
async function submitAnswer(interview, { questionId, answerText, code, language }) {
  if (interview.status !== "in_progress") {
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

  const alreadyAnswered = await Response.exists({ interview: interview._id, question: question._id });
  if (alreadyAnswered) {
    const err = new Error("This question has already been answered");
    err.statusCode = 409;
    throw err;
  }

  const nextIndex = question.order + 1;
  const isFinalQuestion = nextIndex >= interview.questionCount;
  // Resolve the next database record before persisting the response. If an
  // administrator has emptied the bank mid-session, the candidate can retry
  // safely after it is repaired instead of being left with an answered
  // question and no next question.
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

  const currentQuestion = interview ? await getPendingQuestion(interviewId, responses) : null;

  return { interview, session, responses, currentQuestion };
}

module.exports = { startInterview, submitAnswer, getSessionState };
