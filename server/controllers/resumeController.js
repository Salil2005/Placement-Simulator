const ResumeProfile = require("../models/ResumeProfile");
const { ingestResume, analyzeResume } = require("../services/report/resumeAnalyzer");
const { asyncHandler } = require("../utils/asyncHandler");

// Allowed fields the user can manually append items to
const EDITABLE_FIELDS = new Set([
  "skills",
  "programmingLanguages",
  "frameworks",
  "databases",
  "coreCsSubjects",
  "certifications",
]);

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

// PATCH /api/resume/skills  -> manually add one item to a skill category
const addSkill = asyncHandler(async (req, res) => {
  const { field, value } = req.body;

  if (!EDITABLE_FIELDS.has(field)) {
    return res.status(400).json({
      error: `Invalid field "${field}". Allowed: ${[...EDITABLE_FIELDS].join(", ")}`,
    });
  }

  const item = typeof value === "string" ? value.trim() : "";
  if (!item) return res.status(400).json({ error: "Value must be a non-empty string." });

  const profile = await ResumeProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ error: "No resume uploaded yet." });

  // Case-insensitive duplicate check
  const existing = (profile[field] || []).map((s) => s.toLowerCase());
  if (existing.includes(item.toLowerCase())) {
    return res.status(409).json({ error: `"${item}" is already in ${field}.` });
  }

  profile[field].push(item);
  await profile.save();

  res.json({ profile });
});

// DELETE /api/resume/skills -> manually remove one item from a skill category
const removeSkill = asyncHandler(async (req, res) => {
  const { field, value } = req.body;

  if (!EDITABLE_FIELDS.has(field)) {
    return res.status(400).json({
      error: `Invalid field "${field}". Allowed: ${[...EDITABLE_FIELDS].join(", ")}`,
    });
  }

  const item = typeof value === "string" ? value.trim() : "";
  if (!item) return res.status(400).json({ error: "Value must be a non-empty string." });

  const profile = await ResumeProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ error: "No resume uploaded yet." });

  profile[field] = (profile[field] || []).filter(
    (s) => s.toLowerCase() !== item.toLowerCase()
  );
  await profile.save();

  res.json({ profile });
});

module.exports = { uploadResume, getResume, analyze, addSkill, removeSkill };

