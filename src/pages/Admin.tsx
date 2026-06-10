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
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SupabaseStatusBadge } from "@/components/SupabaseStatusBadge";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
      setIsLoading(false);
    };
    checkAccess();
  }, [navigate]);

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

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="registrations">Registros</TabsTrigger>
            <TabsTrigger value="confronto">Confronto</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="hierarchy">Estrutura</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard key={`dashboard-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="registrations">
            <RegistrationsList key={`registrations-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="confronto">
            <ConfrontoTab key={`confronto-${refreshKey}`} />
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
        </Tabs>
      </div>
      <SupabaseStatusBadge />
    </div>
  );
};

export default Admin;