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

const fs = require("fs");
const path = require("path");

async function ensureQuestionBankSeeded() {
  const allSeeds = [...questionBankSeed];

  const leetcodePath = path.join(__dirname, "../../knowledge/leetcodeQuestions.json");
  if (fs.existsSync(leetcodePath)) {
    try {
      const leetcodeData = JSON.parse(fs.readFileSync(leetcodePath, "utf-8"));
      allSeeds.push(...leetcodeData);
    } catch (err) {
      console.warn("[db] Failed to load leetcodeQuestions.json:", err.message);
    }
  }

  const operations = allSeeds.map((question) => ({
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

const ResumeProfile = require("../../models/ResumeProfile");
const { mapScoreToDifficulty } = require("./adaptiveService");

async function getCandidateResumeTopics(userId) {
  if (!userId) return [];
  try {
    const profile = await ResumeProfile.findOne({ user: userId }).lean();
    if (!profile) return [];

    const candidates = [];
    if (Array.isArray(profile.skills)) candidates.push(...profile.skills);
    if (Array.isArray(profile.programmingLanguages)) candidates.push(...profile.programmingLanguages);
    if (Array.isArray(profile.frameworks)) candidates.push(...profile.frameworks);
    if (Array.isArray(profile.databases)) candidates.push(...profile.databases);
    if (Array.isArray(profile.coreCsSubjects)) candidates.push(...profile.coreCsSubjects);
    if (Array.isArray(profile.projects)) {
      profile.projects.forEach((p) => {
        if (p.title) candidates.push(p.title);
      });
    }

    return candidates
      .filter((c) => typeof c === "string" && c.trim().length > 1)
      .map((c) => c.trim().toLowerCase());
  } catch (err) {
    return [];
  }
}

/**
 * Adaptive question selection algorithm:
 * 1. Target difficulty is resolved from the adaptive score (1-3: easy, 4-6: medium, 7-9: hard).
 * 2. Independent topic selection prioritizes resume topics matching question bank topics.
 * 3. Controlled Fallback Hierarchy:
 *    - Priority A: Target Difficulty + Candidate's Preferred/Resume Topic
 *    - Priority B: Target Difficulty + Any other category topic
 *    - Priority C: Closest Available Difficulty + Relevant Topic
 *    - Priority D: Closest Available Difficulty in category
 * 4. Records actualDifficulty, selectionReason, and adaptiveScoreAtSelection.
 */
async function selectQuestion(interview, currentAdaptiveScore = 5) {
  const targetDifficulty = mapScoreToDifficulty(currentAdaptiveScore);
  const usedIds = await getUsedBankQuestionIds(interview._id);

  const baseMatch = {
    category: interview.category,
    active: true,
    ...(usedIds.length ? { _id: { $nin: usedIds } } : {}),
  };

  // 1. Discover all distinct topics available in the bank for this category
  const availableTopics = await QuestionBank.distinct("topic", baseMatch);

  // 2. Extract resume topics for the candidate
  const resumeKeywords = await getCandidateResumeTopics(interview.user);

  // In DSA interviews, questions can span any topic (Trees, Graphs, DP, Linked Lists, etc.) across the full syllabus
  const isDsa = interview.category === "dsa";

  // Find matching topics between resume and available question bank topics (for technical/role-specific interviews)
  const matchingTopics = !isDsa && resumeKeywords.length > 0
    ? availableTopics.filter((bt) => {
        const lower = bt.toLowerCase();
        return resumeKeywords.some((rk) => lower.includes(rk) || rk.includes(lower));
      })
    : [];

  let selected = null;
  let actualDifficulty = targetDifficulty;
  let selectionReason = "";

  // Priority A: Target Difficulty + Matched Resume Topic (for non-DSA or explicit matches)
  if (matchingTopics.length > 0) {
    const [q] = await QuestionBank.aggregate([
      { $match: { ...baseMatch, difficulty: targetDifficulty, topic: { $in: matchingTopics } } },
      { $sample: { size: 1 } },
    ]);
    if (q) {
      selected = q;
      actualDifficulty = q.difficulty;
      selectionReason = `Direct match on target difficulty (${targetDifficulty}) and candidate resume topic (${q.topic}).`;
    }
  }

  // Priority B: Target Difficulty across any topic (standard for DSA to explore varied problem domains)
  if (!selected) {
    const [q] = await QuestionBank.aggregate([
      { $match: { ...baseMatch, difficulty: targetDifficulty } },
      { $sample: { size: 1 } },
    ]);
    if (q) {
      selected = q;
      actualDifficulty = q.difficulty;
      selectionReason = isDsa
        ? `DSA adaptive selection: selected topic (${q.topic}) at target difficulty (${targetDifficulty}).`
        : `Selected topic (${q.topic}) matching target difficulty (${targetDifficulty}).`;
    }
  }

  // Priority C: Closest available difficulty with relevant resume topic
  const difficultyOrder = targetDifficulty === "medium"
    ? ["easy", "hard"]
    : targetDifficulty === "hard"
    ? ["medium", "easy"]
    : ["medium", "hard"];

  if (!selected && matchingTopics.length > 0) {
    for (const altDiff of difficultyOrder) {
      const [q] = await QuestionBank.aggregate([
        { $match: { ...baseMatch, difficulty: altDiff, topic: { $in: matchingTopics } } },
        { $sample: { size: 1 } },
      ]);
      if (q) {
        selected = q;
        actualDifficulty = q.difficulty;
        selectionReason = `Fallback: Target difficulty (${targetDifficulty}) exhausted for resume topics. Selected closest difficulty (${altDiff}) prioritizing resume topic (${q.topic}).`;
        break;
      }
    }
  }

  // Priority D: Closest available difficulty in category (broadest fallback)
  if (!selected) {
    for (const altDiff of difficultyOrder) {
      const [q] = await QuestionBank.aggregate([
        { $match: { ...baseMatch, difficulty: altDiff } },
        { $sample: { size: 1 } },
      ]);
      if (q) {
        selected = q;
        actualDifficulty = q.difficulty;
        selectionReason = `Fallback: Selected closest available difficulty (${altDiff}) in category (${interview.category}) as target difficulty (${targetDifficulty}) was exhausted.`;
        break;
      }
    }
  }

  // Final catch-all if any unused question remains
  if (!selected) {
    const [q] = await QuestionBank.aggregate([
      { $match: baseMatch },
      { $sample: { size: 1 } },
    ]);
    if (q) {
      selected = q;
      actualDifficulty = q.difficulty;
      selectionReason = `Fallback: Selected remaining unused question (${q.topic}, ${q.difficulty}).`;
    }
  }

  if (!selected) {
    throw new QuestionBankError(
      `No unused active ${interview.category} interview questions are available. Please contact an administrator to replenish the question bank.`,
      422
    );
  }

  return {
    ...selected,
    actualDifficulty,
    selectionReason,
    adaptiveScoreAtSelection: currentAdaptiveScore,
  };
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
