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

    // Answer quality classification (backend-enforced)
    answerClassification: {
      type: String,
      enum: [
        "RELEVANT",
        "PARTIALLY_RELEVANT",
        "INCORRECT_BUT_RELEVANT",
        "GIBBERISH",
        "NON_RESPONSIVE",
        "ABUSIVE_OR_INAPPROPRIATE",
        "UNKNOWN",
      ],
      default: "UNKNOWN",
    },

    // True if this answer is to a retry question (same concept, different wording)
    isRetryQuestion: { type: Boolean, default: false },

    // Which project this response belongs to
    projectId: { type: String, default: "" },

    answerStatus: { type: String, enum: ["answered", "unanswered"], default: "answered" },
    evaluation: {
      correctness: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
      notes: { type: String, default: "" },

      // Structured 7-dimension scores (0-100) for Web Dev / System Design
      dimensions: {
        technicalCorrectness: { type: Number, default: 0 },
        conceptualUnderstanding: { type: Number, default: 0 },
        projectRelevance: { type: Number, default: 0 },
        depthOfExplanation: { type: Number, default: 0 },
        architecturalReasoning: { type: Number, default: 0 },
        practicalImplementation: { type: Number, default: 0 },
        tradeoffAnalysis: { type: Number, default: 0 },
      },
      missingConcepts: [{ type: String }],
      technicalInaccuracies: [{ type: String }],
      rationale: { type: String, default: "" },
      recommendedFollowUps: [{ type: String }],

      // Structured transparent evaluation for HR, DSA & Core CS
      performanceScore: { type: Number, default: 0 },
      maxPerformanceScore: { type: Number, default: 10 },
      quality: {
        type: String,
        enum: ["excellent", "good", "average", "weak", "incorrect", "unanswered"],
        default: "average",
      },
      correctnessAssessment: {
        type: String,
        enum: ["fully_correct", "mostly_correct", "partially_correct", "mostly_incorrect", "incorrect", "unanswered"],
        default: "partially_correct",
      },
      strengths: [{ type: String }],
      missingPoints: [{ type: String }],
      importantConcepts: [{ type: String }],
      explanation: { type: String, default: "" },
      improvementSuggestions: [{ type: String }],
    },
    adaptiveScoring: {
      scoreBefore: { type: Number, default: 5 },
      scoreChange: { type: Number, default: 0 },
      scoreAfter: { type: Number, default: 5 },
      changeReason: { type: String, default: "" },
      nextTargetDifficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    },
  },
  { timestamps: true }
);

// A question can only be answered once. This also protects the interview
// flow when a client retries a request after a network interruption.
responseSchema.index({ interview: 1, question: 1 }, { unique: true });

module.exports = mongoose.model("Response", responseSchema);
