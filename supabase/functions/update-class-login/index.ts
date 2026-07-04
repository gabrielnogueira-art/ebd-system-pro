import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  action: "update_email" | "update_password" | "delete_login";
  class_id: number;
  email?: string;
  password?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
    if (!body?.class_id || !body?.action) return json({ error: "Parâmetros ausentes" }, 400);

    // Load class + congregation
    const { data: klass, error: classErr } = await admin
      .from("classes")
      .select("id, name, congregation_id")
      .eq("id", body.class_id)
      .maybeSingle();
    if (classErr || !klass) return json({ error: "Classe não encontrada" }, 404);
    if (!klass.congregation_id) return json({ error: "Classe sem congregação" }, 400);

    // Permission: caller must manage the congregation
    const { data: canManage, error: permErr } = await admin.rpc("user_can_manage_congregation_structure", {
      _user_id: callerId,
      _congregation_id: klass.congregation_id,
    });
    if (permErr) return json({ error: permErr.message }, 500);
    if (!canManage) return json({ error: "Sem permissão para esta classe" }, 403);

    // Find existing professor_classe user for this class via teacher_classes
    const { data: tcRows } = await admin
      .from("teacher_classes")
      .select("user_id")
      .eq("class_id", body.class_id);
    const userIds = Array.from(new Set((tcRows ?? []).map((r: any) => r.user_id)));

    let existingUserId: string | null = null;
    if (userIds.length > 0) {
      const { data: urs } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .eq("role", "professor_classe");
      existingUserId = (urs ?? [])[0]?.user_id ?? null;
    }

    if (body.action === "delete_login") {
      if (!existingUserId) return json({ ok: true });
      await admin.from("teacher_classes").delete().eq("user_id", existingUserId).eq("class_id", body.class_id);
      // remove role if no more classes
      const { data: remaining } = await admin.from("teacher_classes").select("class_id").eq("user_id", existingUserId);
      if (!remaining || remaining.length === 0) {
        await admin.from("user_roles").delete().eq("user_id", existingUserId).eq("role", "professor_classe");
        await admin.auth.admin.deleteUser(existingUserId);
      }
      return json({ ok: true });
    }

    if (body.action === "update_email") {
      if (!body.email) return json({ error: "E-mail obrigatório" }, 400);
      if (!existingUserId) return json({ error: "Login inexistente. Crie primeiro." }, 404);
      const { error } = await admin.auth.admin.updateUserById(existingUserId, { email: body.email, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === "update_password") {
      if (!body.password || body.password.length < 6) return json({ error: "Senha mínima de 6 caracteres" }, 400);
      if (!existingUserId) return json({ error: "Login inexistente. Crie primeiro." }, 404);
      const { error } = await admin.auth.admin.updateUserById(existingUserId, { password: body.password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e: any) {
    return json({ error: e?.message ?? "Erro" }, 500);
  }
});