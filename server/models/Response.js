const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    answerText: { type: String, default: "" },
    code: { type: String, default: "" },
    language: { type: String, default: "" },
    score: { type: Number, default: 0 },
    // Adaptive Web Development + System Design Round detailed fields
    answerScore: { type: Number, default: 0 }, // 0.0 - 1.0 normalized
    previousAdaptiveScore: { type: Number, default: 0.5 },
    updatedAdaptiveScore: { type: Number, default: 0.5 },
    evaluationStatus: {
      type: String,
      enum: ["pending", "evaluating", "completed", "failed"],
      default: "completed",
    },
    answerSubmittedAt: { type: Date, default: Date.now },
    evaluationCompletedAt: { type: Date },
    evaluation: {
      correctness: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
      notes: { type: String, default: "" },
      // Structured 7-dimension scores (0-100 or 0-1)
      dimensions: {
        technicalCorrectness: { type: Number, default: 0 },
        conceptualUnderstanding: { type: Number, default: 0 },
        projectRelevance: { type: Number, default: 0 },
        depthOfExplanation: { type: Number, default: 0 },
        architecturalReasoning: { type: Number, default: 0 },
        practicalImplementation: { type: Number, default: 0 },
        tradeoffAnalysis: { type: Number, default: 0 },
      },
      strengths: [{ type: String }],
      missingConcepts: [{ type: String }],
      technicalInaccuracies: [{ type: String }],
      rationale: { type: String, default: "" },
      recommendedFollowUps: [{ type: String }],
    },
  },
  { timestamps: true }
);

// A question can only be answered once. This also protects the interview
// flow when a client retries a request after a network interruption.
responseSchema.index({ interview: 1, question: 1 }, { unique: true });

module.exports = mongoose.model("Response", responseSchema);
