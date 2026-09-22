const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    answerText: { type: String, default: "" },
    code: { type: String, default: "" },
    language: { type: String, default: "" },
    score: { type: Number, default: 0 },
    evaluation: {
      correctness: { type: Number, default: 0 },
      clarity: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
      notes: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// A question can only be answered once. This also protects the interview
// flow when a client retries a request after a network interruption.
responseSchema.index({ interview: 1, question: 1 }, { unique: true });

module.exports = mongoose.model("Response", responseSchema);
