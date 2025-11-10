"use client";

import { useState, useEffect } from "react";
import { useAlerts } from "./AlertsContext";

export default function AlertModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAlert } = useAlerts();
  const [direction, setDirection] = useState<"above" | "below">("below");
  const [threshold, setThreshold] = useState<string>("0.55");
  const [label, setLabel] = useState<string>("Odds Alert");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  if (!open && !mounted) return null;

  const save = () => {
    const th = Math.max(0, Math.min(1, Number(threshold)));
    addAlert({ direction, threshold: th, label });
    setThreshold("0.55");
    setLabel("Odds Alert");
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className={`bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6 sm:p-8 w-full max-w-md mx-4 shadow-2xl transition-all duration-200 ${
          open ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Create Alert
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Direction</label>
            <div className="flex gap-2 p-1 bg-[#0a0c10] border border-gray-700/50 rounded-xl">
              <button
                type="button"
                onClick={() => setDirection("above")}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  direction === "above"
                    ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/25"
                    : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className={`w-4 h-4 ${direction === "above" ? "text-white" : "text-gray-500"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  <span>Price at or above</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDirection("below")}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  direction === "below"
                    ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25"
                    : "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className={`w-4 h-4 ${direction === "below" ? "text-white" : "text-gray-500"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <span>Price at or below</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Threshold <span className="text-gray-500 text-xs">(0.00–1.00)</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              max="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full bg-[#0a0c10] border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="0.55"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-[#0a0c10] border border-gray-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="Odds Alert"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 text-white font-medium rounded-xl transition-all duration-200 hover:border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200"
          >
            Save Alert
          </button>
        </div>
      </div>
    </div>
  );
}

