import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminDashboard } from "@/components/AdminDashboard";
import { RegistrationsList } from "@/components/RegistrationsList";
import { StudentsManagement } from "@/components/StudentsManagement";
import { ReportsTab } from "@/components/ReportsTab";
import { ConfrontoTab } from "@/components/ConfrontoTab";
import { HierarchyTab } from "@/components/HierarchyTab";
import { ClassesManagement } from "@/components/ClassesManagement";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SupabaseStatusBadge } from "@/components/SupabaseStatusBadge";
import { SedeViewSwitcher } from "@/components/SedeViewSwitcher";
import { MasterApprovalsTab } from "@/components/MasterApprovalsTab";
import { useUserRole } from "@/hooks/useUserRole";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const userRole = useUserRole();
  const isMaster = userRole.role === "master";
  const isSede = userRole.role === "igreja_sede";
  const isSecretario = userRole.role === "secretario_ebd";
  const canSeeStructure =
    userRole.role === "master" ||
    userRole.role === "igreja_mae" ||
    userRole.role === "igreja_sede" ||
    userRole.role === "admin_regional";

  useEffect(() => {
    let active = true;
    // Evita loop de loading caso getSession() trave no proxy do preview:
    // resolve quem chegar primeiro (session restaurada OU evento de auth OU timeout).
    const finish = (session: any) => {
      if (!active) return;
      if (!session) navigate("/login");
      setIsLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => finish(data.session)).catch(() => finish(null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => finish(session));
    const t = setTimeout(() => finish(null), 4000);
    return () => {
      active = false;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!userRole.loading && userRole.role === "professor_classe") {
      navigate("/professor");
    }
  }, [userRole.loading, userRole.role, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast({
      title: "Atualizado",
      description: "Os dados foram atualizados com sucesso.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Área Administrativa - EBD</h1>
            <p className="text-muted-foreground">Gerencie registros, alunos e relatórios</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>

        {(() => {
          const tabs: Array<{ value: string; label: string }> = [
            { value: "dashboard", label: "Dashboard" },
            { value: "registrations", label: "Registros" },
            { value: "confronto", label: "Confronto" },
            { value: "classes", label: "Classes" },
            { value: "students", label: "Alunos" },
            { value: "reports", label: "Relatórios" },
          ];
          if (canSeeStructure) tabs.push({ value: "hierarchy", label: "Estrutura" });
          if (isMaster) tabs.push({ value: "approvals", label: "Aprovações" });
          const cols = `grid-cols-${tabs.length}`;
          return (
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className={`grid w-full ${cols}`}>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard">
            {isSede ? (
              <SedeViewSwitcher key={`sede-${refreshKey}`} />
            ) : (
              <AdminDashboard key={`dashboard-${refreshKey}`} />
            )}
          </TabsContent>

          <TabsContent value="registrations">
            <RegistrationsList key={`registrations-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="confronto">
            <ConfrontoTab key={`confronto-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="classes">
            <ClassesManagement key={`classes-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="students">
            <StudentsManagement key={`students-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab key={`reports-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="hierarchy">
            <HierarchyTab key={`hierarchy-${refreshKey}`} />
          </TabsContent>

          {isMaster && (
            <TabsContent value="approvals">
              <MasterApprovalsTab key={`approvals-${refreshKey}`} />
            </TabsContent>
          )}
        </Tabs>
          );
        })()}
      </div>
      <SupabaseStatusBadge />
    </div>
  );
};

export default Admin;