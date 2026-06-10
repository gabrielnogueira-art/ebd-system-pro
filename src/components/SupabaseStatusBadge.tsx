import { useSupabaseHealth } from "@/hooks/useSupabaseHealth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Bolinha de status da conexao Supabase fixa no canto inferior direito.
 */
export function SupabaseStatusBadge() {
  const { status, lastError, lastCheck, projectUrl } = useSupabaseHealth();

  const color =
    status === "online" ? "bg-green-500" :
    status === "offline" ? "bg-red-500" : "bg-yellow-500";
  const label =
    status === "online" ? "Conectado" :
    status === "offline" ? "Sem conexão" : "Verificando...";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="status"
            aria-label={`Supabase: ${label}`}
            className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs shadow-md backdrop-blur cursor-help select-none"
          >
            <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color, status === "checking" && "animate-pulse")} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div><strong>Status:</strong> {label}</div>
            <div className="break-all"><strong>Projeto:</strong> {projectUrl}</div>
            {lastCheck && <div><strong>Última verificação:</strong> {lastCheck.toLocaleTimeString()}</div>}
            {lastError && <div className="text-red-500"><strong>Erro:</strong> {lastError}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}