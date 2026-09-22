const path = require("path");
const ResumeProfile = require("../../models/ResumeProfile");
const aiService = require("../ai/aiService");
const { extractResumeText } = require("./resumeExtractor");
const { collectCategoryReports } = require("./placementGenerator");

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

/**
 * Parse an uploaded resume file and store the structured profile for a user.
 * @param {string} userId
 * @param {string} publicPath  e.g. "/uploads/123.pdf"
 */
async function ingestResume(userId, publicPath) {
  const absPath = path.join(UPLOADS_DIR, path.basename(publicPath));
  const resumeText = await extractResumeText(absPath);

  const parsed = await aiService.parseResume({ resumeText });

  const profile = await ResumeProfile.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      resumeFile: publicPath,
      rawText: resumeText.slice(0, 4000),
      skills: parsed.skills || [],
      programmingLanguages: parsed.programmingLanguages || [],
      frameworks: parsed.frameworks || [],
      databases: parsed.databases || [],
      coreCsSubjects: parsed.coreCsSubjects || [],
      projects: parsed.projects || [],
      experience: parsed.experience || [],
      certifications: parsed.certifications || [],
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
    matchScore: result.matchScore || 0,
    verifiedSkills: result.verifiedSkills || [],
    unverifiedSkills: result.unverifiedSkills || [],
    improvementSkills: result.improvementSkills || [],
    missingAreas: result.missingAreas || [],
    suggestions: result.suggestions || [],
    summary: result.summary || "",
    generatedAt: new Date(),
  };
  await profile.save();

  return profile;
}

module.exports = { ingestResume, analyzeResume };
