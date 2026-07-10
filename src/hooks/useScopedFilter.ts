import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useScope, NO_REGIONAL } from "@/context/ScopeContext";

interface Cong { id: string; headquarters_id: string; regional_id: string | null }
interface Hq { id: string; ministry_id: string }
interface Cls { id: number; congregation_id: string | null }

export interface ScopedFilter {
  loading: boolean;
  /** null = sem escopo aplicado (nada carrega); [] = escopo sem match */
  congregationIds: string[] | null;
  classIds: number[] | null;
}

/**
 * Resolve o escopo aplicado (Ministério/Sede/Regional/Congregação)
 * para as listas de congregações e classes elegíveis.
 */
export function useScopedFilter(): ScopedFilter {
  const { applied } = useScope();
  const [loading, setLoading] = useState(true);
  const [hqs, setHqs] = useState<Hq[]>([]);
  const [congs, setCongs] = useState<Cong[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);

  useEffect(() => {
    if (!applied) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const [h, c, cl] = await Promise.all([
        supabase.from("headquarters" as any).select("id,ministry_id"),
        supabase.from("congregations" as any).select("id,headquarters_id,regional_id"),
        supabase.from("classes").select("id,congregation_id" as any),
      ]);
      if (!active) return;
      setHqs(((h.data as any) || []) as Hq[]);
      setCongs(((c.data as any) || []) as Cong[]);
      setClasses(((cl.data as any) || []) as Cls[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [applied]);

  if (!applied) {
    return { loading: false, congregationIds: null, classIds: null };
  }

  const hqIdsForMinistry = applied.ministryId
    ? new Set(hqs.filter(h => h.ministry_id === applied.ministryId).map(h => h.id))
    : null;

  const filteredCongs = congs.filter(c => {
    if (applied.congregationId) return c.id === applied.congregationId;
    if (applied.headquartersId && c.headquarters_id !== applied.headquartersId) return false;
    if (applied.regionalId === NO_REGIONAL) {
      if (c.regional_id !== null) return false;
    } else if (applied.regionalId) {
      if (c.regional_id !== applied.regionalId) return false;
    }
    if (hqIdsForMinistry && !hqIdsForMinistry.has(c.headquarters_id)) return false;
    return true;
  });

  const congregationIds = filteredCongs.map(c => c.id);
  const congSet = new Set(congregationIds);
  const classIds = classes
    .filter(cls => cls.congregation_id && congSet.has(cls.congregation_id))
    .map(cls => cls.id);

  return { loading, congregationIds, classIds };
}