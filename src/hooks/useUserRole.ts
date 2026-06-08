import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "secretario_ebd" | "professor_classe";

export interface UserRoleInfo {
  role: AppRole | null;
  congregationId: string | null;
  loading: boolean;
}

/**
 * Le o(s) papel(eis) do usuario logado a partir da tabela public.user_roles.
 * Prioriza secretario_ebd quando o usuario tem ambos os papeis.
 */
export function useUserRole(): UserRoleInfo {
  const [info, setInfo] = useState<UserRoleInfo>({
    role: null,
    congregationId: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setInfo({ role: null, congregationId: null, loading: false });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role, congregation_id")
        .eq("user_id", user.id);

      if (!active) return;
      if (error || !data || data.length === 0) {
        setInfo({ role: null, congregationId: null, loading: false });
        return;
      }
      const rows = (data as unknown) as Array<{ role: AppRole; congregation_id: string | null }>;
      const admin = rows.find((r) => r.role === "secretario_ebd");
      const chosen = admin ?? rows[0];
      setInfo({
        role: chosen.role,
        congregationId: chosen.congregation_id,
        loading: false,
      });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return info;
}