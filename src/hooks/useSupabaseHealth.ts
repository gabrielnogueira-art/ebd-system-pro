import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnStatus = "checking" | "online" | "offline";

export interface SupabaseHealth {
  status: ConnStatus;
  lastError: string | null;
  lastCheck: Date | null;
  projectUrl: string;
}

const PROJECT_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ?? "https://tqgsirutntejwkowplnc.supabase.co";

const healthListeners = new Set<(v: SupabaseHealth) => void>();
let healthState: SupabaseHealth = {
  status: "checking",
  lastError: null,
  lastCheck: null,
  projectUrl: PROJECT_URL,
};
let healthStarted = false;
let healthTimer: ReturnType<typeof setInterval> | null = null;
let healthInflight: Promise<void> | null = null;

function emit(next: SupabaseHealth) {
  healthState = next;
  healthListeners.forEach((listener) => listener(next));
}

async function ping() {
  if (healthInflight) return healthInflight;
  healthInflight = (async () => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .select("key")
        .limit(1);
      if (error) {
        console.error("[Supabase] Falha no health-check:", error.message);
        emit({ ...healthState, status: "offline", lastError: error.message, lastCheck: new Date() });
      } else {
        emit({ ...healthState, status: "online", lastError: null, lastCheck: new Date() });
      }
    } catch (e: any) {
      console.error("[Supabase] Erro de rede no health-check:", e?.message ?? e);
      emit({ ...healthState, status: "offline", lastError: e?.message ?? String(e), lastCheck: new Date() });
    } finally {
      healthInflight = null;
    }
  })();
  return healthInflight;
}

function startHealth(intervalMs: number) {
  if (healthStarted) return;
  healthStarted = true;
  ping();
  healthTimer = setInterval(ping, intervalMs);
}

/**
 * Faz ping leve no banco a cada 30s para mostrar status de conexao.
 */
export function useSupabaseHealth(intervalMs = 30000): SupabaseHealth {
  const [state, setState] = useState<SupabaseHealth>(healthState);

  useEffect(() => {
    startHealth(intervalMs);
    healthListeners.add(setState);
    setState(healthState);
    return () => {
      healthListeners.delete(setState);
    };
  }, [intervalMs]);

  return state;
}