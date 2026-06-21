import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

export interface MinistryBranding {
  id: string;
  name: string;
  display_name: string | null;
  city: string | null;
  state: string | null;
  president_pastor: string | null;
  logo_url: string | null;
  brand_primary_hsl: string | null;
}

const db = supabase as any;

/**
 * Resolve o ministerio "ativo" do usuario logado.
 * - master/igreja_mae: usa o proprio ministry_id quando houver.
 * - demais: sobe pela hierarquia (sede -> regional -> congregacao) para achar.
 * - sem nada: pega o primeiro ministerio (caso single-tenant).
 */
export function useBranding() {
  const role = useUserRole();
  const [ministry, setMinistry] = useState<MinistryBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (role.loading) return;
    let active = true;
    (async () => {
      setLoading(true);
      let ministryId: string | null = role.ministryId ?? null;

      if (!ministryId && role.headquartersId) {
        const { data } = await db.from("headquarters").select("ministry_id").eq("id", role.headquartersId).maybeSingle();
        ministryId = data?.ministry_id ?? null;
      }
      if (!ministryId && role.regionalId) {
        const { data } = await db.from("regionals").select("headquarters_id").eq("id", role.regionalId).maybeSingle();
        if (data?.headquarters_id) {
          const { data: hq } = await db.from("headquarters").select("ministry_id").eq("id", data.headquarters_id).maybeSingle();
          ministryId = hq?.ministry_id ?? null;
        }
      }
      if (!ministryId && role.congregationId) {
        const { data } = await db.from("congregations").select("headquarters_id").eq("id", role.congregationId).maybeSingle();
        if (data?.headquarters_id) {
          const { data: hq } = await db.from("headquarters").select("ministry_id").eq("id", data.headquarters_id).maybeSingle();
          ministryId = hq?.ministry_id ?? null;
        }
      }

      let row: MinistryBranding | null = null;
      if (ministryId) {
        const { data } = await db.from("ministries").select("*").eq("id", ministryId).maybeSingle();
        row = (data as MinistryBranding) ?? null;
      } else {
        const { data } = await db.from("ministries").select("*").order("created_at").limit(1);
        row = (data?.[0] as MinistryBranding) ?? null;
      }
      if (active) {
        setMinistry(row);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [role.loading, role.ministryId, role.headquartersId, role.regionalId, role.congregationId, reloadKey]);

  return { ministry, loading, refresh: () => setReloadKey((k) => k + 1) };
}