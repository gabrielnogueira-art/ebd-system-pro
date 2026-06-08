import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Placeholder da Visao do Professor/Secretario da Classe (mobile-first).
 * Fase 2 implementara: chamada, gestao de alunos da classe e dashboard da classe.
 */
const Professor = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
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
        <Card>
          <CardHeader>
            <CardTitle>Em construção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Em breve aqui você terá:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Chamada de aula com Bíblia/Revista por aluno</li>
              <li>Gestão dos alunos da sua classe</li>
              <li>Dashboard de presença, ofertas e aniversariantes</li>
              <li>Rankings e filtro por trimestre/período</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Professor;