import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";

/**
 * Aplica o tema do ministerio no <html>: sobrescreve --primary, --primary-glow
 * e --gradient-primary com a cor cadastrada. Sem cor cadastrada, mantem o tema padrao.
 */
export const BrandingApplier = () => {
  const { ministry } = useBranding();

  useEffect(() => {
    const root = document.documentElement;
    const hsl = ministry?.brand_primary_hsl?.trim();
    if (!hsl) {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-glow");
      root.style.removeProperty("--gradient-primary");
      root.style.removeProperty("--ring");
      return;
    }
    // hsl no formato "H S% L%"
    const m = hsl.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
    if (!m) return;
    const h = parseFloat(m[1]);
    const s = parseFloat(m[2]);
    const l = parseFloat(m[3]);
    const glowL = Math.min(95, l + 18);
    root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
    root.style.setProperty("--primary-glow", `${h} ${Math.min(100, s + 5)}% ${glowL}%`);
    root.style.setProperty("--ring", `${h} ${s}% ${l}%`);
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${h} ${s}% ${l}%), hsl(${h} ${Math.min(100, s + 5)}% ${glowL}%))`,
    );
  }, [ministry?.brand_primary_hsl]);

  return null;
};