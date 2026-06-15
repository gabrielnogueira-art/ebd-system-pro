import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Search, Eye } from "lucide-react";
import { StudentAttendanceDialog } from "./StudentAttendanceDialog";

interface Student {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  birth_date: string | null;
  cargo?: string | null;
  class_id: number;
  active: boolean;
  classes?: {
    name: string;
  };
}

interface Class {
  id: number;
  name: string;
}

export const StudentsManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAddress, setNewStudentAddress] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = useState("");
  const [newStudentCargo, setNewStudentCargo] = useState("");
  const [newStudentClassId, setNewStudentClassId] = useState("");
  const { toast } = useToast();
  
  // Edit dialog state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentAddress, setEditStudentAddress] = useState("");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [editStudentBirthDate, setEditStudentBirthDate] = useState("");
  const [editStudentCargo, setEditStudentCargo] = useState("");
  const [editStudentClassId, setEditStudentClassId] = useState("");
  
  // Delete dialog state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  
  // Sort state
  const [sortColumn, setSortColumn] = useState<'name' | 'phone' | 'cargo' | 'class' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  
  // Attendance dialog state
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsResult, classesResult] = await Promise.all([
        supabase
          .from("students")
          .select(`
            *,
            classes:class_id (
              name
            )
          `)
          .order("name"),
        supabase
          .from("classes")
          .select("*")
          .order("id")
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (classesResult.error) throw classesResult.error;

      setStudents(studentsResult.data || []);
      setClasses(classesResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addStudent = async () => {
    if (!newStudentName.trim() || !newStudentClassId || !newStudentCargo) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha pelo menos o nome, a classe e o cargo.",
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
            class_id: parseInt(newStudentClassId),
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
      setNewStudentClassId("");
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
    setEditStudentClassId(student.class_id.toString());
  };

  const saveStudentEdit = async () => {
    if (!editingStudent || !editStudentName.trim() || !editStudentClassId || !editStudentCargo) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha pelo menos o nome, a classe e o cargo.",
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
          class_id: parseInt(editStudentClassId),
        })
        .eq("id", editingStudent.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Dados do aluno atualizados com sucesso!",
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

  const deleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Aluno excluído com sucesso!",
      });

      setStudentToDelete(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir aluno.",
      });
    }
  };

  const toggleStudentStatus = async (studentId: number, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ active: !currentStatus })
        .eq("id", studentId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Aluno ${!currentStatus ? "ativado" : "desativado"} com sucesso!`,
      });

      fetchData();
    } catch (error) {
      console.error("Error updating student:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar status do aluno.",
      });
    }
  };

  const handleSort = (column: 'name' | 'phone' | 'cargo' | 'class' | 'status') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredStudents = students.filter((student) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      (student.phone && student.phone.toLowerCase().includes(searchLower)) ||
      (student.classes?.name && student.classes.name.toLowerCase().includes(searchLower))
    );
  });

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortColumn) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'phone': {
        const phoneA = a.phone || '';
        const phoneB = b.phone || '';
        return direction * phoneA.localeCompare(phoneB);
      }
      case 'cargo': {
        const cargoA = a.cargo || '';
        const cargoB = b.cargo || '';
        return direction * cargoA.localeCompare(cargoB);
      }
      case 'class': {
        const classA = a.classes?.name || '';
        const classB = b.classes?.name || '';
        return direction * classA.localeCompare(classB);
      }
      case 'status': {
        const statusA = a.active ? 1 : 0;
        const statusB = b.active ? 1 : 0;
        return direction * (statusA - statusB);
      }
      default:
        return 0;
    }
  });

  const SortIcon = ({ column }: { column: 'name' | 'phone' | 'cargo' | 'class' | 'status' }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  if (isLoading) {
    // Skeleton Loader
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Aluno</CardTitle>
          <CardDescription>
            Cadastre um novo aluno no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="student-name">Nome do Aluno</Label>
              <Input
                id="student-name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="Digite o nome completo"
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="student-phone">Telefone</Label>
              <Input
                id="student-phone"
                value={newStudentPhone}
                onChange={(e) => setNewStudentPhone(e.target.value)}
                placeholder="(22) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-birth-date">Data de Nascimento</Label>
              <Input
                id="student-birth-date"
                type="date"
                value={newStudentBirthDate}
                onChange={(e) => setNewStudentBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-cargo">Cargo *</Label>
              <Select value={newStudentCargo} onValueChange={setNewStudentCargo}>
                <SelectTrigger id="student-cargo">
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
            <div className="space-y-2 md:col-span-2 lg:col-span-1">
              <Label htmlFor="student-address">Endereço</Label>
              <Input
                id="student-address"
                value={newStudentAddress}
                onChange={(e) => setNewStudentAddress(e.target.value)}
                placeholder="Rua, número, bairro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-class">Classe</Label>
              <Select value={newStudentClassId} onValueChange={setNewStudentClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addStudent} className="w-full">
              Adicionar Aluno
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
          <CardDescription>
            Gerencie todos os alunos cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar por nome, telefone ou classe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Nome
                      <SortIcon column="name" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('phone')}
                  >
                    <div className="flex items-center">
                      Telefone
                      <SortIcon column="phone" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('cargo')}
                  >
                    <div className="flex items-center">
                      Cargo
                      <SortIcon column="cargo" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('class')}
                  >
                    <div className="flex items-center">
                      Classe
                      <SortIcon column="class" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => {
                          setSelectedStudentId(student.id);
                          setSelectedStudentName(student.name);
                          setAttendanceDialogOpen(true);
                        }}
                        className="hover:text-primary hover:underline text-left cursor-pointer"
                      >
                        {student.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      {student.phone || "-"}
                    </TableCell>
                    <TableCell>
                      {student.cargo || "-"}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {student.classes?.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.active ? "default" : "secondary"}>
                        {student.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setSelectedStudentName(student.name);
                            setAttendanceDialogOpen(true);
                          }}
                          title="Ver frequência"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStudentStatus(student.id, student.active ?? false)}
                        >
                          {student.active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(student)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStudentToDelete(student)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
            {sortedStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "Nenhum aluno encontrado com os critérios de busca." : "Nenhum aluno cadastrado."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>
              Atualize os dados do aluno
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-student-name">Nome do Aluno</Label>
              <Input
                id="edit-student-name"
                value={editStudentName}
                onChange={(e) => setEditStudentName(e.target.value)}
                placeholder="Digite o nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-student-phone">Telefone</Label>
              <Input
                id="edit-student-phone"
                value={editStudentPhone}
                onChange={(e) => setEditStudentPhone(e.target.value)}
                placeholder="(22) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-student-birth-date">Data de Nascimento</Label>
              <Input
                id="edit-student-birth-date"
                type="date"
                value={editStudentBirthDate}
                onChange={(e) => setEditStudentBirthDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-student-cargo">Cargo *</Label>
              <Select value={editStudentCargo} onValueChange={setEditStudentCargo}>
                <SelectTrigger id="edit-student-cargo">
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
              <Label htmlFor="edit-student-address">Endereço</Label>
              <Input
                id="edit-student-address"
                value={editStudentAddress}
                onChange={(e) => setEditStudentAddress(e.target.value)}
                placeholder="Rua, número, bairro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-student-class">Classe</Label>
              <Select value={editStudentClassId} onValueChange={setEditStudentClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>
              Cancelar
            </Button>
            <Button onClick={saveStudentEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentAttendanceDialog
        studentId={selectedStudentId}
        studentName={selectedStudentName}
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o aluno "{studentToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteStudent}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
