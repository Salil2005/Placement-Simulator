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

  // Projects Handlers
  const handleAddProject = async (data) => {
    setError(null);
    setActionSuccess(null);
    try {
      const { profile: updated } = await resumeService.addProject(data);
      setProfile(updated);
      setActionSuccess(`Added project "${data.title || "Project"}"!`);
      setTimeout(() => setActionSuccess(null), 3000);
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return false;
    }
  };

  const handleUpdateProject = async (index, data) => {
    setError(null);
    setActionSuccess(null);
    try {
      const { profile: updated } = await resumeService.updateProject(index, data);
      setProfile(updated);
      setActionSuccess(`Updated project "${data.title || "Project"}"!`);
      setTimeout(() => setActionSuccess(null), 3000);
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return false;
    }
  };

  const handleDeleteProject = async (index) => {
    setError(null);
    setActionSuccess(null);
    try {
      const { profile: updated } = await resumeService.deleteProject(index);
      setProfile(updated);
      setActionSuccess("Project removed.");
      setTimeout(() => setActionSuccess(null), 3000);
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return false;
    }
  };

  // Experience Handlers
  const handleAddExperience = async (data) => {
    setError(null);
    setActionSuccess(null);
    try {
      const { profile: updated } = await resumeService.addExperience(data);
      setProfile(updated);
      setActionSuccess(`Added experience "${data.role || data.company || "Entry"}"!`);
      setTimeout(() => setActionSuccess(null), 3000);
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return false;
    }
  };

  const handleUpdateExperience = async (index, data) => {
    setError(null);
    setActionSuccess(null);
    try {
      const { profile: updated } = await resumeService.updateExperience(index, data);
      setProfile(updated);
      setActionSuccess("Updated experience entry!");
      setTimeout(() => setActionSuccess(null), 3000);
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return false;
    }
  };

  const handleDeleteExperience = async (index) => {
    setError(null);
    setActionSuccess(null);
    try {
      const { profile: updated } = await resumeService.deleteExperience(index);
      setProfile(updated);
      setActionSuccess("Experience entry removed.");
      setTimeout(() => setActionSuccess(null), 3000);
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || err.message);
      return false;
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

          {/* Editable Projects and Experience Sections */}
          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <ProjectsCard
              projects={profile.projects || []}
              onAdd={handleAddProject}
              onUpdate={handleUpdateProject}
              onDelete={handleDeleteProject}
            />
            <ExperienceCard
              experience={profile.experience || []}
              onAdd={handleAddExperience}
              onUpdate={handleUpdateExperience}
              onDelete={handleDeleteExperience}
            />
          </div>

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

function ProjectsCard({ projects = [], onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartEdit = (index, project) => {
    setEditingIndex(index);
    setEditTitle(project?.title || "");
    setEditDescription(project?.description || "");
    setAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditTitle("");
    setEditDescription("");
    setIsModalOpen(false);
  };

  const handleSaveEdit = async (index) => {
    if (!editTitle.trim() && !editDescription.trim()) return;
    setBusy(true);
    const ok = await onUpdate(index, { title: editTitle.trim(), description: editDescription.trim() });
    setBusy(false);
    if (ok) {
      setEditingIndex(null);
      setIsModalOpen(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() && !newDescription.trim()) return;
    setBusy(true);
    const ok = await onAdd({ title: newTitle.trim(), description: newDescription.trim() });
    setBusy(false);
    if (ok) {
      setNewTitle("");
      setNewDescription("");
      setAdding(false);
    }
  };

  const handleDelete = async (index) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      await onDelete(index);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Projects</h3>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
            {projects.length}
          </span>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingIndex(null);
            }}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            + Add Project
          </button>
        )}
      </div>

      {/* Add Form */}
      {adding && (
        <form onSubmit={handleCreate} className="mb-4 rounded-2xl border border-brand-200/90 bg-brand-50/40 p-5 dark:border-brand-900/50 dark:bg-brand-950/30">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-brand-700 dark:text-brand-300">Add New Project</p>
            <span className="text-xs text-slate-400">Context details</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Project Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Project Title (e.g. AI-powered Customer Support Assistant)"
                className="input py-2.5 px-3.5 text-sm"
                autoFocus
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Project Description & Key Tech
                </label>
                <span className="text-[11px] text-slate-400">{newDescription.length} chars</span>
              </div>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={6}
                placeholder="Describe key technologies used, core responsibilities, architecture, and impact..."
                className="input min-h-[160px] py-3 px-3.5 text-sm leading-relaxed resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setNewTitle("");
                  setNewDescription("");
                }}
                disabled={busy}
                className="btn-secondary py-2 px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={(!newTitle.trim() && !newDescription.trim()) || busy}
                className="btn-primary py-2 px-5 text-sm font-semibold shadow-soft"
              >
                {busy ? "Saving..." : "Save Project"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Projects List */}
      {projects.length > 0 ? (
        <div className="space-y-4 flex-1 overflow-y-auto">
          {projects.map((project, i) => {
            const isEditing = editingIndex === i;

            if (isEditing) {
              return (
                <div key={i} className="rounded-2xl border-2 border-brand-400 bg-white p-5 shadow-lg dark:border-brand-500/60 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                        #{i + 1}
                      </span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Edit Project #{i + 1}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      title="Expand to Full Modal"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span>⤢</span>
                      <span>Expand Modal</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Project Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Project Title"
                        className="input py-2.5 px-3.5 text-sm font-medium"
                        autoFocus
                      />
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Project Description & Context
                        </label>
                        <span className="text-[11px] text-slate-400">{editDescription.length} characters</span>
                      </div>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={10}
                        placeholder="Detailed description, technologies used, responsibilities, and achievements..."
                        className="input min-h-[220px] py-3 px-3.5 text-sm leading-relaxed resize-y font-normal"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={busy}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(i)}
                        disabled={(!editTitle.trim() && !editDescription.trim()) || busy}
                        className="btn-primary px-5 py-2 text-sm font-semibold shadow-soft"
                      >
                        {busy ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={i}
                className="group relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-slate-50/90 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-base text-slate-800 dark:text-slate-100">
                      {project?.title || "Untitled Project"}
                    </p>
                    {project?.description && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(i, project)}
                      title="Edit project"
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-400 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(i)}
                      title="Delete project"
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No projects listed yet.{" "}
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-brand-600 hover:underline dark:text-brand-400 font-medium"
              >
                Add one now
              </button>
            )}
          </p>
        </div>
      )}

      {/* Expanded Modal View for Project Editing */}
      {isModalOpen && editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  Edit Project #{editingIndex + 1} (Expanded View)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enjoy large, comfortable editing space for your project details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Project Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Project Title"
                  className="input py-2.5 px-3.5 text-sm font-medium"
                  autoFocus
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Project Description & Context
                  </label>
                  <span className="text-[11px] text-slate-400">{editDescription.length} characters</span>
                </div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={13}
                  placeholder="Detailed description, technologies used, responsibilities, and achievements..."
                  className="input min-h-[300px] py-3 px-3.5 text-sm leading-relaxed resize-y font-normal"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  handleCancelEdit();
                }}
                disabled={busy}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveEdit(editingIndex);
                }}
                disabled={(!editTitle.trim() && !editDescription.trim()) || busy}
                className="btn-primary px-6 py-2 text-sm font-semibold shadow-soft"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ExperienceCard({ experience = [], onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartEdit = (index, exp) => {
    setEditingIndex(index);
    setEditRole(exp?.role || "");
    setEditCompany(exp?.company || "");
    setEditDescription(exp?.description || "");
    setAdding(false);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditRole("");
    setEditCompany("");
    setEditDescription("");
    setIsModalOpen(false);
  };

  const handleSaveEdit = async (index) => {
    if (!editRole.trim() && !editCompany.trim() && !editDescription.trim()) return;
    setBusy(true);
    const ok = await onUpdate(index, {
      role: editRole.trim(),
      company: editCompany.trim(),
      description: editDescription.trim(),
    });
    setBusy(false);
    if (ok) {
      setEditingIndex(null);
      setIsModalOpen(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRole.trim() && !newCompany.trim() && !newDescription.trim()) return;
    setBusy(true);
    const ok = await onAdd({
      role: newRole.trim(),
      company: newCompany.trim(),
      description: newDescription.trim(),
    });
    setBusy(false);
    if (ok) {
      setNewRole("");
      setNewCompany("");
      setNewDescription("");
      setAdding(false);
    }
  };

  const handleDelete = async (index) => {
    if (window.confirm("Are you sure you want to delete this experience entry?")) {
      await onDelete(index);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Experience</h3>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
            {experience.length}
          </span>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingIndex(null);
            }}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            + Add Experience
          </button>
        )}
      </div>

      {/* Add Form */}
      {adding && (
        <form onSubmit={handleCreate} className="mb-4 rounded-2xl border border-brand-200/90 bg-brand-50/40 p-5 dark:border-brand-900/50 dark:bg-brand-950/30">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-brand-700 dark:text-brand-300">Add Work Experience</p>
            <span className="text-xs text-slate-400">Role & history</span>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role / Title
                </label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Role / Title (e.g. SDE Intern)"
                  className="input py-2.5 px-3.5 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Company (e.g. Google, TechCorp)"
                  className="input py-2.5 px-3.5 text-sm"
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Responsibilities & Achievements
                </label>
                <span className="text-[11px] text-slate-400">{newDescription.length} chars</span>
              </div>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={6}
                placeholder="Responsibilities, achievements, technologies used, impact..."
                className="input min-h-[160px] py-3 px-3.5 text-sm leading-relaxed resize-y"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setNewRole("");
                  setNewCompany("");
                  setNewDescription("");
                }}
                disabled={busy}
                className="btn-secondary py-2 px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={(!newRole.trim() && !newCompany.trim() && !newDescription.trim()) || busy}
                className="btn-primary py-2 px-5 text-sm font-semibold shadow-soft"
              >
                {busy ? "Saving..." : "Save Experience"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Experience List */}
      {experience.length > 0 ? (
        <div className="space-y-4 flex-1 overflow-y-auto">
          {experience.map((exp, i) => {
            const isEditing = editingIndex === i;

            if (isEditing) {
              return (
                <div key={i} className="rounded-2xl border-2 border-brand-400 bg-white p-5 shadow-lg dark:border-brand-500/60 dark:bg-slate-900">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
                        #{i + 1}
                      </span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Edit Experience #{i + 1}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      title="Expand to Full Modal"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span>⤢</span>
                      <span>Expand Modal</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          placeholder="Role / Title"
                          className="input py-2.5 px-3.5 text-sm font-medium"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Company / Organization
                        </label>
                        <input
                          type="text"
                          value={editCompany}
                          onChange={(e) => setEditCompany(e.target.value)}
                          placeholder="Company"
                          className="input py-2.5 px-3.5 text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Responsibilities & Achievements
                        </label>
                        <span className="text-[11px] text-slate-400">{editDescription.length} characters</span>
                      </div>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={10}
                        placeholder="Responsibilities, achievements, technologies used, impact..."
                        className="input min-h-[220px] py-3 px-3.5 text-sm leading-relaxed resize-y font-normal"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={busy}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(i)}
                        disabled={(!editRole.trim() && !editCompany.trim() && !editDescription.trim()) || busy}
                        className="btn-primary px-5 py-2 text-sm font-semibold shadow-soft"
                      >
                        {busy ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={i}
                className="group relative rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 hover:bg-slate-50/90 dark:border-slate-800/80 dark:bg-slate-900/40 dark:hover:border-slate-700 dark:hover:bg-slate-900/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 pr-2">
                    <p className="font-semibold text-base text-slate-800 dark:text-slate-100">
                      {exp?.role || "Position"}
                      {exp?.company && (
                        <span className="ml-2 text-xs font-medium text-brand-600 dark:text-brand-400">
                          @ {exp.company}
                        </span>
                      )}
                    </p>
                    {exp?.description && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(i, exp)}
                      title="Edit experience"
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-brand-400 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(i)}
                      title="Delete experience"
                      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            No work experience listed yet.{" "}
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="text-brand-600 hover:underline dark:text-brand-400 font-medium"
              >
                Add one now
              </button>
            )}
          </p>
        </div>
      )}

      {/* Expanded Modal View for Experience Editing */}
      {isModalOpen && editingIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  Edit Experience #{editingIndex + 1} (Expanded View)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comfortable, full-width editor for work and internship history.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="Role / Title"
                    className="input py-2.5 px-3.5 text-sm font-medium"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    placeholder="Company"
                    className="input py-2.5 px-3.5 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Responsibilities & Achievements
                  </label>
                  <span className="text-[11px] text-slate-400">{editDescription.length} characters</span>
                </div>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={13}
                  placeholder="Responsibilities, achievements, technologies used, impact..."
                  className="input min-h-[300px] py-3 px-3.5 text-sm leading-relaxed resize-y font-normal"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  handleCancelEdit();
                }}
                disabled={busy}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveEdit(editingIndex);
                }}
                disabled={(!editRole.trim() && !editCompany.trim() && !editDescription.trim()) || busy}
                className="btn-primary px-6 py-2 text-sm font-semibold shadow-soft"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}


