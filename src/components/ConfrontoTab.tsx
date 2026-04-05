import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Check, Plus, Minus, Save } from "lucide-react";

interface ConfrontoRegistration {
  id: string;
  registration_date: string;
  class_id: number;
  offering_cash: number;
  offering_pix: number;
  reconciled: boolean;
  cash_difference: number;
  pix_difference: number;
  classes?: {
    name: string;
  };
}

export const ConfrontoTab = () => {
  const [registrations, setRegistrations] = useState<ConfrontoRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localState, setLocalState] = useState<Record<string, {
    reconciled: boolean;
    cashSign: "+" | "-";
    pixSign: "+" | "-";
    cashDiff: string;
    pixDiff: string;
  }>>({});

  useEffect(() => {
    fetchTodayRegistrations();
  }, []);

  const fetchTodayRegistrations = async () => {
    try {
      // Get the most recent Sunday's date from registrations
      const { data: latestReg, error: latestError } = await supabase
        .from("registrations")
        .select("registration_date")
        .order("registration_date", { ascending: false })
        .limit(1);

      if (latestError) throw latestError;
      if (!latestReg || latestReg.length === 0) {
        setRegistrations([]);
        setIsLoading(false);
        return;
      }

      const latestDate = new Date(latestReg[0].registration_date).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("registrations")
        .select(`
          id, registration_date, class_id, offering_cash, offering_pix,
          reconciled, cash_difference, pix_difference,
          classes:class_id (name)
        `)
        .gte("registration_date", latestDate + "T00:00:00")
        .lte("registration_date", latestDate + "T23:59:59")
        .order("class_id");

      if (error) throw error;

      const regs = (data || []) as ConfrontoRegistration[];
      setRegistrations(regs);

      // Initialize local state from DB values
      const state: typeof localState = {};
      regs.forEach(reg => {
        const cashDiff = reg.cash_difference || 0;
        const pixDiff = reg.pix_difference || 0;
        state[reg.id] = {
          reconciled: reg.reconciled || false,
          cashSign: cashDiff >= 0 ? "+" : "-",
          pixSign: pixDiff >= 0 ? "+" : "-",
          cashDiff: formatCentsToDisplay(Math.abs(Math.round(cashDiff * 100))),
          pixDiff: formatCentsToDisplay(Math.abs(Math.round(pixDiff * 100))),
        };
      });
      setLocalState(state);
    } catch (error) {
      console.error("Error fetching registrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCentsToDisplay = (cents: number): string => {
    if (cents === 0) return "";
    const reais = Math.floor(cents / 100);
    const centavos = cents % 100;
    return `${reais},${centavos.toString().padStart(2, "0")}`;
  };

  const handleCurrencyInput = (regId: string, field: "cashDiff" | "pixDiff", value: string) => {
    // Strip non-digits
    const digits = value.replace(/\D/g, "");
    const cents = parseInt(digits || "0", 10);
    const display = formatCentsToDisplay(cents);
    
    setLocalState(prev => ({
      ...prev,
      [regId]: { ...prev[regId], [field]: display }
    }));
  };

  const toggleSign = (regId: string, field: "cashSign" | "pixSign") => {
    setLocalState(prev => ({
      ...prev,
      [regId]: { ...prev[regId], [field]: prev[regId][field] === "+" ? "-" : "+" }
    }));
  };

  const toggleReconciled = (regId: string) => {
    setLocalState(prev => ({
      ...prev,
      [regId]: { 
        ...prev[regId], 
        reconciled: !prev[regId].reconciled,
        cashDiff: !prev[regId].reconciled ? "" : prev[regId].cashDiff,
        pixDiff: !prev[regId].reconciled ? "" : prev[regId].pixDiff,
      }
    }));
  };

  const parseDisplayToNumber = (display: string, sign: "+" | "-"): number => {
    if (!display) return 0;
    const clean = display.replace(/\D/g, "");
    const cents = parseInt(clean || "0", 10);
    const value = cents / 100;
    return sign === "-" ? -value : value;
  };

  const handleSave = async (regId: string) => {
    const state = localState[regId];
    if (!state) return;

    const cashDifference = state.reconciled ? 0 : parseDisplayToNumber(state.cashDiff, state.cashSign);
    const pixDifference = state.reconciled ? 0 : parseDisplayToNumber(state.pixDiff, state.pixSign);

    try {
      const { error } = await supabase
        .from("registrations")
        .update({
          reconciled: state.reconciled,
          cash_difference: cashDifference,
          pix_difference: pixDifference,
        })
        .eq("id", regId);

      if (error) throw error;

      toast({
        title: "Salvo",
        description: "Confronto atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Error saving reconciliation:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o confronto.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAll = async () => {
    try {
      for (const reg of registrations) {
        await handleSave(reg.id);
      }
      toast({
        title: "Tudo salvo",
        description: "Todos os confrontos foram salvos.",
      });
    } catch (error) {
      console.error("Error saving all:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const latestDate = registrations.length > 0
    ? new Date(registrations[0].registration_date).toLocaleDateString("pt-BR")
    : "—";

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Confronto</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Confronto Financeiro</CardTitle>
            <CardDescription>
              Reconciliação das ofertas do domingo mais recente ({latestDate})
            </CardDescription>
          </div>
          <Button onClick={handleSaveAll} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Tudo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum registro encontrado.</p>
        ) : (
          <div className="space-y-4">
            {registrations.map(reg => {
              const state = localState[reg.id];
              if (!state) return null;
              
              return (
                <div key={reg.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{reg.classes?.name || `Classe ${reg.class_id}`}</p>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Dinheiro: {formatCurrency(reg.offering_cash)}</span>
                        <span>PIX/Cartão: {formatCurrency(reg.offering_pix)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`reconciled-${reg.id}`}
                          checked={state.reconciled}
                          onCheckedChange={() => toggleReconciled(reg.id)}
                        />
                        <Label htmlFor={`reconciled-${reg.id}`} className="text-sm cursor-pointer">
                          Valores conferem?
                        </Label>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleSave(reg.id)}>
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {!state.reconciled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      {/* Cash difference */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Diferença em Dinheiro</Label>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant={state.cashSign === "+" ? "default" : "destructive"}
                            className="h-10 w-10 shrink-0"
                            onClick={() => toggleSign(reg.id, "cashSign")}
                          >
                            {state.cashSign === "+" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          </Button>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input
                              className="pl-10"
                              placeholder="0,00"
                              value={state.cashDiff}
                              onChange={(e) => handleCurrencyInput(reg.id, "cashDiff", e.target.value)}
                              inputMode="numeric"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {state.cashSign === "+" ? "Sobrou dinheiro" : "Faltou dinheiro"}
                        </p>
                      </div>

                      {/* PIX difference */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Diferença em PIX/Cartão</Label>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant={state.pixSign === "+" ? "default" : "destructive"}
                            className="h-10 w-10 shrink-0"
                            onClick={() => toggleSign(reg.id, "pixSign")}
                          >
                            {state.pixSign === "+" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          </Button>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input
                              className="pl-10"
                              placeholder="0,00"
                              value={state.pixDiff}
                              onChange={(e) => handleCurrencyInput(reg.id, "pixDiff", e.target.value)}
                              inputMode="numeric"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {state.pixSign === "+" ? "Sobrou valor" : "Faltou valor"}
                        </p>
                      </div>
                    </div>
                  )}

                  {state.reconciled && (
                    <div className="flex items-center gap-2 text-sm text-green-600 pt-1">
                      <Check className="h-4 w-4" />
                      <span>Valores conferidos ✓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
