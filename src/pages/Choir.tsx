import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Music4, Printer } from "lucide-react";

interface Hymn {
  hymn: string;
  class_name: string;
}

const ChoirView = () => {
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchHymns = async () => {
      setIsLoading(true);
      setError(null);
      
      // Define a data de hoje e a do último domingo
      const today = new Date();
      const dayOfWeek = today.getDay(); // Domingo = 0, Segunda = 1, ...
      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - dayOfWeek);
      
      const startOfSunday = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 0, 0, 0);
      const endOfSunday = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 23, 59, 59);

      try {
        const { data, error } = await supabase
          .from("registrations")
          .select(`
            hymn,
            classes (
              name
            )
          `)
          .gte("registration_date", startOfSunday.toISOString())
          .lte("registration_date", endOfSunday.toISOString())
          .not("hymn", "is", null) // Garante que apenas registros com hinos sejam retornados
          .neq("hymn", "");       // Garante que hinos vazios não sejam retornados

        if (error) throw error;
        
        const formattedHymns = data.map(item => ({
          hymn: item.hymn,
          // @ts-expect-error
          class_name: item.classes?.name || "Classe desconhecida"
        }));

        // Ordenar por nome da classe para manter a ordem 1, 2, 3, etc
        formattedHymns.sort((a, b) => a.class_name.localeCompare(b.class_name, 'pt-BR', { numeric: true }));

        setHymns(formattedHymns);
      } catch (err) {
        console.error("Error fetching hymns:", err);
        setError("Não foi possível carregar os hinos. Tente novamente mais tarde.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHymns();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-blue-500/10 p-4 sm:p-6">
      <div className="container mx-auto max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex items-center justify-between">
              <Button onClick={() => navigate("/")} variant="outline" size="sm" className="print:hidden">
                ← Voltar
              </Button>
              <div className="flex-1">
                <CardTitle className="text-2xl sm:text-3xl text-primary flex items-center justify-center gap-3">
                  <Music4 className="h-6 w-6 sm:h-8 sm:w-8" />
                  Hinos para o Louvor
                </CardTitle>
                <CardDescription>
                  Hinos escolhidos pelas classes no último domingo
                </CardDescription>
              </div>
              <Button onClick={handlePrint} variant="outline" size="sm" className="print:hidden">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-muted-foreground">Carregando hinos...</div>
            ) : error ? (
              <div className="text-center text-destructive">{error}</div>
            ) : hymns.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum hino foi registrado no último domingo.
              </div>
            ) : (
              <div className="space-y-4">
                {hymns.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card/50">
                    <p className="text-lg font-semibold text-primary">{item.hymn}</p>
                    <p className="text-sm text-muted-foreground">Sugerido pela: {item.class_name}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChoirView;
