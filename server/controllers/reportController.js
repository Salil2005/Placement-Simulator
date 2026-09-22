const path = require("path");
const Report = require("../models/Report");
const Interview = require("../models/Interview");
const Response = require("../models/Response");
const { generateReport, REPORTS_DIR } = require("../services/report/reportGenerator");
const { asyncHandler } = require("../utils/asyncHandler");

// POST /api/interviews/:id/finish -> generates the final report
const finishInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ error: "Interview not found" });

  const report = await generateReport(interview._id);
  res.json({ report });
});

// GET /api/reports/:interviewId
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ interview: req.params.interviewId, user: req.user._id });
  if (!report) return res.status(404).json({ error: "Report not found" });

  // The answer score is stored on each response as a percentage. Expose it as
  // a simple 0-10 mark so the report can show a question-wise breakdown.
  const responses = await Response.find({ interview: report.interview })
    .populate("question", "order text")
    .sort({ createdAt: 1 });
  const questionMarks = responses.map((response, index) => ({
    question: `Q${response.question?.order ?? index + 1}`,
    marks: Math.round((Math.max(0, Math.min(100, Number(response.score) || 0)) / 10) * 10) / 10,
  }));

  res.json({ report: { ...report.toObject(), questionMarks } });
});

// GET /api/reports/:interviewId/download
const downloadReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ interview: req.params.interviewId, user: req.user._id });
  if (!report || !report.pdfPath) return res.status(404).json({ error: "PDF not available" });

  const filename = path.basename(report.pdfPath);
  res.download(path.join(REPORTS_DIR, filename));
});

module.exports = { finishInterview, getReport, downloadReport };
