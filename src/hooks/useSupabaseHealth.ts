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

/**
 * Faz ping leve no banco a cada 30s para mostrar status de conexao.
 */
export function useSupabaseHealth(intervalMs = 30000): SupabaseHealth {
  const [status, setStatus] = useState<ConnStatus>("checking");
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    const ping = async () => {
      try {
        const { error } = await supabase
          .from("ministries" as any)
          .select("id", { head: true, count: "exact" })
          .limit(1);
        if (!active) return;
        setLastCheck(new Date());
        if (error) {
          console.error("[Supabase] Falha no health-check:", error.message);
          setLastError(error.message);
          setStatus("offline");
        } else {
          setLastError(null);
          setStatus("online");
        }
      } catch (e: any) {
        if (!active) return;
        console.error("[Supabase] Erro de rede no health-check:", e?.message ?? e);
        setLastError(e?.message ?? String(e));
        setStatus("offline");
        setLastCheck(new Date());
      }
    };
    ping();
    const id = setInterval(ping, intervalMs);
    const { data: sub } = supabase.auth.onAuthStateChange(() => ping());
    return () => {
      active = false;
      clearInterval(id);
      sub.subscription.unsubscribe();
    };
  }, [intervalMs]);

  return { status, lastError, lastCheck, projectUrl: PROJECT_URL };
}