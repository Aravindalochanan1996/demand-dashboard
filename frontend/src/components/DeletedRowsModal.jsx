import React, { useEffect, useState } from "react";
import api from "../api";

export default function DeletedRowsModal({ clientId, columns, onClose }) {
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
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {columns.map((c) => (
                      <td key={c}>{String(r.data?.[c] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
