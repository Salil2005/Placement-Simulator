const mongoose = require("mongoose");

// Sub-document: one project entry extracted from the resume
const projectSchema = new mongoose.Schema(
  {
    title      : { type: String, default: "" },
    description: { type: String, default: "" }, // verbatim context from resume
  },
  { _id: false }
);

// Sub-document: one work / internship / freelance experience entry
const experienceSchema = new mongoose.Schema(
  {
    role       : { type: String, default: "" },
    company    : { type: String, default: "" },
    description: { type: String, default: "" }, // verbatim responsibilities / achievements
  },
  { _id: false }
);

const resumeProfileSchema = new mongoose.Schema(
  {
    user                : { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    resumeFile          : { type: String, default: null },  // /uploads/xxxx.pdf
    rawText             : { type: String, default: ""   },  // extracted plain text (truncated)

    // Flat string arrays — unchanged
    skills              : [{ type: String }],
    programmingLanguages: [{ type: String }],
    frameworks          : [{ type: String }],
    databases           : [{ type: String }],
    coreCsSubjects      : [{ type: String }],
    certifications      : [{ type: String }],

    // Rich sub-documents — now store full context from the resume
    projects  : [projectSchema],
    experience: [experienceSchema],

    // Latest resume-vs-interview analysis (regenerated on demand)
    analysis: {
      matchScore      : { type: Number, default: 0 },   // 0-100
      verifiedSkills  : [{ type: String }],
      unverifiedSkills: [{ type: String }],
      improvementSkills: [{ type: String }],
      missingAreas    : [{ type: String }],
      suggestions     : [{ type: String }],
      summary         : { type: String, default: "" },
      generatedAt     : { type: Date,   default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResumeProfile", resumeProfileSchema);

