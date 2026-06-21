import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranding } from "@/hooks/useBranding";
import { hexToHslString, hslStringToHex } from "@/lib/color";
import { Upload, Loader2, Palette, Church } from "lucide-react";

const db = supabase as any;

type Form = {
  display_name: string;
  city: string;
  state: string;
  president_pastor: string;
  logo_url: string;
  brand_primary_hsl: string;
};

export const BrandingTab = () => {
  const { toast } = useToast();
  const role = useUserRole();
  const { ministry, refresh, loading } = useBranding();
  const fileRef = useRef<HTMLInputElement>(null);
  const [hex, setHex] = useState("#3b82f6");
  const [form, setForm] = useState<Form>({
    display_name: "",
    city: "",
    state: "",
    president_pastor: "",
    logo_url: "",
    brand_primary_hsl: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canEdit =
    role.role === "master" ||
    (role.role === "igreja_mae" && ministry?.id && role.ministryId === ministry.id);

  useEffect(() => {
    if (!ministry) return;
    setForm({
      display_name: ministry.display_name ?? "",
      city: ministry.city ?? "",
      state: ministry.state ?? "",
      president_pastor: ministry.president_pastor ?? "",
      logo_url: ministry.logo_url ?? "",
      brand_primary_hsl: ministry.brand_primary_hsl ?? "",
    });
    setHex(hslStringToHex(ministry.brand_primary_hsl));
  }, [ministry?.id, ministry?.brand_primary_hsl, ministry?.logo_url]);

  if (loading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando...</div>;
  }

  if (!ministry) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum ministério vinculado ao seu usuário.
        </CardContent>
      </Card>
    );
  }

  const handleColor = (value: string) => {
    setHex(value);
    const hsl = hexToHslString(value);
    if (hsl) setForm((f) => ({ ...f, brand_primary_hsl: hsl }));
  };

  const handleUpload = async (file: File) => {
    if (!canEdit) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${ministry.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setForm((f) => ({ ...f, logo_url: data.publicUrl }));
      toast({ title: "Logo enviada", description: "Lembre de salvar para aplicar." });
    } catch (e: any) {
      toast({
        title: "Erro ao enviar logo",
        description: e?.message ?? "Verifique se o bucket 'branding' existe e é público.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setSaving(true);
    const { error } = await db
      .from("ministries")
      .update({
        display_name: form.display_name || null,
        city: form.city || null,
        state: form.state || null,
        president_pastor: form.president_pastor || null,
        logo_url: form.logo_url || null,
        brand_primary_hsl: form.brand_primary_hsl || null,
      })
      .eq("id", ministry.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Identidade visual atualizada" });
    refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Identidade visual do ministério
          </CardTitle>
          <CardDescription>
            Personalize logo, cor e cabeçalho. As alterações se aplicam a toda a rede vinculada a este ministério.
            {!canEdit && " Apenas o ministério (igreja mãe) ou o DEV podem editar."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview */}
          <div
            className="rounded-lg p-4 text-white shadow-md"
            style={{
              background: `linear-gradient(135deg, ${hex}, ${hex})`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-md bg-white/15 flex items-center justify-center overflow-hidden">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="logo" className="h-full w-full object-contain" />
                ) : (
                  <Church className="h-7 w-7" />
                )}
              </div>
              <div>
                <div className="font-bold text-lg leading-tight">
                  {(form.display_name || ministry.name).toUpperCase()}
                  {(form.city || form.state) && (
                    <span className="opacity-90"> — {[form.city, form.state].filter(Boolean).join(" - ")}</span>
                  )}
                </div>
                {form.president_pastor && (
                  <div className="text-sm opacity-90">
                    PASTOR PRESIDENTE: {form.president_pastor.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome de exibição</Label>
              <Input
                disabled={!canEdit}
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder={ministry.name}
              />
            </div>
            <div className="space-y-2">
              <Label>Pastor presidente</Label>
              <Input
                disabled={!canEdit}
                value={form.president_pastor}
                onChange={(e) => setForm({ ...form, president_pastor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input
                disabled={!canEdit}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado (UF)</Label>
              <Input
                disabled={!canEdit}
                maxLength={2}
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor primária</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled={!canEdit}
                  value={hex}
                  onChange={(e) => handleColor(e.target.value)}
                  className="h-10 w-16 rounded border border-border bg-transparent cursor-pointer"
                />
                <Input
                  disabled={!canEdit}
                  value={hex}
                  onChange={(e) => handleColor(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo da igreja</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canEdit || uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {form.logo_url ? "Substituir" : "Enviar"}
                </Button>
                {form.logo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!canEdit}
                    onClick={() => setForm({ ...form, logo_url: "" })}
                  >
                    Remover
                  </Button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">PNG/JPG/SVG até ~2MB. Quadrada de preferência.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!canEdit || saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar identidade visual
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};