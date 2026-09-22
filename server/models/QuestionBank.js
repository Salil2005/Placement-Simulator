const mongoose = require("mongoose");

const QUESTION_CATEGORIES = ["hr", "dsa", "core-cs", "web-dev", "system-design"];

/**
 * Reusable, curated interview questions. These records are deliberately
 * separate from Question, whose records are the immutable per-interview
 * transcript/history entries shown to the candidate.
 */
const questionBankSchema = new mongoose.Schema(
  {
    category: { type: String, enum: QUESTION_CATEGORIES, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    topic: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Supports the category/difficulty lookup used when an interview starts.
questionBankSchema.index({ category: 1, difficulty: 1, active: 1 });
// Makes startup seeding idempotent and prevents duplicate questions.
questionBankSchema.index({ category: 1, text: 1 }, { unique: true });

module.exports = mongoose.model("QuestionBank", questionBankSchema);
