import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Check, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Ministry = { id: string; name: string; city: string | null };
type Headquarters = { id: string; name: string; city: string | null; ministry_id: string };
type Regional = { id: string; name: string; headquarters_id: string };
type Congregation = {
  id: string;
  name: string;
  is_headquarters: boolean;
  headquarters_id: string;
  regional_id: string | null;
};
type ClassRow = { id: number; name: string; congregation_id: string | null };

const db = supabase as any;

export const HierarchyTab = () => {
  const { toast } = useToast();
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [headquarters, setHeadquarters] = useState<Headquarters[]>([]);
  const [regionals, setRegionals] = useState<Regional[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  // forms
  const [newMinistry, setNewMinistry] = useState({ name: "", city: "" });
  const [newHq, setNewHq] = useState({ name: "", city: "", ministry_id: "" });
  const [newRegional, setNewRegional] = useState({ name: "", headquarters_id: "" });
  const [newCong, setNewCong] = useState({
    name: "",
    headquarters_id: "",
    regional_id: "",
    is_headquarters: false,
  });

  // Credenciais opcionais para criar usuário junto com a entidade
  const [newMinistryAuth, setNewMinistryAuth] = useState({ email: "", password: "" });
  const [newHqAuth, setNewHqAuth] = useState({ email: "", password: "" });
  const [newRegionalAuth, setNewRegionalAuth] = useState({ email: "", password: "" });
  const [newCongAuth, setNewCongAuth] = useState({ email: "", password: "" });

  const createEntityUser = async (payload: {
    email: string;
    password: string;
    display_name?: string;
    role: "igreja_mae" | "igreja_sede" | "admin_regional" | "secretario_ebd";
    ministry_id?: string | null;
    headquarters_id?: string | null;
    regional_id?: string | null;
    congregation_id?: string | null;
  }) => {
    const { data, error } = await supabase.functions.invoke("create-entity-user", {
      body: payload,
    });
    if (error) {
      // tenta extrair mensagem do corpo da função
      const msg = (data as any)?.error || error.message;
      handleError({ message: msg }, "Falha ao criar usuário");
      return false;
    }
    if ((data as any)?.error) {
      handleError({ message: (data as any).error }, "Falha ao criar usuário");
      return false;
    }
    return true;
  };

  // searches
  const [searchMinistry, setSearchMinistry] = useState("");
  const [searchHq, setSearchHq] = useState("");
  const [searchRegional, setSearchRegional] = useState("");
  const [searchCongregation, setSearchCongregation] = useState("");
  const [searchClass, setSearchClass] = useState("");

  // edit name (inline)
  const [editing, setEditing] = useState<{ table: string; id: string; value: string } | null>(null);

  // edit full congregation
  const [editingCongregation, setEditingCongregation] = useState<Congregation | null>(null);

  // edit full row dialogs
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  const [editingHq, setEditingHq] = useState<Headquarters | null>(null);
  const [editingRegional, setEditingRegional] = useState<Regional | null>(null);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);

  const saveMinistryEdit = async () => {
    if (!editingMinistry || !editingMinistry.name.trim()) return;
    const { error } = await db.from("ministries").update({
      name: editingMinistry.name.trim(),
      city: editingMinistry.city?.trim() || null,
    }).eq("id", editingMinistry.id);
    if (error) return handleError(error, "Falha ao atualizar");
    setEditingMinistry(null);
    ok("Ministério atualizado");
    load();
  };

  const saveHqEdit = async () => {
    if (!editingHq || !editingHq.name.trim() || !editingHq.ministry_id) return;
    const { error } = await db.from("headquarters").update({
      name: editingHq.name.trim(),
      city: editingHq.city?.trim() || null,
      ministry_id: editingHq.ministry_id,
    }).eq("id", editingHq.id);
    if (error) return handleError(error, "Falha ao atualizar");
    setEditingHq(null);
    ok("Igreja Sede atualizada");
    load();
  };

  const saveRegionalEdit = async () => {
    if (!editingRegional || !editingRegional.name.trim() || !editingRegional.headquarters_id) return;
    const { error } = await db.from("regionals").update({
      name: editingRegional.name.trim(),
      headquarters_id: editingRegional.headquarters_id,
    }).eq("id", editingRegional.id);
    if (error) return handleError(error, "Falha ao atualizar");
    setEditingRegional(null);
    ok("Regional atualizada");
    load();
  };

  const saveClassEdit = async () => {
    if (!editingClass || !editingClass.name.trim()) return;
    const { error } = await db.from("classes").update({
      name: editingClass.name.trim(),
      congregation_id: editingClass.congregation_id || null,
    }).eq("id", editingClass.id);
    if (error) return handleError(error, "Falha ao atualizar");
    setEditingClass(null);
    ok("Classe atualizada");
    load();
  };

  const saveCongregationEdit = async () => {
    if (!editingCongregation) return;
    if (!editingCongregation.name.trim() || !editingCongregation.headquarters_id) return;
    
    const { error } = await db.from("congregations").update({
      name: editingCongregation.name.trim(),
      headquarters_id: editingCongregation.headquarters_id,
      regional_id: editingCongregation.regional_id || null,
      is_headquarters: editingCongregation.is_headquarters,
    }).eq("id", editingCongregation.id);
    
    if (error) return handleError(error, "Falha ao atualizar");
    setEditingCongregation(null);
    ok("Congregação atualizada");
    load();
  };

  const load = async () => {
    const [m, h, r, c, cl] = await Promise.all([
      db.from("ministries").select("*").order("name"),
      db.from("headquarters").select("*").order("name"),
      db.from("regionals").select("*").order("name"),
      db.from("congregations").select("*").order("name"),
      db.from("classes").select("id, name, congregation_id").order("name"),
    ]);
    setMinistries(m.data ?? []);
    setHeadquarters(h.data ?? []);
    setRegionals(r.data ?? []);
    setCongregations(c.data ?? []);
    setClasses(cl.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleError = (error: any, fallback: string) => {
    toast({
      title: "Erro",
      description: error?.message ?? fallback,
      variant: "destructive",
    });
  };

  const ok = (msg: string) => toast({ title: "Sucesso", description: msg });

  // ----- CREATE -----
  const addMinistry = async () => {
    if (!newMinistry.name.trim()) return;
    const wantsUser = !!(newMinistryAuth.email.trim() && newMinistryAuth.password);
    const { data: inserted, error } = await db
      .from("ministries")
      .insert({
        name: newMinistry.name.trim(),
        city: newMinistry.city.trim() || null,
      })
      .select()
      .single();
    if (error) return handleError(error, "Falha ao criar ministerio");
    if (wantsUser) {
      const ok2 = await createEntityUser({
        email: newMinistryAuth.email.trim(),
        password: newMinistryAuth.password,
        display_name: newMinistry.name.trim(),
        role: "igreja_mae",
        ministry_id: inserted.id,
      });
      if (!ok2) {
        await load();
        return;
      }
    }
    setNewMinistry({ name: "", city: "" });
    setNewMinistryAuth({ email: "", password: "" });
    ok("Ministerio criado");
    load();
  };

  const addHq = async () => {
    if (!newHq.name.trim() || !newHq.ministry_id) return;
    const wantsUser = !!(newHqAuth.email.trim() && newHqAuth.password);
    const { data: inserted, error } = await db
      .from("headquarters")
      .insert({
        name: newHq.name.trim(),
        city: newHq.city.trim() || null,
        ministry_id: newHq.ministry_id,
      })
      .select()
      .single();
    if (error) return handleError(error, "Falha ao criar sede");
    if (wantsUser) {
      const ok2 = await createEntityUser({
        email: newHqAuth.email.trim(),
        password: newHqAuth.password,
        display_name: newHq.name.trim(),
        role: "igreja_sede",
        ministry_id: newHq.ministry_id,
        headquarters_id: inserted.id,
      });
      if (!ok2) {
        await load();
        return;
      }
    }
    setNewHq({ name: "", city: "", ministry_id: "" });
    setNewHqAuth({ email: "", password: "" });
    ok("Igreja Sede criada");
    load();
  };

  const addRegional = async () => {
    if (!newRegional.name.trim() || !newRegional.headquarters_id) return;
    const wantsUser = !!(newRegionalAuth.email.trim() && newRegionalAuth.password);
    const { data: inserted, error } = await db
      .from("regionals")
      .insert({
        name: newRegional.name.trim(),
        headquarters_id: newRegional.headquarters_id,
      })
      .select()
      .single();
    if (error) return handleError(error, "Falha ao criar regional");
    if (wantsUser) {
      const ok2 = await createEntityUser({
        email: newRegionalAuth.email.trim(),
        password: newRegionalAuth.password,
        display_name: newRegional.name.trim(),
        role: "admin_regional",
        headquarters_id: newRegional.headquarters_id,
        regional_id: inserted.id,
      });
      if (!ok2) {
        await load();
        return;
      }
    }
    setNewRegional({ name: "", headquarters_id: "" });
    setNewRegionalAuth({ email: "", password: "" });
    ok("Regional criada");
    load();
  };

  const addCongregation = async () => {
    if (!newCong.name.trim() || !newCong.headquarters_id) return;
    const wantsUser = !!(newCongAuth.email.trim() && newCongAuth.password);
    const { data: inserted, error } = await db
      .from("congregations")
      .insert({
        name: newCong.name.trim(),
        headquarters_id: newCong.headquarters_id,
        regional_id: newCong.regional_id || null,
        is_headquarters: newCong.is_headquarters,
      })
      .select()
      .single();
    if (error) return handleError(error, "Falha ao criar congregacao");
    if (wantsUser) {
      const ok2 = await createEntityUser({
        email: newCongAuth.email.trim(),
        password: newCongAuth.password,
        display_name: newCong.name.trim(),
        role: "secretario_ebd",
        headquarters_id: newCong.headquarters_id,
        regional_id: newCong.regional_id || null,
        congregation_id: inserted.id,
      });
      if (!ok2) {
        await load();
        return;
      }
    }
    setNewCong({ name: "", headquarters_id: "", regional_id: "", is_headquarters: false });
    setNewCongAuth({ email: "", password: "" });
    ok("Congregacao criada");
    load();
  };

  // ----- UPDATE name -----
  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await db.from(editing.table).update({ name: editing.value.trim() }).eq("id", editing.id);
    if (error) return handleError(error, "Falha ao atualizar");
    setEditing(null);
    ok("Atualizado");
    load();
  };

  // ----- DELETE -----
  const removeRow = async (table: string, id: string, label: string) => {
    if (!confirm(`Remover ${label}? Itens vinculados podem ser afetados.`)) return;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return handleError(error, "Falha ao remover");
    ok("Removido");
    load();
  };

  // ----- Classes -> Congregation -----
  const updateClassCongregation = async (classId: number, congregationId: string) => {
    const { error } = await db
      .from("classes")
      .update({ congregation_id: congregationId || null })
      .eq("id", classId);
    if (error) return handleError(error, "Falha ao vincular classe");
    ok("Classe vinculada");
    load();
  };

  const renderNameCell = (table: string, row: { id: string; name: string }) => {
    if (editing && editing.table === table && editing.id === row.id) {
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            className="h-8"
          />
          <Button size="icon" variant="ghost" onClick={saveEdit}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span>{row.name}</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setEditing({ table, id: row.id, value: row.name })}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  const hqName = (id: string) => headquarters.find((h) => h.id === id)?.name ?? "-";
  const regionalName = (id: string | null) =>
    id ? regionals.find((r) => r.id === id)?.name ?? "-" : "-";
  const ministryName = (id: string) => ministries.find((m) => m.id === id)?.name ?? "-";
  const congregationName = (id: string | null) =>
    id ? congregations.find((c) => c.id === id)?.name ?? "-" : "-";

  const [sortConfig, setSortConfig] = useState<{table: string, key: string, direction: 'asc'|'desc'} | null>(null);

  const handleSort = (table: string, key: string) => {
    setSortConfig(prev => {
      if (prev?.table === table && prev?.key === key) {
        return { table, key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { table, key, direction: 'asc' };
    });
  };

  const SortIcon = ({ table, column }: { table: string, column: string }) => {
    if (sortConfig?.table !== table || sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 inline cursor-pointer text-muted-foreground" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 inline cursor-pointer" /> : <ArrowDown className="ml-2 h-4 w-4 inline cursor-pointer" />;
  };

  const getSorted = <T extends any>(data: T[], table: string, extractors: Record<string, (item: T) => any> = {}) => {
    if (sortConfig?.table !== table) return data;
    return [...data].sort((a, b) => {
      const { key, direction } = sortConfig;
      const ex = extractors[key] || ((item) => item[key]);
      const aVal = ex(a) ?? "";
      const bVal = ex(b) ?? "";
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredMinistries = ministries.filter(m => m.name.toLowerCase().includes(searchMinistry.toLowerCase()) || (m.city && m.city.toLowerCase().includes(searchMinistry.toLowerCase())));
  const sortedMinistries = getSorted(filteredMinistries, 'ministries');
  
  const filteredHq = headquarters.filter(h => h.name.toLowerCase().includes(searchHq.toLowerCase()) || ministryName(h.ministry_id).toLowerCase().includes(searchHq.toLowerCase()));
  const sortedHq = getSorted(filteredHq, 'headquarters', { ministry: (h) => ministryName(h.ministry_id) });
  
  const filteredRegionals = regionals.filter(r => r.name.toLowerCase().includes(searchRegional.toLowerCase()) || hqName(r.headquarters_id).toLowerCase().includes(searchRegional.toLowerCase()));
  const sortedRegionals = getSorted(filteredRegionals, 'regionals', { hq: (r) => hqName(r.headquarters_id) });
  
  const filteredCongregations = congregations.filter(c => c.name.toLowerCase().includes(searchCongregation.toLowerCase()) || hqName(c.headquarters_id).toLowerCase().includes(searchCongregation.toLowerCase()) || regionalName(c.regional_id).toLowerCase().includes(searchCongregation.toLowerCase()));
  const sortedCongregations = getSorted(filteredCongregations, 'congregations', {
    hq: (c) => hqName(c.headquarters_id),
    regional: (c) => regionalName(c.regional_id),
    tipo: (c) => c.is_headquarters ? 1 : 0
  });
  
  const filteredClasses = classes.filter(cl => cl.name.toLowerCase().includes(searchClass.toLowerCase()) || congregationName(cl.congregation_id).toLowerCase().includes(searchClass.toLowerCase()));
  const sortedClasses = getSorted(filteredClasses, 'classes', { cong: (cl) => congregationName(cl.congregation_id) });

  return (
    <div className="space-y-6">
      {/* Ministerios */}
      <Card>
        <CardHeader>
          <CardTitle>Ministerios</CardTitle>
          <CardDescription>Topo da hierarquia organizacional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Nome do ministerio"
                value={newMinistry.name}
                onChange={(e) => setNewMinistry({ ...newMinistry, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input
                placeholder="Cidade"
                value={newMinistry.city}
                onChange={(e) => setNewMinistry({ ...newMinistry, city: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addMinistry} className="w-full">Adicionar</Button>
            </div>
          </div>
          <div className="pt-4">
            <Input
              placeholder="Pesquisar mistério..."
              value={searchMinistry}
              onChange={(e) => setSearchMinistry(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('ministries', 'name')}>Nome <SortIcon table="ministries" column="name" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('ministries', 'city')}>Cidade <SortIcon table="ministries" column="city" /></TableHead>
                <TableHead className="w-20">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMinistries.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.city ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingMinistry(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow("ministries", m.id, m.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Igrejas Sede */}
      <Card>
        <CardHeader>
          <CardTitle>Igrejas Sede</CardTitle>
          <CardDescription>Sede de cada ministerio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <Label>Ministerio</Label>
              <Select
                value={newHq.ministry_id}
                onValueChange={(v) => setNewHq({ ...newHq, ministry_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ministries.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={newHq.name}
                onChange={(e) => setNewHq({ ...newHq, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input
                value={newHq.city}
                onChange={(e) => setNewHq({ ...newHq, city: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addHq} className="w-full">Adicionar</Button>
            </div>
          </div>
          <div className="pt-4">
            <Input
              placeholder="Pesquisar sede..."
              value={searchHq}
              onChange={(e) => setSearchHq(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('headquarters', 'name')}>Nome <SortIcon table="headquarters" column="name" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('headquarters', 'city')}>Cidade <SortIcon table="headquarters" column="city" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('headquarters', 'ministry')}>Ministerio <SortIcon table="headquarters" column="ministry" /></TableHead>
                <TableHead className="w-20">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHq.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{h.name}</TableCell>
                  <TableCell>{h.city ?? "-"}</TableCell>
                  <TableCell>{ministryName(h.ministry_id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingHq(h)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow("headquarters", h.id, h.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Regionais */}
      <Card>
        <CardHeader>
          <CardTitle>Regionais</CardTitle>
          <CardDescription>Divisoes regionais de cada sede</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <div>
              <Label>Igreja Sede</Label>
              <Select
                value={newRegional.headquarters_id}
                onValueChange={(v) => setNewRegional({ ...newRegional, headquarters_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {headquarters.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={newRegional.name}
                onChange={(e) => setNewRegional({ ...newRegional, name: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addRegional} className="w-full">Adicionar</Button>
            </div>
          </div>
          <div className="pt-4">
            <Input
              placeholder="Pesquisar regional..."
              value={searchRegional}
              onChange={(e) => setSearchRegional(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('regionals', 'name')}>Nome <SortIcon table="regionals" column="name" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('regionals', 'hq')}>Igreja Sede <SortIcon table="regionals" column="hq" /></TableHead>
                <TableHead className="w-20">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRegionals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{hqName(r.headquarters_id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingRegional(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow("regionals", r.id, r.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Congregacoes */}
      <Card>
        <CardHeader>
          <CardTitle>Congregações</CardTitle>
          <CardDescription>Cada congregação pertence a uma sede e opcionalmente a uma regional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-5">
            <div>
              <Label>Igreja Sede</Label>
              <Select
                value={newCong.headquarters_id}
                onValueChange={(v) => setNewCong({ ...newCong, headquarters_id: v, regional_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {headquarters.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Regional</Label>
              <Select
                value={newCong.regional_id}
                onValueChange={(v) => setNewCong({ ...newCong, regional_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  {regionals
                    .filter((r) => !newCong.headquarters_id || r.headquarters_id === newCong.headquarters_id)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={newCong.name}
                onChange={(e) => setNewCong({ ...newCong, name: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newCong.is_headquarters}
                  onChange={(e) => setNewCong({ ...newCong, is_headquarters: e.target.checked })}
                />
                E sede
              </label>
            </div>
            <div className="flex items-end">
              <Button onClick={addCongregation} className="w-full">Adicionar</Button>
            </div>
          </div>
          <div className="pt-4">
            <Input
              placeholder="Pesquisar congregação..."
              value={searchCongregation}
              onChange={(e) => setSearchCongregation(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('congregations', 'name')}>Nome <SortIcon table="congregations" column="name" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('congregations', 'hq')}>Sede <SortIcon table="congregations" column="hq" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('congregations', 'regional')}>Regional <SortIcon table="congregations" column="regional" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('congregations', 'tipo')}>Tipo <SortIcon table="congregations" column="tipo" /></TableHead>
                <TableHead className="w-20">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCongregations.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{hqName(c.headquarters_id)}</TableCell>
                  <TableCell>{regionalName(c.regional_id)}</TableCell>
                  <TableCell>
                    {c.is_headquarters ? (
                      <Badge>Sede</Badge>
                    ) : (
                      <Badge variant="secondary">Congregacao</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingCongregation(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow("congregations", c.id, c.name)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Classes -> Congregacao */}
      <Card>
        <CardHeader>
          <CardTitle>Vinculo de Classes</CardTitle>
          <CardDescription>Defina a qual congregacao cada classe pertence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              placeholder="Pesquisar classe..."
              value={searchClass}
              onChange={(e) => setSearchClass(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('classes', 'name')}>Classe <SortIcon table="classes" column="name" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('classes', 'cong')}>Congregacao atual <SortIcon table="classes" column="cong" /></TableHead>
                <TableHead>Alterar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClasses.map((cl) => (
                <TableRow key={cl.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{cl.name}</span>
                      <Button size="icon" variant="ghost" onClick={() => setEditingClass(cl)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{congregationName(cl.congregation_id)}</TableCell>
                  <TableCell>
                    <Select
                      value={cl.congregation_id ?? ""}
                      onValueChange={(v) => updateClassCongregation(cl.id, v)}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {congregations.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({hqName(c.headquarters_id)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!editingCongregation} onOpenChange={(open) => !open && setEditingCongregation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Congregação</DialogTitle>
          </DialogHeader>
          {editingCongregation && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingCongregation.name}
                  onChange={(e) => setEditingCongregation({ ...editingCongregation, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Igreja Sede</Label>
                <Select
                  value={editingCongregation.headquarters_id}
                  onValueChange={(v) => setEditingCongregation({ ...editingCongregation, headquarters_id: v, regional_id: null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {headquarters.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regional (Opcional)</Label>
                <Select
                  value={editingCongregation.regional_id || "none"}
                  onValueChange={(v) => setEditingCongregation({ ...editingCongregation, regional_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {regionals
                      .filter((r) => !editingCongregation.headquarters_id || r.headquarters_id === editingCongregation.headquarters_id)
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-is-hq"
                  checked={editingCongregation.is_headquarters}
                  onChange={(e) => setEditingCongregation({ ...editingCongregation, is_headquarters: e.target.checked })}
                />
                <Label htmlFor="edit-is-hq">É sede</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCongregation(null)}>Cancelar</Button>
            <Button onClick={saveCongregationEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ministry */}
      <Dialog open={!!editingMinistry} onOpenChange={(open) => !open && setEditingMinistry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Ministério</DialogTitle></DialogHeader>
          {editingMinistry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingMinistry.name}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={editingMinistry.city ?? ""}
                  onChange={(e) => setEditingMinistry({ ...editingMinistry, city: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMinistry(null)}>Cancelar</Button>
            <Button onClick={saveMinistryEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Headquarters */}
      <Dialog open={!!editingHq} onOpenChange={(open) => !open && setEditingHq(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Igreja Sede</DialogTitle></DialogHeader>
          {editingHq && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingHq.name}
                  onChange={(e) => setEditingHq({ ...editingHq, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={editingHq.city ?? ""}
                  onChange={(e) => setEditingHq({ ...editingHq, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ministério</Label>
                <Select
                  value={editingHq.ministry_id}
                  onValueChange={(v) => setEditingHq({ ...editingHq, ministry_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ministries.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHq(null)}>Cancelar</Button>
            <Button onClick={saveHqEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Regional */}
      <Dialog open={!!editingRegional} onOpenChange={(open) => !open && setEditingRegional(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Regional</DialogTitle></DialogHeader>
          {editingRegional && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingRegional.name}
                  onChange={(e) => setEditingRegional({ ...editingRegional, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Igreja Sede</Label>
                <Select
                  value={editingRegional.headquarters_id}
                  onValueChange={(v) => setEditingRegional({ ...editingRegional, headquarters_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {headquarters.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRegional(null)}>Cancelar</Button>
            <Button onClick={saveRegionalEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class */}
      <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Classe</DialogTitle></DialogHeader>
          {editingClass && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingClass.name}
                  onChange={(e) => setEditingClass({ ...editingClass, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Congregação</Label>
                <Select
                  value={editingClass.congregation_id ?? "none"}
                  onValueChange={(v) => setEditingClass({ ...editingClass, congregation_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {congregations.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({hqName(c.headquarters_id)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClass(null)}>Cancelar</Button>
            <Button onClick={saveClassEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
