import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Role =
  | "igreja_mae"
  | "igreja_sede"
  | "admin_regional"
  | "secretario_ebd"
  | "professor_classe";

interface Body {
  email: string;
  password: string;
  display_name?: string;
  role: Role;
  ministry_id?: string | null;
  headquarters_id?: string | null;
  regional_id?: string | null;
  congregation_id?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Não autenticado" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);
    const callerId = userData.user.id;

    const body = (await req.json()) as Body;
    const { email, password, display_name, role } = body;
    if (!email || !password || !role) return json({ error: "Dados incompletos" }, 400);
    if (password.length < 6) return json({ error: "Senha mínima de 6 caracteres" }, 400);

    // Permissões: master sempre pode. Demais conforme o escopo.
    const { data: rolesData } = await admin
      .from("user_roles")
      .select("role, ministry_id, headquarters_id, regional_id, congregation_id")
      .eq("user_id", callerId);
    const callerRoles = (rolesData ?? []) as any[];
    const isMaster = callerRoles.some((r) => r.role === "master");

    const hasMinistry = (mid: string) =>
      callerRoles.some((r) => r.role === "igreja_mae" && r.ministry_id === mid);
    const hasHq = (hid: string) =>
      callerRoles.some((r) => r.role === "igreja_sede" && r.headquarters_id === hid);

    const targetMinistry = body.ministry_id ?? null;
    const targetHq = body.headquarters_id ?? null;
    const targetRegional = body.regional_id ?? null;
    const targetCong = body.congregation_id ?? null;

    let allowed = isMaster;
    if (!allowed) {
      if (role === "igreja_mae") allowed = false; // só master
      else if (role === "igreja_sede") {
        // master ou igreja_mae do mesmo ministério
        allowed = !!targetMinistry && hasMinistry(targetMinistry);
      } else if (role === "admin_regional" || role === "secretario_ebd") {
        // master, igreja_mae do ministério da sede, ou igreja_sede da sede
        if (targetHq) {
          const { data: hq } = await admin
            .from("headquarters")
            .select("ministry_id")
            .eq("id", targetHq)
            .maybeSingle();
          allowed = (hq && hasMinistry((hq as any).ministry_id)) || hasHq(targetHq);
        }
      } else if (role === "professor_classe") {
        allowed = false;
      }
    }
    if (!allowed) return json({ error: "Sem permissão para criar este nível de acesso" }, 403);

    // Cria usuário (auto-confirmado)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name ?? email },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Falha ao criar usuário" }, 400);
    }
    const newUserId = created.user.id;

    // Marca pending como aprovado (trigger pode ter criado) e insere role
    await admin
      .from("pending_users")
      .update({ status: "approved", decided_by: callerId, decided_at: new Date().toISOString() })
      .eq("user_id", newUserId);

    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: newUserId,
      role,
      ministry_id: targetMinistry,
      headquarters_id: targetHq,
      regional_id: targetRegional,
      congregation_id: targetCong,
    });
    if (roleErr) {
      // rollback do auth user para não deixar órfão
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: `Falha ao atribuir papel: ${roleErr.message}` }, 400);
    }

    return json({ ok: true, user_id: newUserId }, 200);
  } catch (e: any) {
    return json({ error: e?.message ?? "Erro inesperado" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}