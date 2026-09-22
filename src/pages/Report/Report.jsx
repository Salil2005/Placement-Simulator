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
