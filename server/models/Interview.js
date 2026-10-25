const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["hr", "dsa", "core-cs", "web-dev", "system-design", "adaptive-web-system"],
      required: true,
    },
    role: { type: String, required: true },
    experience: { type: String, default: "0-1 years" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    durationMinutes: { type: Number, default: 15 },
    questionCount: { type: Number, default: 20 },
    programmingLanguage: { type: String, default: "javascript" },
    resumeFile: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "not_started",
        "in_progress",
        "grace_period",
        "completed",
        "RESUME_PROCESSING",
        "SKILL_REVIEW",
        "READY_TO_START",
        "ANSWER_SUBMITTED",
        "EVALUATING",
        "GENERATING_QUESTION",
        "FINALIZING",
        "FAILED",
      ],
      default: "not_started",
    },
    currentQuestionIndex: { type: Number, default: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },

    // Adaptive Web Development + System Design Round fields
    isAdaptive: { type: Boolean, default: false },
    initialAdaptiveScore: { type: Number, default: 0.5 },
    currentAdaptiveScore: { type: Number, default: 0.5 },
    scoringAlpha: { type: Number, default: 0.35 },
    projectContext: {
      selectedProject: { type: String, default: "" },
      projects: [
        {
          title: { type: String, default: "" },
          description: { type: String, default: "" },
          technologies: [{ type: String }],
          frontendArchitecture: { type: String, default: "" },
          backendArchitecture: { type: String, default: "" },
          databases: [{ type: String }],
          apisAndIntegrations: [{ type: String }],
          auth: { type: String, default: "" },
          keyDecisions: { type: String, default: "" },
          scalabilityAndPerformance: { type: String, default: "" },
          source: { type: String, enum: ["resume", "user_edit", "user_added"], default: "resume" },
        },
      ],
      skills: [{ type: String }],
      technologies: [{ type: String }],
    },
    reviewStatus: {
      type: String,
      enum: ["pending", "in_review", "confirmed", "expired", "skipped"],
      default: "pending",
    },
    reviewStartedAt: { type: Date },
    reviewDeadline: { type: Date },
    interviewDeadline: { type: Date },
    answerTimeLimitSeconds: { type: Number, default: 120 },
    backendProcessingLimitSeconds: { type: Number, default: 60 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);
