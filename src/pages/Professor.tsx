import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserRole } from "@/hooks/useUserRole";
import { SupabaseStatusBadge } from "@/components/SupabaseStatusBadge";
import { ProfessorAttendanceTab } from "@/components/ProfessorAttendanceTab";

const Professor = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [checking, setChecking] = useState(true);
  const [classId, setClassId] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      
      // Fetch teacher's class
      const { data: teacherClass } = await supabase
        .from("teacher_classes")
        .select("class_id")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();
        
      if (teacherClass) {
        setClassId(teacherClass.class_id);
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
          <h1 className="text-2xl font-bold text-primary">Minha Classe</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>Sair</Button>
        </div>
        
        {!classId ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma classe vinculada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Você ainda não foi vinculado a nenhuma classe. Procure o Secretário da EBD.</p>
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