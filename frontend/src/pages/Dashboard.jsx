import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import ModuleNav from "../components/ModuleNav";
import ClientTabs from "../components/ClientTabs";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editMode, setEditMode] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showModuleNav, setShowModuleNav] = useState(true);
  const [lastEdited, setLastEdited] = useState(null);
  const [error, setError] = useState("");

  const loadClients = useCallback(async () => {
    const res = await api.get("/api/clients");
    setClients(res.data);
    const firstId = res.data.length > 0 ? res.data[0].id : null;
    setSelectedClientId((prev) => prev || firstId);
    return res.data;
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

  // reset paging when client or rows change or search changes
  useEffect(() => {
    setPage(1);
  }, [selectedClientId, rows, search, pageSize]);

  const handleCellSave = async (rowId, field, value) => {
    setError("");
    try {
      await api.put(`/api/clients/${selectedClientId}/rows/${rowId}`, { data: { [field]: value } });
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

  const handleBulkDelete = async (rowIds) => {
    if (!window.confirm(`Delete ${rowIds.length} selected row(s)?`)) return;
    try {
      await api.post(`/api/admin/clients/${selectedClientId}/rows/bulk-delete`, { row_ids: rowIds });
      await loadRows(selectedClientId);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete selected rows");
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const columns = selectedClient?.columns || [];

  const filteredRows = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (r.id && String(r.id).toLowerCase().includes(q)) return true;
      const vals = Object.values(r.data || {}).map((v) => (v == null ? "" : String(v).toLowerCase()));
      return vals.some((v) => v.includes(q));
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const displayedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  return (
    <div className="dashboard-layout">
      <Navbar
        editMode={editMode}
        onToggleEdit={() => setEditMode((v) => !v)}
        onToggleMenu={() => setShowModuleNav((v) => !v)}
        onUploadClick={() => setShowUpload(true)}
        onViewDeletedClick={selectedClientId ? () => setShowDeleted(true) : undefined}
        lastEditedLabel={
          lastEdited ? `Last edited by ${lastEdited.edited_by} on ${lastEdited.client}` : null
        }
      />
      <div className="dashboard-body">
        <div className={"module-nav-wrap" + (showModuleNav ? " open" : "")}>
          <ModuleNav />
        </div>
        { /* overlay shown only on small screens when module nav is open */ }
        {showModuleNav && <div className="module-nav-overlay" onClick={() => setShowModuleNav(false)} />}
        <main className="dashboard-content">
          <h2>Demand Dashboard</h2>
          <ClientTabs
            clients={clients}
            selectedClientId={selectedClientId}
            onSelect={(id) => {
              setSelectedClientId(id);
              setEditMode(false);
            }}
          />
          <div className="controls-row">
            <input
              className="search-input"
              placeholder="Search rows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="pagination-controls">
              <label>
                Rows per page:
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <div className="pager">
                <button className="btn secondary small" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page<=1}>
                  Prev
                </button>
                <span className="pager-info">Page {page} / {totalPages}</span>
                <button className="btn secondary small" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page>=totalPages}>
                  Next
                </button>
              </div>
            </div>
          </div>
          {error && <div className="error-text">{error}</div>}
          {selectedClientId && (
            <DataTable
              columns={columns}
              rows={displayedRows}
              editMode={editMode}
              onCellSave={handleCellSave}
              isAdmin={isAdmin}
              onDeleteRow={handleDeleteRow}
              onBulkDelete={handleBulkDelete}
            />
          )}
        </main>
      </div>

      {showUpload && (
        <UploadExcelModal
          onClose={() => setShowUpload(false)}
          onUploaded={async () => {
            const newClients = await loadClients();
            const newId = newClients && newClients.length > 0 ? newClients[0].id : selectedClientId;
            setSelectedClientId(newId);
            if (newId) await loadRows(newId);
          }}
        />
      )}
      {showDeleted && selectedClientId && (
        <DeletedRowsModal clientId={selectedClientId} columns={columns} onClose={() => setShowDeleted(false)} />
      )}
    </div>
  );
}
