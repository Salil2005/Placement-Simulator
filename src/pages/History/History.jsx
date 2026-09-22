import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { interviewService } from "../../services/interviewService.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Loader from "../../components/common/Loader.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { formatDate } from "../../utils/formatDate.js";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    interviewService
      .history()
      .then(({ history }) => setHistory(history))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullScreen />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <h1 className="mb-1 text-2xl font-extrabold">Interview History</h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Review every past mock interview and its report.</p>

      {history.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No completed interviews yet"
          description="Finish an interview to see it appear here."
          action={<Link to="/interview/create" className="btn-primary">Start an Interview</Link>}
        />
      ) : (
        <div className="space-y-4">
          {history.map(({ interview, report }) => (
            <Card key={interview._id} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge color="brand">{interview.category}</Badge>
                  <Badge color="neutral">{interview.difficulty}</Badge>
                </div>
                <h3 className="font-semibold">{interview.role}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Completed {formatDate(interview.completedAt)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {report && (
                  <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Score</p>
                    <p className="text-xl font-extrabold text-brand-600">{report.scores.overall}</p>
                  </div>
                )}
                <Link to={`/report/${interview._id}`} className="btn-secondary">View Report</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
