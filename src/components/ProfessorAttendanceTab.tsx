import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Student {
  id: number;
  name: string;
  active: boolean;
}

interface ProfessorAttendanceTabProps {
  classId: number;
}

interface AttendanceState {
  present: boolean;
  bible: boolean;
  magazine: boolean;
}

export const ProfessorAttendanceTab = ({ classId }: ProfessorAttendanceTabProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [attendance, setAttendance] = useState<Record<number, AttendanceState>>({});
  const [visitors, setVisitors] = useState<number>(0);
  const [offeringCash, setOfferingCash] = useState<string>("");
  const [offeringPix, setOfferingPix] = useState<string>("");
  const [hymn, setHymn] = useState<string>("");
  
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (classId) fetchData();
  }, [classId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, name, active")
        .eq("class_id", classId)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      
      const loadedStudents = data || [];
      setStudents(loadedStudents);
      
      // Initialize attendance state
      const initialAttendance: Record<number, AttendanceState> = {};
      loadedStudents.forEach(s => {
        initialAttendance[s.id] = { present: false, bible: false, magazine: false };
      });
      setAttendance(initialAttendance);
      
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

  const handleAttendanceChange = (studentId: number, field: keyof AttendanceState, value: boolean) => {
    setAttendance(prev => {
      const newState = { ...prev, [studentId]: { ...prev[studentId], [field]: value } };
      
      // Se marcou bíblia ou revista, o aluno tem que estar presente
      if ((field === "bible" || field === "magazine") && value) {
        newState[studentId].present = true;
      }
      
      // Se desmarcou presença, desmarca bíblia e revista
      if (field === "present" && !value) {
        newState[studentId].bible = false;
        newState[studentId].magazine = false;
      }
      
      return newState;
    });
  };

  const parseCurrencyToFloat = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(',', '.'));
  };

  const formatCurrencyInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const cents = parseInt(numbers);
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Calcular totais
      const presentStudentsNames: string[] = [];
      let totalBibles = 0;
      let totalMagazines = 0;
      
      students.forEach(student => {
        const state = attendance[student.id];
        if (state.present) {
          presentStudentsNames.push(student.name);
        }
        if (state.bible) totalBibles++;
        if (state.magazine) totalMagazines++;
      });
      
      const cashFloat = parseCurrencyToFloat(offeringCash);
      const pixFloat = parseCurrencyToFloat(offeringPix);
      
      const registrationData = {
        class_id: classId,
        present_students: presentStudentsNames,
        total_present: presentStudentsNames.length,
        visitors: visitors || 0,
        bibles: totalBibles,
        magazines: totalMagazines,
        offering_cash: cashFloat,
        offering_pix: pixFloat,
        hymn: hymn,
        registration_date: new Date().toISOString()
      };

      const { error } = await supabase.from("registrations").insert([registrationData]);
      if (error) throw error;
      
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error submitting attendance:", error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar a chamada. Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    const initialAttendance: Record<number, AttendanceState> = {};
    students.forEach(s => {
      initialAttendance[s.id] = { present: false, bible: false, magazine: false };
    });
    setAttendance(initialAttendance);
    setVisitors(0);
    setOfferingCash("");
    setOfferingPix("");
    setHymn("");
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando chamada...</div>;
  }

  // Totals for display
  const totalPresent = Object.values(attendance).filter(a => a.present).length;
  const totalBibles = Object.values(attendance).filter(a => a.bible).length;
  const totalMagazines = Object.values(attendance).filter(a => a.magazine).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Chamada Inteligente</CardTitle>
          <CardDescription>
            Faça a chamada marcando os alunos presentes e seus materiais. 
            O sistema calculará os totais automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg mb-6">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="text-center w-20">Presente</TableHead>
                  <TableHead className="text-center w-20">Bíblia</TableHead>
                  <TableHead className="text-center w-20">Revista</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={attendance[student.id]?.present || false}
                        onCheckedChange={(c) => handleAttendanceChange(student.id, "present", c as boolean)}
                        className="h-5 w-5"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={attendance[student.id]?.bible || false}
                        onCheckedChange={(c) => handleAttendanceChange(student.id, "bible", c as boolean)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={attendance[student.id]?.magazine || false}
                        onCheckedChange={(c) => handleAttendanceChange(student.id, "magazine", c as boolean)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhum aluno ativo nesta classe.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-primary/5 p-4 rounded-lg border border-primary/10">
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Matriculados</p>
              <p className="text-xl font-bold">{students.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Presentes</p>
              <p className="text-xl font-bold text-primary">{totalPresent}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Bíblias</p>
              <p className="text-xl font-bold text-green-600">{totalBibles}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Revistas</p>
              <p className="text-xl font-bold text-purple-600">{totalMagazines}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Visitantes</Label>
              <Input 
                type="number" 
                min="0"
                value={visitors || ""} 
                onChange={(e) => setVisitors(parseInt(e.target.value) || 0)} 
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Hino Cantado</Label>
              <Input 
                value={hymn} 
                onChange={(e) => setHymn(e.target.value)} 
                placeholder="Ex: 15 - Harpa Cristã"
              />
            </div>
            <div className="space-y-2">
              <Label>Oferta em Dinheiro (R$)</Label>
              <Input 
                value={offeringCash} 
                onChange={(e) => setOfferingCash(formatCurrencyInput(e.target.value))} 
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Oferta em PIX (R$)</Label>
              <Input 
                value={offeringPix} 
                onChange={(e) => setOfferingPix(formatCurrencyInput(e.target.value))} 
                placeholder="0,00"
              />
            </div>
          </div>

          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleSubmit}
            disabled={isSubmitting || students.length === 0}
          >
            {isSubmitting ? "Enviando Relatório..." : "Enviar Relatório Final"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Chamada Registrada!
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-4">
              <p>O relatório oficial da sua classe foi salvo com sucesso e já está disponível para a secretaria.</p>
              <div className="bg-muted p-3 rounded text-sm space-y-1">
                <p>✓ Presentes: {totalPresent}</p>
                <p>✓ Visitantes: {visitors}</p>
                <p>✓ Bíblias: {totalBibles} | Revistas: {totalMagazines}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => { setShowSuccessDialog(false); resetForm(); }} className="w-full">
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
