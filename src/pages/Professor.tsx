import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { SupabaseStatusBadge } from "@/components/SupabaseStatusBadge";
import { ProfessorAttendanceTab } from "@/components/ProfessorAttendanceTab";
import { ProfessorStudentsTab } from "@/components/ProfessorStudentsTab";
import { ProfessorDashboardTab } from "@/components/ProfessorDashboardTab";
import { ProfessorSidebar, ProfessorSection } from "@/components/ProfessorSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Professor = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [checking, setChecking] = useState(true);
  const [classId, setClassId] = useState<number | null>(null);
  const [availableClasses, setAvailableClasses] = useState<{ id: number; name: string }[]>([]);
  const [section, setSection] = useState<ProfessorSection>("chamada");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      const { data: classesData, error } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");
      if (!error && classesData && classesData.length > 0) {
        setAvailableClasses(classesData);
        setClassId(classesData[0].id);
      }
      setChecking(false);
    };
    check();
  }, [navigate]);

  useEffect(() => {
    if (!loading && role === "secretario_ebd") {
      navigate("/admin");
    }
  }, [loading, role, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (checking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const sectionTitle =
    section === "chamada" ? "Chamada" :
    section === "alunos" ? "Alunos da Classe" : "Painel da Classe";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ProfessorSidebar section={section} onChange={setSection} />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b px-3 sticky top-0 bg-background/80 backdrop-blur z-10">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-primary truncate flex-1">
              Painel do Professor — {sectionTitle}
            </h1>
            {availableClasses.length > 0 && (
              <Select
                value={classId?.toString() || ""}
                onValueChange={(val) => setClassId(parseInt(val))}
              >
                <SelectTrigger className="w-[180px] hidden sm:flex">
                  <SelectValue placeholder="Classe..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>Sair</Button>
          </header>

          {availableClasses.length > 0 && (
            <div className="sm:hidden px-3 pt-3">
              <Select
                value={classId?.toString() || ""}
                onValueChange={(val) => setClassId(parseInt(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma classe..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
            {!classId ? (
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle>Nenhuma classe vinculada</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Você ainda não possui acesso a nenhuma classe. Procure o Secretário da EBD.
                  </p>
                </CardContent>
              </Card>
            ) : section === "chamada" ? (
              <div className="max-w-md mx-auto">
                <ProfessorAttendanceTab classId={classId} />
              </div>
            ) : section === "alunos" ? (
              <div className="max-w-5xl mx-auto">
                <ProfessorStudentsTab classId={classId} />
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                <ProfessorDashboardTab classId={classId} />
              </div>
            )}
          </main>
        </div>
      </div>
      <SupabaseStatusBadge />
    </SidebarProvider>
  );
};

export default Professor;