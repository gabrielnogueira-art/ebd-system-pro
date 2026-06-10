import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, type AppRole } from "./useUserRole";

export interface Headquarters { id: string; name: string; ministry_id: string }
export interface Regional { id: string; name: string; headquarters_id: string }
export interface Congregation { id: string; name: string; regional_id: string | null; headquarters_id: string }
export interface ClassRow { id: number; name: string; congregation_id: string | null }

export interface DashboardScope {
  loading: boolean;
  role: AppRole | null;
  headquarters: Headquarters[];
  regionals: Regional[];
  congregations: Congregation[];
  classes: ClassRow[];
  selectedHeadquartersId: string;
  selectedRegionalId: string;
  selectedCongregationId: string;
  setSelectedHeadquartersId: (v: string) => void;
  setSelectedRegionalId: (v: string) => void;
  setSelectedCongregationId: (v: string) => void;
  effectiveCongregationIds: string[];
  /** null = sem restricao (admin legacy); [] = nenhuma visivel */
  effectiveClassIds: number[] | null;
  /** key memoizavel pra usar em useEffect deps */
  classIdsKey: string;
}

export function useDashboardScope(): DashboardScope {
  const userRole = useUserRole();
  const [loading, setLoading] = useState(true);
  const [headquarters, setHeadquarters] = useState<Headquarters[]>([]);
  const [regionals, setRegionals] = useState<Regional[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  const [selectedHeadquartersId, setSelectedHeadquartersId] = useState<string>("all");
  const [selectedRegionalId, setSelectedRegionalId] = useState<string>("all");
  const [selectedCongregationId, setSelectedCongregationId] = useState<string>("all");

  useEffect(() => {
    if (userRole.loading) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: hq }, { data: rg }, { data: cg }, { data: cls }] = await Promise.all([
        supabase.from("headquarters" as any).select("id,name,ministry_id"),
        supabase.from("regionals" as any).select("id,name,headquarters_id"),
        supabase.from("congregations" as any).select("id,name,regional_id,headquarters_id"),
        supabase.from("classes").select("id,name,congregation_id" as any),
      ]);
      if (!active) return;

      const allHq = (hq as unknown as Headquarters[]) || [];
      const allRg = (rg as unknown as Regional[]) || [];
      const allCg = (cg as unknown as Congregation[]) || [];
      const allCls = (cls as unknown as ClassRow[]) || [];

      // Filtra hierarquia visivel conforme papel
      let visHq = allHq;
      let visRg = allRg;
      let visCg = allCg;

      if (userRole.role === "igreja_mae" && userRole.ministryId) {
        visHq = allHq.filter((h) => h.ministry_id === userRole.ministryId);
        const hqIds = new Set(visHq.map((h) => h.id));
        visRg = allRg.filter((r) => hqIds.has(r.headquarters_id));
        visCg = allCg.filter((c) => hqIds.has(c.headquarters_id));
      } else if (userRole.role === "igreja_sede" && userRole.headquartersId) {
        visHq = allHq.filter((h) => h.id === userRole.headquartersId);
        visRg = allRg.filter((r) => r.headquarters_id === userRole.headquartersId);
        visCg = allCg.filter((c) => c.headquarters_id === userRole.headquartersId);
      } else if (userRole.role === "admin_regional" && userRole.regionalId) {
        visRg = allRg.filter((r) => r.id === userRole.regionalId);
        const hqIds = new Set(visRg.map((r) => r.headquarters_id));
        visHq = allHq.filter((h) => hqIds.has(h.id));
        visCg = allCg.filter((c) => c.regional_id === userRole.regionalId);
      } else if (userRole.role === "secretario_ebd" && userRole.congregationId) {
        visCg = allCg.filter((c) => c.id === userRole.congregationId);
        const hqIds = new Set(visCg.map((c) => c.headquarters_id));
        visHq = allHq.filter((h) => hqIds.has(h.id));
        visRg = allRg.filter((r) => hqIds.has(r.headquarters_id));
      }

      setHeadquarters(visHq);
      setRegionals(visRg);
      setCongregations(visCg);
      setClasses(allCls);

      // Trava selecao inicial para roles restritos
      if (userRole.role === "igreja_sede" && userRole.headquartersId) {
        setSelectedHeadquartersId(userRole.headquartersId);
      }
      if (userRole.role === "admin_regional" && userRole.regionalId) {
        setSelectedRegionalId(userRole.regionalId);
      }
      if (userRole.role === "secretario_ebd" && userRole.congregationId) {
        setSelectedCongregationId(userRole.congregationId);
      }

      setLoading(false);
    })();
    return () => { active = false; };
  }, [userRole.loading, userRole.role, userRole.ministryId, userRole.headquartersId, userRole.regionalId, userRole.congregationId]);

  const effectiveCongregationIds = useMemo(() => {
    let pool = congregations;
    if (selectedHeadquartersId !== "all") pool = pool.filter((c) => c.headquarters_id === selectedHeadquartersId);
    if (selectedRegionalId !== "all") pool = pool.filter((c) => c.regional_id === selectedRegionalId);
    if (selectedCongregationId !== "all") pool = pool.filter((c) => c.id === selectedCongregationId);
    return pool.map((c) => c.id);
  }, [congregations, selectedHeadquartersId, selectedRegionalId, selectedCongregationId]);

  const effectiveClassIds = useMemo<number[] | null>(() => {
    // Sem papel mapeado: comportamento legacy (sem restricao)
    if (!userRole.role) return null;
    const allow = new Set(effectiveCongregationIds);
    return classes
      .filter((c) => c.congregation_id && allow.has(c.congregation_id))
      .map((c) => c.id);
  }, [classes, effectiveCongregationIds, userRole.role]);

  const classIdsKey = effectiveClassIds === null ? "ALL" : effectiveClassIds.slice().sort((a,b)=>a-b).join(",");

  return {
    loading: loading || userRole.loading,
    role: userRole.role,
    headquarters,
    regionals,
    congregations,
    classes,
    selectedHeadquartersId,
    selectedRegionalId,
    selectedCongregationId,
    setSelectedHeadquartersId,
    setSelectedRegionalId,
    setSelectedCongregationId,
    effectiveCongregationIds,
    effectiveClassIds,
    classIdsKey,
  };
}