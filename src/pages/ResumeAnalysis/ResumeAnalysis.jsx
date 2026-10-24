import { useEffect, useRef, useState } from "react";
import { resumeService } from "../../services/resumeService.js";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Loader from "../../components/common/Loader.jsx";
import ProgressRing from "../../components/charts/ProgressRing.jsx";

const CATEGORY_CONFIG = [
  { field: "coreCsSubjects", title: "Core CS Subjects", placeholder: "e.g. OS, DBMS, Computer Networks, OOP" },
  { field: "skills", title: "Skills", placeholder: "e.g. System Design, REST APIs, Docker, CI/CD" },
  { field: "programmingLanguages", title: "Programming Languages", placeholder: "e.g. C++, Java, Python, TypeScript" },
  { field: "frameworks", title: "Frameworks", placeholder: "e.g. React, Node.js, Express, Spring Boot" },
  { field: "databases", title: "Databases", placeholder: "e.g. PostgreSQL, MongoDB, Redis, MySQL" },
  { field: "certifications", title: "Certifications", placeholder: "e.g. AWS Certified Developer, CKAD" },
];

export default function ResumeAnalysis() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const fileRef = useRef(null);

  // Quick Add Toolbar State
  const [quickField, setQuickField] = useState("coreCsSubjects");
  const [quickValue, setQuickValue] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);

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
    setActionSuccess(null);
    try {
      const { profile } = await resumeService.upload(file);
      setProfile(profile);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    setBusy(true);
    setError(null);
    setActionSuccess(null);
    try {
      const { profile } = await resumeService.analyze();
      setProfile(profile);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAddItem = async (field, value) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    setError(null);
    setActionSuccess(null);
    try {
      const { profile: updated } = await resumeService.addSkill(field, trimmed);
      setProfile(updated);
      const cat = CATEGORY_CONFIG.find((c) => c.field === field);
      setActionSuccess(`Added "${trimmed}" to ${cat?.title || field}!`);
      setTimeout(() => setActionSuccess(null), 3000);
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return false;
    }
  };

  const handleRemoveItem = async (field, value) => {
    setError(null);
    setActionSuccess(null);
    try {
      const { profile: updated } = await resumeService.removeSkill(field, value);
      setProfile(updated);
      const cat = CATEGORY_CONFIG.find((c) => c.field === field);
      setActionSuccess(`Removed "${value}" from ${cat?.title || field}.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickValue.trim() || quickLoading) return;
    setQuickLoading(true);
    const ok = await handleAddItem(quickField, quickValue);
    setQuickLoading(false);
    if (ok) setQuickValue("");
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

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {actionSuccess && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          ✓ {actionSuccess}
        </div>
      )}

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
          {/* Quick Add Missing Skills Bar */}
          <Card className="mb-8 border-brand-200/80 bg-gradient-to-r from-brand-50/40 to-indigo-50/20 dark:border-brand-900/40 dark:from-brand-950/20 dark:to-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-brand-700 dark:text-brand-300">
                  Missing a Skill, Language, Database, or Core Subject?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  If any subject or skill wasn't extracted from your resume, manually add it here to include it in analysis.
                </p>
              </div>
            </div>

            <form onSubmit={handleQuickAdd} className="flex flex-col gap-2 sm:flex-row">
              <select
                value={quickField}
                onChange={(e) => setQuickField(e.target.value)}
                className="input sm:w-56"
              >
                {CATEGORY_CONFIG.map((cat) => (
                  <option key={cat.field} value={cat.field}>
                    {cat.title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={quickValue}
                onChange={(e) => setQuickValue(e.target.value)}
                placeholder={
                  CATEGORY_CONFIG.find((c) => c.field === quickField)?.placeholder ||
                  "Enter item name..."
                }
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={!quickValue.trim() || quickLoading}
                className="btn-primary whitespace-nowrap"
              >
                {quickLoading ? "Adding..." : "+ Add to Profile"}
              </button>
            </form>
          </Card>

          {/* Extracted profile with inline additions */}
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            {CATEGORY_CONFIG.map((cat) => (
              <ChipCard
                key={cat.field}
                field={cat.field}
                title={cat.title}
                placeholder={cat.placeholder}
                items={profile[cat.field]}
                onAdd={(val) => handleAddItem(cat.field, val)}
                onRemove={(val) => handleRemoveItem(cat.field, val)}
                isEditable
              />
            ))}
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
                Resume profile ready. Click <strong>Run Analysis</strong> to compare it with your interview performance.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ChipCard({
  field,
  title,
  placeholder = "Add new...",
  items,
  color = "brand",
  isEditable = false,
  onAdd,
  onRemove,
}) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [adding]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    if (onAdd) {
      const ok = await onAdd(val.trim());
      if (ok) {
        setVal("");
        setAdding(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setAdding(false);
      setVal("");
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-bold">{title}</h3>
        {isEditable && (
          <button
            type="button"
            onClick={() => setAdding((prev) => !prev)}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline"
          >
            {adding ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>

      {isEditable && adding && (
        <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="input py-1.5 text-xs flex-1"
          />
          <button type="submit" disabled={!val.trim()} className="btn-primary py-1.5 px-3 text-xs">
            Add
          </button>
        </form>
      )}

      {items?.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((s, i) => {
            const label = typeof s === "string" ? s : String(s);
            return (
              <Badge key={i} color={color}>
                <span className="flex items-center gap-1.5">
                  <span>{label}</span>
                  {isEditable && onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(label)}
                      title={`Remove ${label}`}
                      className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[10px] opacity-60 hover:bg-slate-300/60 hover:opacity-100 dark:hover:bg-slate-700"
                    >
                      ×
                    </button>
                  )}
                </span>
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          None found. {isEditable && <span className="text-xs text-brand-500 cursor-pointer" onClick={() => setAdding(true)}>Add one</span>}
        </p>
      )}
    </Card>
  );
}

function ListCard({ title, items }) {
  if (!items?.length) return null;

  return (
    <Card>
      <h3 className="mb-3 font-bold">{title}</h3>
      <ul className="space-y-3 text-sm">
        {items.map((item, i) => {
          if (item && typeof item === "object") {
            const heading = item.title || item.role || "";
            const sub     = item.company ? `${item.company}` : "";
            const body    = item.description || "";
            return (
              <li key={i} className="border-l-2 border-brand-500 pl-3">
                {heading && (
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {heading}
                    {sub && (
                      <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                        @ {sub}
                      </span>
                    )}
                  </p>
                )}
                {body && (
                  <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">
                    {body}
                  </p>
                )}
              </li>
            );
          }
          return (
            <li key={i} className="flex gap-2">
              <span>•</span>
              {String(item)}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}


