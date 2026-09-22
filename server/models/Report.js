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
    },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestions: [{ type: String }],
    quotedMoments: [quotedMomentSchema],
    summary: { type: String, default: "" },
    pdfPath: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
