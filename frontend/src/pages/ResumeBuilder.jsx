import React, { useEffect, useState } from "react";
import api from "../api";
import ModuleNav from "../components/ModuleNav";
import Navbar from "../components/Navbar";

const emptyExperience = { company: "", role: "", dates: "", description: "" };
const emptyEducation = { school: "", degree: "", dates: "" };

export default function ResumeBuilder() {
  const [draft, setDraft] = useState({
    full_name: "",
    title: "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
  });
  const [showModuleNav, setShowModuleNav] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    api.get("/api/resume-builder").then((res) => {
      if (res.data) setDraft(res.data);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put("/api/resume-builder", draft);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const addExperience = () => setDraft({ ...draft, experience: [...draft.experience, { ...emptyExperience }] });
  const addEducation = () => setDraft({ ...draft, education: [...draft.education, { ...emptyEducation }] });
  const addSkill = () => {
    if (skillInput.trim()) {
      setDraft({ ...draft, skills: [...draft.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const aiSuggestSummary = async () => {
    setSuggesting(true);
    try {
      const res = await api.post("/api/resume-builder/ai-suggest", {
        section: "summary",
        context: `Name: ${draft.full_name}. Title: ${draft.title}. Skills: ${draft.skills.join(", ")}`,
      });
      setDraft({ ...draft, summary: res.data.suggestion });
    } catch (err) {
      alert(err.response?.data?.detail || "AI suggestion failed - check ANTHROPIC_API_KEY in backend/.env");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Navbar onToggleMenu={() => setShowModuleNav((v) => !v)} menuOpen={showModuleNav} />
      <div className="dashboard-body">
        <div className={"module-nav-wrap" + (showModuleNav ? " open" : "")}>
          <ModuleNav />
        </div>
        {showModuleNav && <div className="module-nav-overlay" onClick={() => setShowModuleNav(false)} />}
        <main className="dashboard-content">
          <h2>Resume Builder</h2>
          <p className="subtitle">
            Basic structure inspired by Novoresume's editor: fill in sections on the left, see a
            live preview on the right.
          </p>

          <div className="resume-builder-grid">
            <div className="card-form">
              <label>Full name</label>
              <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />

              <label>Title / headline</label>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />

              <label>
                Summary{" "}
                <button type="button" className="btn text small" onClick={aiSuggestSummary} disabled={suggesting}>
                  {suggesting ? "Thinking..." : "✨ AI suggest"}
                </button>
              </label>
              <textarea
                rows={4}
                value={draft.summary}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              />

              <h3>Experience</h3>
              {draft.experience.map((exp, i) => (
                <div key={i} className="repeating-block">
                  <input
                    placeholder="Company"
                    value={exp.company}
                    onChange={(e) => {
                      const next = [...draft.experience];
                      next[i] = { ...exp, company: e.target.value };
                      setDraft({ ...draft, experience: next });
                    }}
                  />
                  <input
                    placeholder="Role"
                    value={exp.role}
                    onChange={(e) => {
                      const next = [...draft.experience];
                      next[i] = { ...exp, role: e.target.value };
                      setDraft({ ...draft, experience: next });
                    }}
                  />
                  <input
                    placeholder="Dates (e.g. 2022 - Present)"
                    value={exp.dates}
                    onChange={(e) => {
                      const next = [...draft.experience];
                      next[i] = { ...exp, dates: e.target.value };
                      setDraft({ ...draft, experience: next });
                    }}
                  />
                  <textarea
                    placeholder="Description"
                    rows={2}
                    value={exp.description}
                    onChange={(e) => {
                      const next = [...draft.experience];
                      next[i] = { ...exp, description: e.target.value };
                      setDraft({ ...draft, experience: next });
                    }}
                  />
                </div>
              ))}
              <button type="button" className="btn secondary small" onClick={addExperience}>
                + Add experience
              </button>

              <h3>Education</h3>
              {draft.education.map((edu, i) => (
                <div key={i} className="repeating-block">
                  <input
                    placeholder="School"
                    value={edu.school}
                    onChange={(e) => {
                      const next = [...draft.education];
                      next[i] = { ...edu, school: e.target.value };
                      setDraft({ ...draft, education: next });
                    }}
                  />
                  <input
                    placeholder="Degree"
                    value={edu.degree}
                    onChange={(e) => {
                      const next = [...draft.education];
                      next[i] = { ...edu, degree: e.target.value };
                      setDraft({ ...draft, education: next });
                    }}
                  />
                  <input
                    placeholder="Dates"
                    value={edu.dates}
                    onChange={(e) => {
                      const next = [...draft.education];
                      next[i] = { ...edu, dates: e.target.value };
                      setDraft({ ...draft, education: next });
                    }}
                  />
                </div>
              ))}
              <button type="button" className="btn secondary small" onClick={addEducation}>
                + Add education
              </button>

              <h3>Skills</h3>
              <div className="inline-form">
                <input
                  placeholder="Add a skill and press Add"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                />
                <button type="button" className="btn secondary small" onClick={addSkill}>
                  Add
                </button>
              </div>
              <div className="skill-chips">
                {draft.skills.map((s, i) => (
                  <span key={i} className="skill-chip">
                    {s}
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, skills: draft.skills.filter((_, idx) => idx !== i) })}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <button className="btn primary" onClick={save} disabled={saving} style={{ marginTop: 20 }}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
              {saved && <span className="success-text"> Saved!</span>}
            </div>

            <div className="resume-preview">
              <h1>{draft.full_name || "Your Name"}</h1>
              <div className="preview-title">{draft.title}</div>
              {draft.summary && <p className="preview-summary">{draft.summary}</p>}

              {draft.experience.length > 0 && (
                <>
                  <h4>Experience</h4>
                  {draft.experience.map((exp, i) => (
                    <div key={i} className="preview-block">
                      <div className="preview-block-header">
                        <strong>{exp.role}</strong> — {exp.company}
                        <span className="preview-dates">{exp.dates}</span>
                      </div>
                      <p>{exp.description}</p>
                    </div>
                  ))}
                </>
              )}

              {draft.education.length > 0 && (
                <>
                  <h4>Education</h4>
                  {draft.education.map((edu, i) => (
                    <div key={i} className="preview-block">
                      <div className="preview-block-header">
                        <strong>{edu.degree}</strong> — {edu.school}
                        <span className="preview-dates">{edu.dates}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {draft.skills.length > 0 && (
                <>
                  <h4>Skills</h4>
                  <div className="skill-chips">
                    {draft.skills.map((s, i) => (
                      <span key={i} className="skill-chip readonly">
                        {s}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
