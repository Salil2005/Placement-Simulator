const Interview = require("../models/Interview");
const Question = require("../models/Question");
const interviewEngine = require("../services/interview/interviewEngine");
const adaptiveEngine = require("../services/interview/adaptiveEngine");
const { asyncHandler } = require("../utils/asyncHandler");

// POST /api/interviews
const createInterview = asyncHandler(async (req, res) => {
  const { category, role, experience, difficulty, durationMinutes, questionCount, programmingLanguage } = req.body;
  const duration = Number(durationMinutes || 15);
  const count = Number(questionCount || 20);

  if (!category || !role?.trim()) {
    return res.status(400).json({ error: "category and role are required" });
  }

  const isAdaptive = category === "adaptive-web-system";

  const interview = await Interview.create({
    user: req.user._id,
    category,
    role,
    experience,
    difficulty,
    durationMinutes: duration,
    questionCount: count,
    programmingLanguage: programmingLanguage || "javascript",
    resumeFile: req.file ? `/uploads/${req.file.filename}` : null,
    isAdaptive,
    status: isAdaptive ? "RESUME_PROCESSING" : "not_started",
  });

  // If this is an adaptive round, kick off resume processing & initialize 120s review window
  if (isAdaptive) {
    try {
      await adaptiveEngine.initializeAdaptiveReview(interview);
    } catch (err) {
      console.error("[createInterview] adaptive review initialization warning:", err.message);
    }
  }

  res.status(201).json({ interview });
});

// PATCH /api/interviews/:id/review
const updateReview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ error: "Interview not found" });

  const updated = await adaptiveEngine.updateReviewContext(interview, req.body);
  res.json({ interview: updated });
});

// POST /api/interviews/:id/start
const startInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ error: "Interview not found" });

  if (interview.isAdaptive || interview.category === "adaptive-web-system") {
    const result = await adaptiveEngine.startAdaptiveInterview(interview);
    return res.json({ interview: result.interview, question: result.question });
  }

  // Check if a question already exists for this interview to prevent duplicate creation crashes
  let existingQuestion = await Question.findOne({ interview: interview._id }).sort({ createdAt: 1 });
  if (existingQuestion) {
    if (interview.status === "not_started" || !interview.startedAt) {
      interview.status = "in_progress";
      interview.startedAt = interview.startedAt || new Date();
      await interview.save();
    }
    return res.json({ interview, question: existingQuestion });
  }

  try {
    const { question, interview: startedInterview } = await interviewEngine.startInterview(interview);
    res.json({ interview: startedInterview || interview, question });
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
const respond = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ error: "Interview not found" });

  const { questionId, answerText, code, language } = req.body;

  if (interview.isAdaptive || interview.category === "adaptive-web-system") {
    try {
      const result = await adaptiveEngine.submitAdaptiveAnswer(interview, {
        questionId,
        answerText,
        code,
        language,
      });
      return res.json(result);
    } catch (err) {
      if (err.code === 11000) {
        const sessionState = await adaptiveEngine.getAdaptiveSessionState(interview._id);
        return res.status(200).json({
          response: { evaluation: "Response already recorded." },
          nextQuestion: sessionState.currentQuestion,
          isFinalQuestion: !sessionState.currentQuestion,
        });
      }
      throw err;
    }
  }

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
        isFinalQuestion: !sessionState.currentQuestion,
      });
    }
    throw err;
  }
});

// GET /api/interviews/:id
const getInterview = asyncHandler(async (req, res) => {
  const interviewDoc = await Interview.findById(req.params.id);
  if (!interviewDoc) return res.status(404).json({ error: "Interview not found" });
  if (String(interviewDoc.user) !== String(req.user._id)) {
    return res.status(404).json({ error: "Interview not found" });
  }

  if (interviewDoc.isAdaptive || interviewDoc.category === "adaptive-web-system") {
    const state = await adaptiveEngine.getAdaptiveSessionState(req.params.id);
    return res.json(state);
  }

  const { interview, session, responses, currentQuestion } = await interviewEngine.getSessionState(
    req.params.id
  );
  res.json({ interview, session, responses, currentQuestion });
});

// GET /api/interviews (list for dashboard/history)
const listInterviews = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ interviews });
});

module.exports = { createInterview, updateReview, startInterview, respond, getInterview, listInterviews };
