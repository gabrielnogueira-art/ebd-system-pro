import { useBranding } from "@/hooks/useBranding";
import { Church } from "lucide-react";

/**
 * Faixa institucional exibida no topo das areas internas:
 * logo + nome do ministerio + cidade/UF + pastor presidente.
 */
export const BrandingHeader = () => {
  const { ministry, loading } = useBranding();
  if (loading || !ministry) return null;

  const title = (ministry.display_name || ministry.name || "").toUpperCase();
  const cityUf = [ministry.city, ministry.state].filter(Boolean).join(" - ");
  const subtitle = ministry.president_pastor
    ? `PASTOR PRESIDENTE: ${ministry.president_pastor.toUpperCase()}`
    : null;

  return (
    <div className="rounded-lg border border-border bg-gradient-primary text-primary-foreground shadow-primary mb-6">
      <div className="flex items-center gap-4 px-5 py-3">
        <div className="h-14 w-14 rounded-md bg-background/15 backdrop-blur flex items-center justify-center overflow-hidden shrink-0">
          {ministry.logo_url ? (
            <img src={ministry.logo_url} alt={title} className="h-full w-full object-contain" />
          ) : (
            <Church className="h-7 w-7 opacity-80" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-bold leading-tight truncate">
            {title}
            {cityUf && <span className="opacity-90"> — {cityUf}</span>}
          </div>
          {subtitle && (
            <div className="text-xs sm:text-sm opacity-90 truncate">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  );
};