const path = require("path");
const PlacementReport = require("../models/PlacementReport");
const { generatePlacementReport, collectCategoryReports, REPORTS_DIR } =
  require("../services/report/placementGenerator");
const { asyncHandler } = require("../utils/asyncHandler");

// GET /api/placement/eligibility -> how many categories completed
const getEligibility = asyncHandler(async (req, res) => {
  const categoryReports = await collectCategoryReports(req.user._id);
  res.json({
    completedCount: categoryReports.length,
    completedCategories: categoryReports.map((c) => c.category),
    eligible: categoryReports.length >= 2,
  });
});

// POST /api/placement/generate -> build combined weighted report
const generate = asyncHandler(async (req, res) => {
  const report = await generatePlacementReport(req.user._id);
  res.json({ report });
});

// GET /api/placement -> latest stored placement report
const getPlacement = asyncHandler(async (req, res) => {
  const report = await PlacementReport.findOne({ user: req.user._id });
  if (!report) return res.status(404).json({ error: "No placement report yet. Generate one first." });
  res.json({ report });
});

// GET /api/placement/download
const downloadPlacement = asyncHandler(async (req, res) => {
  const report = await PlacementReport.findOne({ user: req.user._id });
  if (!report || !report.pdfPath) return res.status(404).json({ error: "PDF not available" });
  res.download(path.join(REPORTS_DIR, path.basename(report.pdfPath)));
});

module.exports = { getEligibility, generate, getPlacement, downloadPlacement };
