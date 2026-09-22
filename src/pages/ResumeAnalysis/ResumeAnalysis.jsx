import { useEffect, useRef, useState } from "react";
import { resumeService } from "../../services/resumeService.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Loader from "../../components/common/Loader.jsx";
import ProgressRing from "../../components/charts/ProgressRing.jsx";

export default function ResumeAnalysis() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    resumeService
      .get()
      .then(({ profile }) => setProfile(profile))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { profile } = await resumeService.upload(file);
      setProfile(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    setBusy(true);
    setError(null);
    try {
      const { profile } = await resumeService.analyze();
      setProfile(profile);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader fullScreen label="Loading resume analysis..." />;

  const analysis = profile?.analysis;
  const hasAnalysis = analysis && analysis.generatedAt;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Resume Analysis</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Compare your resume claims against your interview performance.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            onChange={handleUpload}
          />
          <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {profile?.resumeFile ? "Replace Resume" : "Upload Resume"}
          </button>
          {profile && (
            <button className="btn-primary" onClick={handleAnalyze} disabled={busy}>
              {busy ? "Analyzing..." : "Run Analysis"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {!profile ? (
        <Card className="text-center">
          <div className="mb-3 text-5xl">📄</div>
          <p className="mb-4 text-slate-500 dark:text-slate-400">
            Upload your resume (PDF) to extract your skills and compare them with your interview results.
          </p>
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? "Uploading..." : "Upload Resume"}
          </button>
        </Card>
      ) : (
        <>
          {/* Extracted profile */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <ChipCard title="Skills" items={profile.skills} />
            <ChipCard title="Programming Languages" items={profile.programmingLanguages} />
            <ChipCard title="Frameworks" items={profile.frameworks} />
            <ChipCard title="Databases" items={profile.databases} />
            <ChipCard title="Core CS Subjects" items={profile.coreCsSubjects} />
            <ChipCard title="Certifications" items={profile.certifications} />
          </div>

          {(profile.projects?.length > 0 || profile.experience?.length > 0) && (
            <div className="mb-8 grid gap-6 md:grid-cols-2">
              <ListCard title="Projects" items={profile.projects} />
              <ListCard title="Experience" items={profile.experience} />
            </div>
          )}

          {/* Analysis */}
          {hasAnalysis ? (
            <>
              <Card className="mb-8 flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
                <div>
                  <p className="label">Resume Match Score</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    How well your interview performance backs up your resume.
                  </p>
                </div>
                <ProgressRing value={analysis.matchScore} label="Match" />
              </Card>

              <div className="mb-8 grid gap-6 md:grid-cols-2">
                <ChipCard title="Skills Verified in Interviews" items={analysis.verifiedSkills} color="success" />
                <ChipCard title="Claimed but Not Demonstrated" items={analysis.unverifiedSkills} color="warning" />
                <ChipCard title="Skills Needing Improvement" items={analysis.improvementSkills} color="warning" />
                <ChipCard title="Missing / Weak Areas" items={analysis.missingAreas} color="neutral" />
              </div>

              {analysis.suggestions?.length > 0 && (
                <Card className="mb-6">
                  <h3 className="mb-3 font-bold text-brand-600">AI Suggestions</h3>
                  <ul className="space-y-2 text-sm">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2"><span>💡</span>{s}</li>
                    ))}
                  </ul>
                </Card>
              )}

              <Card>
                <h3 className="mb-2 font-bold">Summary</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.summary}</p>
              </Card>
            </>
          ) : (
            <Card className="text-center">
              <p className="text-slate-500 dark:text-slate-400">
                Resume uploaded. Click <strong>Run Analysis</strong> to compare it with your interview performance.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ChipCard({ title, items, color = "brand" }) {
  return (
    <Card>
      <h3 className="mb-3 font-bold">{title}</h3>
      {items?.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((s, i) => (
            <Badge key={i} color={color}>{s}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">None found.</p>
      )}
    </Card>
  );
}

function ListCard({ title, items }) {
  return (
    <Card>
      <h3 className="mb-3 font-bold">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2"><span>•</span>{s}</li>
        ))}
      </ul>
    </Card>
  );
}
