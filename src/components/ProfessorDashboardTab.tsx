import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/use-toast";
import { Users, BookOpen, BookMarked, Wallet, AlertTriangle, Gift } from "lucide-react";

interface Student {
  id: number;
  name: string;
  birth_date: string | null;
  active: boolean;
}

interface ProfessorDashboardTabProps {
  classId: number;
}

export const ProfessorDashboardTab = ({ classId }: ProfessorDashboardTabProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    avgPresence: 0,
    avgBibles: 0,
    avgMagazines: 0,
    totalOfferings: 0,
    enrolled: 0
  });
  
  const [birthdays, setBirthdays] = useState<{name: string, date: string, isUpcoming: boolean}[]>([]);
  const [absentStudents, setAbsentStudents] = useState<{name: string, consecutive: number}[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    if (classId) fetchDashboardData();
  }, [classId]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Students
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name, birth_date")
        .eq("class_id", classId)
        .eq("active", true);

      if (studentsError) throw studentsError;

      // 2. Fetch Registrations (last 3 months or all)
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("*")
        .eq("class_id", classId)
        .order("registration_date", { ascending: false });

      if (regError) throw regError;

      // --- Calculate Stats ---
      let totalPresence = 0;
      let totalBibles = 0;
      let totalMagazines = 0;
      let totalOfferings = 0;
      const numRecords = registrations?.length || 0;

      if (registrations && registrations.length > 0) {
        registrations.forEach(r => {
          totalPresence += r.total_present || 0;
          totalBibles += r.bibles || 0;
          totalMagazines += r.magazines || 0;
          totalOfferings += (parseFloat(String(r.offering_cash || 0)) + parseFloat(String(r.offering_pix || 0)));
        });
      }

      setStats({
        enrolled: students?.length || 0,
        avgPresence: numRecords > 0 ? Math.round(totalPresence / numRecords) : 0,
        avgBibles: numRecords > 0 ? Math.round(totalBibles / numRecords) : 0,
        avgMagazines: numRecords > 0 ? Math.round(totalMagazines / numRecords) : 0,
        totalOfferings
      });

      // --- Calculate Birthdays ---
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();
      
      const bdays: {name: string, date: string, isUpcoming: boolean}[] = [];
      
      students?.forEach(s => {
        if (s.birth_date) {
          // birth_date format: YYYY-MM-DD
          const parts = s.birth_date.split('-');
          if (parts.length === 3) {
            const bMonth = parseInt(parts[1]) - 1; // 0-indexed
            const bDay = parseInt(parts[2]);
            
            // Is it this month?
            if (bMonth === currentMonth) {
              bdays.push({
                name: s.name,
                date: `${bDay.toString().padStart(2, '0')}/${(bMonth + 1).toString().padStart(2, '0')}`,
                isUpcoming: bDay >= currentDay
              });
            }
          }
        }
      });
      
      // Sort: upcoming first, then past
      bdays.sort((a, b) => {
        const dayA = parseInt(a.date.split('/')[0]);
        const dayB = parseInt(b.date.split('/')[0]);
        return dayA - dayB;
      });
      
      setBirthdays(bdays);

      // --- Calculate Absent Students ---
      // We look at the last 4 registrations
      const recentRegs = registrations?.slice(0, 4) || [];
      const absencesList: {name: string, consecutive: number}[] = [];
      
      students?.forEach(student => {
        let consecutiveAbsences = 0;
        
        for (const reg of recentRegs) {
          const presents = reg.present_students || [];
          if (!presents.includes(student.name)) {
            consecutiveAbsences++;
          } else {
            break; // Found presence, break the consecutive chain
          }
        }
        
        if (consecutiveAbsences >= 2) {
          absencesList.push({ name: student.name, consecutive: consecutiveAbsences });
        }
      });
      
      absencesList.sort((a, b) => b.consecutive - a.consecutive);
      setAbsentStudents(absencesList);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados do painel.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando painel...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Frequência (Média)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.avgPresence} <span className="text-sm text-muted-foreground font-normal">/ {stats.enrolled}</span></div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Bíblias (Média)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.avgBibles}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookMarked className="h-4 w-4" /> Revistas (Média)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.avgMagazines}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Ofertas Acumuladas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">R$ {stats.totalOfferings.toFixed(2).replace('.', ',')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aniversariantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Gift className="h-5 w-5" /> Aniversariantes do Mês
            </CardTitle>
            <CardDescription>Alunos celebrando vida neste mês</CardDescription>
          </CardHeader>
          <CardContent>
            {birthdays.length > 0 ? (
              <div className="space-y-3">
                {birthdays.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="font-medium">{b.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{b.date}</span>
                      <Badge variant={b.isUpcoming ? "default" : "secondary"}>
                        {b.isUpcoming ? "Chegando" : "Passou"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhum aniversariante neste mês.</p>
            )}
          </CardContent>
        </Card>

        {/* Alunos Ausentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Atenção Pastoral
            </CardTitle>
            <CardDescription>Alunos com 2 ou mais faltas seguidas</CardDescription>
          </CardHeader>
          <CardContent>
            {absentStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead className="text-right">Faltas Seguidas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentStudents.map((student, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{student.consecutive}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">Ótimo! Nenhum aluno com faltas acumuladas recentes.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
