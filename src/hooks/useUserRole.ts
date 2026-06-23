import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "master"
  | "igreja_mae"
  | "igreja_sede"
  | "admin_regional"
  | "secretario_ebd"
  | "professor_classe";

export interface UserRoleInfo {
  role: AppRole | null;
  ministryId: string | null;
  headquartersId: string | null;
  regionalId: string | null;
  congregationId: string | null;
  loading: boolean;
}

// Prioridade do mais alto pro mais baixo
const ROLE_PRIORITY: AppRole[] = [
  "master",
  "igreja_mae",
  "igreja_sede",
  "admin_regional",
  "secretario_ebd",
  "professor_classe",
];

/**
 * Le o(s) papel(eis) do usuario logado e devolve o de maior escopo,
 * junto com os ids de ministerio/sede/congregacao quando aplicaveis.
 */
export function useUserRole(): UserRoleInfo {
  const [info, setInfo] = useState<UserRoleInfo>({
    role: null,
    ministryId: null,
    headquartersId: null,
    regionalId: null,
    congregationId: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active)
          setInfo({
            role: null,
            ministryId: null,
            headquartersId: null,
            regionalId: null,
            congregationId: null,
            loading: false,
          });
        return;
      }
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role, ministry_id, headquarters_id, regional_id, congregation_id");

      if (!active) return;
      if (error || !data || data.length === 0) {
        setInfo({
          role: null,
          ministryId: null,
          headquartersId: null,
          regionalId: null,
          congregationId: null,
          loading: false,
        });
        return;
      }
      const rows = (data as unknown) as Array<{
        role: AppRole;
        ministry_id: string | null;
        headquarters_id: string | null;
        regional_id: string | null;
        congregation_id: string | null;
      }>;
      const chosen =
        ROLE_PRIORITY.map((r) => rows.find((x) => x.role === r)).find(Boolean) ??
        rows[0];

      setInfo({
        role: chosen!.role,
        ministryId: chosen!.ministry_id ?? null,
        headquartersId: chosen!.headquarters_id ?? null,
        regionalId: chosen!.regional_id ?? null,
        congregationId: chosen!.congregation_id ?? null,
        loading: false,
      });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Defer: nunca executar awaits do Supabase direto no callback de auth.
      setTimeout(() => { if (active) load(); }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return info;
}