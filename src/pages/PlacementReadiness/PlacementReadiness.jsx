import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { placementService } from "../../services/placementService.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Loader from "../../components/common/Loader.jsx";
import ProgressRing from "../../components/charts/ProgressRing.jsx";
import CategoryBar from "../../components/charts/CategoryBar.jsx";

const LABELS = {
  hr: "HR / Behavioral",
  dsa: "DSA",
  "core-cs": "Core CS",
  "web-dev": "Web Development",
  "system-design": "System Design",
};

const STATUS_COLOR = { Excellent: "success", Good: "brand", "Needs Improvement": "warning" };

export default function PlacementReadiness() {
  const [report, setReport] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const elig = await placementService.eligibility();
        setEligibility(elig);
        try {
          const { report } = await placementService.get();
          setReport(report);
        } catch {
          /* no report yet — fine */
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { report } = await placementService.generate();
      setReport(report);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { data } = await placementService.download();
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "placement-readiness-report.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <Loader fullScreen label="Loading placement readiness..." />;

  if (eligibility && !eligibility.eligible && !report) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mb-4 text-5xl">🎯</div>
        <h1 className="mb-3 text-2xl font-extrabold">Overall Placement Readiness</h1>
        <p className="mb-6 text-slate-500 dark:text-slate-400">
          Complete at least two interview categories to generate the Overall Placement Readiness Report.
        </p>
        <p className="mb-6 text-sm text-slate-400">
          Completed so far: {eligibility.completedCount} / 2
        </p>
        <Link to="/interview/create" className="btn-primary">Start an Interview</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Overall Placement Readiness</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Weighted across every completed interview category.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : report ? "Regenerate" : "Generate Report"}
          </button>
          {report && (
            <button type="button" onClick={handleDownload} className="btn-secondary">Download PDF</button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {!report ? (
        <Card className="text-center">
          <p className="text-slate-500 dark:text-slate-400">
            Click <strong>Generate Report</strong> to build your combined readiness assessment.
          </p>
        </Card>
      ) : (
        <>
          {/* Readiness header */}
          <Card className="mb-8 flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="label">Readiness Status</p>
              <p className="text-3xl font-extrabold text-brand-600">{report.readinessLevel}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Based on {report.completedCategories.length} completed categories
              </p>
            </div>
            <ProgressRing value={report.readinessScore} label="Readiness" />
          </Card>

          {/* Charts */}
          <div className="mb-8">
            <Card>
              <div className="mb-4">
                <p className="label">Performance overview</p>
                <h2 className="text-lg font-bold">Category Comparison</h2>
              </div>
              <CategoryBar categoryScores={report.categoryScores} />
            </Card>
          </div>

          {/* Comparison table */}
          <Card className="mb-8 overflow-x-auto">
            <h2 className="mb-4 text-lg font-bold">Category Breakdown</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Score</th>
                  <th className="py-2 text-right">Weight</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.categoryScores.map((c) => (
                  <tr key={c.category} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2">{LABELS[c.category] || c.category}</td>
                    <td className="py-2 text-right font-semibold">{c.score}</td>
                    <td className="py-2 text-right text-slate-500">{Math.round(c.weight * 100)}%</td>
                    <td className="py-2 text-right">
                      <Badge color={STATUS_COLOR[c.status] || "neutral"}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Strengths / weaknesses / consistency */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <ListCard title="Strengths Across All Interviews" icon="✅" items={report.strengths} />
            <ListCard title="Weaknesses Across All Interviews" icon="⚠️" items={report.weaknesses} />
            <ListCard title="Most Consistent Skills" icon="📈" items={report.consistentSkills} />
            <ListCard title="Skills Requiring Improvement" icon="🛠️" items={report.improvementSkills} />
          </div>

          {/* Improvement priority */}
          {report.improvementPriority?.length > 0 && (
            <Card className="mb-8">
              <h2 className="mb-4 text-lg font-bold">Improvement Priority</h2>
              <ol className="space-y-3">
                {report.improvementPriority.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      {i + 1}
                    </span>
                    <span className="text-sm">{p}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {/* Prediction */}
          <Card className="mb-8">
            <h2 className="mb-4 text-lg font-bold">Placement Prediction</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label="Readiness" value={`${report.readinessScore}%`} />
              <Stat label="Technical Success" value={report.technicalSuccess} />
              <Stat label="HR Success" value={report.hrSuccess} />
            </div>
            <div className="mt-4">
              <p className="label mb-2">Recommended Companies</p>
              <div className="flex flex-wrap gap-2">
                {report.recommendedCompanies.map((c) => (
                  <Badge key={c} color="brand">{c}</Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* AI summary + recommendation */}
          <Card className="mb-6">
            <h2 className="mb-2 text-lg font-bold">AI Career Readiness Summary</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{report.careerSummary}</p>
          </Card>
          <Card>
            <h2 className="mb-2 text-lg font-bold">Final Recommendation</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{report.finalRecommendation}</p>
          </Card>
        </>
      )}
    </div>
  );
}

function ListCard({ title, icon, items }) {
  return (
    <Card>
      <h3 className="mb-3 font-bold">{title}</h3>
      {items?.length ? (
        <ul className="space-y-2 text-sm">
          {items.map((s, i) => (
            <li key={i} className="flex gap-2"><span>{icon}</span>{s}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">None identified.</p>
      )}
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800">
      <p className="label">{label}</p>
      <p className="text-xl font-extrabold text-brand-600">{value}</p>
    </div>
  );
}
