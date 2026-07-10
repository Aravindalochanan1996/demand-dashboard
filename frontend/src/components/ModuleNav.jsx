import React from "react";
import { NavLink } from "react-router-dom";

const MODULES = [
  { path: "/dashboard", label: "Demand Dashboard", icon: "📊" },
  { path: "/ats-tracker", label: "ATS Tracker", icon: "🎯" },
  { path: "/resume-builder", label: "Resume Builder", icon: "📝" },
  { path: "/resume-analyzer", label: "Resume Analyzer", icon: "💬" },
];

export default function ModuleNav() {
  return (
    <nav className="module-nav">
      {MODULES.map((m) => (
        <NavLink
          key={m.path}
          to={m.path}
          className={({ isActive }) => "module-tab" + (isActive ? " active" : "")}
        >
          <span className="module-icon">{m.icon}</span>
          <span className="module-label">{m.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
