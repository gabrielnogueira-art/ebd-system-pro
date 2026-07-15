import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Home, ChevronLeft, Search, ArrowRight } from "lucide-react";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useUserRole } from "@/hooks/useUserRole";

type View = "local" | "list" | "drill";
type Congregation = {
  id: string;
  name: string;
  is_headquarters: boolean;
  regional_id: string | null;
  headquarters_id: string;
};
type Regional = { id: string; name: string; headquarters_id: string };

const db = supabase as any;

/**
 * Switch entre "EBD da minha igreja" e "Visao das Congregacoes" para igreja_sede.
 */
export const SedeViewSwitcher = () => {
  const role = useUserRole();
  const [view, setView] = useState<View>("local");
  const [drillId, setDrillId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [regionals, setRegionals] = useState<Regional[]>([]);
  const [localCongId, setLocalCongId] = useState<string | null>(null);

  useEffect(() => {
    if (!role.headquartersId) return;
    (async () => {
      const { data: cgs } = await db.from("congregations").select("*").eq("headquarters_id", role.headquartersId).order("name");
      const { data: rgs } = await db.from("regionals").select("*").eq("headquarters_id", role.headquartersId).order("name");
      const list: Congregation[] = cgs ?? [];
      setCongregations(list);
      setRegionals(rgs ?? []);
      const local = list.find((c) => c.is_headquarters) ?? list[0];
      setLocalCongId(local?.id ?? null);
    })();
  }, [role.headquartersId]);

  const regionalName = (id: string | null) => regionals.find((r) => r.id === id)?.name ?? "Sem regional";

  const byRegional = useMemo(() => {
    const map = new Map<string, Congregation[]>();
    const filtered = congregations.filter((c) =>
      search ? c.name.toLowerCase().includes(search.toLowerCase()) : true,
    );
    for (const c of filtered) {
      const k = c.regional_id ?? "_none";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return map;
  }, [congregations, search]);

  if (role.loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={view === "local" ? "default" : "outline"}
          onClick={() => { setView("local"); setDrillId(null); }}
        >
          <Home className="h-4 w-4 mr-2" />
          EBD da minha igreja
        </Button>
        <Button
          variant={view === "list" || view === "drill" ? "default" : "outline"}
          onClick={() => { setView("list"); setDrillId(null); }}
        >
          <Building2 className="h-4 w-4 mr-2" />
          Visão das Congregações ({congregations.length})
        </Button>
      </div>

      {view === "local" && (
        localCongId ? (
          <AdminDashboard congregationOverride={localCongId} />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Identificando a congregação Sede local...
            </CardContent>
          </Card>
        )
      )}

      {view === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Congregações vinculadas</span>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...byRegional.entries()]
              .sort((a, b) => regionalName(a[0] === "_none" ? null : a[0]).localeCompare(regionalName(b[0] === "_none" ? null : b[0])))
              .map(([rid, list]) => (
                <div key={rid}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{regionalName(rid === "_none" ? null : rid)}</Badge>
                    <span className="text-xs text-muted-foreground">{list.length} congregação(ões)</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setView("drill"); setDrillId(c.id); }}
                        className="text-left rounded-md border border-border bg-card hover:bg-accent transition px-3 py-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-sm">{c.name}</div>
                          {c.is_headquarters && <span className="text-[10px] uppercase text-primary">Sede local</span>}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            {congregations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma congregação cadastrada para esta sede.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {view === "drill" && drillId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => { setView("list"); setDrillId(null); }}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar à lista
            </Button>
            <Badge variant="secondary">
              {congregations.find((c) => c.id === drillId)?.name ?? "Congregação"}
            </Badge>
          </div>
          <AdminDashboard congregationOverride={drillId} />
        </div>
      )}
    </div>
  );
};