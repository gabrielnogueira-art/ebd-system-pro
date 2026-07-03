import { useState, useEffect } from "react";
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
import { Pencil, Trash2 } from "lucide-react";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [classesRes, congregationsRes, studentsRes] = await Promise.all([
        supabase
          .from("classes")
          .select(`
            *,
            congregations (
              name
            )
          `)
          .order("name"),
        supabase
          .from("congregations")
          .select("id, name")
          .order("name"),
        supabase
          .from("students")
          .select("id, name, class_id, cargo, classes:class_id(name)")
          .eq("active", true)
          .order("name")
      ]);

      if (classesRes.error) throw classesRes.error;
      if (congregationsRes.error) throw congregationsRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setClassesList(classesRes.data || []);
      setCongregations(congregationsRes.data || []);
      setStudents((studentsRes.data as StudentOption[]) || []);
      
      // Auto-select congregation if there is only one available
      if (congregationsRes.data && congregationsRes.data.length === 1) {
        setNewClassCongregationId(congregationsRes.data[0].id);
      }
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
      const { error } = await supabase
        .from("classes")
        .update({
          name: editClassName.trim(),
          congregation_id: editClassCongregationId,
          teacher_student_id: editTeacherStudentId === "none" ? null : Number(editTeacherStudentId),
        })
        .eq("id", editingClass.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Classe atualizada com sucesso!",
      });

      setEditingClass(null);
      fetchData();
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

  const updateClassTeacher = async (classId: number, studentId: string) => {
    try {
      const { error } = await supabase
        .from("classes")
        .update({ teacher_student_id: studentId === "none" ? null : Number(studentId) })
        .eq("id", classId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Professor responsável atualizado.",
      });
      fetchData();
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
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classesList.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.congregations?.name || "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={cls.teacher_student_id ? String(cls.teacher_student_id) : "none"}
                          onValueChange={(value) => updateClassTeacher(cls.id, value)}
                        >
                          <SelectTrigger className="min-w-[220px]">
                            <SelectValue placeholder="Sem professor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem professor</SelectItem>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={String(student.id)}>
                                {student.name}{student.classes?.name ? ` — ${student.classes.name}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
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
              <Label htmlFor="edit-class-teacher">Professor responsável</Label>
              <Select value={editTeacherStudentId} onValueChange={setEditTeacherStudentId}>
                <SelectTrigger id="edit-class-teacher">
                  <SelectValue placeholder="Sem professor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem professor</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={String(student.id)}>
                      {student.name}{student.classes?.name ? ` — ${student.classes.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
