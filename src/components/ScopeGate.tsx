import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, RotateCcw } from "lucide-react";
import { useScope, AppliedScope } from "@/context/ScopeContext";
import { useUserRole } from "@/hooks/useUserRole";

interface Ministry { id: string; name: string }
interface Hq { id: string; name: string; ministry_id: string }
interface Reg { id: string; name: string; headquarters_id: string }
interface Cong { id: string; name: string; regional_id: string | null; headquarters_id: string }

const ALL = "__all__";

/**
 * Nada é carregado pelas abas até o usuário aplicar um escopo.
 * Cascata: Ministério → Sede → Regional → Congregação.
 * Roles restritas têm níveis superiores pré-fixados.
 */
export function ScopeGate({ children }: { children: ReactNode }) {
  const { applied, apply, reset } = useScope();
  const userRole = useUserRole();
  const [loading, setLoading] = useState(true);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [hqs, setHqs] = useState<Hq[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [congs, setCongs] = useState<Cong[]>([]);

  const [mSel, setMSel] = useState<string>(ALL);
  const [hSel, setHSel] = useState<string>(ALL);
  const [rSel, setRSel] = useState<string>(ALL);
  const [cSel, setCSel] = useState<string>(ALL);

  useEffect(() => {
    if (userRole.loading) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [m, h, r, c] = await Promise.all([
        supabase.from("ministries" as any).select("id,name"),
        supabase.from("headquarters" as any).select("id,name,ministry_id"),
        supabase.from("regionals" as any).select("id,name,headquarters_id"),
        supabase.from("congregations" as any).select("id,name,regional_id,headquarters_id"),
      ]);
      if (!active) return;
      setMinistries(((m.data as any) || []) as Ministry[]);
      setHqs(((h.data as any) || []) as Hq[]);
      setRegs(((r.data as any) || []) as Reg[]);
      setCongs(((c.data as any) || []) as Cong[]);

      // Pré-fixar níveis para roles restritas
      if (userRole.role === "igreja_mae" && userRole.ministryId) setMSel(userRole.ministryId);
      if (userRole.role === "igreja_sede" && userRole.headquartersId) {
        setHSel(userRole.headquartersId);
        const hq = ((h.data as any) || []).find((x: Hq) => x.id === userRole.headquartersId);
        if (hq) setMSel(hq.ministry_id);
      }
      if (userRole.role === "admin_regional" && userRole.regionalId) {
        setRSel(userRole.regionalId);
        const reg = ((r.data as any) || []).find((x: Reg) => x.id === userRole.regionalId);
        if (reg) {
          setHSel(reg.headquarters_id);
          const hq = ((h.data as any) || []).find((x: Hq) => x.id === reg.headquarters_id);
          if (hq) setMSel(hq.ministry_id);
        }
      }
      if (userRole.role === "secretario_ebd" && userRole.congregationId) {
        setCSel(userRole.congregationId);
        const cg = ((c.data as any) || []).find((x: Cong) => x.id === userRole.congregationId);
        if (cg) {
          setHSel(cg.headquarters_id);
          if (cg.regional_id) setRSel(cg.regional_id);
          const hq = ((h.data as any) || []).find((x: Hq) => x.id === cg.headquarters_id);
          if (hq) setMSel(hq.ministry_id);
        }
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [userRole.loading, userRole.role, userRole.ministryId, userRole.headquartersId, userRole.regionalId, userRole.congregationId]);

  if (applied) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Escopo aplicado:</span>
            <span className="font-medium">{describe(applied, ministries, hqs, regs, congs)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-3 w-3 mr-1" /> Alterar escopo
          </Button>
        </div>
        {children}
      </div>
    );
  }

  const hqsForUI = mSel === ALL ? hqs : hqs.filter((h) => h.ministry_id === mSel);
  const regsForUI = hSel === ALL ? regs.filter((r) => hqsForUI.some((h) => h.id === r.headquarters_id))
    : regs.filter((r) => r.headquarters_id === hSel);
  const congsForUI = congs.filter((c) => {
    if (hSel !== ALL && c.headquarters_id !== hSel) return false;
    if (rSel !== ALL && c.regional_id !== rSel) return false;
    if (mSel !== ALL && !hqs.some((h) => h.id === c.headquarters_id && h.ministry_id === mSel)) return false;
    return true;
  });

  const canPickM = userRole.role === "master" || userRole.role === "igreja_mae" ? userRole.role === "master" : false;
  const canPickH = ["master", "igreja_mae"].includes(userRole.role || "");
  const canPickR = ["master", "igreja_mae", "igreja_sede"].includes(userRole.role || "");
  const canPickC = ["master", "igreja_mae", "igreja_sede", "admin_regional"].includes(userRole.role || "");

  const handleApply = () => {
    const scope: AppliedScope = {
      ministryId: mSel === ALL ? null : mSel,
      headquartersId: hSel === ALL ? null : hSel,
      regionalId: rSel === ALL ? null : rSel,
      congregationId: cSel === ALL ? null : cSel,
    };
    apply(scope);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" /> Selecione o escopo
        </CardTitle>
        <CardDescription>
          Escolha o nível hierárquico para carregar os dados. Nada é consultado enquanto você não aplicar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando hierarquia…</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label>Ministério</Label>
                <Select value={mSel} onValueChange={(v) => { setMSel(v); setHSel(ALL); setRSel(ALL); setCSel(ALL); }} disabled={!canPickM}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    {ministries.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Igreja Sede</Label>
                <Select value={hSel} onValueChange={(v) => { setHSel(v); setRSel(ALL); setCSel(ALL); }} disabled={!canPickH}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {hqsForUI.map((h) => (<SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Regional</Label>
                <Select value={rSel} onValueChange={(v) => { setRSel(v); setCSel(ALL); }} disabled={!canPickR}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {regsForUI.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Congregação</Label>
                <Select value={cSel} onValueChange={setCSel} disabled={!canPickC}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {congsForUI.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleApply}>Aplicar e carregar dados</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function describe(s: AppliedScope, ms: Ministry[], hs: Hq[], rs: Reg[], cs: Cong[]) {
  const parts: string[] = [];
  if (s.ministryId) parts.push(ms.find((x) => x.id === s.ministryId)?.name || "Ministério");
  else parts.push("Todos os ministérios");
  if (s.headquartersId) parts.push(hs.find((x) => x.id === s.headquartersId)?.name || "Sede");
  if (s.regionalId) parts.push(rs.find((x) => x.id === s.regionalId)?.name || "Regional");
  if (s.congregationId) parts.push(cs.find((x) => x.id === s.congregationId)?.name || "Congregação");
  return parts.join(" › ");
}