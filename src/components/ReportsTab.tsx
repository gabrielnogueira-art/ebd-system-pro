import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CalendarDays, FileText, Download } from "lucide-react";
import adCamposLogo from "@/assets/ad-campos-logo.png";

interface ReportData {
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent: number;
  totalVisitors: number;
  totalOffering: number;
  totalMagazines: number;
  totalBibles: number;
  magazinesByCategory: {
    children: number;
    adolescents: number;
    youth: number;
    newConverts: number;
    adults: number;
    teachers: number;
  };
  topClasses: {
    children: Array<{ name: string; offering: number; rank: string }>;
    adolescents: Array<{ name: string; offering: number; rank: string }>;
    adults: Array<{ name: string; offering: number; rank: string }>;
  };
  classDetails: Array<{
    name: string;
    enrolled: number;
    present: number;
    visitors: number;
    absent: number;
    totalPresent: number;
    bibles: number;
    magazines: number;
    offering: number;
    rank: string;
  }>;
  cashTotal: number;
  pixTotal: number;
}

// Componentes do Relatório (definidos fora para melhor performance)
const GeneralReport = ({ reportData, selectedDate, ebdObservations, reportTheme }: { reportData: ReportData | null; selectedDate: string; ebdObservations?: string; reportTheme: string }) => {
  const reportYear = selectedDate ? new Date(selectedDate + 'T12:00:00Z').getFullYear() : new Date().getFullYear();
  
  return (
  <div className="bg-white text-black px-6 py-4" style={{ width: '193mm', height: '280mm', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', fontSize: '13pt', boxSizing: 'border-box' }}>
    <header className="flex items-start justify-between pb-1">
      <div className="flex items-center gap-3">
        <img src={adCamposLogo} alt="AD Campos Logo" className="w-[70px] h-[70px]" />
        <div>
          <h1 className="text-base font-bold">Catedral das Assembleias de Deus em Campos</h1>
          <h2 className="text-sm">Secretaria da Escola Bíblica Dominical - EBD</h2>
          <p className="text-xs text-gray-600">Pastor Presidente Paulo Areas de Moraes - Ministério de Madureira</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold">Ano</p>
        <p className="text-3xl font-bold tracking-tighter">{reportYear}</p>
      </div>
    </header>
    <div className="text-center"><h3 className="text-lg font-bold">RELATÓRIO DA ESCOLA BÍBLICA DOMINICAL</h3></div>
    <div className="flex justify-end text-xs mt-1 mb-1"><p><strong>Data:</strong> {selectedDate ? new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : ''}</p></div>
    
    <main className="flex-grow" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="grid grid-cols-2 gap-x-4 mb-1">
        <div className="space-y-0.5">
          <div className="border border-black px-2 py-0.5 text-xs flex justify-between"><span>ALUNOS MATRICULADOS:</span><span className="font-bold">{reportData?.totalEnrolled || 0}</span></div>
          <div className="border border-black px-2 py-0.5 text-xs flex justify-between"><span>ALUNOS PRESENTES:</span><span className="font-bold">{reportData?.totalPresent || 0}</span></div>
          <div className="border border-black px-2 py-0.5 text-xs flex justify-between"><span>ALUNOS VISITANTES:</span><span className="font-bold">{reportData?.totalVisitors || 0}</span></div>
          <div className="border border-black px-2 py-0.5 text-xs flex justify-between"><span>ALUNOS AUSENTES:</span><span className="font-bold">{reportData?.totalAbsent || 0}</span></div>
        </div>
        <div className="space-y-0.5">
          <div className="border border-black px-2 py-0.5 text-xs flex justify-between"><span>TOTAL DE OFERTAS EBD:</span><span className="font-bold">R$ {reportData?.totalOffering.toFixed(2).replace('.', ',') || '0,00'}</span></div>
          <div className="border border-black px-2 py-0.5 text-xs flex justify-between"><span>TOTAL DE REVISTAS EBD, INCLUINDO PROFESSORES:</span><span className="font-bold">{reportData?.totalMagazines || 0}</span></div>
        </div>
      </div>

      <div className="border border-black px-2 py-0.5 mb-1 text-xs flex justify-between"><span>TOTAL DE ALUNOS PRESENTES (alunos presentes + alunos visitantes):</span><span className="font-bold">{(reportData?.totalPresent || 0) + (reportData?.totalVisitors || 0)}</span></div>
      
      <div className="space-y-0.5 mb-1 text-xs">
          <div className="border border-black px-2 py-0.5 flex justify-between"><span>TOTAL DE REVISTAS UTILIZADAS (Crianças e Juniores):</span><span>{reportData?.magazinesByCategory?.children || 0}</span></div>
          <div className="border border-black px-2 py-0.5 flex justify-between"><span>TOTAL DE REVISTAS UTILIZADAS (Adolescentes):</span><span>{reportData?.magazinesByCategory?.adolescents || 0}</span></div>
          <div className="border border-black px-2 py-0.5 flex justify-between"><span>TOTAL DE REVISTAS UTILIZADAS (Jovens):</span><span>{reportData?.magazinesByCategory?.youth || 0}</span></div>
          <div className="border border-black px-2 py-0.5 flex justify-between"><span>TOTAL DE REVISTAS UTILIZADAS (Novos Convertidos):</span><span>{reportData?.magazinesByCategory?.newConverts || 0}</span></div>
          <div className="border border-black px-2 py-0.5 flex justify-between"><span>TOTAL DE REVISTAS UTILIZADAS (Adultos):</span><span>{reportData?.magazinesByCategory?.adults || 0}</span></div>
          <div className="border border-black px-2 py-0.5 flex justify-between"><span>TOTAL DE REVISTAS PROFESSORES EM CLASSE:</span><span>{reportData?.magazinesByCategory?.teachers || 0}</span></div>
      </div>

      <div className="border border-black p-2 mb-1 text-xs">
          <h4 className="font-bold text-center mb-1 text-sm">CLASSIFICAÇÃO DAS OFERTAS</h4>
          <div className="space-y-1">
              <div>
                  <div className="flex justify-between font-bold bg-gray-200 px-2 py-0.5"><span>CLASSES DAS CRIANÇAS:</span><span>VALOR R$</span></div>
                  {reportData?.topClasses?.children.map((cls) => (<div key={cls.name} className="flex justify-between px-2"><span>{cls.rank} {cls.name}</span><span>R$ {cls.offering.toFixed(2).replace('.', ',')}</span></div>))}
              </div>
              <div>
                  <div className="flex justify-between font-bold bg-gray-200 px-2 py-0.5"><span>CLASSES DOS ADOLESCENTES:</span><span>VALOR R$</span></div>
                  {reportData?.topClasses?.adolescents.map((cls) => (<div key={cls.name} className="flex justify-between px-2"><span>{cls.rank} {cls.name}</span><span>R$ {cls.offering.toFixed(2).replace('.', ',')}</span></div>))}
              </div>
              <div>
                  <div className="flex justify-between font-bold bg-gray-200 px-2 py-0.5"><span>CLASSES DOS ADULTOS:</span><span>VALOR R$</span></div>
                  {reportData?.topClasses?.adults.map((cls) => (<div key={cls.name} className="flex justify-between px-2"><span>{cls.rank} {cls.name}</span><span>R$ {cls.offering.toFixed(2).replace('.', ',')}</span></div>))}
              </div>
          </div>
      </div>
      
      <div className="flex gap-4 mb-1">
          <div className="border border-black p-1 flex-1 text-xs flex justify-between"><span>TOTAL EM DINHEIRO:</span><span className="font-bold">R$ {reportData?.cashTotal.toFixed(2).replace('.', ',') || '0,00'}</span></div>
          <div className="border border-black p-1 flex-1 text-xs flex justify-between"><span>TOTAL EM PIX/CARTÃO:</span><span className="font-bold">R$ {reportData?.pixTotal.toFixed(2).replace('.', ',') || '0,00'}</span></div>
      </div>

      <div className="border border-black p-2 h-14 text-xs">
        <span className="font-bold">OBSERVAÇÕES:</span>
        {ebdObservations && (
          <p className="mt-1 text-[9pt]">{ebdObservations}</p>
        )}
      </div>
      
      <div className="text-center mt-1" style={{ marginTop: 'auto' }}>
        <p className="font-bold text-xs">{reportTheme}</p>
      </div>
    </main>
  </div>
);};

const ClassesReport = ({ reportData, selectedDate, reportTheme }: { reportData: ReportData | null; selectedDate: string; reportTheme: string }) => {
  const reportYear = selectedDate ? new Date(selectedDate + 'T12:00:00Z').getFullYear() : new Date().getFullYear();
  
  // Separar classes por faixa etária e ordenar por nome
  const childrenClasses = reportData?.classDetails?.filter(c => 
    c.name.includes("SOLDADOS") || c.name.includes("OVELHINHAS") || c.name.includes("CORDEIRINHOS")
  ) || [];
  
  const adolescentsClasses = reportData?.classDetails?.filter(c => 
    c.name.includes("ESTRELA") || c.name.includes("LAEL") || c.name.includes("ÁGAPE")
  ) || [];
  
  const adultsClasses = reportData?.classDetails?.filter(c => 
    !childrenClasses.some(child => child.name === c.name) && 
    !adolescentsClasses.some(adol => adol.name === c.name)
  ) || [];

  // Função para calcular ranking por faixa etária (top 3 apenas)
  const calculateRanking = (classes: typeof childrenClasses) => {
    const sortedByOffering = [...classes].sort((a, b) => b.offering - a.offering);
    return classes.map(c => {
      const position = sortedByOffering.findIndex(sc => sc.name === c.name) + 1;
      return { ...c, rank: position <= 3 ? `${position}°` : '-' };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Aplicar ranking e ordenar por nome
  const rankedChildren = calculateRanking(childrenClasses);
  const rankedAdolescents = calculateRanking(adolescentsClasses);
  const rankedAdults = calculateRanking(adultsClasses);

  // Combinar todas as classes na ordem: crianças, adolescentes, adultos
  const allClassesOrdered = [...rankedChildren, ...rankedAdolescents, ...rankedAdults];

  return (
    <div className="bg-white text-black px-6 py-4" style={{ width: '280mm', height: '193mm', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <header className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <img src={adCamposLogo} alt="AD Campos Logo" className="w-14 h-14" />
          <div>
            <h1 className="text-sm font-bold">Catedral das Assembleias de Deus em Campos</h1>
            <h2 className="text-xs">Secretaria da Escola Bíblica Dominical - EBD</h2>
            <p className="text-[10px] text-gray-700">Pastor Presidente Paulo Areas de Moraes - Ministério de Madureira</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold">Ano {reportYear}</p>
          <p className="text-[10px]"><strong>Data:</strong> {selectedDate ? new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : ''}</p>
        </div>
      </header>
      <div>
        <table className="w-full border-collapse border border-black text-[12px]">
          <thead><tr className="bg-gray-200 font-bold"><th className="border border-black px-2 py-1.5 text-left">Nome da Classe</th><th className="border border-black px-2 py-1.5">Matriculados</th><th className="border border-black px-2 py-1.5">Presentes</th><th className="border border-black px-2 py-1.5">Visitantes</th><th className="border border-black px-2 py-1.5">Ausentes</th><th className="border border-black px-2 py-1.5">Total Presentes</th><th className="border border-black px-2 py-1.5">Bíblias</th><th className="border border-black px-2 py-1.5">Revistas</th><th className="border border-black px-2 py-1.5">Ofertas</th><th className="border border-black px-2 py-1.5">Rank</th></tr></thead>
          <tbody>
            {allClassesOrdered.map((classData, index) => (
              <tr key={index}>
                <td className="border border-black px-2 py-1.5">{classData.name}</td><td className="border border-black px-2 py-1.5 text-center">{classData.enrolled}</td><td className="border border-black px-2 py-1.5 text-center">{classData.present}</td><td className="border border-black px-2 py-1.5 text-center">{classData.visitors}</td><td className="border border-black px-2 py-1.5 text-center">{classData.absent}</td><td className="border border-black px-2 py-1.5 text-center">{classData.totalPresent}</td><td className="border border-black px-2 py-1.5 text-center">{classData.bibles}</td><td className="border border-black px-2 py-1.5 text-center">{classData.magazines}</td><td className="border border-black px-2 py-1.5 text-center">R$ {classData.offering.toFixed(2).replace('.', ',')}</td><td className="border border-black px-2 py-1.5 text-center font-bold">{classData.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5 border-2 border-black p-2">
        <h3 className="text-sm font-bold text-center mb-1">TOTAL GERAL</h3>
        <div className="flex justify-around items-center text-center text-xs">
            <div><p>Matriculados</p><p className="font-bold text-base">{reportData?.totalEnrolled || 0}</p></div>
            <div><p>Ausentes</p><p className="font-bold text-base">{reportData?.totalAbsent || 0}</p></div>
            <div><p>Visitantes</p><p className="font-bold text-base">{reportData?.totalVisitors || 0}</p></div>
            <div><p>Total Presentes</p><p className="font-bold text-base">{(reportData?.totalPresent || 0) + (reportData?.totalVisitors || 0)}</p></div>
            <div><p>Bíblias</p><p className="font-bold text-base">{reportData?.totalBibles || 0}</p></div>
            <div><p>Revistas</p><p className="font-bold text-base">{reportData?.totalMagazines || 0}</p></div>
            <div><p>Ofertas</p><p className="font-bold text-base">R$ {reportData?.totalOffering.toFixed(2).replace('.', ',') || '0,00'}</p></div>
        </div>
      </div>
      <div className="text-center mt-1" style={{ marginTop: 'auto' }}>
        <p className="font-bold text-xs">{reportTheme}</p>
      </div>
    </div>
  );
};


export const ReportsTab = () => {
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noData, setNoData] = useState(false);
  const [reportType, setReportType] = useState<"general" | "classes">("general");
  const [ebdObservations, setEbdObservations] = useState<string>("");
  const [reportTheme, setReportTheme] = useState<string>(() => {
    const saved = localStorage.getItem("ebd-report-theme");
    return saved || "2025 ANO DA CELEBRAÇÃO - SALMOS 35.27";
  });

  // Persistir reportTheme no localStorage
  useEffect(() => {
    localStorage.setItem("ebd-report-theme", reportTheme);
  }, [reportTheme]);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Extrair anos únicos das datas disponíveis
  const availableYears = [...new Set(availableDates.map(date => new Date(date + 'T12:00:00Z').getFullYear().toString()))].sort((a, b) => b.localeCompare(a));
  
  // Filtrar datas pelo ano selecionado
  const filteredDates = selectedYear 
    ? availableDates.filter(date => new Date(date + 'T12:00:00Z').getFullYear().toString() === selectedYear)
    : availableDates;

  useEffect(() => {
    fetchAvailableDates();
  }, []);

  const fetchAvailableDates = async () => {
    try {
      const { data } = await supabase.from("registrations").select("registration_date").order("registration_date", { ascending: false });
      if (data) {
        const dates = [...new Set(data.map(r => new Date(r.registration_date).toISOString().split('T')[0]))];
        setAvailableDates(dates);
      }
    } catch (error) { console.error("Error fetching dates:", error); }
  };

  const fetchReportData = async (date: string) => {
    if (!date) return;
    setIsLoading(true);
    setReportData(null);
    setNoData(false);
    try {
      // Ajustar para buscar do início ao fim do dia na data selecionada
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');
      
      const { data: registrations } = await supabase
        .from("registrations")
        .select("*, classes(name)")
        .gte("registration_date", startDate.toISOString())
        .lte("registration_date", endDate.toISOString());

      if (!registrations || registrations.length === 0) {
        setNoData(true);
        return;
      }
      
      const { data: students } = await supabase.from("students").select("*, classes(id, name)").eq("active", true);
      if (!students) {
        setNoData(true);
        return;
      };

      const totalEnrolled = students.length;
      let totalPresent = 0, totalVisitors = 0, totalMagazines = 0, totalBibles = 0, cashTotal = 0, pixTotal = 0;
      registrations.forEach(reg => {
        totalPresent += reg.total_present || 0;
        totalVisitors += reg.visitors || 0;
        totalMagazines += reg.magazines || 0;
        totalBibles += reg.bibles || 0;
        cashTotal += parseFloat(String(reg.offering_cash || 0));
        pixTotal += parseFloat(String(reg.offering_pix || 0));
      });
      const totalOffering = cashTotal + pixTotal;

      const classDetails = registrations.map(reg => {
        const classStudents = students.filter(s => s.class_id === reg.class_id);
        const enrolled = classStudents.length;
        const present = reg.total_present || 0;
        const offering = (parseFloat(String(reg.offering_cash || 0)) + parseFloat(String(reg.offering_pix || 0)));
        return {
          name: reg.classes?.name || "Classe Desconhecida", enrolled, present,
          visitors: reg.visitors || 0, absent: enrolled - present, totalPresent: present + (reg.visitors || 0),
          bibles: reg.bibles || 0, magazines: reg.magazines || 0,
          offering, rank: ""
        };
      });

      const sortedByOffering = [...classDetails].sort((a, b) => b.offering - a.offering);
      const getTopN = (items: typeof classDetails, n: number) => {
        return items.slice(0, n).map((item, index) => ({ ...item, rank: `${index + 1}°` }));
      };
      
      const childrenClasses = sortedByOffering.filter(c => c.name.includes("SOLDADOS") || c.name.includes("OVELHINHAS"));
      const adolescentsClasses = sortedByOffering.filter(c => c.name.includes("ESTRELA") || c.name.includes("LAEL") || c.name.includes("ÁGAPE"));
      const adultsClasses = sortedByOffering.filter(c => !childrenClasses.some(child => child.name === c.name) && !adolescentsClasses.some(adol => adol.name === c.name));
      
      classDetails.sort((a, b) => a.name.localeCompare(b.name));

      // Observação: agora o campo ebd_notes será preenchido diretamente na interface de relatórios

      setReportData({
        totalEnrolled, totalPresent, totalAbsent: totalEnrolled - totalPresent, totalVisitors,
        totalOffering, totalMagazines, totalBibles,
        magazinesByCategory: { children: 20, adolescents: 17, youth: 15, newConverts: 9, adults: 136, teachers: 36 },
        topClasses: {
          children: getTopN(childrenClasses, 3),
          adolescents: getTopN(adolescentsClasses, 3),
          adults: getTopN(adultsClasses, 3)
        },
        classDetails, cashTotal, pixTotal
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      setNoData(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedDate("");
    setReportData(null);
    setNoData(false);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    fetchReportData(date);
  };

  const handlePrint = () => {
    const printContent = printableAreaRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Relatório EBD</title>');

      // Get all style sheets from the main document
      Array.from(document.styleSheets).forEach(styleSheet => {
        try {
          if (styleSheet.href) {
            printWindow.document.write(`<link rel="stylesheet" href="${styleSheet.href}">`);
          } 
          else if (styleSheet.cssRules) {
            printWindow.document.write('<style>');
            Array.from(styleSheet.cssRules).forEach(rule => {
              printWindow.document.write(rule.cssText);
            });
            printWindow.document.write('</style>');
          }
        } catch (e) {
          console.warn('Could not copy stylesheet for printing:', e);
        }
      });
      
      printWindow.document.write(`
        <style>
          @page {
            size: ${reportType === 'general' ? 'A4 portrait' : 'A4 landscape'};
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > div {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 6mm !important;
            box-sizing: border-box;
          }
        </style>
      `);

      printWindow.document.write('</head><body>');
      printWindow.document.write(printContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 500);
      };
    }
  };

  return (
    <div className="space-y-6">
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Relatórios da EBD</CardTitle>
          <CardDescription>Gere relatórios detalhados das atividades da Escola Bíblica Dominical</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 no-print">
          <div className="flex items-center gap-4 flex-wrap">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={selectedDate} onValueChange={handleDateChange} disabled={!selectedYear}>
              <SelectTrigger className="w-64"><SelectValue placeholder={selectedYear ? "Selecione uma data" : "Selecione o ano primeiro"} /></SelectTrigger>
              <SelectContent>
                {filteredDates.map(date => (<SelectItem key={date} value={date}>{new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR')}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {selectedDate && (<div className="flex gap-4"><Button variant={reportType === "general" ? "default" : "outline"} onClick={() => setReportType("general")}>Relatório Geral (A4)</Button><Button variant={reportType === "classes" ? "default" : "outline"} onClick={() => setReportType("classes")}>Relatório por Classes (A4 Paisagem)</Button></div>)}
          
          {selectedDate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-theme">Tema/Frase do Ano (Rodapé)</Label>
                <input
                  id="report-theme"
                  type="text"
                  className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ex: 2026 Ano da Plenitude - 2 Reis 3:18"
                  value={reportTheme}
                  onChange={(e) => setReportTheme(e.target.value)}
                />
              </div>
              {reportType === "general" && (
                <div className="space-y-2">
                  <Label htmlFor="ebd-observations">Observações da EBD (aparecerá no relatório geral)</Label>
                  <textarea
                    id="ebd-observations"
                    className="w-full min-h-[100px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Digite aqui as observações gerais da EBD..."
                    value={ebdObservations}
                    onChange={(e) => setEbdObservations(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {isLoading && (<div className="text-center py-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div><p className="text-muted-foreground">Gerando relatório...</p></div>)}
      
      {noData && !isLoading && selectedDate && (<Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">Nenhum dado encontrado para a data selecionada.</p></CardContent></Card>)}
      
      {reportData && !isLoading && !noData && (
        <>
          <div className="space-y-4 no-print">
            <Separator />
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Visualização: {reportType === "general" ? "Relatório Geral" : "Relatório por Classes"}</h3>
              <Button onClick={handlePrint} className="flex items-center gap-2"><Download className="h-4 w-4" />Imprimir/Salvar PDF</Button>
            </div>
            <div className="border rounded-lg overflow-auto bg-gray-200 p-4 flex justify-center">
              <div style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}>
                 {reportType === "general" ? <GeneralReport reportData={reportData} selectedDate={selectedDate} ebdObservations={ebdObservations} reportTheme={reportTheme} /> : <ClassesReport reportData={reportData} selectedDate={selectedDate} reportTheme={reportTheme} />}
              </div>
            </div>
          </div>

          <div className="hidden">
            <div ref={printableAreaRef}>
              {reportType === "general" ? <GeneralReport reportData={reportData} selectedDate={selectedDate} ebdObservations={ebdObservations} reportTheme={reportTheme} /> : <ClassesReport reportData={reportData} selectedDate={selectedDate} reportTheme={reportTheme} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
