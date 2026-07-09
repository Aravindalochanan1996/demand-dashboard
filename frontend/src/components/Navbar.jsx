import React from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({
  editMode,
  onToggleEdit,
  onUploadClick,
  onViewDeletedClick,
  lastEditedLabel,
}) {
  const { auth, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="brand">Demand Dashboard</span>
        {lastEditedLabel && <span className="last-edited-pill">{lastEditedLabel}</span>}
      </div>
      <div className="navbar-right">
        {auth.role === "admin" && (
          <>
            <button className="btn secondary" onClick={onUploadClick}>
              Upload Excel
            </button>
            <button className="btn secondary" onClick={onViewDeletedClick}>
              View Deleted Rows
            </button>
          </>
        )}
        <button className={`btn ${editMode ? "primary" : "secondary"}`} onClick={onToggleEdit}>
          {editMode ? "Done Editing" : "Edit"}
        </button>
        <span className="user-chip">
          {auth.username} ({auth.role})
        </span>
        <button className="btn text" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
