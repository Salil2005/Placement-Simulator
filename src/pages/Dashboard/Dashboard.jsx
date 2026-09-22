import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { interviewService } from "../../services/interviewService.js";
import { useAuth } from "../../hooks/useAuth.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Loader from "../../components/common/Loader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { formatDate } from "../../utils/formatDate.js";

const STATUS_COLOR = { not_started: "neutral", in_progress: "warning", completed: "success" };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewService
      .dashboard()
      .then(({ stats, recentInterviews }) => {
        setStats(stats);
        setRecent(recentInterviews);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullScreen />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
      <h1 className="text-2xl font-extrabold">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Here's how your practice is going.</p>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="label">Total Interviews</p>
          <p className="text-3xl font-extrabold">{stats?.totalInterviews ?? 0}</p>
        </Card>
        <Card>
          <p className="label">Average Score</p>
          <p className="text-3xl font-extrabold text-brand-600">{stats?.averageScore ?? 0}</p>
        </Card>
        <Card>
          <p className="label">Best Score</p>
          <p className="text-3xl font-extrabold text-emerald-600">{stats?.bestScore ?? 0}</p>
        </Card>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        <Link
          to="/placement"
          className="flex items-center justify-between rounded-2xl border border-brand-200 bg-brand-50 p-5 transition hover:shadow-md dark:border-brand-900/40 dark:bg-brand-900/20"
        >
          <div>
            <p className="font-bold text-brand-700 dark:text-brand-300">Overall Placement Readiness</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Combined weighted score across all categories
            </p>
          </div>
          <span className="text-2xl">🎯</span>
        </Link>
        <Link
          to="/resume"
          className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-5 transition hover:shadow-md dark:border-emerald-900/40 dark:bg-emerald-900/20"
        >
          <div>
            <p className="font-bold text-emerald-700 dark:text-emerald-300">Resume Analysis</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare your resume against interview performance
            </p>
          </div>
          <span className="text-2xl">📄</span>
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Recent Interviews</h2>
        <Link to="/interview/create" className="btn-primary">Start New Interview</Link>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No interviews yet"
          description="Create your first mock interview to get started."
          action={<Link to="/interview/create" className="btn-primary">Create Interview</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((iv) => (
            <Card key={iv._id}>
              <div className="mb-2 flex items-center justify-between">
                <Badge color="brand">{iv.category}</Badge>
                <Badge color={STATUS_COLOR[iv.status]}>{iv.status.replace("_", " ")}</Badge>
              </div>
              <h3 className="mb-1 font-semibold">{iv.role}</h3>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{formatDate(iv.createdAt)} · {iv.difficulty}</p>
              <Link
                to={iv.status === "completed" ? `/report/${iv._id}` : `/interview/${iv._id}`}
                className="btn-secondary w-full"
              >
                {iv.status === "completed" ? "View Report" : "Continue"}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
