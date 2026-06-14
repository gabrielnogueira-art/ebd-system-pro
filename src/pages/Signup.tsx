import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, ArrowLeft } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: name },
        },
      });
      if (error) throw error;
      // Faz logout para não deixar logado sem aprovação
      await supabase.auth.signOut();
      setSubmitted(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no cadastro", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate("/login")} className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card className="shadow-2xl border-primary/20">
          <CardHeader className="text-center">
            <UserPlus className="mx-auto h-12 w-12 text-primary mb-4" />
            <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
            <CardDescription>Sua conta passará por aprovação antes de receber acesso.</CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4">
                <p className="text-sm">Cadastro recebido! Aguarde a aprovação de um administrador.</p>
                <Button onClick={() => navigate("/login")} className="w-full">Voltar ao login</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required className="h-12" />
                <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12" />
                <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-12" />
                <Button type="submit" disabled={loading} className="w-full h-12 text-lg">
                  {loading ? "Enviando..." : "Solicitar acesso"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Já tem conta? <Link to="/login" className="text-primary underline">Entrar</Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;