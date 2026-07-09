import React, { useState } from "react";
import api from "../api";

export default function UploadExcelModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/admin/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSummary(res.data.summary);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Upload Excel</h2>
        <p className="subtitle">
          Each sheet becomes a client in the sidepane. Sheet headers should match: Date, Role,
          Required Positions, Profiles Submitted, Drop out profile, Pending Interview, Interview
          Round 1, Interview Round 2, Selected.
        </p>
        <input
          type="file"
          accept=".xlsx,.xlsm"
          onChange={(e) => setFile(e.target.files[0])}
        />
        {error && <div className="error-text">{error}</div>}
        {summary && (
          <ul className="upload-summary">
            {summary.map((s) => (
              <li key={s.client}>
                {s.client}: {s.rows_imported} rows imported
              </li>
            ))}
          </ul>
        )}
        <div className="modal-actions">
          <button className="btn secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn primary" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
