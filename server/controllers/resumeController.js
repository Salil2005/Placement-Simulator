const ResumeProfile = require("../models/ResumeProfile");
const { ingestResume, analyzeResume } = require("../services/report/resumeAnalyzer");
const { asyncHandler } = require("../utils/asyncHandler");

// POST /api/resume/upload  (multipart: resume)
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No resume file uploaded" });
  const publicPath = `/uploads/${req.file.filename}`;
  const profile = await ingestResume(req.user._id, publicPath);
  res.status(201).json({ profile });
});

// GET /api/resume  -> stored resume profile (+ last analysis)
const getResume = asyncHandler(async (req, res) => {
  const profile = await ResumeProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ error: "No resume uploaded yet." });
  res.json({ profile });
});

// POST /api/resume/analyze -> resume vs interview analysis
const analyze = asyncHandler(async (req, res) => {
  const profile = await analyzeResume(req.user._id);
  res.json({ profile });
});

module.exports = { uploadResume, getResume, analyze };
