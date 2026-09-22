const mongoose = require("mongoose");

const resumeProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    resumeFile: { type: String, default: null },     // /uploads/xxxx.pdf
    rawText: { type: String, default: "" },          // extracted plain text (truncated)
    skills: [{ type: String }],
    programmingLanguages: [{ type: String }],
    frameworks: [{ type: String }],
    databases: [{ type: String }],
    coreCsSubjects: [{ type: String }],
    projects: [{ type: String }],
    experience: [{ type: String }],
    certifications: [{ type: String }],

    // Latest resume-vs-interview analysis (regenerated on demand)
    analysis: {
      matchScore: { type: Number, default: 0 },      // 0-100
      verifiedSkills: [{ type: String }],
      unverifiedSkills: [{ type: String }],
      improvementSkills: [{ type: String }],
      missingAreas: [{ type: String }],
      suggestions: [{ type: String }],
      summary: { type: String, default: "" },
      generatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResumeProfile", resumeProfileSchema);
