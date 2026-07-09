import React from "react";

export default function Sidebar({ clients, selectedClientId, onSelect }) {
  return (
    <aside className="sidebar">
      <h3>Clients</h3>
      {clients.length === 0 && <p className="empty-note">No clients assigned yet</p>}
      <ul>
        {clients.map((c) => (
          <li
            key={c.id}
            className={c.id === selectedClientId ? "active" : ""}
            onClick={() => onSelect(c.id)}
          >
            {c.name}
          </li>
        ))}
      </ul>
    </aside>
  );
}
