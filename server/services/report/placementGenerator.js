const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const Report = require("../../models/Report");
const Interview = require("../../models/Interview");
const PlacementReport = require("../../models/PlacementReport");
const aiService = require("../ai/aiService");
const {
  CATEGORY_LABELS,
  readinessLevel,
  successBand,
  recommendedCompanies,
  computeWeightedScore,
} = require("./placementConfig");

const REPORTS_DIR = path.join(__dirname, "..", "..", "reports");
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

/**
 * Collect the latest completed report per interview category for a user.
 * Returns an array of { category, scores, strengths, weaknesses, suggestions, summary }.
 */
async function collectCategoryReports(userId) {
  const interviews = await Interview.find({ user: userId, status: "completed" }).lean();
  const interviewById = Object.fromEntries(interviews.map((i) => [String(i._id), i]));

  const reports = await Report.find({ user: userId }).sort({ createdAt: -1 }).lean();

  const latestByCategory = {};
  for (const r of reports) {
    const iv = interviewById[String(r.interview)];
    if (!iv) continue;
    if (!latestByCategory[iv.category]) {
      latestByCategory[iv.category] = {
        category: iv.category,
        scores: r.scores,
        strengths: r.strengths,
        weaknesses: r.weaknesses,
        suggestions: r.suggestions,
        summary: r.summary,
      };
    }
  }
  return Object.values(latestByCategory);
}

/**
 * Generate (or regenerate) the combined placement readiness report for a user.
 * Requires at least two completed categories.
 */
async function generatePlacementReport(userId) {
  const categoryReports = await collectCategoryReports(userId);

  if (categoryReports.length < 2) {
    const err = new Error(
      "Complete at least two interview categories to generate the Overall Placement Readiness Report."
    );
    err.statusCode = 400;
    throw err;
  }

  // 1. Weighted score with automatic normalization over completed categories.
  const completed = categoryReports.map((c) => ({ category: c.category, score: c.scores.overall }));
  const { readinessScore, categoryScores } = computeWeightedScore(completed);
  const level = readinessLevel(readinessScore);

  // 2. AI holistic analysis.
  const ai = await aiService.generatePlacementAnalysis({
    readinessScore,
    readinessLevel: level,
    categoryReports,
  });

  // 3. Persist (one placement report per user, upserted).
  const doc = await PlacementReport.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      readinessScore,
      readinessLevel: level,
      completedCategories: categoryReports.map((c) => c.category),
      categoryScores,
      strengths: ai.strengths || [],
      weaknesses: ai.weaknesses || [],
      consistentSkills: ai.consistentSkills || [],
      improvementSkills: ai.improvementSkills || [],
      improvementPriority: ai.improvementPriority || [],
      recommendedCompanies: recommendedCompanies(readinessScore),
      technicalSuccess: successBand(readinessScore),
      hrSuccess: successBand(
        (categoryReports.find((c) => c.category === "hr") || {}).scores?.overall ?? readinessScore
      ),
      careerSummary: ai.careerSummary || "",
      finalRecommendation: ai.finalRecommendation || "",
    },
    { upsert: true, new: true }
  );

  const pdfPath = await renderPlacementPdf(doc);
  doc.pdfPath = pdfPath;
  await doc.save();

  return doc;
}

function renderPlacementPdf(report) {
  return new Promise((resolve, reject) => {
    const filename = `placement-${report.user}.pdf`;
    const filePath = path.join(REPORTS_DIR, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(22).fillColor("#4f46e5").text("Placement Simulator - Readiness Report");
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor("black").text(`Readiness Score: ${report.readinessScore}/100`);
    doc.fontSize(13).fillColor("#4f46e5").text(`Status: ${report.readinessLevel}`);
    doc.moveDown();

    doc.fontSize(16).fillColor("#4f46e5").text("Category Comparison");
    doc.fontSize(12).fillColor("black");
    report.categoryScores.forEach((c) =>
      doc.text(`${CATEGORY_LABELS[c.category] || c.category}: ${c.score}/100  (${c.status})`)
    );
    doc.moveDown();

    section(doc, "Strengths Across All Interviews", report.strengths);
    section(doc, "Weaknesses Across All Interviews", report.weaknesses);
    section(doc, "Most Consistent Skills", report.consistentSkills);
    section(doc, "Skills Requiring Improvement", report.improvementSkills);
    section(doc, "Improvement Priority", report.improvementPriority);

    doc.moveDown();
    doc.fontSize(16).fillColor("#4f46e5").text("Placement Prediction");
    doc.fontSize(12).fillColor("black");
    doc.text(`Estimated Technical Interview Success: ${report.technicalSuccess}`);
    doc.text(`Estimated HR Interview Success: ${report.hrSuccess}`);
    doc.text(`Recommended: ${report.recommendedCompanies.join(", ")}`);
    doc.moveDown();

    doc.fontSize(16).fillColor("#4f46e5").text("AI Career Readiness Summary");
    doc.fontSize(12).fillColor("black").text(report.careerSummary || "");
    doc.moveDown();
    doc.fontSize(16).fillColor("#4f46e5").text("Final Recommendation");
    doc.fontSize(12).fillColor("black").text(report.finalRecommendation || "");

    doc.end();
    stream.on("finish", () => resolve(`/reports/${filename}`));
    stream.on("error", reject);
  });
}

function section(doc, title, items) {
  doc.moveDown(0.5);
  doc.fontSize(14).fillColor("#4f46e5").text(title);
  doc.fontSize(12).fillColor("black");
  (items || []).forEach((s) => doc.text(`- ${s}`));
}

module.exports = { generatePlacementReport, collectCategoryReports, REPORTS_DIR };
