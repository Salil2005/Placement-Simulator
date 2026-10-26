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

  const { computeAdaptiveTransition } = require("../interview/adaptiveService");

  // If there are unanswered questions (e.g. time expired or grace period passed), record them explicitly
  let runningAdaptive = interview.currentAdaptiveScore ?? 5;
  for (const unans of unansweredQuestions) {
    const adaptTrans = computeAdaptiveTransition({
      currentScore: runningAdaptive,
      quality: "unanswered",
      isUnanswered: true,
    });
    runningAdaptive = adaptTrans.scoreAfter;

    const unansResponse = await Response.create({
      interview: interviewId,
      question: unans._id,
      answerText: "[Not Answered - Time Expired]",
      score: 0,
      answerStatus: "unanswered",
      evaluation: {
        correctness: 0,
        clarity: 0,
        confidence: 0,
        performanceScore: 0,
        maxPerformanceScore: 10,
        quality: "unanswered",
        correctnessAssessment: "unanswered",
        strengths: [],
        missingPoints: ["No answer was submitted before interview expiration."],
        importantConcepts: ["Complete answers within allotted time."],
        explanation: "Question left unanswered; scored 0 with -2 adaptive difficulty penalty.",
        improvementSuggestions: ["Manage pacing to ensure all questions receive an attempt."],
        notes: "Candidate did not submit an answer before the interview and grace period concluded.",
      },
      adaptiveScoring: {
        scoreBefore: adaptTrans.scoreBefore,
        scoreChange: adaptTrans.scoreChange,
        scoreAfter: adaptTrans.scoreAfter,
        changeReason: adaptTrans.changeReason,
        nextTargetDifficulty: adaptTrans.nextTargetDifficulty,
      },
    });
    responses.push(unansResponse);
  }

  // Update interview final adaptive score
  interview.currentAdaptiveScore = runningAdaptive;
  await interview.save();

  // --- Aggregate Preparation & Performance Metrics ---
  const totalQuestions = allQuestions.length;
  const answeredQuestions = responses.filter((r) => r.answerStatus === "answered").length;
  const unansweredCount = responses.filter((r) => r.answerStatus === "unanswered").length;

  let totalPerformanceScore = 0;
  let maxPerformanceScore = totalQuestions * 10;
  const adaptiveHistory = [];

  // Group by topic and difficulty
  const topicMap = new Map();
  const difficultyMap = new Map();

  for (const res of responses) {
    const qDoc = allQuestions.find((q) => String(q._id) === String(res.question?._id || res.question));
    const perf = res.evaluation?.performanceScore ?? Math.round((res.score || 0) / 10);
    totalPerformanceScore += perf;

    const topic = qDoc?.topic || "General";
    const diff = qDoc?.actualDifficulty || interview.difficulty || "medium";

    // Adaptive history event
    adaptiveHistory.push({
      questionOrder: qDoc?.order ?? 0,
      questionText: qDoc?.text ?? "",
      topic,
      difficulty: diff,
      scoreBefore: res.adaptiveScoring?.scoreBefore ?? 5,
      scoreChange: res.adaptiveScoring?.scoreChange ?? 0,
      scoreAfter: res.adaptiveScoring?.scoreAfter ?? 5,
      changeReason: res.adaptiveScoring?.changeReason ?? "",
    });

    // Topic aggregator
    if (!topicMap.has(topic)) topicMap.set(topic, { count: 0, total: 0 });
    const tEntry = topicMap.get(topic);
    tEntry.count += 1;
    tEntry.total += perf;

    // Difficulty aggregator
    if (!difficultyMap.has(diff)) difficultyMap.set(diff, { count: 0, total: 0 });
    const dEntry = difficultyMap.get(diff);
    dEntry.count += 1;
    dEntry.total += perf;
  }

  // Sort adaptive history chronologically by question order
  adaptiveHistory.sort((a, b) => a.questionOrder - b.questionOrder);

  const percentageScore = maxPerformanceScore > 0
    ? Math.round((totalPerformanceScore / maxPerformanceScore) * 100)
    : 0;

  const topicPerformance = [];
  const strongestAreas = [];
  const areasNeedingImprovement = [];

  for (const [topic, data] of topicMap.entries()) {
    const avg = Math.round((data.total / data.count) * 10); // scale to 0-100%
    let assessment = "";
    if (data.count < 2) {
      assessment = `Limited evidence (${data.count} question tested; scored ${avg}%).`;
    } else if (avg >= 75) {
      assessment = `Strong proficiency (${data.count} questions tested; avg ${avg}%).`;
      strongestAreas.push(`${topic} (${avg}%)`);
    } else if (avg <= 50) {
      assessment = `Needs improvement (${data.count} questions tested; avg ${avg}%).`;
      areasNeedingImprovement.push(`${topic} (${avg}%)`);
    } else {
      assessment = `Moderate proficiency (${data.count} questions tested; avg ${avg}%).`;
    }

    topicPerformance.push({
      topic,
      count: data.count,
      averageScore: avg,
      assessment,
    });
  }

  const difficultyPerformance = [];
  for (const [difficulty, data] of difficultyMap.entries()) {
    const avg = Math.round((data.total / data.count) * 10);
    difficultyPerformance.push({
      difficulty,
      count: data.count,
      averageScore: avg,
    });
  }

  // Evidence-based assessment of preparation
  let preparationAssessment = "";
  if (percentageScore >= 80) {
    preparationAssessment = `Candidate showed strong placement readiness with ${percentageScore}% overall performance across ${totalQuestions} questions, progressing to an adaptive score of ${runningAdaptive}/9.`;
  } else if (percentageScore >= 60) {
    preparationAssessment = `Candidate demonstrated good foundational readiness (${percentageScore}% overall performance) but has noticeable gaps in depth and precision. Adaptive difficulty finalized at ${runningAdaptive}/9.`;
  } else {
    preparationAssessment = `Candidate demonstrated emerging preparation (${percentageScore}% overall performance) with core concept misunderstandings and pacing challenges. Adaptive difficulty finalized at ${runningAdaptive}/9.`;
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
        overall: percentageScore, // Underlying consistent performance percentage
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

      initialAdaptiveScore: interview.initialAdaptiveScore || 5,
      finalAdaptiveScore: runningAdaptive,
      totalQuestions,
      answeredQuestions,
      unansweredQuestions: unansweredCount,
      totalPerformanceScore,
      maxPerformanceScore,
      percentageScore,
      preparationAssessment,
      adaptiveHistory,
      topicPerformance,
      difficultyPerformance,
      strongestAreas,
      areasNeedingImprovement,
    },
    { upsert: true, new: true }
  );

  const pdfPath = await renderPdf(report, interview);
  report.pdfPath = pdfPath;
  await report.save();

  interview.status = "completed";
  interview.completedAt = new Date();
  await interview.save();

  await updateUserStats(interview.user, percentageScore);

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
