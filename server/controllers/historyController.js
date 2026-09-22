const Interview = require("../models/Interview");
const Report = require("../models/Report");
const { asyncHandler } = require("../utils/asyncHandler");

// GET /api/history
const getHistory = asyncHandler(async (req, res) => {
  const interviews = await Interview.find({ user: req.user._id, status: "completed" })
    .sort({ completedAt: -1 })
    .lean();

  const reports = await Report.find({ user: req.user._id }).lean();
  const reportByInterview = Object.fromEntries(reports.map((r) => [String(r.interview), r]));

  const history = interviews.map((i) => ({
    interview: i,
    report: reportByInterview[String(i._id)] || null,
  }));

  res.json({ history });
});

// GET /api/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
  const recent = await Interview.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);
  res.json({
    stats: req.user.stats,
    recentInterviews: recent,
  });
});

module.exports = { getHistory, getDashboardStats };
