import React, { useState, useEffect } from "react";

// First N columns (positional, whatever their header text is) are locked -
// matches the backend's NON_EDITABLE_COLUMN_COUNT.
const NON_EDITABLE_COLUMN_COUNT = 3;

export default function DataTable({
  columns,
  rows,
  editMode,
  onCellSave,
  isAdmin,
  onDeleteRow,
  onBulkDelete,
}) {
  const [draft, setDraft] = useState({});
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  const cellKey = (rowId, field) => `${rowId}::${field}`;

  const isEditableColumn = (idx) => idx >= NON_EDITABLE_COLUMN_COUNT;

  const handleChange = (rowId, field, value) => {
    setDraft((d) => ({ ...d, [cellKey(rowId, field)]: value }));
  };

  const handleBlur = (row, field) => {
    const key = cellKey(row.id, field);
    if (!(key in draft)) return;
    const rawValue = draft[key];
    const current = row.data?.[field];
    if (rawValue !== String(current ?? "")) {
      const numeric = rawValue !== "" && !isNaN(Number(rawValue)) ? Number(rawValue) : rawValue;
      onCellSave(row.id, field, numeric === "" ? null : numeric);
    }
  };

  const toggleRow = (rowId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  };

  const numericColumns = columns.filter((_, idx) => idx >= 2); // Required Positions onward, matches screenshot's totals row

  const totals = numericColumns.reduce((acc, col) => {
    const sum = rows.reduce((s, r) => {
      const v = Number(r.data?.[col]);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    acc[col] = sum;
    return acc;
  }, {});

  return (
    <div className="table-wrapper">
      {isAdmin && selected.size > 0 && (
        <div className="bulk-actions-bar">
          <span>{selected.size} row(s) selected</span>
          <button
            className="btn danger small"
            onClick={() => {
              onBulkDelete(Array.from(selected));
              setSelected(new Set());
            }}
          >
            Delete Selected
          </button>
        </div>
      )}
      <table className="data-table">
        <thead>
          <tr>
            {isAdmin && (
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col, idx) => (
              <th key={col} className={isEditableColumn(idx) ? "editable-header" : ""}>
                {col}
              </th>
            ))}
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={selected.has(row.id) ? "row-selected" : ""}>
              {isAdmin && (
                <td className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                  />
                </td>
              )}
              {columns.map((col, idx) => {
                const editableNow = editMode && isEditableColumn(idx);
                const key = cellKey(row.id, col);
                const rawValue = row.data?.[col] ?? "";
                const value = key in draft ? draft[key] : rawValue;
                const formatDate = (v) => {
                  if (v == null || v === "") return "";
                  // If already YYYY-MM-DD, leave it
                  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
                  // ISO date-time like 2026-07-03T00:00:00
                  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
                    try {
                      const d = new Date(v);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      return `${y}-${m}-${day}`;
                    } catch (e) {
                      return String(v);
                    }
                  }
                  return String(v);
                };

                return (
                  <td key={col} className={isEditableColumn(idx) ? "editable-col" : ""}>
                    {editableNow ? (
                      <input
                        value={value}
                        onChange={(e) => handleChange(row.id, col, e.target.value)}
                        onBlur={() => handleBlur(row, col)}
                      />
                    ) : (
                      formatDate(rawValue)
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
              <td
                colSpan={columns.length + (isAdmin ? 2 : 0)}
                className="empty-note"
              >
                No rows to display
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              {isAdmin && <td />}
              <td>
                <strong>Total</strong>
              </td>
              <td />
              {numericColumns.map((col) => (
                <td key={col}>
                  <strong>{totals[col]}</strong>
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
