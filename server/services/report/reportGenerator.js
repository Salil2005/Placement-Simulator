const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const Interview = require("../../models/Interview");
const Response = require("../../models/Response");
const Question = require("../../models/Question");
const Session = require("../../models/Session");
const Report = require("../../models/Report");
const User = require("../../models/User");
const aiService = require("../ai/aiService");

const REPORTS_DIR = path.join(__dirname, "..", "..", "reports");
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

async function generateReport(interviewId) {
  const interview = await Interview.findById(interviewId);
  if (!interview) throw new Error("Interview not found");

  // Finishing is idempotent: a retry after a slow network request must not
  // regenerate the PDF or inflate the user's aggregate statistics.
  const existingReport = await Report.findOne({ interview: interviewId });
  if (existingReport) return existingReport;

  const [session, responses, allQuestions] = await Promise.all([
    Session.findOne({ interview: interviewId }),
    Response.find({ interview: interviewId }).populate("question"),
    Question.find({ interview: interviewId }).sort({ order: 1 }),
  ]);
  if (!session) {
    const err = new Error("Start the interview before generating a report");
    err.statusCode = 409;
    throw err;
  }

  // Identify questions asked that received no candidate response
  const answeredQuestionIds = new Set(responses.map((r) => String(r.question?._id || r.question)));
  const unansweredQuestions = allQuestions.filter((q) => !answeredQuestionIds.has(String(q._id)));

  // If there are unanswered questions (e.g. time expired or grace period passed), record them with score 0
  for (const unans of unansweredQuestions) {
    const unansResponse = await Response.create({
      interview: interviewId,
      question: unans._id,
      answerText: "[Not Answered - Time Expired]",
      score: 0,
      evaluation: {
        correctness: 0,
        clarity: 0,
        confidence: 0,
        notes: "Candidate did not submit an answer before the interview and grace period concluded.",
      },
    });
    responses.push(unansResponse);
  }

  const result = await aiService.generateFinalReport({
    interview,
    transcript: session.transcript,
    responses,
  });

  const report = await Report.findOneAndUpdate(
    { interview: interviewId },
    {
      interview: interviewId,
      user: interview.user,
      scores: {
        overall: result.overall,
        technical: result.technical,
        communication: result.communication,
        confidence: result.confidence,
        problemSolving: result.problemSolving,
        coding: result.coding || 0,
      },
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      suggestions: result.suggestions || [],
      quotedMoments: result.quotedMoments || [],
      summary: result.summary || "",
    },
    { upsert: true, new: true }
  );

  const pdfPath = await renderPdf(report, interview);
  report.pdfPath = pdfPath;
  await report.save();

  interview.status = "completed";
  interview.completedAt = new Date();
  await interview.save();

  await updateUserStats(interview.user, result.overall);

  return report;
}

async function updateUserStats(userId, latestScore) {
  const user = await User.findById(userId);
  if (!user) return;
  const completedCount = user.stats.totalInterviews + 1;
  const newAverage = Math.round(
    (user.stats.averageScore * user.stats.totalInterviews + latestScore) / completedCount
  );
  user.stats.totalInterviews = completedCount;
  user.stats.averageScore = newAverage;
  user.stats.bestScore = Math.max(user.stats.bestScore, latestScore);
  await user.save();
}

function renderPdf(report, interview) {
  return new Promise((resolve, reject) => {
    const filename = `report-${interview._id}.pdf`;
    const filePath = path.join(REPORTS_DIR, filename);
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(22).fillColor("#4f46e5").text("Placement Simulator - Interview Report", { align: "left" });
    doc.moveDown();
    doc.fontSize(12).fillColor("black").text(`Role: ${interview.role}`);
    doc.text(`Category: ${interview.category}`);
    doc.text(`Difficulty: ${interview.difficulty}`);
    doc.moveDown();

    doc.fontSize(16).fillColor("#4f46e5").text("Scores");
    doc.fontSize(12).fillColor("black");
    Object.entries(report.scores.toObject ? report.scores.toObject() : report.scores).forEach(
      ([key, value]) => doc.text(`${key}: ${value}/100`)
    );

    doc.moveDown();
    doc.fontSize(16).fillColor("#4f46e5").text("Strengths");
    doc.fontSize(12).fillColor("black");
    (report.strengths || []).forEach((s) => doc.text(`- ${s}`));

    doc.moveDown();
    doc.fontSize(16).fillColor("#4f46e5").text("Weaknesses");
    doc.fontSize(12).fillColor("black");
    (report.weaknesses || []).forEach((w) => doc.text(`- ${w}`));

    doc.moveDown();
    doc.fontSize(16).fillColor("#4f46e5").text("Suggestions");
    doc.fontSize(12).fillColor("black");
    (report.suggestions || []).forEach((s) => doc.text(`- ${s}`));

    doc.moveDown();
    doc.fontSize(16).fillColor("#4f46e5").text("Summary");
    doc.fontSize(12).fillColor("black").text(report.summary || "");

    doc.end();
    stream.on("finish", () => resolve(`/reports/${filename}`));
    stream.on("error", reject);
  });
}

module.exports = { generateReport, REPORTS_DIR };
