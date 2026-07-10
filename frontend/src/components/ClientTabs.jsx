import React from "react";

export default function ClientTabs({ clients, selectedClientId, onSelect }) {
  if (clients.length === 0) {
    return <p className="empty-note">No clients assigned yet</p>;
  }
  return (
    <div className="client-tabs">
      {clients.map((c) => (
        <button
          key={c.id}
          className={"client-tab" + (c.id === selectedClientId ? " active" : "")}
          onClick={() => onSelect(c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
