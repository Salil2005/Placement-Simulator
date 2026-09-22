const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", required: true },
    text: { type: String, required: true },
    // Source record in the reusable question bank. Keeping this reference lets
    // selection exclude questions already shown in this interview.
    bankQuestion: { type: mongoose.Schema.Types.ObjectId, ref: "QuestionBank", default: null },
    topic: { type: String, default: "" },
    order: { type: Number, required: true },
    isCoding: { type: Boolean, default: false },
    isFollowUp: { type: Boolean, default: false },
  },
  { timestamps: true }
);

questionSchema.index({ interview: 1, bankQuestion: 1 });

module.exports = mongoose.model("Question", questionSchema);
