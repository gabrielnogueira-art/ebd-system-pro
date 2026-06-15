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
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Ministry = { id: string; name: string };
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
  const [newMinistry, setNewMinistry] = useState("");
  const [newHq, setNewHq] = useState({ name: "", city: "", ministry_id: "" });
  const [newRegional, setNewRegional] = useState({ name: "", headquarters_id: "" });
  const [newCong, setNewCong] = useState({
    name: "",
    headquarters_id: "",
    regional_id: "",
    is_headquarters: false,
  });

  // edit name (inline)
  const [editing, setEditing] = useState<{ table: string; id: string; value: string } | null>(null);

  // edit full congregation
  const [editingCongregation, setEditingCongregation] = useState<Congregation | null>(null);

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
    if (!newMinistry.trim()) return;
    const { error } = await db.from("ministries").insert({ name: newMinistry.trim() });
    if (error) return handleError(error, "Falha ao criar ministerio");
    setNewMinistry("");
    ok("Ministerio criado");
    load();
  };

  const addHq = async () => {
    if (!newHq.name.trim() || !newHq.ministry_id) return;
    const { error } = await db.from("headquarters").insert({
      name: newHq.name.trim(),
      city: newHq.city.trim() || null,
      ministry_id: newHq.ministry_id,
    });
    if (error) return handleError(error, "Falha ao criar sede");
    setNewHq({ name: "", city: "", ministry_id: "" });
    ok("Igreja Sede criada");
    load();
  };

  const addRegional = async () => {
    if (!newRegional.name.trim() || !newRegional.headquarters_id) return;
    const { error } = await db.from("regionals").insert({
      name: newRegional.name.trim(),
      headquarters_id: newRegional.headquarters_id,
    });
    if (error) return handleError(error, "Falha ao criar regional");
    setNewRegional({ name: "", headquarters_id: "" });
    ok("Regional criada");
    load();
  };

  const addCongregation = async () => {
    if (!newCong.name.trim() || !newCong.headquarters_id) return;
    const { error } = await db.from("congregations").insert({
      name: newCong.name.trim(),
      headquarters_id: newCong.headquarters_id,
      regional_id: newCong.regional_id || null,
      is_headquarters: newCong.is_headquarters,
    });
    if (error) return handleError(error, "Falha ao criar congregacao");
    setNewCong({ name: "", headquarters_id: "", regional_id: "", is_headquarters: false });
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

  return (
    <div className="space-y-6">
      {/* Ministerios */}
      <Card>
        <CardHeader>
          <CardTitle>Ministerios</CardTitle>
          <CardDescription>Topo da hierarquia organizacional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do ministerio"
              value={newMinistry}
              onChange={(e) => setNewMinistry(e.target.value)}
            />
            <Button onClick={addMinistry}>Adicionar</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-20">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ministries.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{renderNameCell("ministries", m)}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow("ministries", m.id, m.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Ministerio</TableHead>
                <TableHead className="w-20">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headquarters.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>{renderNameCell("headquarters", h)}</TableCell>
                  <TableCell>{h.city ?? "-"}</TableCell>
                  <TableCell>{ministryName(h.ministry_id)}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow("headquarters", h.id, h.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Igreja Sede</TableHead>
                <TableHead className="w-20">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regionals.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{renderNameCell("regionals", r)}</TableCell>
                  <TableCell>{hqName(r.headquarters_id)}</TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow("regionals", r.id, r.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
          <CardTitle>Congregacoes</CardTitle>
          <CardDescription>Cada congregacao pertence a uma sede e opcionalmente a uma regional</CardDescription>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Regional</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-20">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {congregations.map((c) => (
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classe</TableHead>
                <TableHead>Congregacao atual</TableHead>
                <TableHead>Alterar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((cl) => (
                <TableRow key={cl.id}>
                  <TableCell>{cl.name}</TableCell>
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
    </div>
  );
};