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

    // Adaptive Web Development + System Design Round metadata
    questionCategory: {
      type: String,
      enum: ["Project Walkthrough", "Web Development", "System Design", "General"],
      default: "General",
    },
    difficulty: { type: String, default: "medium" },
    projectReference: { type: String, default: "" },
    targetCompetencyLevel: { type: String, default: "" },

    // Follow-up chain tracking
    // How deep is this question in a follow-up chain on the same concept?
    // 0 = original question, 1 = first follow-up, 2 = second follow-up, etc.
    followUpDepth: { type: Number, default: 0 },

    // Reference to the question this is a follow-up to (if applicable)
    parentQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", default: null },

    // True if this question is a retry of the same concept (after a gibberish answer)
    isRetryQuestion: { type: Boolean, default: false },

    // The next action the AI decided when generating this question
    nextAction: {
      type: String,
      enum: ["FOLLOW_UP", "PROBE", "DEEPEN", "SWITCH_PROJECT", "CLOSE", "RETRY_SAME_CONCEPT", "NEW_TOPIC"],
      default: "NEW_TOPIC",
    },
  },
  { timestamps: true }
);

questionSchema.index({ interview: 1, bankQuestion: 1 });

module.exports = mongoose.model("Question", questionSchema);
