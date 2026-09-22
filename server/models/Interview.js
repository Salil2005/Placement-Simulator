const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["hr", "dsa", "core-cs", "web-dev", "system-design"],
      required: true,
    },
    role: { type: String, required: true },
    experience: { type: String, default: "0-1 years" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    questionCount: { type: Number, default: 5 },
    programmingLanguage: { type: String, default: "javascript" },
    resumeFile: { type: String, default: null },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    currentQuestionIndex: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);
