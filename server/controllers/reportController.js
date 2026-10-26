const path = require("path");
const Report = require("../models/Report");
const Interview = require("../models/Interview");
const Response = require("../models/Response");
const { generateReport, REPORTS_DIR } = require("../services/report/reportGenerator");
const { finalizeAdaptiveReport } = require("../services/interview/adaptiveEngine");
const { asyncHandler } = require("../utils/asyncHandler");

// POST /api/interviews/:id/finish -> triggers bounded finalization workflow
const finishInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
  if (!interview) return res.status(404).json({ error: "Interview not found" });

  // Idempotency: if report already finalized, return it immediately
  const existingReport = await Report.findOne({ interview: interview._id });
  if (existingReport && ["complete", "degraded"].includes(existingReport.generationStatus)) {
    return res.json({ report: existingReport });
  }

  let report;
  if (interview.isAdaptive || interview.category === "adaptive-web-system") {
    report = await finalizeAdaptiveReport(interview._id);
  } else {
    report = await generateReport(interview._id);
  }

  res.json({ report });
});

// GET /api/reports/:interviewId
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ interview: req.params.interviewId, user: req.user._id });
  if (!report) return res.status(404).json({ error: "Report not found" });

  const responses = await Response.find({ interview: report.interview })
    .populate({
      path: "question",
      select: "order text questionCategory actualDifficulty topic bankQuestion isCoding",
      populate: { path: "bankQuestion", select: "difficulty topic" },
    })
    .sort({ createdAt: 1 });

  const Interview = require("../models/Interview");
  const interviewDoc = await Interview.findById(report.interview);

  const questionMarks = responses.map((response, index) => {
    const rawScore = Number(response.score) || 0;
    const storedPerf = Number(response.evaluation?.performanceScore);
    const marks = Number.isFinite(storedPerf) && storedPerf > 0
      ? storedPerf
      : Math.round((Math.max(0, Math.min(100, rawScore)) / 10) * 10) / 10;
    return {
      question: `Q${response.question?.order ?? index + 1}`,
      marks,
      classification: response.answerClassification || "UNKNOWN",
      category: response.question?.questionCategory || "General",
    };
  });

    const isAdaptiveRound = !!(interviewDoc?.isAdaptive || interviewDoc?.category === "adaptive-web-system");
    const { computeAdaptiveTransition, getInitialAdaptiveScore } = require("../services/interview/adaptiveService");
    const initAdaptive = report.initialAdaptiveScore ?? (interviewDoc?.initialAdaptiveScore || getInitialAdaptiveScore(interviewDoc?.difficulty));
    let runningAdaptive = initAdaptive;

    const questionReviews = responses.map((res) => {
      const q = res.question || {};
      const evalData = res.evaluation || {};
      const adaptData = res.adaptiveScoring || {};
      const rawScore = Number(res.score) || 0;
      const storedPerf = Number(evalData.performanceScore);
      const perfScore = Number.isFinite(storedPerf) && storedPerf > 0
        ? storedPerf
        : Math.round((Math.max(0, Math.min(100, rawScore)) / 10) * 10) / 10;

      const isDefaultSchemaEval = evalData.quality === "average" && (!storedPerf || storedPerf === 0) && rawScore > 0;
      const quality = !isDefaultSchemaEval && evalData.quality
        ? evalData.quality
        : (perfScore >= 9 ? "excellent" : perfScore >= 7 ? "good" : perfScore >= 5 ? "average" : perfScore >= 3 ? "weak" : "incorrect");
      const correctness = !isDefaultSchemaEval && evalData.correctnessAssessment
        ? evalData.correctnessAssessment
        : (perfScore >= 9 ? "fully_correct" : perfScore >= 7 ? "mostly_correct" : perfScore >= 5 ? "partially_correct" : "incorrect");

      // Resolve adaptive scoring either from stored document or by sequential simulation
      let scoreBefore, scoreChange, scoreAfter, changeReason, nextTargetDifficulty;
      if (typeof adaptData.scoreBefore === "number" && typeof adaptData.scoreAfter === "number" && adaptData.scoreBefore !== adaptData.scoreAfter) {
        scoreBefore = adaptData.scoreBefore;
        scoreChange = adaptData.scoreChange;
        scoreAfter = adaptData.scoreAfter;
        changeReason = adaptData.changeReason;
        nextTargetDifficulty = adaptData.nextTargetDifficulty;
        runningAdaptive = scoreAfter;
      } else {
        const transition = computeAdaptiveTransition({
          currentScore: runningAdaptive,
          quality,
          isUnanswered: res.answerStatus === "unanswered",
        });
        scoreBefore = transition.scoreBefore;
        scoreChange = transition.scoreChange;
        scoreAfter = transition.scoreAfter;
        changeReason = transition.changeReason;
        nextTargetDifficulty = transition.nextTargetDifficulty;
        runningAdaptive = scoreAfter;
      }

      const questionDiff = q.actualDifficulty || q.bankQuestion?.difficulty || "easy";

      return {
        question_id: String(q._id || res.question),
        order: q.order ?? 0,
        question: q.text || "",
        topic: q.topic || q.bankQuestion?.topic || "General",
        difficulty: questionDiff,
        selection_reason: q.selectionReason || "",
        answer_status: res.answerStatus || "answered",
        user_answer: res.answerText || res.code || "",
        category: q.questionCategory || "General",
        classification: res.answerClassification || "UNKNOWN",
        projectReference: q.projectReference || "",
        evaluation: {
          performance_score: perfScore,
          max_performance_score: evalData.maxPerformanceScore || 10,
          quality,
          correctness,
          dimensions: evalData.dimensions || {},
          strengths: evalData.strengths || [],
          missing_points: evalData.missingPoints || evalData.missingConcepts || [],
          important_concepts: evalData.importantConcepts || evalData.recommendedFollowUps || [],
          explanation: evalData.explanation || evalData.rationale || evalData.notes || "",
          improvement_suggestions: evalData.improvementSuggestions || [],
          raw_correctness: evalData.correctness ?? Math.round(perfScore * 10),
          raw_clarity: evalData.clarity ?? 80,
          raw_confidence: evalData.confidence ?? 80,
        },
        adaptive_scoring: {
          score_before: isAdaptiveRound ? (res.previousAdaptiveScore ?? scoreBefore) : scoreBefore,
          score_change: isAdaptiveRound ? Number(((res.updatedAdaptiveScore ?? 0) - (res.previousAdaptiveScore ?? 0)).toFixed(2)) : scoreChange,
          score_after: isAdaptiveRound ? (res.updatedAdaptiveScore ?? scoreAfter) : scoreAfter,
          change_reason: changeReason,
          next_target_difficulty: nextTargetDifficulty,
        },
      };
    });

  // Calculate dynamic metrics so reports generated previously or missing fields display perfectly
  const totalQuestions = questionReviews.length;
  const answeredQuestions = questionReviews.filter((r) => r.answer_status === "answered").length;
  const unansweredQuestions = totalQuestions - answeredQuestions;

  let totalPerformanceScore = 0;
  const maxPerformanceScore = totalQuestions * 10;
  const topicMap = new Map();
  const diffMap = new Map();

  for (const qr of questionReviews) {
    const pts = qr.evaluation.performance_score;
    totalPerformanceScore += pts;

    const topic = qr.topic || "General";
    if (!topicMap.has(topic)) topicMap.set(topic, { count: 0, total: 0 });
    const tEntry = topicMap.get(topic);
    tEntry.count += 1;
    tEntry.total += pts;

    const diff = qr.difficulty || "medium";
    if (!diffMap.has(diff)) diffMap.set(diff, { count: 0, total: 0 });
    const dEntry = diffMap.get(diff);
    dEntry.count += 1;
    dEntry.total += pts;
  }

  const topicPerformance = report.topicPerformance && report.topicPerformance.length > 0
    ? report.topicPerformance
    : Array.from(topicMap.entries()).map(([topic, data]) => {
        const avg = Math.round((data.total / (data.count * 10)) * 100);
        let assessment = "";
        if (data.count < 2) {
          assessment = `Evidence from ${data.count} question (average score: ${avg}%).`;
        } else if (avg >= 75) {
          assessment = `Strong proficiency across ${data.count} questions (average score: ${avg}%).`;
        } else if (avg <= 50) {
          assessment = `Needs practice across ${data.count} questions (average score: ${avg}%).`;
        } else {
          assessment = `Consistent performance across ${data.count} questions (average score: ${avg}%).`;
        }
        return { topic, count: data.count, averageScore: avg, assessment };
      });

  const difficultyPerformance = report.difficultyPerformance && report.difficultyPerformance.length > 0
    ? report.difficultyPerformance
    : Array.from(diffMap.entries()).map(([difficulty, data]) => ({
        difficulty,
        count: data.count,
        averageScore: Math.round((data.total / (data.count * 10)) * 100),
      }));

  const percentageScore = maxPerformanceScore > 0
    ? Math.round((totalPerformanceScore / maxPerformanceScore) * 100)
    : (report.scores?.overall || 0);

  const initialAdaptiveScore = report.initialAdaptiveScore ?? initAdaptive;
  const finalAdaptiveScore = (typeof report.finalAdaptiveScore === "number" && report.finalAdaptiveScore !== report.initialAdaptiveScore)
    ? report.finalAdaptiveScore
    : (runningAdaptive || interviewDoc?.currentAdaptiveScore || initialAdaptiveScore);

  // Compute calculated technical score fallback from question marks/evaluations
  const computedTechnical = answeredQuestions > 0
    ? Math.round((totalPerformanceScore / (answeredQuestions * 10)) * 100)
    : percentageScore;

  const scores = {
    ...report.scores?.toObject?.() || report.scores || {},
  };
  if (!scores.technical || scores.technical === 0) {
    scores.technical = computedTechnical;
  }
  if (!scores.technicalCorrectness || scores.technicalCorrectness === 0) {
    scores.technicalCorrectness = computedTechnical;
  }
  if (!scores.overall || scores.overall === 0) {
    scores.overall = percentageScore;
  }

  let adaptiveDetails = report.adaptiveDetails;
  if (isAdaptiveRound) {
    // Determine the most accurate final adaptive score from last response or interviewDoc
    const lastAdaptiveResponse = [...responses].reverse().find((r) => typeof r.updatedAdaptiveScore === "number");
    const lastAdaptiveScore = lastAdaptiveResponse
      ? lastAdaptiveResponse.updatedAdaptiveScore
      : (typeof interviewDoc?.currentAdaptiveScore === "number" ? interviewDoc.currentAdaptiveScore : (report.adaptiveDetails?.finalAdaptiveScore ?? 0.5));

    const initialScore = report.adaptiveDetails?.initialAdaptiveScore ?? (interviewDoc?.initialAdaptiveScore ?? 0.5);

    adaptiveDetails = {
      ...report.adaptiveDetails?.toObject?.() || report.adaptiveDetails || {},
      initialAdaptiveScore: initialScore,
      finalAdaptiveScore: lastAdaptiveScore,
    };
  }

  res.json({
    report: {
      ...report.toObject(),
      scores,
      adaptiveDetails,
      interviewCategory: interviewDoc?.category || report.category,
      interviewStatus: interviewDoc?.status || (report.terminationReason ? "TERMINATED_INVALID_ANSWERS" : "completed"),
      terminationReason: report.terminationReason || interviewDoc?.terminationReason || null,
      isAdaptiveRound: !!(interviewDoc?.isAdaptive || interviewDoc?.category === "adaptive-web-system"),
      role: interviewDoc?.role,
      questionMarks,
      questionReviews,
      totalQuestions: report.totalQuestions || totalQuestions,
      answeredQuestions: report.answeredQuestions || answeredQuestions,
      unansweredQuestions: report.unansweredQuestions ?? unansweredQuestions,
      totalPerformanceScore: report.totalPerformanceScore || Math.round(totalPerformanceScore * 10) / 10,
      maxPerformanceScore: report.maxPerformanceScore || maxPerformanceScore,
      percentageScore: report.percentageScore || percentageScore,
      initialAdaptiveScore,
      finalAdaptiveScore: isAdaptiveRound ? (adaptiveDetails?.finalAdaptiveScore ?? finalAdaptiveScore) : finalAdaptiveScore,
      topicPerformance,
      difficultyPerformance,
      preparationAssessment: report.preparationAssessment || `Candidate achieved ${percentageScore}% performance across ${totalQuestions} questions with an adaptive progression of ${initialAdaptiveScore} ➔ ${finalAdaptiveScore}/10.`,
    },
  });
});

// GET /api/reports/:interviewId/download
const downloadReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ interview: req.params.interviewId, user: req.user._id });
  if (!report || !report.pdfPath) return res.status(404).json({ error: "PDF not available" });

  const filename = path.basename(report.pdfPath);
  res.download(path.join(REPORTS_DIR, filename));
});

module.exports = { finishInterview, getReport, downloadReport };
