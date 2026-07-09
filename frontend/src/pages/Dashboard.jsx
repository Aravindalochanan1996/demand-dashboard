import React, { useEffect, useState, useCallback } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import DataTable from "../components/DataTable";
import UploadExcelModal from "../components/UploadExcelModal";
import DeletedRowsModal from "../components/DeletedRowsModal";

export default function Dashboard() {
  const { auth } = useAuth();
  const isAdmin = auth.role === "admin";

  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [rows, setRows] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [lastEdited, setLastEdited] = useState(null);
  const [error, setError] = useState("");

  const loadClients = useCallback(async () => {
    const res = await api.get("/api/clients");
    setClients(res.data);
    if (res.data.length > 0 && !selectedClientId) {
      setSelectedClientId(res.data[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRows = useCallback(async (clientId) => {
    if (!clientId) return;
    const res = await api.get(`/api/clients/${clientId}/rows`);
    setRows(res.data);
  }, []);

  const loadLastEdited = useCallback(async () => {
    if (!isAdmin) return;
    const res = await api.get("/api/admin/last-edited");
    setLastEdited(res.data.most_recent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    loadClients();
    loadLastEdited();
  }, [loadClients, loadLastEdited]);

  useEffect(() => {
    loadRows(selectedClientId);
  }, [selectedClientId, loadRows]);

  const handleCellSave = async (rowId, field, value) => {
    setError("");
    try {
      await api.put(`/api/clients/${selectedClientId}/rows/${rowId}`, { [field]: value });
      await loadRows(selectedClientId);
      await loadLastEdited();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save change");
    }
  };

  const handleDeleteRow = async (rowId) => {
    if (!window.confirm("Delete this row? It can still be viewed under Deleted Rows.")) return;
    try {
      await api.delete(`/api/admin/clients/${selectedClientId}/rows/${rowId}`);
      await loadRows(selectedClientId);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete row");
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="dashboard-layout">
      <Navbar
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onUploadClick={() => setShowUpload(true)}
        onViewDeletedClick={() => setShowDeleted(true)}
        lastEditedLabel={
          lastEdited
            ? `Last edited by ${lastEdited.edited_by} on ${lastEdited.client}`
            : null
        }
      />
      <div className="dashboard-body">
        <Sidebar
          clients={clients}
          selectedClientId={selectedClientId}
          onSelect={(id) => {
            setSelectedClientId(id);
            setEditMode(false);
          }}
        />
        <main className="dashboard-content">
          <h2>{selectedClient ? selectedClient.name : "Select a client"}</h2>
          {error && <div className="error-text">{error}</div>}
          {selectedClientId && (
            <DataTable
              rows={rows}
              editMode={editMode}
              onCellSave={handleCellSave}
              isAdmin={isAdmin}
              onDeleteRow={handleDeleteRow}
            />
          )}
        </main>
      </div>

      {showUpload && (
        <UploadExcelModal
          onClose={() => setShowUpload(false)}
          onUploaded={async () => {
            await loadClients();
            await loadRows(selectedClientId);
          }}
        />
      )}
      {showDeleted && selectedClientId && (
        <DeletedRowsModal clientId={selectedClientId} onClose={() => setShowDeleted(false)} />
      )}
    </div>
  );
}
