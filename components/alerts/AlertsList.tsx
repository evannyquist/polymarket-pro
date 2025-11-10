"use client";

import { useAlerts } from "./AlertsContext";

function fmt(x: number) {
  return (Math.round(x * 1000) / 1000).toFixed(3);
}

export default function AlertsList() {
  const { alerts, removeAlert } = useAlerts();

  if (alerts.length === 0) {
    return (
      <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Active Alerts</h2>
            <p className="text-sm text-gray-400">Your price alerts will appear here</p>
          </div>
        </div>
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500">No alerts yet. Create one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1117] border border-gray-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Active Alerts</h2>
          <p className="text-sm text-gray-400">
            {alerts.filter((a) => a.active).length} active, {alerts.filter((a) => !a.active).length} triggered
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              alert.active
                ? "bg-gray-900/30 border-gray-700/50 hover:border-gray-600/50"
                : "bg-gray-900/20 border-gray-800/30 opacity-60"
            }`}
          >
            <div className="flex items-center gap-4 flex-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  alert.active ? "bg-blue-500 animate-pulse" : "bg-gray-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{alert.label || "Price Alert"}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      alert.active
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {alert.active ? "Active" : "Triggered"}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  Price {alert.direction === "above" ? "≥" : "≤"} {fmt(alert.threshold)}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeAlert(alert.id)}
              className="ml-4 p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Remove alert"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

