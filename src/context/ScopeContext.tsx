import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export interface AppliedScope {
  ministryId: string | null;      // null = all
  headquartersId: string | null;
  regionalId: string | null;
  congregationId: string | null;
}

interface ScopeContextValue {
  applied: AppliedScope | null;
  apply: (s: AppliedScope) => void;
  reset: () => void;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [applied, setApplied] = useState<AppliedScope | null>(null);
  const value = useMemo<ScopeContextValue>(() => ({
    applied,
    apply: (s) => setApplied(s),
    reset: () => setApplied(null),
  }), [applied]);
  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope must be used within ScopeProvider");
  return ctx;
}