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
import { BrandingTab } from "@/components/BrandingTab";
import { BrandingHeader } from "@/components/BrandingHeader";
import { ScopeProvider } from "@/context/ScopeContext";
import { ScopeGate } from "@/components/ScopeGate";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("dashboard");
  const userRole = useUserRole();
  const isMaster = userRole.role === "master";
  const isSede = userRole.role === "igreja_sede";
  const canEditBranding = userRole.role === "master" || userRole.role === "igreja_mae";
  const canSeeStructure =
    userRole.role === "master" ||
    userRole.role === "igreja_mae" ||
    userRole.role === "igreja_sede" ||
    userRole.role === "admin_regional" ||
    userRole.role === "secretario_ebd";

  useEffect(() => {
    let active = true;
    let hasSession = false;
    let resolved = false;
    const finish = (session: any) => {
      if (!active) return;
      if (session) {
        hasSession = true;
        resolved = true;
        setIsLoading(false);
      } else if (!hasSession && resolved) {
        // só redireciona depois que getSession resolveu e confirmou que não há sessão
        setIsLoading(false);
        navigate("/login");
      }
    };
    // Listener primeiro para capturar SIGNED_IN/TOKEN_REFRESHED.
    // Defer async work para evitar deadlock do auth client.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setTimeout(() => finish(session), 0);
    });
    supabase.auth.getSession()
      .then(({ data }) => { resolved = true; finish(data.session); })
      .catch(() => { resolved = true; finish(null); });
    return () => {
      active = false;
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
        <BrandingHeader />
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
          if (canEditBranding) tabs.push({ value: "branding", label: "Identidade" });
          if (isMaster) tabs.push({ value: "approvals", label: "Aprovações" });
          // Mapa estatico para garantir geracao das classes Tailwind
          const colsMap: Record<number, string> = {
            5: "grid-cols-5",
            6: "grid-cols-6",
            7: "grid-cols-7",
            8: "grid-cols-8",
            9: "grid-cols-9",
          };
          const cols = colsMap[tabs.length] ?? "grid-cols-6";
          return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${cols}`}>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* Render apenas o tab ativo — montar todos simultaneamente
              disparava queries/realtime em todos e causava input lag. */}
          <TabsContent value={activeTab} forceMount>
            {activeTab === "dashboard" && (
              isSede ? (
                <SedeViewSwitcher key={`sede-${refreshKey}`} />
              ) : (
                <ScopeProvider key={`sp-dashboard-${refreshKey}`}>
                  <ScopeGate><AdminDashboard key={`dashboard-${refreshKey}`} /></ScopeGate>
                </ScopeProvider>
              )
            )}
            {activeTab === "registrations" && (
              <ScopeProvider key={`sp-reg-${refreshKey}`}><ScopeGate><RegistrationsList key={`registrations-${refreshKey}`} /></ScopeGate></ScopeProvider>
            )}
            {activeTab === "confronto" && (
              <ScopeProvider key={`sp-conf-${refreshKey}`}><ScopeGate><ConfrontoTab key={`confronto-${refreshKey}`} /></ScopeGate></ScopeProvider>
            )}
            {activeTab === "classes" && (
              <ScopeProvider key={`sp-cls-${refreshKey}`}><ScopeGate><ClassesManagement key={`classes-${refreshKey}`} /></ScopeGate></ScopeProvider>
            )}
            {activeTab === "students" && (
              <ScopeProvider key={`sp-stu-${refreshKey}`}><ScopeGate><StudentsManagement key={`students-${refreshKey}`} /></ScopeGate></ScopeProvider>
            )}
            {activeTab === "reports" && (
              <ScopeProvider key={`sp-rep-${refreshKey}`}><ScopeGate><ReportsTab key={`reports-${refreshKey}`} /></ScopeGate></ScopeProvider>
            )}
            {activeTab === "hierarchy" && canSeeStructure && <HierarchyTab key={`hierarchy-${refreshKey}`} />}
            {activeTab === "branding" && canEditBranding && <BrandingTab key={`branding-${refreshKey}`} />}
            {activeTab === "approvals" && isMaster && <MasterApprovalsTab key={`approvals-${refreshKey}`} />}
          </TabsContent>
        </Tabs>
          );
        })()}
      </div>
      <SupabaseStatusBadge />
    </div>
  );
};

export default Admin;