import { useState, useEffect } from "react";
import Button from "../ui/Button.jsx";
import Card from "../ui/Card.jsx";
import Badge from "../ui/Badge.jsx";

export default function ResumeReviewWindow({
  interview,
  onStartEarly,
  onUpdateContext,
}) {
  const context = interview?.projectContext || { projects: [], skills: [], technologies: [] };
  const [projects, setProjects] = useState(context.projects || []);
  const [skills, setSkills] = useState(context.skills || []);
  const [technologies, setTechnologies] = useState(context.technologies || []);
  const [selectedProject, setSelectedProject] = useState(context.selectedProject || projects[0]?.title || "");
  const [newSkill, setNewSkill] = useState("");
  const [newTech, setNewTech] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 120-second countdown calculation based on reviewDeadline
  useEffect(() => {
    const deadline = interview?.reviewDeadline
      ? new Date(interview.reviewDeadline).getTime()
      : Date.now() + 120000;

    const updateTimer = () => {
      const diffSec = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemainingSeconds(diffSec);
      if (diffSec <= 0 && onStartEarly) {
        onStartEarly();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [interview?.reviewDeadline, onStartEarly]);

  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const secs = String(remainingSeconds % 60).padStart(2, "0");

  const handleSaveCorrections = async () => {
    setSaving(true);
    try {
      await onUpdateContext({
        projects,
        skills,
        technologies,
        selectedProject,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    const updated = [...skills, trimmed];
    setSkills(updated);
    setNewSkill("");
    onUpdateContext({ skills: updated });
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updated = skills.filter((s) => s !== skillToRemove);
    setSkills(updated);
    onUpdateContext({ skills: updated });
  };

  const handleAddTech = () => {
    const trimmed = newTech.trim();
    if (!trimmed || technologies.includes(trimmed)) return;
    const updated = [...technologies, trimmed];
    setTechnologies(updated);
    setNewTech("");
    onUpdateContext({ technologies: updated });
  };

  const handleRemoveTech = (techToRemove) => {
    const updated = technologies.filter((t) => t !== techToRemove);
    setTechnologies(updated);
    onUpdateContext({ technologies: updated });
  };

  const handleProjectFieldChange = (index, field, value) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value, source: "user_edit" };
    setProjects(updated);
  };

  const handleAddProject = () => {
    const newProj = {
      title: "New Project " + (projects.length + 1),
      description: "Brief overview of responsibilities and technical problem solved.",
      technologies: ["React", "Node.js"],
      frontendArchitecture: "Component hierarchy and routing",
      backendArchitecture: "REST API endpoints and data model",
      databases: ["MongoDB"],
      source: "user_added",
    };
    const updated = [...projects, newProj];
    setProjects(updated);
    if (!selectedProject) setSelectedProject(newProj.title);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Review Header Banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
                Stage 1: Review Window
              </span>
              <span className="text-xs text-white/80">Adaptive Web Dev + System Design</span>
            </div>
            <h1 className="text-2xl font-bold">Review Your Extracted Resume & Projects</h1>
            <p className="text-sm text-white/80 mt-1 max-w-xl">
              We extracted the projects and architecture below. Review, correct, or add details. Your verified information is the authoritative source for the adaptive interview.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-black/30 px-4 py-2 border border-white/20 backdrop-blur-sm">
              <span className="text-xl">⏱</span>
              <div className="text-right">
                <div className="text-xs text-white/70 uppercase font-mono">Time Remaining</div>
                <div className="text-2xl font-mono font-extrabold text-amber-300">
                  {mins}:{secs}
                </div>
              </div>
            </div>
            <Button
              onClick={onStartEarly}
              className="!bg-emerald-500 hover:!bg-emerald-600 text-white font-bold shadow-md w-full sm:w-auto"
            >
              Start Interview Now 🚀
            </Button>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <span>✓</span> Corrections saved. These verified details will guide your interview questions.
        </div>
      )}

      {/* Primary Project Selection for First Question */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Primary Project Focus</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The first question will be a detailed architectural walkthrough of this selected project.
            </p>
          </div>
          <Badge color="brand">Authoritative Context</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((proj, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedProject(proj.title)}
              className={`cursor-pointer rounded-xl border p-3.5 transition ${
                selectedProject === proj.title
                  ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 dark:border-brand-500 ring-2 ring-brand-400"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-slate-900 dark:text-white">{proj.title}</div>
                <span className="text-xs">
                  {proj.source === "resume" ? (
                    <Badge color="neutral">From Resume</Badge>
                  ) : (
                    <Badge color="warning">User Edited</Badge>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {proj.description || "No description provided."}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Project Details Editor */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Extracted Projects & Architecture</h2>
          <button
            onClick={handleAddProject}
            type="button"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
          >
            + Add Another Project
          </button>
        </div>

        {projects.map((proj, idx) => (
          <Card key={idx} className="relative space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Project #{idx + 1}
              </span>
              <div className="flex items-center gap-2">
                {selectedProject === proj.title && (
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                    ★ Selected for Walkthrough
                  </span>
                )}
                {proj.source && (
                  <span className="text-xs text-slate-400 italic">({proj.source})</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Project Title</label>
              <input
                type="text"
                value={proj.title}
                onChange={(e) => handleProjectFieldChange(idx, "title", e.target.value)}
                className="input text-sm mt-1"
                placeholder="Project Name"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Problem & Description</label>
              <textarea
                rows={2}
                value={proj.description}
                onChange={(e) => handleProjectFieldChange(idx, "description", e.target.value)}
                className="input text-sm mt-1"
                placeholder="What problem does it solve and what was your role?"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Frontend Architecture</label>
                <input
                  type="text"
                  value={proj.frontendArchitecture || ""}
                  onChange={(e) => handleProjectFieldChange(idx, "frontendArchitecture", e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="e.g. React SPA, component lifecycle, state management"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Backend Architecture</label>
                <input
                  type="text"
                  value={proj.backendArchitecture || ""}
                  onChange={(e) => handleProjectFieldChange(idx, "backendArchitecture", e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="e.g. Node.js Express REST API, services, middleware"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Databases & Storage</label>
                <input
                  type="text"
                  value={Array.isArray(proj.databases) ? proj.databases.join(", ") : proj.databases || ""}
                  onChange={(e) =>
                    handleProjectFieldChange(
                      idx,
                      "databases",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  className="input text-xs mt-1"
                  placeholder="e.g. PostgreSQL, Redis, MongoDB"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Key Architectural Decisions</label>
                <input
                  type="text"
                  value={proj.keyDecisions || ""}
                  onChange={(e) => handleProjectFieldChange(idx, "keyDecisions", e.target.value)}
                  className="input text-xs mt-1"
                  placeholder="e.g. Asynchronous queue processing, normalization trade-offs"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Skills and Technologies Chips */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Verified Technical Skills</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-indigo-400 hover:text-indigo-600 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
              placeholder="Add skill (e.g. System Design)"
              className="input text-xs !py-1.5"
            />
            <button type="button" onClick={handleAddSkill} className="btn-secondary !py-1.5 !px-3 text-xs">
              Add
            </button>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Verified Technologies & Frameworks</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {technologies.map((tech, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                {tech}
                <button
                  type="button"
                  onClick={() => handleRemoveTech(tech)}
                  className="text-emerald-400 hover:text-emerald-600 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTech()}
              placeholder="Add tech (e.g. Kafka)"
              className="input text-xs !py-1.5"
            />
            <button type="button" onClick={handleAddTech} className="btn-secondary !py-1.5 !px-3 text-xs">
              Add
            </button>
          </div>
        </Card>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Button
          type="button"
          onClick={handleSaveCorrections}
          disabled={saving}
          className="btn-secondary text-xs font-semibold"
        >
          {saving ? "Saving..." : "Save Corrections"}
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Auto-starts in {remainingSeconds}s</span>
          <Button onClick={onStartEarly} className="btn-primary">
            Confirm & Start Interview →
          </Button>
        </div>
      </div>
    </div>
  );
}
