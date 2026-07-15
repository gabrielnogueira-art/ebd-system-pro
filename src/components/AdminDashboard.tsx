import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ComposedChart, LabelList } from "recharts";
import { BookOpen, BookMarked, Trophy } from "lucide-react";
import { CalendarDays, TrendingUp, Users, DollarSign, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardScope } from "@/hooks/useDashboardScope";
import { DashboardScopeFilter } from "@/components/DashboardScopeFilter";

interface DashboardStats {
  totalRegistrations: number;
  totalStudents: number;
  totalClasses: number;
  todayRegistrations: number;
  totalPresence: number;
  totalVisitors: number;
  totalOfferings: number;
}

interface QuarterlyData {
  month: string;
  registrations: number;
  presence: number;
  offerings: number;
}

interface AttendanceData {
  dayOfWeek: string;
  attendance: number;
}

interface ClassData {
  className: string;
  enrolled: number;
  present: number;
  percentage: number;
  presenceRate: number;
  biblesRate: number;
  magazinesRate: number;
  totalBibles: number;
  totalMagazines: number;
  totalPresent: number;
}

interface AbsentStudent {
  id: number;
  name: string;
  className: string;
  consecutiveAbsences: number;
  absenceRate: number;
  totalSundays: number;
  presentCount: number;
}

interface AdminDashboardProps {
  /** Restringe TODO o dashboard a uma unica congregacao (drill-down). */
  congregationOverride?: string | null;
}

export const AdminDashboard = ({ congregationOverride }: AdminDashboardProps = {}) => {
  const scope = useDashboardScope();
  const baseClassIds = scope.effectiveClassIds; // null = sem restricao
  const classIds = useMemo(
    () => congregationOverride
      ? scope.classes
          .filter((c) => c.congregation_id === congregationOverride)
          .map((c) => c.id)
      : baseClassIds,
    [baseClassIds, congregationOverride, scope.classes],
  );
  const scopeKey = useMemo(
    () => (congregationOverride ?? "") + "|" + (classIds === null ? "ALL" : classIds.slice().sort((a, b) => a - b).join(",")),
    [classIds, congregationOverride],
  );
  const visibleClasses = useMemo(() => {
    if (classIds === null) return scope.classes;
    const allow = new Set(classIds);
    return scope.classes.filter((c) => allow.has(c.id));
  }, [classIds, scope.classes]);
  const loadSeq = useRef(0);
  const initialLoadDone = useRef(false);
  const realtimeRefreshTimer = useRef<number | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalRegistrations: 0,
    totalStudents: 0,
    totalClasses: 0,
    todayRegistrations: 0,
    totalPresence: 0,
    totalVisitors: 0,
    totalOfferings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [allowRegistrations, setAllowRegistrations] = useState(false); // Modificado para 'allowRegistrations'
  const [selectedQuarter, setSelectedQuarter] = useState("current");
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyData[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [filteredAbsentStudents, setFilteredAbsentStudents] = useState<AbsentStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "consecutiveAbsences" | "absenceRate">("consecutiveAbsences");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [absenceQuarter, setAbsenceQuarter] = useState("current");
  const [ageGroup, setAgeGroup] = useState<"all" | "Crianças" | "Adolescentes" | "Adultos">("all");
  const { toast } = useToast();

  useEffect(() => {
    if (scope.loading) return;
    let active = true;
    const seq = ++loadSeq.current;
    initialLoadDone.current = false;

    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([
          fetchStats(),
          fetchQuarterlyData(),
          fetchSettings(), // Adicionado para buscar o estado do interruptor
      ]);
      if (active && seq === loadSeq.current) {
        initialLoadDone.current = true;
        setIsLoading(false);
        window.setTimeout(() => {
          if (active && seq === loadSeq.current) fetchAbsentStudents();
        }, 80);
      }
    };
    loadInitialData();
    
    // Setup Realtime subscription somente apos o escopo estar resolvido.
    const channel = supabase
      .channel(`registrations-changes-${scopeKey || "global"}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations'
        },
        () => {
          if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
          realtimeRefreshTimer.current = window.setTimeout(() => {
            fetchStats();
            fetchQuarterlyData();
          }, 400);
        }
      )
      .subscribe();
    
    return () => {
      active = false;
      if (realtimeRefreshTimer.current) clearTimeout(realtimeRefreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [scope.loading, scopeKey]);
  
  useEffect(() => {
    if (!scope.loading && initialLoadDone.current) {
        fetchQuarterlyData();
    }
  }, [selectedQuarter, selectedDate]);

  useEffect(() => {
    if (!scope.loading && initialLoadDone.current) {
        fetchAbsentStudents();
    }
  }, [absenceQuarter]);

  useEffect(() => {
    let filtered = absentStudents.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.className.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "name") return multiplier * a.name.localeCompare(b.name);
      if (sortBy === "consecutiveAbsences") return multiplier * (a.consecutiveAbsences - b.consecutiveAbsences);
      if (sortBy === "absenceRate") return multiplier * (a.absenceRate - b.absenceRate);
      return 0;
    });

    setFilteredAbsentStudents(filtered);
  }, [absentStudents, searchTerm, sortBy, sortOrder]);

  const fetchSettings = async () => {
    try {
        const { data, error } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "allow_registrations")
            .single();
        if (error) throw error;
        if (data) {
            setAllowRegistrations(data.value as boolean);
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
        setAllowRegistrations(false); // Mantém bloqueado por segurança
    }
  };

  const getQuarterDates = (quarter: string) => {
    const now = new Date();
    let year = now.getFullYear();
    let startMonth, endMonth;

    const quarterMapping: { [key: string]: number[] } = {
        "Q1": [0, 2], "Q2": [3, 5], "Q3": [6, 8], "Q4": [9, 11]
    };

    if (quarter in quarterMapping) {
        [startMonth, endMonth] = quarterMapping[quarter];
    } else { // current quarter
        const currentMonth = now.getMonth();
        startMonth = Math.floor(currentMonth / 3) * 3;
        endMonth = startMonth + 2;
    }
    
    const startDate = new Date(Date.UTC(year, startMonth, 1));
    const endDate = new Date(Date.UTC(year, endMonth + 1, 1));
    endDate.setUTCMilliseconds(endDate.getUTCMilliseconds() - 1);

    return { startDate, endDate };
  };

  // Removido - vamos usar diretamente as datas dos registros

  const fetchQuarterlyData = async () => {
    try {
      let { startDate, endDate } = getQuarterDates(selectedQuarter);

      // Fallback: se o trimestre atual estiver sem qualquer registro,
      // recua ate 4 trimestres para mostrar os dados existentes automaticamente.
      if (selectedQuarter === "current" && classIds !== null && classIds.length > 0) {
        for (let back = 1; back <= 4; back++) {
          const { count } = await (supabase as any)
            .from("registrations")
            .select("id", { count: "exact", head: true })
            .in("class_id", classIds)
            .gte("registration_date", startDate.toISOString())
            .lte("registration_date", endDate.toISOString());
          if ((count ?? 0) > 0) break;
          const prevStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() - 3, 1));
          const prevEnd = new Date(Date.UTC(prevStart.getUTCFullYear(), prevStart.getUTCMonth() + 3, 1));
          prevEnd.setUTCMilliseconds(prevEnd.getUTCMilliseconds() - 1);
          startDate = prevStart;
          endDate = prevEnd;
        }
      }

      if (classIds !== null && classIds.length === 0) {
        setQuarterlyData([]);
        setAttendanceData([{ dayOfWeek: "Sem dados", attendance: 0 }]);
        setClassData([]);
        setAvailableDates([]);
        return;
      }
      const { data, error } = await (supabase as any).rpc("get_admin_dashboard_trends", {
        _class_ids: classIds,
        _start_date: startDate.toISOString(),
        _end_date: endDate.toISOString(),
        _selected_date: selectedDate && selectedDate !== "all" ? selectedDate : null,
      });
      if (error) throw error;
      setQuarterlyData((data?.quarterlyData ?? []) as QuarterlyData[]);
      setAttendanceData((data?.attendanceData?.length ? data.attendanceData : [{ dayOfWeek: "Sem dados", attendance: 0 }]) as AttendanceData[]);
      setClassData(((data?.classData ?? []) as ClassData[]).sort((a, b) => {
        const numA = parseInt(a.className.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.className.match(/\d+/)?.[0] || '0');
        return numA - numB;
      }));
      setAvailableDates((data?.availableDates ?? []) as string[]);
    } catch (error) {
      console.error("Error fetching quarterly data:", error);
    }
  };

  const fetchAbsentStudents = async () => {
    try {
      let { startDate, endDate } = getQuarterDates(absenceQuarter);

      if (classIds !== null && classIds.length === 0) {
        setAbsentStudents([]);
        return;
      }

      // Fallback: se o trimestre atual estiver sem registros,
      // recua ate 4 trimestres para manter a analise coerente
      // com o painel "Analise Trimestral".
      if (absenceQuarter === "current" && classIds !== null && classIds.length > 0) {
        for (let back = 1; back <= 4; back++) {
          const { count } = await (supabase as any)
            .from("registrations")
            .select("id", { count: "exact", head: true })
            .in("class_id", classIds)
            .gte("registration_date", startDate.toISOString())
            .lte("registration_date", endDate.toISOString());
          if ((count ?? 0) > 0) break;
          const prevStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() - 3, 1));
          const prevEnd = new Date(Date.UTC(prevStart.getUTCFullYear(), prevStart.getUTCMonth() + 3, 1));
          prevEnd.setUTCMilliseconds(prevEnd.getUTCMilliseconds() - 1);
          startDate = prevStart;
          endDate = prevEnd;
        }
      }

      let stuQ = supabase.from("students").select("id, name, class_id").eq("active", true);
      if (classIds !== null) stuQ = stuQ.in("class_id", classIds);
      const classes = visibleClasses;

      let regQ = supabase
        .from("registrations")
        .select("registration_date, present_students, class_id")
        .gte("registration_date", startDate.toISOString())
        .lte("registration_date", endDate.toISOString())
        .order("registration_date", { ascending: true });
      if (classIds !== null) regQ = regQ.in("class_id", classIds);
      const [{ data: students }, { data: registrations }] = await Promise.all([stuQ, regQ]);
      
      if (!students || !classes || !registrations) return;
      
      // Criar mapa de classes
      const classMap = new Map(classes.map(c => [c.id, c.name]));
      
      // Analisar cada aluno
      const absentStudentsList: AbsentStudent[] = [];
      
      const registrationsByClass = new Map<number, typeof registrations>();
      registrations.forEach((reg) => {
        const key = reg.class_id;
        if (!key) return;
        const list = registrationsByClass.get(key) ?? [];
        list.push(reg);
        registrationsByClass.set(key, list);
      });

      students.forEach(student => {
        // Filtrar registros apenas da classe do aluno
        const classRegistrations = registrationsByClass.get(student.class_id) ?? [];
        const totalSundays = classRegistrations.length;
        
        if (totalSundays === 0) return; // Pular alunos sem registros da classe
        
        let presentCount = 0;
        let maxConsecutiveAbsences = 0;
        let currentConsecutiveAbsences = 0;
        
        classRegistrations.forEach(reg => {
          const presentStudents = reg.present_students || [];
          const isPresent = presentStudents.includes(student.name);
          
          if (isPresent) {
            presentCount++;
            currentConsecutiveAbsences = 0;
          } else {
            currentConsecutiveAbsences++;
            maxConsecutiveAbsences = Math.max(maxConsecutiveAbsences, currentConsecutiveAbsences);
          }
        });
        
        const absenceRate = ((totalSundays - presentCount) / totalSundays) * 100;
        
        // Verificar se atende aos critérios: 3+ ausências consecutivas OU taxa de ausência > 50%
        if (maxConsecutiveAbsences >= 3 || absenceRate > 50) {
          absentStudentsList.push({
            id: student.id,
            name: student.name,
            className: classMap.get(student.class_id) || "Sem classe",
            consecutiveAbsences: maxConsecutiveAbsences,
            absenceRate: Math.round(absenceRate),
            totalSundays,
            presentCount
          });
        }
      });
      
      setAbsentStudents(absentStudentsList);
    } catch (error) {
      console.error("Error fetching absent students:", error);
    }
  };

  const fetchStats = async () => {
    try {
        if (classIds !== null && classIds.length === 0) {
          setStats({ totalRegistrations: 0, totalStudents: 0, totalClasses: 0, todayRegistrations: 0, totalPresence: 0, totalVisitors: 0, totalOfferings: 0 });
          return;
        }
        const { data, error } = await (supabase as any).rpc("get_admin_dashboard_summary", {
          _class_ids: classIds,
        });
        if (error) throw error;
        setStats({
            totalRegistrations: Number(data?.totalRegistrations ?? 0),
            totalStudents: Number(data?.totalStudents ?? 0),
            totalClasses: Number(data?.totalClasses ?? visibleClasses.length),
            todayRegistrations: Number(data?.todayRegistrations ?? 0),
            totalPresence: Number(data?.totalPresence ?? 0),
            totalVisitors: Number(data?.totalVisitors ?? 0),
            totalOfferings: Number(data?.totalOfferings ?? 0),
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
    }
  };
  
  const toggleSort = (field: "name" | "consecutiveAbsences" | "absenceRate") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleToggleRegistrations = async (isChecked: boolean) => {
    try {
      // Primeiro, verifica se o registro existe
      const { data: existing, error: fetchError } = await supabase
        .from("system_settings")
        .select("key")
        .eq("key", "allow_registrations")
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      if (existing) {
        // Atualiza o registro existente
        const { error } = await supabase
          .from("system_settings")
          .update({ value: isChecked })
          .eq("key", "allow_registrations");
        
        if (error) throw error;
      } else {
        // Cria o registro se não existir
        const { error } = await supabase
          .from("system_settings")
          .insert({ 
            key: "allow_registrations", 
            value: isChecked,
            description: "Controla se o formulário de registro está aberto"
          });
        
        if (error) throw error;
      }
      
      setAllowRegistrations(isChecked);
      toast({
        title: "Status do Sistema Alterado",
        description: `Registros e edições agora estão ${isChecked ? "LIBERADOS" : "BLOQUEADOS"}.`,
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível alterar a permissão." });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(9)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-3/4"></div></CardHeader>
            <CardContent><div className="h-8 bg-muted rounded w-1/2"></div></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  const getClassCategory = (className: string): "Crianças" | "Adolescentes" | "Adultos" | "Ignorar" => {
    const upper = (className || "").toUpperCase();
    if (upper.includes("PROFESSOR") || upper.includes("EXTRA")) return "Ignorar";
    if (upper.includes("OVELHINHAS") || upper.includes("CORDEIRINHOS") || upper.includes("SOLDADOS") || upper.includes("ESTRELA")) return "Crianças";
    if (upper.includes("LAEL") || upper.includes("ÁGAPE") || upper.includes("AGAPE")) return "Adolescentes";
    // Faixa por idade textual "(X a Y anos)" / "(X e Y anos)"
    const m = upper.match(/(\d{1,2})\s*(?:A|E|-|—)\s*(\d{1,2})\s*ANOS/);
    if (m) {
      const min = parseInt(m[1], 10);
      if (min <= 11) return "Crianças";
      if (min <= 17) return "Adolescentes";
      return "Adultos";
    }
    return "Adultos";
  };

  const filteredClassData = ageGroup === "all"
    ? classData
    : classData.filter((c) => getClassCategory(c.className) === ageGroup);

  return (
    <div className="space-y-6">
        <DashboardScopeFilter scope={scope} />
        <Card>
            <CardHeader>
                <CardTitle>Controle do Sistema</CardTitle>
                <CardDescription>Controle se os secretários de classe podem enviar e editar registros.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center space-x-2">
                <Switch
                    id="allow-registrations"
                    checked={allowRegistrations}
                    onCheckedChange={handleToggleRegistrations}
                />
                <Label htmlFor="allow-registrations" className="cursor-pointer">
                    {allowRegistrations ? "Registros Liberados" : "Registros Bloqueados"}
                </Label>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Classes</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-primary">{stats.totalClasses}</div></CardContent></Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Alunos</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{stats.totalStudents}</div></CardContent></Card>
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Registros Totais</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{stats.totalRegistrations}</div></CardContent></Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Registros Hoje</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-emerald-600">{stats.todayRegistrations}</div></CardContent></Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Média de Frequência</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-purple-600">{stats.totalPresence}</div></CardContent></Card>
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Média de Visitantes</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-orange-600">{stats.totalVisitors}</div></CardContent></Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 md:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total de Ofertas</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-yellow-600">R$ {stats.totalOfferings.toFixed(2).replace('.', ',')}</div></CardContent></Card>
        </div>

        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Análise Trimestral</CardTitle>
                        <CardDescription>Visualize as métricas do trimestre selecionado</CardDescription>
                    </div>
                    <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Trimestre" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="current">Trimestre Atual</SelectItem>
                            <SelectItem value="Q1">1º Trimestre</SelectItem>
                            <SelectItem value="Q2">2º Trimestre</SelectItem>
                            <SelectItem value="Q3">3º Trimestre</SelectItem>
                            <SelectItem value="Q4">4º Trimestre</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="overview" className="space-y-4">
                     <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                        <TabsTrigger value="attendance">Frequência</TabsTrigger>
                        <TabsTrigger value="classes">Por Classe</TabsTrigger>
                        <TabsTrigger value="rankings">Rankings %</TabsTrigger>
                        <TabsTrigger value="financial">Financeiro</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Frequência Média</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-primary">
                                        {attendanceData.length > 0 
                                            ? Math.round(attendanceData.reduce((sum, item) => sum + item.attendance, 0) / attendanceData.length)
                                            : 0}%
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ofertas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        R$ {quarterlyData.reduce((sum: number, item: any) => sum + (item.offerings || 0), 0).toFixed(2).replace('.', ',')}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <Card className="border-orange-500/20 bg-orange-500/5">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                                        <CardTitle>Alunos com Alta Taxa de Ausência</CardTitle>
                                    </div>
                                    <Select value={absenceQuarter} onValueChange={setAbsenceQuarter}>
                                        <SelectTrigger className="w-40"><SelectValue placeholder="Trimestre" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="current">Trimestre Atual</SelectItem>
                                            <SelectItem value="Q1">1º Trimestre</SelectItem>
                                            <SelectItem value="Q2">2º Trimestre</SelectItem>
                                            <SelectItem value="Q3">3º Trimestre</SelectItem>
                                            <SelectItem value="Q4">4º Trimestre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <CardDescription>
                                    Alunos que faltaram 3+ domingos consecutivos ou têm mais de 50% de ausência no trimestre selecionado
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 mb-4">
                                    <Input
                                        placeholder="Buscar por nome ou classe..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="max-w-sm"
                                    />
                                </div>
                                
                                {filteredAbsentStudents.length > 0 ? (
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleSort("name")}
                                                            className="hover:bg-transparent"
                                                        >
                                                            Nome
                                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead>Classe</TableHead>
                                                    <TableHead className="text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleSort("consecutiveAbsences")}
                                                            className="hover:bg-transparent"
                                                        >
                                                            Ausências Consecutivas
                                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead className="text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleSort("absenceRate")}
                                                            className="hover:bg-transparent"
                                                        >
                                                            Taxa de Ausência
                                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                                        </Button>
                                                    </TableHead>
                                                    <TableHead className="text-center">Presença/Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredAbsentStudents.map((student) => (
                                                    <TableRow key={student.id}>
                                                        <TableCell className="font-medium">{student.name}</TableCell>
                                                        <TableCell>{student.className}</TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                                                student.consecutiveAbsences >= 5 
                                                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                                                    : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                                            }`}>
                                                                {student.consecutiveAbsences} domingo(s)
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                                                student.absenceRate >= 75 
                                                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                                                    : student.absenceRate >= 50
                                                                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                                            }`}>
                                                                {student.absenceRate}%
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center text-muted-foreground">
                                                            {student.presentCount}/{student.totalSundays}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p className="font-medium">Nenhum aluno encontrado com alta taxa de ausência</p>
                                        <p className="text-sm mt-1">
                                            {searchTerm 
                                                ? "Tente ajustar sua busca"
                                                : "Parabéns! Todos os alunos estão com boa frequência"}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="attendance">
                        <ChartContainer config={{}} className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={attendanceData.map((item) => {
                                    const totalEnrolled = stats.totalStudents;
                                    const present = Math.round((item.attendance * totalEnrolled) / 100);
                                    const absent = totalEnrolled - present;
                                    return {
                                        dayOfWeek: item.dayOfWeek,
                                        enrolled: totalEnrolled,
                                        present,
                                        absent
                                    };
                                })}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dayOfWeek" />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="present" fill="#FB923C" name="Presentes" stackId="a">
                                        <LabelList dataKey="present" position="center" fill="#fff" fontSize={12} />
                                    </Bar>
                                    <Bar dataKey="absent" fill="#A78BFA" name="Ausentes" stackId="a">
                                        <LabelList dataKey="absent" position="center" fill="#fff" fontSize={12} />
                                    </Bar>
                                    <Line type="monotone" dataKey="enrolled" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} name="Matriculados">
                                        <LabelList dataKey="enrolled" position="top" fontSize={12} />
                                    </Line>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </TabsContent>
                    <TabsContent value="financial">
                        <ChartContainer config={{}} className="h-80 w-full">
                            <BarChart data={quarterlyData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="offerings" fill="hsl(var(--primary))" name="Ofertas (R$)">
                                    <LabelList dataKey="offerings" position="top" formatter={(value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`} fontSize={12} />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </TabsContent>
                    <TabsContent value="classes">
                        <div className="mb-4">
                            <div className="flex items-center gap-4">
                                <Select value={selectedDate} onValueChange={setSelectedDate}>
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Selecione uma data" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Média do Trimestre</SelectItem>
                                        {availableDates.map(date => (
                                            <SelectItem key={date} value={date}>
                                                {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground">
                                    {selectedDate && selectedDate !== "all"
                                        ? `Exibindo presentes em ${new Date(selectedDate).toLocaleDateString('pt-BR')}`
                                        : "Exibindo média de presentes por domingo no trimestre"}
                                </p>
                            </div>
                        </div>
                         <ChartContainer config={{}} className="h-[600px] w-full">
                           <BarChart data={classData} layout="vertical" margin={{ left: 20, right: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis 
                                    dataKey="className" 
                                    type="category" 
                                    width={200} 
                                    style={{ fontSize: '12px' }}
                                    interval={0}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar 
                                    dataKey="present" 
                                    fill="hsl(var(--primary))" 
                                    name={selectedDate && selectedDate !== "all" ? "Presentes" : "Média de Presentes"} 
                                >
                                    <LabelList dataKey="present" position="right" style={{ fontSize: '12px', fill: 'hsl(var(--foreground))' }} />
                                </Bar>
                           </BarChart>
                         </ChartContainer>
                    </TabsContent>
                    <TabsContent value="rankings">
                        {(() => {
                            const getClassCategory = (className: string): string => {
                                const upper = className.toUpperCase();
                                if (upper.includes("OVELHINHAS") || upper.includes("CORDEIRINHOS") || upper.includes("SOLDADOS") || upper.includes("ESTRELA")) return "Crianças";
                                if (upper.includes("LAEL") || upper.includes("ÁGAPE")) return "Adolescentes";
                                if (upper.includes("NOVA VIDA") || upper.includes("EMANUEL") || upper.includes("ESTER") || upper.includes("LÍRIOS") || upper.includes("VENCEDORAS") || upper.includes("ESPERANÇA") || upper.includes("HERÓIS") || upper.includes("DÉBORA") || upper.includes("MOISÉS") || upper.includes("ABRAÃO")) return "Adultos";
                                if (upper.includes("PROFESSOR") || upper.includes("EXTRA")) return "Ignorar";
                                return "Ignorar";
                            };

                            const validClasses = classData.filter(c => getClassCategory(c.className) !== "Ignorar");

                            const getTop3 = (data: ClassData[], category: string, metric: keyof ClassData, filterKey: keyof ClassData) => {
                                return data
                                    .filter(c => getClassCategory(c.className) === category && (c[filterKey] as number) > 0)
                                    .sort((a, b) => (b[metric] as number) - (a[metric] as number))
                                    .slice(0, 3);
                            };

                            const categories = ["Crianças", "Adolescentes", "Adultos"];
                            const metrics: { key: keyof ClassData; filterKey: keyof ClassData; label: string; icon: React.ReactNode; description: string }[] = [
                                { key: "presenceRate", filterKey: "enrolled", label: "Ranking de Presença", icon: <Users className="h-4 w-4 text-blue-600" />, description: "% presentes / matriculados" },
                                { key: "biblesRate", filterKey: "totalPresent", label: "Ranking de Bíblias", icon: <BookOpen className="h-4 w-4 text-green-600" />, description: "% bíblias / presentes" },
                                { key: "magazinesRate", filterKey: "totalPresent", label: "Ranking de Revistas", icon: <BookMarked className="h-4 w-4 text-purple-600" />, description: "% revistas / presentes" },
                            ];

                            return (
                                <div className="space-y-6">
                                    {metrics.map(metric => (
                                        <div key={metric.label}>
                                            <div className="flex items-center gap-2 mb-3">
                                                {metric.icon}
                                                <h3 className="font-semibold text-base">{metric.label}</h3>
                                                <span className="text-xs text-muted-foreground">({metric.description})</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {categories.map(category => {
                                                    const top3 = getTop3(validClasses, category, metric.key, metric.filterKey);
                                                    return (
                                                        <Card key={category}>
                                                            <CardHeader className="pb-2">
                                                                <CardTitle className="text-sm">{category}</CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                {top3.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {top3.map((cls, i) => (
                                                                            <div key={cls.className} className="flex items-center justify-between text-sm">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Trophy className={`h-4 w-4 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-orange-400'}`} />
                                                                                    <span className="font-medium">{i + 1}º {cls.className}</span>
                                                                                </div>
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className="font-mono font-semibold">{cls[metric.key]}%</span>
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {metric.key === "presenceRate" ? `${cls.present} pres.` : 
                                                                                         metric.key === "biblesRate" ? `${cls.totalBibles} bíblias` : 
                                                                                         `${cls.totalMagazines} revistas`}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-muted-foreground text-center py-2">Sem dados</p>
                                                                )}
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
  );
};
