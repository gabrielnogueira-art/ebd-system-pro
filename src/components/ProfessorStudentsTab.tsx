import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

interface Student {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  birth_date: string | null;
  cargo?: string | null;
  class_id: number;
  active: boolean;
}

interface ProfessorStudentsTabProps {
  classId: number;
}

export const ProfessorStudentsTab = ({ classId }: ProfessorStudentsTabProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAddress, setNewStudentAddress] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = useState("");
  const [newStudentCargo, setNewStudentCargo] = useState("");
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentAddress, setEditStudentAddress] = useState("");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [editStudentBirthDate, setEditStudentBirthDate] = useState("");
  const [editStudentCargo, setEditStudentCargo] = useState("");
  
  const { toast } = useToast();

  useEffect(() => {
    if (classId) fetchData();
  }, [classId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", classId)
        .order("name");

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar lista de alunos.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addStudent = async () => {
    if (!newStudentName.trim() || !newStudentCargo) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha pelo menos o nome e o cargo.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("students")
        .insert([
          {
            name: newStudentName.trim(),
            address: newStudentAddress.trim(),
            phone: newStudentPhone.trim(),
            birth_date: newStudentBirthDate || null,
            cargo: newStudentCargo || null,
            class_id: classId,
            active: true
          }
        ]);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Aluno adicionado com sucesso!",
      });

      setNewStudentName("");
      setNewStudentAddress("");
      setNewStudentPhone("");
      setNewStudentBirthDate("");
      setNewStudentCargo("");
      fetchData();
    } catch (error) {
      console.error("Error adding student:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao adicionar aluno.",
      });
    }
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setEditStudentName(student.name);
    setEditStudentAddress(student.address || "");
    setEditStudentPhone(student.phone || "");
    setEditStudentBirthDate(student.birth_date || "");
    setEditStudentCargo(student.cargo || "");
  };

  const saveStudentEdit = async () => {
    if (!editingStudent || !editStudentName.trim() || !editStudentCargo) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha o nome e o cargo.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("students")
        .update({
          name: editStudentName.trim(),
          address: editStudentAddress.trim() || null,
          phone: editStudentPhone.trim() || null,
          birth_date: editStudentBirthDate || null,
          cargo: editStudentCargo || null,
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dados atualizados com sucesso!",
      });

      setEditingStudent(null);
      fetchData();
    } catch (error) {
      console.error("Error updating student:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar dados do aluno.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Aluno</CardTitle>
          <CardDescription>Cadastre um aluno diretamente na sua classe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="prof-student-name">Nome do Aluno</Label>
              <Input
                id="prof-student-name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-student-phone">Telefone</Label>
              <Input
                id="prof-student-phone"
                value={newStudentPhone}
                onChange={(e) => setNewStudentPhone(e.target.value)}
                placeholder="(22) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-student-birth">Nascimento</Label>
              <Input
                id="prof-student-birth"
                type="date"
                value={newStudentBirthDate}
                onChange={(e) => setNewStudentBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-student-cargo">Cargo *</Label>
              <Select value={newStudentCargo} onValueChange={setNewStudentCargo}>
                <SelectTrigger id="prof-student-cargo">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Membro">Membro</SelectItem>
                  <SelectItem value="Congregado">Congregado</SelectItem>
                  <SelectItem value="Obreiro">Obreiro</SelectItem>
                  <SelectItem value="Diácono">Diácono</SelectItem>
                  <SelectItem value="Presbítero">Presbítero</SelectItem>
                  <SelectItem value="Pastor">Pastor</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="prof-student-address">Endereço</Label>
              <Input
                id="prof-student-address"
                value={newStudentAddress}
                onChange={(e) => setNewStudentAddress(e.target.value)}
                placeholder="Rua, número"
              />
            </div>
            <Button onClick={addStudent} className="w-full">
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meus Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead className="w-[80px]">Editar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.phone || "-"}</TableCell>
                      <TableCell>{student.cargo || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(student)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        Nenhum aluno cadastrado na sua classe.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Aluno</Label>
              <Input
                value={editStudentName}
                onChange={(e) => setEditStudentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={editStudentPhone}
                onChange={(e) => setEditStudentPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={editStudentBirthDate}
                onChange={(e) => setEditStudentBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Select value={editStudentCargo} onValueChange={setEditStudentCargo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Membro">Membro</SelectItem>
                  <SelectItem value="Congregado">Congregado</SelectItem>
                  <SelectItem value="Obreiro">Obreiro</SelectItem>
                  <SelectItem value="Diácono">Diácono</SelectItem>
                  <SelectItem value="Presbítero">Presbítero</SelectItem>
                  <SelectItem value="Pastor">Pastor</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={editStudentAddress}
                onChange={(e) => setEditStudentAddress(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancelar</Button>
            <Button onClick={saveStudentEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
