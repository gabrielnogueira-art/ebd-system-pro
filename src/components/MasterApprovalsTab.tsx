import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

const db = supabase as any;

type Pending = {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Ministry = { id: string; name: string };
type HQ = { id: string; name: string };
type Reg = { id: string; name: string };
type Cong = { id: string; name: string };

const ROLES = [
  { value: "master", label: "Master" },
  { value: "igreja_mae", label: "Ministério" },
  { value: "igreja_sede", label: "Igreja Sede" },
  { value: "admin_regional", label: "Regional" },
  { value: "secretario_ebd", label: "Secretário (Congregação)" },
  { value: "professor_classe", label: "Professor de Classe" },
];

export const MasterApprovalsTab = () => {
  const { toast } = useToast();
  const [pending, setPending] = useState<Pending[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [hqs, setHqs] = useState<HQ[]>([]);
  const [regs, setRegs] = useState<Reg[]>([]);
  const [congs, setCongs] = useState<Cong[]>([]);
  const [draft, setDraft] = useState<Record<string, { role: string; scopeId: string }>>({});

  const load = async () => {
    const [p, m, h, r, c] = await Promise.all([
      db.from("pending_users").select("*").order("created_at", { ascending: false }),
      db.from("ministries").select("id,name").order("name"),
      db.from("headquarters").select("id,name").order("name"),
      db.from("regionals").select("id,name").order("name"),
      db.from("congregations").select("id,name").order("name"),
    ]);
    setPending(p.data ?? []);
    setMinistries(m.data ?? []);
    setHqs(h.data ?? []);
    setRegs(r.data ?? []);
    setCongs(c.data ?? []);
  };

  useEffect(() => { load(); }, []);

  const scopeOptionsForRole = (role: string): { id: string; label: string }[] => {
    switch (role) {
      case "igreja_mae": return ministries.map((x) => ({ id: x.id, label: x.name }));
      case "igreja_sede": return hqs.map((x) => ({ id: x.id, label: x.name }));
      case "admin_regional": return regs.map((x) => ({ id: x.id, label: x.name }));
      case "secretario_ebd":
      case "professor_classe": return congs.map((x) => ({ id: x.id, label: x.name }));
      default: return [];
    }
  };

  const approve = async (row: Pending) => {
    const d = draft[row.id];
    if (!d?.role) {
      toast({ title: "Selecione o papel", variant: "destructive" });
      return;
    }
    const needsScope = d.role !== "master";
    if (needsScope && !d.scopeId) {
      toast({ title: "Selecione o escopo", variant: "destructive" });
      return;
    }
    const params: any = { _pending_id: row.id, _role: d.role };
    if (d.role === "igreja_mae") params._ministry_id = d.scopeId;
    if (d.role === "igreja_sede") params._headquarters_id = d.scopeId;
    if (d.role === "admin_regional") params._regional_id = d.scopeId;
    if (d.role === "secretario_ebd" || d.role === "professor_classe") params._congregation_id = d.scopeId;
    const { error } = await db.rpc("approve_user", params);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Usuário aprovado" });
    load();
  };

  const reject = async (row: Pending) => {
    const { error } = await db.rpc("reject_user", { _pending_id: row.id });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Solicitação rejeitada" });
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprovação de Usuários</CardTitle>
        <CardDescription>
          Defina o nível e o escopo de cada conta solicitada antes de liberar o acesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma solicitação no momento.
                </TableCell>
              </TableRow>
            )}
            {pending.map((row) => {
              const d = draft[row.id] ?? { role: "", scopeId: "" };
              const opts = scopeOptionsForRole(d.role);
              const isPending = row.status === "pending";
              return (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{row.email}</TableCell>
                  <TableCell className="text-xs">{row.display_name ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "pending" ? "secondary" : row.status === "approved" ? "default" : "destructive"}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={d.role}
                      onValueChange={(v) => setDraft({ ...draft, [row.id]: { role: v, scopeId: "" } })}
                      disabled={!isPending}
                    >
                      <SelectTrigger className="h-8 w-44"><SelectValue placeholder="Papel" /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {d.role && d.role !== "master" ? (
                      <Select
                        value={d.scopeId}
                        onValueChange={(v) => setDraft({ ...draft, [row.id]: { ...d, scopeId: v } })}
                        disabled={!isPending}
                      >
                        <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Escopo" /></SelectTrigger>
                        <SelectContent>
                          {opts.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {isPending && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => approve(row)} title="Aprovar">
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => reject(row)} title="Rejeitar">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};