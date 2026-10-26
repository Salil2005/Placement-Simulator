import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { interviewService } from "../../services/interviewService.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Loader from "../../components/common/Loader.jsx";
import QuestionMarksPieChart from "../../components/charts/QuestionMarksPieChart.jsx";

export default function Report() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  useEffect(() => {
    interviewService
      .getReport(id)
      .then(({ report }) => setReport(report))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader fullScreen label="Loading your report..." />;

  if (error || !report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-red-500">{error || "Report not found."}</p>
        <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const toggleExpand = (index) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleDownload = async () => {
    try {
      const { data } = await interviewService.downloadReport(id);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "interview-report.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const isAdaptiveRound = Boolean(
    report.interviewCategory === "adaptive-web-system" ||
    (report.isAdaptiveRound && report.interviewCategory !== "dsa" && report.interviewCategory !== "hr" && report.interviewCategory !== "core-cs")
  );

  const isTerminated = Boolean(
    report.terminationReason ||
    report.interviewStatus === "TERMINATED_INVALID_ANSWERS" ||
    report.generationError?.toLowerCase().includes("terminated") ||
    report.summary?.toLowerCase().includes("terminated")
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 space-y-8">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-extrabold tracking-tight">Interview Report & Evaluation</h1>
            {isAdaptiveRound && (
              <Badge color="brand">Adaptive Web Dev + System Design</Badge>
            )}
            {isTerminated && (
              <Badge color="danger">Terminated Early</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAdaptiveRound
              ? "Project-grounded competency evaluation, architectural reasoning, and adaptive progression."
              : "Comprehensive adaptive performance and evidence-based analysis."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleDownload} className="btn-secondary">Download PDF</button>
          <Link to="/placement" className="btn-secondary">Placement Readiness</Link>
          <Link to="/interview/create" className="btn-primary">New Interview</Link>
        </div>
      </div>

      {/* Red Terminated Banner */}
      {isTerminated && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 flex items-start gap-3 animate-fadeIn">
          <span className="text-2xl leading-none">🚫</span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-red-700 dark:text-red-300">
              This interview was terminated because of invalid answers.
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {report.terminationReason === "Two consecutive invalid answers were submitted." || report.terminationReason === "CONSECUTIVE_INVALID_ANSWERS"
                ? "Multiple consecutive responses did not address the questions or fell below acceptable evaluation thresholds. This report reflects your responses prior to termination."
                : (report.terminationReason || "Multiple invalid responses were detected during the session. Performance metrics below are evaluated based on questions attempted before termination.")}
            </p>
          </div>
        </div>
      )}

      {/* Overall Summary Banner */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="text-center p-5">
          <p className="label">Performance Score</p>
          <p className="text-4xl font-extrabold text-brand-600 mt-1">
            {report.percentageScore ?? report.scores?.overall}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {report.totalPerformanceScore ?? (report.questionReviews ? Math.round(report.questionReviews.reduce((acc, q) => acc + (q.evaluation?.performance_score || 0), 0) * 10) / 10 : 0)} / {report.maxPerformanceScore || ((report.totalQuestions || report.questionReviews?.length || 1) * 10)} pts
          </p>
        </Card>

        <Card className="text-center p-5">
          <p className="label">Questions Evaluated</p>
          <p className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">
            {report.totalQuestions || (report.questionReviews?.length || 0)}
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            {report.answeredQuestions ?? (report.questionReviews?.filter(r => r.answer_status === 'answered').length || report.questionReviews?.length || 0)} answered • {report.unansweredQuestions ?? (report.questionReviews?.filter(r => r.answer_status === 'unanswered').length || 0)} skipped
          </p>
        </Card>

        <Card className="text-center p-5">
          <p className="label">Adaptive Score Path</p>
          <p className={`font-extrabold text-purple-600 mt-1 whitespace-nowrap tracking-tight ${isAdaptiveRound ? "text-2xl sm:text-3xl" : "text-4xl"}`}>
            {isAdaptiveRound
              ? `${(report.adaptiveDetails?.initialAdaptiveScore ?? 0.5).toFixed(2)} ➔ ${(report.adaptiveDetails?.finalAdaptiveScore ?? report.finalAdaptiveScore ?? 0.5).toFixed(2)}`
              : `${report.initialAdaptiveScore ?? 5} ➔ ${report.finalAdaptiveScore ?? 5}`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isAdaptiveRound ? "Continuous Scale: 0.00 to 1.00" : "Scale: 1 (Easy) to 10 (Hard)"}
          </p>
        </Card>

        <Card className="text-center p-5">
          <p className="label">{isAdaptiveRound ? "Architectural Depth" : "Technical Depth"}</p>
          <p className="text-4xl font-extrabold text-indigo-600 mt-1">
            {isAdaptiveRound
              ? (report.scores?.technicalCorrectness ?? report.scores?.technical ?? 0)
              : (report.scores?.technical || report.scores?.overall || report.percentageScore || 0)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isAdaptiveRound
              ? `Ownership: ${report.scores?.projectOwnership ?? 0}% • Conceptual: ${report.scores?.conceptualUnderstanding ?? 0}%`
              : `Comm: ${report.scores?.communication ?? 0}% • Conf: ${report.scores?.confidence ?? 0}%`}
          </p>
        </Card>
      </div>

      {/* Preparation Assessment Note (if standard round or populated) */}
      {!isAdaptiveRound && report.preparationAssessment && (
        <Card className="border-l-4 border-l-brand-600 bg-brand-50/40 dark:bg-brand-950/20">
          <h3 className="text-sm font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-1">
            Preparation Assessment
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {report.preparationAssessment}
          </p>
        </Card>
      )}

      {/* Adaptive Web Dev & System Design Dimension Breakdown */}
      {isAdaptiveRound && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Adaptive Competency Dimensions Breakdown
              </h3>
              {report.adaptiveDetails?.projectsDiscussed?.length > 0 && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Project: <strong>{report.adaptiveDetails.projectsDiscussed.join(", ")}</strong>
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-center">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Web Dev</p>
                <p className="text-xl font-bold text-brand-600 mt-1">{report.scores?.webDevelopment ?? 0}%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">System Design</p>
                <p className="text-xl font-bold text-indigo-600 mt-1">{report.scores?.systemDesign ?? 0}%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Technical Correctness</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{report.scores?.technicalCorrectness ?? 0}%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Conceptual Depth</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{report.scores?.conceptualUnderstanding ?? 0}%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Project Ownership</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{report.scores?.projectOwnership ?? 0}%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Architectural Reasoning</p>
                <p className="text-xl font-bold text-purple-600 mt-1">{report.scores?.architecturalReasoning ?? 0}%</p>
              </div>
            </div>

            {report.adaptiveDetails && (
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  <strong>Projects Grounding:</strong> {(report.adaptiveDetails.projectsDiscussed || []).join(", ") || "Candidate Resume Project"}
                </span>
                <span>
                  <strong>Adaptive Trajectory:</strong> {(report.adaptiveDetails.initialAdaptiveScore ?? 0.5).toFixed(2)} → {(report.adaptiveDetails.finalAdaptiveScore ?? 0.5).toFixed(2)}
                </span>
                <span>
                  <strong>Evaluated Questions:</strong> {report.adaptiveDetails.evaluatedAnswersCount ?? 0} / {report.adaptiveDetails.totalQuestionsAsked ?? report.totalQuestions ?? 0}
                </span>
              </div>
            )}
          </Card>

          {(report.adaptiveDetails?.knowledgeGaps?.length > 0 || report.adaptiveDetails?.misconceptions?.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {report.adaptiveDetails.knowledgeGaps?.length > 0 && (
                <Card>
                  <h4 className="mb-2 text-sm font-bold text-amber-600 flex items-center gap-1.5">
                    <span>⚠️</span> Identified Knowledge Gaps
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {report.adaptiveDetails.knowledgeGaps.map((gap, i) => (
                      <li key={i} className="flex gap-1.5"><span>•</span>{gap}</li>
                    ))}
                  </ul>
                </Card>
              )}
              {report.adaptiveDetails.misconceptions?.length > 0 && (
                <Card>
                  <h4 className="mb-2 text-sm font-bold text-red-600 flex items-center gap-1.5">
                    <span>🚫</span> Identified Misconceptions
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {report.adaptiveDetails.misconceptions.map((misc, i) => (
                      <li key={i} className="flex gap-1.5"><span>•</span>{misc}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Non-Adaptive: Topic-Wise & Difficulty Performance Breakdown */}
      {!isAdaptiveRound && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="mb-4 font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
              <span>Topic-Wise Performance</span>
              <span className="text-xs font-normal text-slate-500">Evidence-Based</span>
            </h3>
            {report.topicPerformance?.length > 0 ? (
              <div className="space-y-3">
                {report.topicPerformance.map((tp, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{tp.topic}</span>
                      <span className="text-xs font-bold text-brand-600">{tp.averageScore}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="bg-brand-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, tp.averageScore)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{tp.assessment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Not enough topic data available.</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-4 font-bold text-slate-800 dark:text-slate-100">
              Difficulty-Wise Breakdown
            </h3>
            {report.difficultyPerformance?.length > 0 ? (
              <div className="space-y-4">
                {report.difficultyPerformance.map((dp, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-3 dark:border-slate-800 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Badge color={dp.difficulty === "hard" ? "danger" : dp.difficulty === "easy" ? "neutral" : "brand"}>
                        {dp.difficulty.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-slate-500">({dp.count} questions asked)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-slate-800 dark:text-slate-200">{dp.averageScore}%</span>
                      <p className="text-[10px] text-slate-400">average score</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <QuestionMarksPieChart questionMarks={report.questionMarks || []} />
                </div>
              </div>
            ) : (
              <QuestionMarksPieChart questionMarks={report.questionMarks || []} />
            )}
          </Card>
        </div>
      )}

      {/* Question-By-Question Detailed Review */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Question-by-Question Review</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Expand each card to inspect transparent rubric evaluations, missing points, and adaptive difficulty shifts.
            </p>
          </div>
        </div>

        {(report.questionReviews || []).map((review, idx) => {
          const isExpanded = !!expandedQuestions[idx];
          const isUnanswered = review.answer_status === "unanswered";

          return (
            <Card key={idx} className="overflow-hidden border border-slate-200 dark:border-slate-800 p-0">
              {/* Question Header (Always Visible) */}
              <div
                onClick={() => toggleExpand(idx)}
                className="cursor-pointer p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">Q{review.order + 1}</span>
                    <Badge color="brand">{review.category || review.topic}</Badge>
                    {!isAdaptiveRound && (
                      <Badge color={review.difficulty === "hard" ? "danger" : review.difficulty === "easy" ? "neutral" : "brand"}>
                        {review.difficulty}
                      </Badge>
                    )}
                    {review.projectReference && (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        📁 {review.projectReference}
                      </span>
                    )}
                    {isUnanswered && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                        Unanswered
                      </span>
                    )}
                    <span className="text-xs font-medium text-slate-500">
                      Score: <strong className="text-brand-600">{review.evaluation?.performance_score ?? 0}</strong> / {review.evaluation?.max_performance_score ?? 10}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 pt-1">
                    {review.question}
                  </h4>
                  {review.selection_reason && (
                    <p className="text-xs text-slate-400 italic">
                      Why asked: {review.selection_reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-slate-400 font-mono">
                    {isAdaptiveRound
                      ? `Score: ${typeof review.adaptive_scoring?.score_after === "number" ? review.adaptive_scoring.score_after.toFixed(2) : "0.50"}`
                      : `Adaptive: ${review.adaptive_scoring?.score_before} ➔ ${review.adaptive_scoring?.score_after} (${review.adaptive_scoring?.score_change > 0 ? `+${review.adaptive_scoring?.score_change}` : review.adaptive_scoring?.score_change})`}
                  </span>
                  <button type="button" className="text-xs font-bold text-brand-600 hover:underline">
                    {isExpanded ? "Collapse ▲" : "Details ▼"}
                  </button>
                </div>
              </div>

              {/* Expanded Transparent Evaluation Body */}
              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                  {/* Candidate Answer */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Candidate's Submitted Answer
                    </p>
                    <div className="rounded-lg bg-white dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-300 font-mono border dark:border-slate-700 whitespace-pre-wrap">
                      {isUnanswered ? "[No answer submitted - time expired]" : (review.user_answer || "No text submitted")}
                    </div>
                  </div>

                  {/* Rubric Evaluation Breakdown */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 p-3 border border-emerald-200 dark:border-emerald-800/40">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                        ✅ What You Did Well
                      </p>
                      {review.evaluation?.strengths?.length > 0 ? (
                        <ul className="list-disc list-inside text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                          {review.evaluation.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No specific strengths demonstrated.</p>
                      )}
                    </div>

                    <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-800/40">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                        ⚠️ Missing / Incomplete Points
                      </p>
                      {review.evaluation?.missing_points?.length > 0 ? (
                        <ul className="list-disc list-inside text-xs text-amber-900 dark:text-amber-200 space-y-1">
                          {review.evaluation.missing_points.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-400 italic">None noted.</p>
                      )}
                    </div>
                  </div>

                  {/* Important Concepts & Improvement Guidance */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {review.evaluation?.important_concepts?.length > 0 && (
                      <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/20 p-3 border border-blue-200 dark:border-blue-800/40">
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">
                          📌 Key Concepts You Should Cover
                        </p>
                        <ul className="list-disc list-inside text-xs text-blue-900 dark:text-blue-200 space-y-1">
                          {review.evaluation.important_concepts.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {review.evaluation?.improvement_suggestions?.length > 0 && (
                      <div className="rounded-lg bg-purple-50/60 dark:bg-purple-950/20 p-3 border border-purple-200 dark:border-purple-800/40">
                        <p className="text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">
                          💡 Actionable Improvement Steps
                        </p>
                        <ul className="list-disc list-inside text-xs text-purple-900 dark:text-purple-200 space-y-1">
                          {review.evaluation.improvement_suggestions.map((imp, i) => (
                            <li key={i}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Score Explanation & Adaptive Shift Reason */}
                  <div className="rounded-lg bg-slate-100 dark:bg-slate-800/80 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p>
                      <strong>Score Rationale:</strong> {review.evaluation?.explanation || "Standard rubric scoring applied."}
                    </p>
                    <p>
                      <strong>Adaptive Shift:</strong> {review.adaptive_scoring?.change_reason || "Difficulty maintained based on performance."}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Overall Strengths, Weaknesses, Suggestions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <h3 className="mb-3 font-bold text-emerald-600">Overall Strengths</h3>
          <ul className="space-y-2 text-sm">
            {(report.strengths || []).map((s, i) => (
              <li key={i} className="flex gap-2"><span>✅</span>{s}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold text-amber-600">Areas For Growth</h3>
          <ul className="space-y-2 text-sm">
            {(report.weaknesses || []).map((w, i) => (
              <li key={i} className="flex gap-2"><span>⚠️</span>{w}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold text-brand-600">Next Step Suggestions</h3>
          <ul className="space-y-2 text-sm">
            {(report.suggestions || []).map((s, i) => (
              <li key={i} className="flex gap-2"><span>💡</span>{s}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Quoted Moments */}
      {report.quotedMoments?.length > 0 && (
        <Card>
          <h3 className="mb-4 font-bold">Key Quoted Moments</h3>
          <div className="space-y-3">
            {report.quotedMoments.map((q, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                <div className="mb-1 flex items-center gap-2">
                  <Badge color={q.speaker === "ai" ? "brand" : "neutral"}>{q.speaker}</Badge>
                </div>
                <p className="text-sm italic">"{q.quote}"</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{q.why}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <h3 className="mb-2 font-bold">Comprehensive Summary</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {report.summary}
        </p>
      </Card>
    </div>
  );
}

