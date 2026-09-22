const mongoose = require("mongoose");

const categoryScoreSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },   // hr | dsa | core-cs | web-dev | system-design
    score: { type: Number, required: true },      // that category's overall score
    weight: { type: Number, required: true },      // normalized weight actually used (0-1)
    status: { type: String, default: "" },         // Excellent | Good | Needs Improvement
  },
  { _id: false }
);

const placementReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    readinessScore: { type: Number, required: true },       // final weighted score 0-100
    readinessLevel: { type: String, required: true },        // Outstanding | Placement Ready | ...
    completedCategories: [{ type: String }],
    categoryScores: [categoryScoreSchema],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    consistentSkills: [{ type: String }],
    improvementSkills: [{ type: String }],
    improvementPriority: [{ type: String }],
    recommendedCompanies: [{ type: String }],
    technicalSuccess: { type: String, default: "" },
    hrSuccess: { type: String, default: "" },
    careerSummary: { type: String, default: "" },
    finalRecommendation: { type: String, default: "" },
    pdfPath: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlacementReport", placementReportSchema);
