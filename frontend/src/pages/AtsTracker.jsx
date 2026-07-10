import React, { useEffect, useState } from "react";
import api from "../api";
import ModuleNav from "../components/ModuleNav";
import Navbar from "../components/Navbar";

const STATUSES = ["Applied", "Interview", "Offer", "Rejected"];

export default function AtsTracker() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ company: "", role: "", applied_date: "", notes: "" });
  const [showModuleNav, setShowModuleNav] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await api.get("/api/ats");
    setEntries(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/ats", { ...form, status: "Applied" });
      setForm({ company: "", role: "", applied_date: "", notes: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add entry");
    }
  };

  const moveStatus = async (entry, newStatus) => {
    await api.put(`/api/ats/${entry.id}`, { ...entry, status: newStatus });
    load();
  };

  const remove = async (id) => {
    await api.delete(`/api/ats/${id}`);
    load();
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
          <h2>ATS Tracker</h2>
          <p className="subtitle">
            A simple Kanban for tracking your own applications, modeled after the flow used by
            tools like Huntr and Teal - add an application, then drag it forward as it progresses.
          </p>

          <form className="card-form inline-form" onSubmit={handleAdd}>
            <input
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              required
            />
            <input
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
            />
            <input
              type="date"
              value={form.applied_date}
              onChange={(e) => setForm({ ...form, applied_date: e.target.value })}
            />
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button className="btn primary" type="submit">
              Add Application
            </button>
          </form>
          {error && <div className="error-text">{error}</div>}

          <div className="kanban-board">
            {STATUSES.map((status) => (
              <div key={status} className={`kanban-column status-${status.toLowerCase()}`}>
                <h3>{status}</h3>
                {entries
                  .filter((e) => e.status === status)
                  .map((entry) => (
                    <div key={entry.id} className="kanban-card">
                      <strong>{entry.company}</strong>
                      <div>{entry.role}</div>
                      {entry.applied_date && <div className="card-meta">{entry.applied_date}</div>}
                      {entry.notes && <div className="card-notes">{entry.notes}</div>}
                      <div className="kanban-card-actions">
                        <select
                          value={entry.status}
                          onChange={(e) => moveStatus(entry, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button className="btn danger small" onClick={() => remove(entry.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
