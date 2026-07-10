import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({
  editMode,
  onToggleEdit,
  onUploadClick,
  onViewDeletedClick,
  lastEditedLabel,
  onToggleMenu,
  menuOpen = false,
}) {
  const { auth, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        {onToggleMenu && (
          <button
            className="hamburger btn text"
            onClick={onToggleMenu}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
        <span className="brand">✨ Demand Dashboard</span>
        {lastEditedLabel && <span className="last-edited-pill">{lastEditedLabel}</span>}
      </div>
      <div className="navbar-right">
        {auth.role === "admin" && (
          <>
            <Link className="btn secondary" to="/admin/users">
              Manage Users
            </Link>
            {onUploadClick && (
              <button className="btn secondary" onClick={onUploadClick}>
                Upload Excel
              </button>
            )}
            {onViewDeletedClick && (
              <button className="btn secondary" onClick={onViewDeletedClick}>
                View Deleted Rows
              </button>
            )}
          </>
        )}
        {onToggleEdit && (
          <button className={`btn ${editMode ? "primary" : "secondary"}`} onClick={onToggleEdit}>
            {editMode ? "Done Editing" : "Edit"}
          </button>
        )}
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
