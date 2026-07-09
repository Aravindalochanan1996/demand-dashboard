import React, { useEffect, useState } from "react";
import api from "../api";

export default function DeletedRowsModal({ clientId, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDeleted = async () => {
      try {
        const res = await api.get(`/api/admin/clients/${clientId}/rows/deleted`);
        setRows(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load deleted rows");
      } finally {
        setLoading(false);
      }
    };
    fetchDeleted();
  }, [clientId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <h2>Deleted Rows</h2>
        {loading && <p>Loading...</p>}
        {error && <div className="error-text">{error}</div>}
        {!loading && rows.length === 0 && <p className="empty-note">No deleted rows for this client</p>}
        {rows.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Role</th>
                <th>Required Positions</th>
                <th>Profiles Submitted</th>
                <th>Selected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.role}</td>
                  <td>{r.required_positions}</td>
                  <td>{r.profiles_submitted}</td>
                  <td>{r.selected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
