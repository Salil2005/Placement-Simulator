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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Interview Report</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Here's how you did.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleDownload} className="btn-secondary">Download PDF</button>
          <Link to="/placement" className="btn-secondary">Overall Placement Readiness</Link>
          <Link to="/interview/create" className="btn-primary">New Interview</Link>
        </div>
      </div>

      <div className="mb-8">
        <Card className="mx-auto max-w-2xl">
          <div className="mb-1 text-center">
            <p className="label">Performance by response</p>
            <h2 className="text-lg font-bold">Question-wise Marks</h2>
          </div>
          <QuestionMarksPieChart questionMarks={report.questionMarks} />
        </Card>
      </div>

      <Card className="mb-6 text-center">
        <p className="label">Overall Score</p>
        <p className="text-5xl font-extrabold text-brand-600">{report.scores.overall}</p>
      </Card>

      {/* Adaptive Web Dev & System Design Dimension Breakdown */}
      {report.scores && (report.scores.webDevelopment > 0 || report.scores.systemDesign > 0 || report.adaptiveDetails) && (
        <div className="mb-6 space-y-4">
          <Card>
            <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-white">
              Adaptive Dimension Evaluation Breakdown
            </h3>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6 text-center">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Web Dev</p>
                <p className="text-xl font-bold text-brand-600">{report.scores.webDevelopment ?? report.scores.technical}/100</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">System Design</p>
                <p className="text-xl font-bold text-indigo-600">{report.scores.systemDesign ?? report.scores.problemSolving}/100</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Correctness</p>
                <p className="text-xl font-bold text-emerald-600">{report.scores.technicalCorrectness ?? report.scores.technical}/100</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Conceptual</p>
                <p className="text-xl font-bold text-blue-600">{report.scores.conceptualUnderstanding ?? report.scores.technical}/100</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Ownership</p>
                <p className="text-xl font-bold text-amber-600">{report.scores.projectOwnership ?? report.scores.confidence}/100</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="text-xs text-slate-500 dark:text-slate-400">Architectural</p>
                <p className="text-xl font-bold text-purple-600">{report.scores.architecturalReasoning ?? report.scores.problemSolving}/100</p>
              </div>
            </div>

            {report.adaptiveDetails && (
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  <strong>Projects Discussed:</strong> {(report.adaptiveDetails.projectsDiscussed || []).join(", ") || "Main Project"}
                </span>
                <span>
                  <strong>Adaptive Score:</strong> {report.adaptiveDetails.initialAdaptiveScore?.toFixed(2)} → {report.adaptiveDetails.finalAdaptiveScore?.toFixed(2)}
                </span>
                <span>
                  <strong>Questions Evaluated:</strong> {report.adaptiveDetails.evaluatedAnswersCount} / {report.adaptiveDetails.totalQuestionsAsked}
                </span>
              </div>
            )}
          </Card>

          {(report.adaptiveDetails?.knowledgeGaps?.length > 0 || report.adaptiveDetails?.misconceptions?.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {report.adaptiveDetails.knowledgeGaps?.length > 0 && (
                <Card>
                  <h4 className="mb-2 text-sm font-bold text-amber-600">Knowledge Gaps</h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {report.adaptiveDetails.knowledgeGaps.map((gap, i) => (
                      <li key={i} className="flex gap-1.5"><span>•</span>{gap}</li>
                    ))}
                  </ul>
                </Card>
              )}
              {report.adaptiveDetails.misconceptions?.length > 0 && (
                <Card>
                  <h4 className="mb-2 text-sm font-bold text-red-600">Identified Misconceptions</h4>
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

      <div className="mb-6 grid gap-6 md:grid-cols-3">
        <Card>
          <h3 className="mb-3 font-bold text-emerald-600">Strengths</h3>
          <ul className="space-y-2 text-sm">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex gap-2"><span>✅</span>{s}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold text-amber-600">Weaknesses</h3>
          <ul className="space-y-2 text-sm">
            {report.weaknesses.map((s, i) => (
              <li key={i} className="flex gap-2"><span>⚠️</span>{s}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-3 font-bold text-brand-600">Suggestions</h3>
          <ul className="space-y-2 text-sm">
            {report.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2"><span>💡</span>{s}</li>
            ))}
          </ul>
        </Card>
      </div>

      {report.quotedMoments?.length > 0 && (
        <Card className="mb-6">
          <h3 className="mb-4 font-bold">Quoted Moments</h3>
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

      <Card>
        <h3 className="mb-2 font-bold">Summary</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">{report.summary}</p>
      </Card>
    </div>
  );
}
