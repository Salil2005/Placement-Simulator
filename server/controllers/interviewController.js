const Interview = require("../models/Interview");
const Question = require("../models/Question");
const interviewEngine = require("../services/interview/interviewEngine");
const { asyncHandler } = require("../utils/asyncHandler");

// POST /api/interviews
const createInterview = asyncHandler(async (req, res) => {
  const { category, role, experience, difficulty, questionCount, programmingLanguage } = req.body;
  const count = Number(questionCount || 5);

  if (!category || !role?.trim()) {
    return res.status(400).json({ error: "category and role are required" });
  }
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    return res.status(400).json({ error: "questionCount must be a whole number between 1 and 20" });
  }

  const interview = await Interview.create({
    user: req.user._id,
    category,
    role,
    experience,
    difficulty,
    questionCount: count,
    programmingLanguage: programmingLanguage || "javascript",
    resumeFile: req.file ? `/uploads/${req.file.filename}` : null,
  });

  res.status(201).json({ interview });
});

// POST /api/interviews/:id/start
// POST /api/interviews/:id/start
const startInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ error: "Interview not found" });

  // Check if a question already exists for this interview to prevent duplicate creation crashes
  let existingQuestion = await Question.findOne({ interview: interview._id }).sort({ createdAt: 1 });
  if (existingQuestion) {
    if (interview.status === "not_started") {
      interview.status = "in_progress";
      await interview.save();
    }
    return res.json({ interview, question: existingQuestion });
  }

  try {
    const { question } = await interviewEngine.startInterview(interview);
    res.json({ interview, question });
  } catch (err) {
    // Fallback safeguard if a race condition slips past the initial lookup
    if (err.code === 11000) {
      const fallbackQuestion = await Question.findOne({ interview: interview._id }).sort({ createdAt: 1 });
      return res.json({ interview, question: fallbackQuestion });
    }
    throw err;
  }
});

// POST /api/interviews/:id/respond
// const respond = asyncHandler(async (req, res) => {
//   const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
//   if (!interview) return res.status(404).json({ error: "Interview not found" });

//   const { questionId, answerText, code, language } = req.body;
//   const { response, nextQuestion, isFinalQuestion } = await interviewEngine.submitAnswer(
//     interview,
//     { questionId, answerText, code, language }
//   );

//   res.json({ response, nextQuestion, isFinalQuestion });
// });
// POST /api/interviews/:id/respond
const respond = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ error: "Interview not found" });

  const { questionId, answerText, code, language } = req.body;

  try {
    const { response, nextQuestion, isFinalQuestion } = await interviewEngine.submitAnswer(
      interview,
      { questionId, answerText, code, language }
    );
    res.json({ response, nextQuestion, isFinalQuestion });
  } catch (err) {
    // If a duplicate key error occurs on the responses collection, handle it idempotently
    if (err.code === 11000) {
      // Fetch the next logical question or session state to recover gracefully
      const sessionState = await interviewEngine.getSessionState(interview._id);
      return res.status(200).json({
        response: { evaluation: "Response already recorded." },
        nextQuestion: sessionState.currentQuestion,
        isFinalQuestion: !sessionState.currentQuestion
      });
    }
    throw err;
  }
});

// GET /api/interviews/:id
const getInterview = asyncHandler(async (req, res) => {
  const { interview, session, responses, currentQuestion } = await interviewEngine.getSessionState(
    req.params.id
  );
  if (!interview) return res.status(404).json({ error: "Interview not found" });
  if (String(interview.user) !== String(req.user._id)) {
    return res.status(404).json({ error: "Interview not found" });
  }
  res.json({ interview, session, responses, currentQuestion });
});

// GET /api/interviews (list for dashboard/history)
const listInterviews = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ interviews });
});

module.exports = { createInterview, startInterview, respond, getInterview, listInterviews };
