import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import type { DashboardScope } from "@/hooks/useDashboardScope";

interface Props { scope: DashboardScope }

/** Filtro hierarquico de escopo (Sede > Regional > Congregacao) */
export function DashboardScopeFilter({ scope }: Props) {
  const {
    role,
    headquarters,
    regionals,
    congregations,
    selectedHeadquartersId,
    selectedRegionalId,
    selectedCongregationId,
    setSelectedHeadquartersId,
    setSelectedRegionalId,
    setSelectedCongregationId,
  } = scope;

  // Secretario nao escolhe nada
  if (role === "secretario_ebd") return null;
  if (role === "professor_classe") return null;

  const canPickHq = role === "igreja_mae";
  const canPickRegional = role === "igreja_mae" || role === "igreja_sede";
  const canPickCong = role === "igreja_mae" || role === "igreja_sede";

  // Regionais visiveis dependem da Sede selecionada
  const regionalsForUI = selectedHeadquartersId === "all"
    ? regionals
    : regionals.filter((r) => r.headquarters_id === selectedHeadquartersId);

  const congsForUI = congregations.filter((c) => {
    if (selectedHeadquartersId !== "all" && c.headquarters_id !== selectedHeadquartersId) return false;
    if (selectedRegionalId !== "all" && c.regional_id !== selectedRegionalId) return false;
    return true;
  });

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" /> Escopo de Visualizacao
        </CardTitle>
        <CardDescription>
          {role === "igreja_mae" && "Voce esta vendo dados consolidados do Ministerio. Use os filtros para refinar."}
          {role === "igreja_sede" && "Voce esta vendo dados da sua Sede. Refine por Regional ou Congregacao."}
          {!role && "Visao global (sem papel definido)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {canPickHq && (
          <div className="space-y-1">
            <Label>Igreja Sede</Label>
            <Select
              value={selectedHeadquartersId}
              onValueChange={(v) => {
                setSelectedHeadquartersId(v);
                setSelectedRegionalId("all");
                setSelectedCongregationId("all");
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Sedes</SelectItem>
                {headquarters.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {canPickRegional && (
          <div className="space-y-1">
            <Label>Regional</Label>
            <Select
              value={selectedRegionalId}
              onValueChange={(v) => {
                setSelectedRegionalId(v);
                setSelectedCongregationId("all");
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Regionais</SelectItem>
                {regionalsForUI.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {canPickCong && (
          <div className="space-y-1">
            <Label>Congregacao</Label>
            <Select value={selectedCongregationId} onValueChange={setSelectedCongregationId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Congregacoes</SelectItem>
                {congsForUI.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}