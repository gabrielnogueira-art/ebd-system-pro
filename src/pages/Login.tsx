import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserCog, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Same-origin relative paths only, to avoid open-redirect abuse.
  const rawNext = searchParams.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  const routeByRole = async (userId: string) => {
    if (nextPath) {
      window.location.href = nextPath;
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId);

    const roleList = ((roles as unknown) as Array<{ role: string }>) || [];
    const has = (r: string) => roleList.some((x) => x.role === r);

    if (has("master")) navigate("/admin?scope=master");
    else if (has("igreja_mae")) navigate("/admin?scope=ministry");
    else if (has("igreja_sede")) navigate("/admin?scope=headquarters");
    else if (has("admin_regional")) navigate("/admin?scope=regional");
    else if (has("secretario_ebd")) navigate("/admin?scope=congregation");
    else if (has("professor_classe")) navigate("/professor");
    else navigate("/admin");
  };

  useEffect(() => {
    // Verifica se já existe uma sessão ativa ao carregar a página
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        routeByRole(session.user.id);
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Utiliza a autenticação real do Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        // Fornece uma mensagem de erro mais clara para o utilizador
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Senha incorreta. Por favor, tente novamente.");
        }
        throw error;
      }

      // Verificação crucial para garantir que a sessão foi estabelecida antes de navegar
      if (!data.session) {
        throw new Error("Não foi possível estabelecer uma sessão. Tente novamente.");
      }

      // Bloqueia se a conta ainda esta pendente de aprovacao
      const { data: pending } = await supabase
        .from("pending_users" as any)
        .select("status")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const pStatus = ((pending as any) ?? [])[0]?.status;
      if (pStatus === "pending") {
        await supabase.auth.signOut();
        throw new Error("Sua conta está aguardando aprovação de um administrador.");
      }
      if (pStatus === "rejected") {
        await supabase.auth.signOut();
        throw new Error("Sua solicitação de acesso foi recusada.");
      }

      toast({
        title: "Login bem-sucedido!",
        description: "A redirecionar...",
      });

      await routeByRole(data.session.user.id);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de Login",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à Página Inicial
        </Button>
        <Card className="shadow-2xl border-primary/20">
          <CardHeader className="text-center">
            <UserCog className="mx-auto h-12 w-12 text-primary mb-4" />
            <CardTitle className="text-2xl font-bold">Acesso Administrativo</CardTitle>
          <CardDescription>
              Digite suas credenciais para aceder ao painel de controlo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Input
                  id="password"
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 text-lg">
                {isLoading ? "A entrar..." : "Entrar"}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Não tem conta?{" "}
              <Link to="/signup" className="text-primary underline">Solicitar acesso</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

