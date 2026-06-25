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
 * Cache global por ministry_id resolvido — evita refetch quando varios
 * componentes (BrandingHeader, BrandingApplier, BrandingTab...) montam
 * simultaneamente. Master nao tem branding: retorna null direto.
 */
const cache = new Map<string, MinistryBranding | null>();
const cacheListeners = new Set<() => void>();
const bump = () => cacheListeners.forEach((l) => l());

async function resolveMinistryId(role: ReturnType<typeof useUserRole>): Promise<string | null> {
  if (role.ministryId) return role.ministryId;
  if (role.headquartersId) {
    const { data } = await db.from("headquarters").select("ministry_id").eq("id", role.headquartersId).maybeSingle();
    if (data?.ministry_id) return data.ministry_id;
  }
  if (role.regionalId) {
    const { data } = await db.from("regionals").select("headquarters_id").eq("id", role.regionalId).maybeSingle();
    if (data?.headquarters_id) {
      const { data: hq } = await db.from("headquarters").select("ministry_id").eq("id", data.headquarters_id).maybeSingle();
      if (hq?.ministry_id) return hq.ministry_id;
    }
  }
  if (role.congregationId) {
    const { data } = await db.from("congregations").select("headquarters_id").eq("id", role.congregationId).maybeSingle();
    if (data?.headquarters_id) {
      const { data: hq } = await db.from("headquarters").select("ministry_id").eq("id", data.headquarters_id).maybeSingle();
      if (hq?.ministry_id) return hq.ministry_id;
    }
  }
  return null;
}

export function useBranding() {
  const role = useUserRole();
  const [ministry, setMinistry] = useState<MinistryBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (role.loading) return;
    // Master: conta do desenvolvedor — nao herda branding de nenhuma igreja.
    if (role.role === "master") {
      setMinistry(null);
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      const ministryId = await resolveMinistryId(role);
      if (!active) return;
      if (!ministryId) {
        setMinistry(null);
        setLoading(false);
        return;
      }
      if (cache.has(ministryId)) {
        setMinistry(cache.get(ministryId) ?? null);
        setLoading(false);
        return;
      }
      const { data } = await db.from("ministries").select("*").eq("id", ministryId).maybeSingle();
      const row = (data as MinistryBranding) ?? null;
      cache.set(ministryId, row);
      if (active) { setMinistry(row); setLoading(false); }
    })();
    const sub = () => setReloadKey((k) => k + 1);
    cacheListeners.add(sub);
    return () => { active = false; cacheListeners.delete(sub); };
  }, [role.loading, role.role, role.ministryId, role.headquartersId, role.regionalId, role.congregationId, reloadKey]);

  return {
    ministry,
    loading,
    refresh: () => { cache.clear(); bump(); },
  };
}