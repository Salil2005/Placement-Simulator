const path = require("path");
const ResumeProfile = require("../../models/ResumeProfile");
const aiService = require("../ai/aiService");
const { extractResumeText } = require("./resumeExtractor");
const { collectCategoryReports } = require("./placementGenerator");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

// ─────────────────────────────────────────────────────────────────────────────
// Normalizers — coerce AI output into the exact schema shape
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a projects entry is always { title, description }.
 * Handles: object with title/description, plain string, or anything else.
 */
function normalizeProject(item) {
  if (item && typeof item === "object") {
    return {
      title      : String(item.title       || item.name || "").trim(),
      description: String(item.description || item.details || "").trim(),
    };
  }
  if (typeof item === "string" && item.trim()) {
    return { title: item.trim(), description: "" };
  }
  return null;
}

/**
 * Ensure an experience entry is always { role, company, description }.
 * Handles: object with role/company/description, plain string, or anything else.
 */
function normalizeExperience(item) {
  if (item && typeof item === "object") {
    return {
      role       : String(item.role        || item.title   || "").trim(),
      company    : String(item.company     || item.org     || "").trim(),
      description: String(item.description || item.details || "").trim(),
    };
  }
  if (typeof item === "string" && item.trim()) {
    return { role: item.trim(), company: "", description: "" };
  }
  return null;
}

/** Safely cast a value to a clean string array. */
function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => v.trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// Public functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an uploaded resume file and store the structured profile for a user.
 * @param {string} userId
 * @param {string} publicPath  e.g. "/uploads/123.pdf"
 */
async function ingestResume(userId, publicPath) {
  const absPath    = path.join(UPLOADS_DIR, path.basename(publicPath));
  const resumeText = await extractResumeText(absPath);

  const parsed = await aiService.parseResume({ resumeText });

  // Normalize every field before touching Mongoose.
  const projects   = (parsed.projects   || []).map(normalizeProject).filter(Boolean);
  const experience = (parsed.experience || []).map(normalizeExperience).filter(Boolean);

  const profile = await ResumeProfile.findOneAndUpdate(
    { user: userId },
    {
      user                : userId,
      resumeFile          : publicPath,
      rawText             : resumeText.slice(0, 4000),
      skills              : toStringArray(parsed.skills),
      programmingLanguages: toStringArray(parsed.programmingLanguages),
      frameworks          : toStringArray(parsed.frameworks),
      databases           : toStringArray(parsed.databases),
      coreCsSubjects      : toStringArray(parsed.coreCsSubjects),
      certifications      : toStringArray(parsed.certifications),
      projects,
      experience,
    },
    { upsert: true, new: true }
  );

  return profile;
}

/**
 * Compare stored resume profile against interview performance and store analysis.
 */
async function analyzeResume(userId) {
  const profile = await ResumeProfile.findOne({ user: userId });
  if (!profile) {
    const err = new Error("Upload a resume first to run Resume Analysis.");
    err.statusCode = 400;
    throw err;
  }

  const categoryReports = await collectCategoryReports(userId);
  if (categoryReports.length < 1) {
    const err = new Error("Complete at least one interview to compare against your resume.");
    err.statusCode = 400;
    throw err;
  }

  const result = await aiService.analyzeResumeVsInterview({
    resumeProfile: profile,
    categoryReports,
  });

  profile.analysis = {
    matchScore       : result.matchScore        || 0,
    verifiedSkills   : result.verifiedSkills    || [],
    unverifiedSkills : result.unverifiedSkills  || [],
    improvementSkills: result.improvementSkills || [],
    missingAreas     : result.missingAreas      || [],
    suggestions      : result.suggestions       || [],
    summary          : result.summary           || "",
    generatedAt      : new Date(),
  };
  await profile.save();

  return profile;
}

module.exports = { ingestResume, analyzeResume };

