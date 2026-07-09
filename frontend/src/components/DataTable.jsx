import React, { useState } from "react";

const COLUMNS = [
  { key: "date", label: "Date", editable: false },
  { key: "role", label: "Role", editable: false },
  { key: "required_positions", label: "Required Positions", editable: false },
  { key: "profiles_submitted", label: "Profiles Submitted", editable: true },
  { key: "drop_out_profile", label: "Drop out profile", editable: true },
  { key: "pending_interview", label: "Pending Interview", editable: true },
  { key: "interview_round1", label: "Interview Round 1", editable: true },
  { key: "interview_round2", label: "Interview Round 2", editable: true },
  { key: "selected", label: "Selected", editable: true },
];

export default function DataTable({ rows, editMode, onCellSave, isAdmin, onDeleteRow }) {
  const [draft, setDraft] = useState({}); // { `${rowId}-${field}`: value }

  const cellKey = (rowId, field) => `${rowId}-${field}`;

  const handleChange = (rowId, field, value) => {
    setDraft((d) => ({ ...d, [cellKey(rowId, field)]: value }));
  };

  const handleBlur = (row, field) => {
    const key = cellKey(row.id, field);
    if (!(key in draft)) return;
    const rawValue = draft[key];
    const numValue = rawValue === "" ? null : Number(rawValue);
    if (numValue !== row[field]) {
      onCellSave(row.id, field, numValue);
    }
  };

  const totals = COLUMNS.reduce((acc, col) => {
    if (col.key === "date" || col.key === "role") return acc;
    acc[col.key] = rows.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
    return acc;
  }, {});

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {COLUMNS.map((col) => {
                const editableNow = editMode && col.editable;
                const key = cellKey(row.id, col.key);
                const value = key in draft ? draft[key] : row[col.key] ?? "";
                return (
                  <td key={col.key} className={col.editable ? "editable-col" : ""}>
                    {editableNow ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(row.id, col.key, e.target.value)}
                        onBlur={() => handleBlur(row, col.key)}
                      />
                    ) : (
                      row[col.key] ?? ""
                    )}
                  </td>
                );
              })}
              {isAdmin && (
                <td>
                  <button className="btn danger small" onClick={() => onDeleteRow(row.id)}>
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + (isAdmin ? 1 : 0)} className="empty-note">
                No rows to display
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td>
                <strong>Total</strong>
              </td>
              <td />
              {COLUMNS.slice(2).map((col) => (
                <td key={col.key}>
                  <strong>{totals[col.key]}</strong>
                </td>
              ))}
              {isAdmin && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
