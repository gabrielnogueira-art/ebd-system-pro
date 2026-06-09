import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserCog, ArrowLeft } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verifica se já existe uma sessão ativa ao carregar a página
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/admin");
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

      // Identifica o papel do usuario para rotear corretamente
      const { data: roles } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", data.session.user.id);

      const roleList = ((roles as unknown) as Array<{ role: string }>) || [];
      const has = (r: string) => roleList.some((x) => x.role === r);

      toast({
        title: "Login bem-sucedido!",
        description: "A redirecionar...",
      });

      if (has("igreja_mae")) {
        navigate("/admin?scope=ministry");
      } else if (has("igreja_sede")) {
        navigate("/admin?scope=headquarters");
      } else if (has("secretario_ebd")) {
        navigate("/admin?scope=congregation");
      } else if (has("professor_classe")) {
        navigate("/professor");
      } else {
        // Compatibilidade: usuarios antigos sem role caem no /admin
        navigate("/admin");
      }

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

