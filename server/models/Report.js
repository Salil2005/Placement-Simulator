const mongoose = require("mongoose");

const quotedMomentSchema = new mongoose.Schema(
  {
    speaker: { type: String, enum: ["ai", "user"] },
    quote: String,
    why: String,
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scores: {
      overall: { type: Number, required: true },
      technical: { type: Number, required: true },
      communication: { type: Number, required: true },
      confidence: { type: Number, required: true },
      problemSolving: { type: Number, required: true },
      coding: { type: Number, default: 0 },
      // Adaptive round specific scores
      webDevelopment: { type: Number, default: 0 },
      systemDesign: { type: Number, default: 0 },
      conceptualUnderstanding: { type: Number, default: 0 },
      technicalCorrectness: { type: Number, default: 0 },
      projectOwnership: { type: Number, default: 0 },
      architecturalReasoning: { type: Number, default: 0 },
    },
    // Adaptive metadata
    adaptiveDetails: {
      projectsDiscussed: [{ type: String }],
      totalQuestionsAsked: { type: Number, default: 0 },
      evaluatedAnswersCount: { type: Number, default: 0 },
      unansweredCount: { type: Number, default: 0 },
      invalidAnswerCount: { type: Number, default: 0 },
      initialAdaptiveScore: { type: Number, default: 0.5 },
      finalAdaptiveScore: { type: Number, default: 0.5 },
      knowledgeGaps: [{ type: String }],
      misconceptions: [{ type: String }],
      areasForImprovement: [{ type: String }],
      interviewerSummary: { type: String, default: "" },
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestions: [{ type: String }],
    quotedMoments: [quotedMomentSchema],
    summary: { type: String, default: "" },
    pdfPath: { type: String, default: null },

    // Finalization tracking
    generationStatus: {
      type: String,
      enum: ["pending", "generating", "complete", "degraded", "failed"],
      default: "pending",
    },
    generationError: { type: String, default: null },
    generatedAt: { type: Date, default: null },

    // Termination reason if interview was cut short
    terminationReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
