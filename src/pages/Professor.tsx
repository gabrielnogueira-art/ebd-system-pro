import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { SupabaseStatusBadge } from "@/components/SupabaseStatusBadge";
import { ProfessorAttendanceTab } from "@/components/ProfessorAttendanceTab";

const Professor = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [checking, setChecking] = useState(true);
  const [classId, setClassId] = useState<number | null>(null);
  const [availableClasses, setAvailableClasses] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      
      // Busca todas as classes disponíveis para este professor (o RLS filtra automaticamente)
      const { data: classesData, error } = await supabase
        .from("classes")
        .select("id, name")
        .order("name");
        
      if (!error && classesData && classesData.length > 0) {
        setAvailableClasses(classesData);
        // Seleciona a primeira classe da lista por padrão
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Minhas Classes</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>Sair</Button>
        </div>
        
        {availableClasses.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Selecione a Classe</CardTitle>
              <CardDescription>Escolha de qual classe você irá registrar a chamada hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={classId?.toString() || ""}
                onValueChange={(val) => setClassId(parseInt(val))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma classe..." />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : null}
        
        {!classId ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma classe vinculada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Você ainda não possui acesso a nenhuma classe. Procure o Secretário da EBD.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="pt-4">
            <ProfessorAttendanceTab classId={classId} />
          </div>
        )}
      </div>
      <SupabaseStatusBadge />
    </div>
  );
};

export default Professor;