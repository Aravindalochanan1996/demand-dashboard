import React, { useEffect, useState } from "react";
import api from "../api";
import ModuleNav from "../components/ModuleNav";
import Navbar from "../components/Navbar";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("business_user");
  const [assignedClients, setAssignedClients] = useState([]);
  const [showModuleNav, setShowModuleNav] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    const res = await api.get("/api/admin/users");
    setUsers(res.data);
  };

  const loadClients = async () => {
    const res = await api.get("/api/clients");
    setClients(res.data);
  };

  useEffect(() => {
    loadUsers();
    loadClients();
  }, []);

  const toggleClient = (name) => {
    setAssignedClients((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api.post("/api/admin/users", {
        username,
        password,
        role,
        assigned_clients: role === "admin" ? [] : assignedClients,
      });
      setSuccess(`User "${username}" created.`);
      setUsername("");
      setPassword("");
      setRole("business_user");
      setAssignedClients([]);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create user");
    } finally {
      setSaving(false);
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
          <h2>Manage Users</h2>
          <p className="subtitle">Create business users and choose which clients they can see.</p>

          <div className="admin-users-grid">
            <form className="card-form" onSubmit={handleSubmit}>
              <h3>New user</h3>
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />

              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="business_user">Business User</option>
                <option value="admin">Admin</option>
              </select>

              {role === "business_user" && (
                <>
                  <label>Assigned clients</label>
                  <div className="client-checkbox-list">
                    {clients.length === 0 && <p className="empty-note">No clients yet - upload an Excel file first</p>}
                    {clients.map((c) => (
                      <label key={c.id} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={assignedClients.includes(c.name)}
                          onChange={() => toggleClient(c.name)}
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </>
              )}

              {error && <div className="error-text">{error}</div>}
              {success && <div className="success-text">{success}</div>}

              <button className="btn primary" type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create User"}
              </button>
            </form>

            <div className="card-form">
              <h3>Existing users</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Assigned Clients</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.username}>
                      <td>{u.username}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>{u.role}</span>
                      </td>
                      <td>{u.assigned_clients.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
