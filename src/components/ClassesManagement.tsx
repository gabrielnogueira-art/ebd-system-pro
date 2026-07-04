import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Check, ChevronsUpDown, KeyRound, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useScope } from "@/context/ScopeContext";

interface ClassItem {
  id: number;
  name: string;
  congregation_id: string | null;
  teacher_student_id: number | null;
  congregations?: {
    name: string;
  };
}

interface StudentOption {
  id: number;
  name: string;
  class_id: number | null;
  cargo: string | null;
  classes?: {
    name: string;
  } | null;
}

interface Congregation {
  id: string;
  name: string;
}

export const ClassesManagement = () => {
  const { applied } = useScope();
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [congregations, setCongregations] = useState<Congregation[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newClassName, setNewClassName] = useState("");
  const [newClassCongregationId, setNewClassCongregationId] = useState("");
  
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [editClassCongregationId, setEditClassCongregationId] = useState("");
  const [editTeacherStudentId, setEditTeacherStudentId] = useState("none");
  
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);
  const [loginClass, setLoginClass] = useState<ClassItem | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"create" | "update_email" | "update_password">("create");
  const [loginBusy, setLoginBusy] = useState(false);
  const [classLoginMap, setClassLoginMap] = useState<Record<number, { email: string; user_id: string }>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied?.ministryId, applied?.headquartersId, applied?.regionalId, applied?.congregationId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1) Congregations respecting applied scope
      let congQuery = supabase.from("congregations").select("id, name, regional_id, headquarters_id").order("name");
      if (applied?.congregationId) congQuery = congQuery.eq("id", applied.congregationId);
      else if (applied?.regionalId) congQuery = congQuery.eq("regional_id", applied.regionalId);
      else if (applied?.headquartersId) congQuery = congQuery.eq("headquarters_id", applied.headquartersId);
      const congregationsRes: any = await congQuery;
      if (congregationsRes.error) throw congregationsRes.error;

      let congList: any[] = congregationsRes.data || [];
      if (applied?.ministryId && !applied?.headquartersId) {
        const { data: hqs } = await supabase.from("headquarters" as any).select("id").eq("ministry_id", applied.ministryId);
        const hqIds = new Set((hqs as any[] || []).map((h) => h.id));
        congList = congList.filter((c) => hqIds.has(c.headquarters_id));
      }
      const congIds = congList.map((c) => c.id);

      // 2) Classes restricted to those congregations
      let classesQuery = supabase
        .from("classes")
        .select(`*, congregations ( name )`)
        .order("name");
      if (congIds.length > 0) classesQuery = classesQuery.in("congregation_id", congIds);
      else classesQuery = classesQuery.in("congregation_id", ["00000000-0000-0000-0000-000000000000"]); // empty result
      const classesRes: any = await classesQuery;
      if (classesRes.error) throw classesRes.error;

      // 3) Students restricted to the same congregations (for teacher combobox)
      const classIds = (classesRes.data || []).map((c: any) => c.id);
      let studentsRes: any = { data: [], error: null };
      if (classIds.length > 0) {
        studentsRes = await supabase
          .from("students")
          .select("id, name, class_id, cargo, classes:class_id(name)")
          .eq("active", true)
          .in("class_id", classIds)
          .order("name");
      }

      if (studentsRes.error) throw studentsRes.error;

      setClassesList(classesRes.data || []);
      setCongregations(congList);
      setStudents((studentsRes.data as StudentOption[]) || []);

      // Auto-select congregation if there is only one available
      if (congList.length === 1) {
        setNewClassCongregationId(congList[0].id);
      }

      // 4) Load class login map (users with role professor_classe + their classes)
      await fetchClassLogins((classesRes.data || []).map((c: any) => c.id));
    } catch (error) {
      console.error("Error fetching classes:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados de turmas.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassLogins = async (classIds: number[]) => {
    if (classIds.length === 0) { setClassLoginMap({}); return; }
    const { data, error } = await supabase.rpc("get_class_logins" as any, {
      _class_ids: classIds,
    });
    if (error) {
      console.error("get_class_logins error", error);
      setClassLoginMap({});
      return;
    }
    const map: Record<number, { email: string; user_id: string }> = {};
    ((data as any[]) || []).forEach((r) => {
      if (r.email) map[r.class_id] = { email: r.email, user_id: r.user_id };
    });
    setClassLoginMap(map);
  };

  const addClass = async () => {
    if (!newClassName.trim() || !newClassCongregationId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha o nome da classe e selecione a congregação.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("classes")
        .insert([
          {
            name: newClassName.trim(),
            congregation_id: newClassCongregationId,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Classe criada com sucesso!",
      });

      setNewClassName("");
      if (congregations.length !== 1) {
        setNewClassCongregationId("");
      }
      fetchData();
    } catch (error: any) {
      console.error("Error adding class:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao criar classe. Verifique suas permissões.",
      });
    }
  };

  const openEditDialog = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassCongregationId(cls.congregation_id || "");
    setEditTeacherStudentId(cls.teacher_student_id ? String(cls.teacher_student_id) : "none");
  };

  const saveClassEdit = async () => {
    if (!editingClass || !editClassName.trim() || !editClassCongregationId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha o nome da classe e a congregação.",
      });
      return;
    }

    try {
      const teacherId = editTeacherStudentId === "none" ? null : Number(editTeacherStudentId);
      const { error } = await supabase
        .from("classes")
        .update({
          name: editClassName.trim(),
          congregation_id: editClassCongregationId,
          teacher_student_id: teacherId,
        })
        .eq("id", editingClass.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Classe atualizada com sucesso!",
      });

      // Atualiza somente o item na lista local — evita refetch que causa reload/lag
      setClassesList((prev) => prev.map((c) =>
        c.id === editingClass.id
          ? { ...c, name: editClassName.trim(), congregation_id: editClassCongregationId, teacher_student_id: teacherId }
          : c
      ));
      setEditingClass(null);
    } catch (error) {
      console.error("Error updating class:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar classe.",
      });
    }
  };

  const teacherName = (studentId: number | null) => {
    if (!studentId) return "-";
    return students.find((student) => student.id === studentId)?.name || "-";
  };

  const updateClassTeacher = async (classId: number, studentId: string | null) => {
    try {
      const teacherId = !studentId || studentId === "none" ? null : Number(studentId);
      const { error } = await supabase
        .from("classes")
        .update({ teacher_student_id: teacherId })
        .eq("id", classId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Professor responsável atualizado.",
      });
      // Update only local list — no full refetch => sem "recarregar página"
      setClassesList((prev) => prev.map((c) => c.id === classId ? { ...c, teacher_student_id: teacherId } : c));
    } catch (error) {
      console.error("Error updating class teacher:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao vincular professor à classe.",
      });
    }
  };

  const deleteClass = async () => {
    if (!classToDelete) return;

    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Classe excluída com sucesso!",
      });

      setClassToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir classe. Ela pode ter alunos vinculados.",
      });
    }
  };

  // ============= LOGIN DA CLASSE =============
  const openLoginDialog = (cls: ClassItem) => {
    setLoginClass(cls);
    const existing = classLoginMap[cls.id];
    setLoginMode(existing ? "update_password" : "create");
    setLoginEmail(existing?.email || "");
    setLoginPassword("");
  };

  const submitLogin = async () => {
    if (!loginClass) return;
    setLoginBusy(true);
    try {
      if (loginMode === "create") {
        if (!loginEmail || !loginPassword) throw new Error("Preencha e-mail e senha");
        const { data, error } = await supabase.functions.invoke("create-entity-user", {
          body: {
            action: "create_user",
            email: loginEmail,
            password: loginPassword,
            display_name: loginClass.name,
            role: "professor_classe",
            class_ids: [loginClass.id],
            congregation_id: loginClass.congregation_id,
          },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
      } else if (loginMode === "update_email") {
        const { data, error } = await supabase.functions.invoke("update-class-login", {
          body: { action: "update_email", class_id: loginClass.id, email: loginEmail },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
      } else if (loginMode === "update_password") {
        if (!loginPassword) throw new Error("Preencha a nova senha");
        const { data, error } = await supabase.functions.invoke("update-class-login", {
          body: { action: "update_password", class_id: loginClass.id, password: loginPassword },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
      }
      toast({ title: "Sucesso", description: "Login da classe atualizado." });
      setLoginClass(null);
      await fetchClassLogins(classesList.map((c) => c.id));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e?.message || "Falha ao atualizar login." });
    } finally {
      setLoginBusy(false);
    }
  };

  const deleteLogin = async () => {
    if (!loginClass) return;
    setLoginBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-class-login", {
        body: { action: "delete_login", class_id: loginClass.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Login removido" });
      setLoginClass(null);
      await fetchClassLogins(classesList.map((c) => c.id));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e?.message || "Falha ao remover login." });
    } finally {
      setLoginBusy(false);
    }
  };

  // Alunos elegíveis para vincular como professor:
  // apenas alunos ativos matriculados em classes cujo nome contém "PROFESSOR"
  // e da mesma congregação da classe alvo.
  const eligibleTeachersFor = (classCongregationId: string | null) => {
    if (!classCongregationId) return [] as StudentOption[];
    const profClassIds = new Set(
      classesList
        .filter((c) => (c.name || "").toUpperCase().includes("PROFESSOR") && c.congregation_id === classCongregationId)
        .map((c) => c.id)
    );
    return students.filter((s) => s.class_id != null && profClassIds.has(s.class_id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Nova Classe</CardTitle>
          <CardDescription>
            Crie uma nova turma da EBD
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="class-name">Nome da Classe</Label>
              <Input
                id="class-name"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Ex: Jovens, Adultos..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-congregation">Congregação</Label>
              <Select value={newClassCongregationId} onValueChange={setNewClassCongregationId}>
                <SelectTrigger id="class-congregation">
                  <SelectValue placeholder="Selecione a congregação" />
                </SelectTrigger>
                <SelectContent>
                  {congregations.map((cong) => (
                    <SelectItem key={cong.id} value={cong.id}>
                      {cong.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addClass} className="w-full">
              Adicionar Classe
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Classes</CardTitle>
          <CardDescription>
            Gerencie as classes cadastradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Classe</TableHead>
                    <TableHead>Congregação</TableHead>
                    <TableHead>Professor responsável</TableHead>
                    <TableHead>Login da classe</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classesList.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.congregations?.name || "-"}</TableCell>
                      <TableCell>
                        <TeacherCombobox
                          value={cls.teacher_student_id}
                          options={eligibleTeachersFor(cls.congregation_id)}
                          onChange={(id) => updateClassTeacher(cls.id, id == null ? null : String(id))}
                        />
                      </TableCell>
                      <TableCell>
                        {classLoginMap[cls.id] ? (
                          <span className="text-xs">{classLoginMap[cls.id].email}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem login</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" title="Gerenciar login" onClick={() => openLoginDialog(cls)}>
                            {classLoginMap[cls.id] ? <KeyRound className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(cls)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setClassToDelete(cls)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {classesList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                        Nenhuma classe encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Class Dialog */}
      <Dialog open={!!editingClass} onOpenChange={(open) => !open && setEditingClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Classe</DialogTitle>
            <DialogDescription>
              Atualize os dados da classe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-class-name">Nome da Classe</Label>
              <Input
                id="edit-class-name"
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-class-congregation">Congregação</Label>
              <Select value={editClassCongregationId} onValueChange={setEditClassCongregationId}>
                <SelectTrigger id="edit-class-congregation">
                  <SelectValue placeholder="Selecione a congregação" />
                </SelectTrigger>
                <SelectContent>
                  {congregations.map((cong) => (
                    <SelectItem key={cong.id} value={cong.id}>
                      {cong.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Professor responsável</Label>
              <TeacherCombobox
                value={editTeacherStudentId === "none" ? null : Number(editTeacherStudentId)}
                options={eligibleTeachersFor(editClassCongregationId || null)}
                onChange={(id) => setEditTeacherStudentId(id == null ? "none" : String(id))}
              />
              {editingClass?.teacher_student_id && (
                <p className="text-xs text-muted-foreground">Atual: {teacherName(editingClass.teacher_student_id)}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingClass(null)}>
              Cancelar
            </Button>
            <Button onClick={saveClassEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={!!loginClass} onOpenChange={(open) => !open && setLoginClass(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login da Classe</DialogTitle>
            <DialogDescription>
              {loginClass?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loginClass && classLoginMap[loginClass.id] && (
              <div className="flex gap-2">
                <Button variant={loginMode === "update_email" ? "default" : "outline"} size="sm" onClick={() => setLoginMode("update_email")}>Alterar e-mail</Button>
                <Button variant={loginMode === "update_password" ? "default" : "outline"} size="sm" onClick={() => setLoginMode("update_password")}>Redefinir senha</Button>
              </div>
            )}
            {(loginMode === "create" || loginMode === "update_email") && (
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="classe@igreja.com" />
              </div>
            )}
            {(loginMode === "create" || loginMode === "update_password") && (
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="text" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="mínimo 6 caracteres" />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {loginClass && classLoginMap[loginClass.id] && (
              <Button variant="destructive" onClick={deleteLogin} disabled={loginBusy}>Remover login</Button>
            )}
            <Button variant="outline" onClick={() => setLoginClass(null)} disabled={loginBusy}>Cancelar</Button>
            <Button onClick={submitLogin} disabled={loginBusy}>{loginBusy ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!classToDelete} onOpenChange={(open) => !open && setClassToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a classe "{classToDelete?.name}"? 
              Isso só será possível se não houver alunos vinculados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteClass}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ============ Teacher Combobox (com busca) ============
interface TeacherComboboxProps {
  value: number | null;
  options: StudentOption[];
  onChange: (id: number | null) => void;
}

function TeacherCombobox({ value, options, onChange }: TeacherComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((o) => o.id === value) || null, [options, value]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="min-w-[240px] justify-between font-normal">
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.name : "Sem professor"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar aluno..." />
          <CommandList>
            <CommandEmpty>
              {options.length === 0
                ? "Nenhum aluno na classe de professores desta congregação."
                : "Nenhum resultado."}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => { onChange(null); setOpen(false); }}
              >
                <Check className={cn("mr-2 h-4 w-4", value == null ? "opacity-100" : "opacity-0")} />
                Sem professor
              </CommandItem>
              {options.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.name} ${s.classes?.name || ""}`}
                  onSelect={() => { onChange(s.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === s.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{s.name}</span>
                    {s.classes?.name && <span className="text-xs text-muted-foreground">{s.classes.name}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
