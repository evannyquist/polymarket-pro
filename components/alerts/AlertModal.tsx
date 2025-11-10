"use client";

import { useState } from "react";
import { useAlerts } from "./AlertsContext";

export default function AlertModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAlert } = useAlerts();
  const [direction, setDirection] = useState<"above" | "below">("below");
  const [threshold, setThreshold] = useState<string>("0.55");
  const [label, setLabel] = useState<string>("Odds Alert");

  if (!open) return null;

  const save = () => {
    const th = Math.max(0, Math.min(1, Number(threshold)));
    addAlert({ direction, threshold: th, label });
    onClose();
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Create Alert</h3>

        <label style={labelStyle}>Direction</label>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as "above" | "below")}
          style={inputStyle}
        >
          <option value="above">Price at or above</option>
          <option value="below">Price at or below</option>
        </select>

        <label style={labelStyle}>Threshold (0.00–1.00)</label>
        <input
          type="number"
          step="0.001"
          min="0"
          max="1"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Label</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={save} style={btnPrimary}>Save Alert</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
};
const modalStyle: React.CSSProperties = {
  width: 420, background: "#0f1220", color: "white",
  border: "1px solid #1f232b", borderRadius: 12, padding: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
};
const labelStyle: React.CSSProperties = { display: "block", marginTop: 10, marginBottom: 6, opacity: 0.8 };
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#0b0d12", border: "1px solid #1f232b",
  borderRadius: 8, padding: "10px 12px", color: "white", outline: "none"
};
const btnPrimary: React.CSSProperties = {
  background: "#3b82f6", border: "none", color: "white", padding: "10px 14px", borderRadius: 8, fontWeight: 600, cursor: "pointer"
};
const btnGhost: React.CSSProperties = {
  background: "transparent", border: "1px solid #1f232b", color: "white", padding: "10px 14px", borderRadius: 8, cursor: "pointer"
};
