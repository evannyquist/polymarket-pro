"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";

type AlertRule = {
  id: string;
  direction: "above" | "below";
  threshold: number; // 0..1
  label?: string;
  active: boolean;
};

type AlertsCtx = {
  alerts: AlertRule[];
  addAlert: (rule: Omit<AlertRule, "id" | "active">) => void;
  removeAlert: (id: string) => void;
  evaluateAlerts: (price: number) => void;
};

const Ctx = createContext<AlertsCtx | null>(null);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);

  const addAlert = useCallback((rule: Omit<AlertRule, "id" | "active">) => {
    setAlerts((a) => [
      ...a,
      { ...rule, id: crypto.randomUUID(), active: true }
    ]);
    toast.success(`Alert created: ${rule.direction} ${fmt(rule.threshold)}`);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((a) => a.filter((r) => r.id !== id));
    toast(`Alert removed`);
  }, []);

  const evaluateAlerts = useCallback((price: number) => {
    setAlerts((a) =>
      a.map((r) => {
        if (!r.active) return r;
        const hit =
          (r.direction === "above" && price >= r.threshold) ||
          (r.direction === "below" && price <= r.threshold);
        if (hit) {
          toast(`🔔 ${r.label ?? "Price"} ${r.direction} ${fmt(r.threshold)} (now ${fmt(price)})`);
          return { ...r, active: false }; // one-shot for now
        }
        return r;
      })
    );
  }, []);

  const value = useMemo(() => ({ alerts, addAlert, removeAlert, evaluateAlerts }), [alerts, addAlert, removeAlert, evaluateAlerts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAlerts() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}

function fmt(x: number) {
  return (Math.round(x * 1000) / 1000).toFixed(3);
}
