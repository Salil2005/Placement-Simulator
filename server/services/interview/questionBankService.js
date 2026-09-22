const Question = require("../../models/Question");
const QuestionBank = require("../../models/QuestionBank");
const { questionBankSeed } = require("../../knowledge/questionBankSeed");

class QuestionBankError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = "QuestionBankError";
    this.statusCode = statusCode;
  }
}

async function ensureQuestionBankSeeded() {
  const operations = questionBankSeed.map((question) => ({
    updateOne: {
      filter: { category: question.category, text: question.text },
      update: { $setOnInsert: question },
      upsert: true,
    },
  }));

  await QuestionBank.bulkWrite(operations, { ordered: false });
}

async function getUsedBankQuestionIds(interviewId) {
  const priorQuestions = await Question.find(
    { interview: interviewId, bankQuestion: { $exists: true, $ne: null } },
    { bankQuestion: 1, _id: 0 }
  ).lean();

  return priorQuestions.map((question) => question.bankQuestion);
}

async function selectQuestion(interview) {
  const usedIds = await getUsedBankQuestionIds(interview._id);
  const baseMatch = {
    category: interview.category,
    active: true,
    ...(usedIds.length ? { _id: { $nin: usedIds } } : {}),
  };

  // Prefer a question tagged for the configured difficulty. If those are used
  // up, expand only within the same category so a 20-question interview still
  // never repeats a bank question.
  let [selected] = await QuestionBank.aggregate([
    { $match: { ...baseMatch, difficulty: interview.difficulty } },
    { $sample: { size: 1 } },
  ]);

  if (!selected) {
    [selected] = await QuestionBank.aggregate([
      { $match: baseMatch },
      { $sample: { size: 1 } },
    ]);
  }

  if (!selected) {
    throw new QuestionBankError(
      `No unused active ${interview.category} interview questions are available. Please contact an administrator to replenish the question bank.`,
      422
    );
  }

  return selected;
}

async function assertSufficientQuestions(interview) {
  const available = await QuestionBank.countDocuments({
    category: interview.category,
    active: true,
  });

  if (available < interview.questionCount) {
    throw new QuestionBankError(
      `The ${interview.category} question bank has ${available} active questions, but this interview requires ${interview.questionCount}. Please contact an administrator to replenish the question bank.`,
      422
    );
  }
}

module.exports = {
  QuestionBankError,
  ensureQuestionBankSeeded,
  selectQuestion,
  assertSufficientQuestions,
};
