import { createClient } from "npm:@supabase/supabase-js@2.45.0";

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
  action?:
    | "create_user"
    | "create_independent_church"
    | "create_ministry"
    | "create_headquarters"
    | "create_regional"
    | "create_congregation";
  name?: string;
  city?: string | null;
  email?: string;
  password?: string;
  display_name?: string;
  role?: Role;
  ministry_id?: string | null;
  headquarters_id?: string | null;
  regional_id?: string | null;
  congregation_id?: string | null;
  class_ids?: number[];
  is_headquarters?: boolean;
}

interface CallerRole {
  role: string;
  ministry_id: string | null;
  headquarters_id: string | null;
  regional_id: string | null;
  congregation_id: string | null;
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
    const { email, password, display_name } = body;
    const role = body.role;
    const wantsAuthUser = !!(email || password);
    if (wantsAuthUser && (!email || !password)) return json({ error: "Preencha e-mail e senha, ou deixe ambos vazios" }, 400);
    if (password && password.length < 6) return json({ error: "Senha mínima de 6 caracteres" }, 400);

    // Permissões: master sempre pode. Demais conforme o escopo.
    const { data: rolesData } = await admin
      .from("user_roles")
      .select("role, ministry_id, headquarters_id, regional_id, congregation_id")
      .eq("user_id", callerId);
    const callerRoles = (rolesData ?? []) as CallerRole[];
    const isMaster = callerRoles.some((r) => r.role === "master");

    const action = body.action ?? "create_user";

    if (action !== "create_user" && action !== "create_independent_church") {
      const name = body.name?.trim();
      if (!name) return json({ error: "Informe o nome" }, 400);

      let entityTable: "ministries" | "headquarters" | "regionals" | "congregations" | null = null;
      let entityId: string | null = null;
      let authUserId: string | null = null;
      let targetRole: Role | null = null;
      let targetMinistry = body.ministry_id ?? null;
      let targetHq = body.headquarters_id ?? null;
      let targetRegional = body.regional_id ?? null;
      let targetCongregation = body.congregation_id ?? null;

      const hasMinistry = (mid: string) =>
        callerRoles.some((r) => r.role === "igreja_mae" && r.ministry_id === mid);
      const hasHq = (hid: string) =>
        callerRoles.some((r) => r.role === "igreja_sede" && r.headquarters_id === hid);
      const hasRegional = (rid: string) =>
        callerRoles.some((r) => r.role === "admin_regional" && r.regional_id === rid);

      try {
        if (action === "create_ministry") {
          if (!isMaster) return json({ error: "Apenas Master pode criar ministérios" }, 403);
          const { data, error } = await admin
            .from("ministries")
            .insert({ name, city: body.city?.trim() || null })
            .select("id")
            .single();
          if (error || !data) throw new Error(error?.message ?? "Ministério não retornado");
          entityTable = "ministries";
          entityId = (data as { id: string }).id;
          targetMinistry = entityId;
          targetRole = "igreja_mae";
        }

        if (action === "create_headquarters") {
          if (!targetMinistry) return json({ error: "Informe o ministério da sede" }, 400);
          if (!isMaster && !hasMinistry(targetMinistry)) return json({ error: "Sem permissão para criar sede neste ministério" }, 403);
          const { data, error } = await admin
            .from("headquarters")
            .insert({ name, city: body.city?.trim() || null, ministry_id: targetMinistry })
            .select("id")
            .single();
          if (error || !data) throw new Error(error?.message ?? "Sede não retornada");
          entityTable = "headquarters";
          entityId = (data as { id: string }).id;
          targetHq = entityId;
          targetRole = "igreja_sede";
        }

        if (action === "create_regional") {
          if (!targetHq) return json({ error: "Informe a sede da regional" }, 400);
          const { data: hq } = await admin.from("headquarters").select("ministry_id").eq("id", targetHq).maybeSingle();
          const hqMinistry = (hq as any)?.ministry_id as string | undefined;
          if (!hqMinistry) return json({ error: "Sede inválida" }, 400);
          if (!isMaster && !hasHq(targetHq) && !hasMinistry(hqMinistry)) {
            return json({ error: "Sem permissão para criar regional nesta sede" }, 403);
          }
          const { data, error } = await admin
            .from("regionals")
            .insert({ name, headquarters_id: targetHq })
            .select("id")
            .single();
          if (error || !data) throw new Error(error?.message ?? "Regional não retornada");
          entityTable = "regionals";
          entityId = (data as { id: string }).id;
          targetRegional = entityId;
          targetRole = "admin_regional";
        }

        if (action === "create_congregation") {
          if (!targetHq) return json({ error: "Informe a sede da congregação" }, 400);
          const { data: hq } = await admin.from("headquarters").select("ministry_id").eq("id", targetHq).maybeSingle();
          const hqMinistry = (hq as any)?.ministry_id as string | undefined;
          if (!hqMinistry) return json({ error: "Sede inválida" }, 400);
          if (targetRegional) {
            const { data: regional } = await admin.from("regionals").select("headquarters_id").eq("id", targetRegional).maybeSingle();
            if (!regional || (regional as any).headquarters_id !== targetHq) {
              return json({ error: "A regional selecionada não pertence à sede informada" }, 400);
            }
          }
          const allowed = isMaster || hasHq(targetHq) || hasMinistry(hqMinistry) || (!!targetRegional && hasRegional(targetRegional));
          if (!allowed) return json({ error: "Sem permissão para criar congregação nesta estrutura" }, 403);
          const { data, error } = await admin
            .from("congregations")
            .insert({
              name,
              headquarters_id: targetHq,
              regional_id: targetRegional,
              is_headquarters: !!body.is_headquarters,
            })
            .select("id")
            .single();
          if (error || !data) throw new Error(error?.message ?? "Congregação não retornada");
          entityTable = "congregations";
          entityId = (data as { id: string }).id;
          targetCongregation = entityId;
          targetRole = "secretario_ebd";
        }

        if (wantsAuthUser && targetRole && email && password) {
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { display_name: display_name ?? name },
          });
          if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar usuário");
          authUserId = created.user.id;

          await admin
            .from("pending_users")
            .update({ status: "approved", decided_by: callerId, decided_at: new Date().toISOString() })
            .eq("user_id", authUserId);

          const { error: roleErr } = await admin.from("user_roles").insert({
            user_id: authUserId,
            role: targetRole,
            ministry_id: targetMinistry,
            headquarters_id: targetHq,
            regional_id: targetRegional,
            congregation_id: targetCongregation,
          });
          if (roleErr) throw new Error(`Falha ao atribuir papel: ${roleErr.message}`);
        }

        return json({ ok: true, id: entityId, user_id: authUserId }, 200);
      } catch (e: any) {
        if (authUserId) await admin.auth.admin.deleteUser(authUserId);
        if (entityTable && entityId) await admin.from(entityTable).delete().eq("id", entityId);
        console.error(`[${action}] rollback after error:`, e?.message ?? e);
        return json({ error: e?.message ?? "Falha ao criar item da estrutura" }, 400);
      }
    }

    if (action === "create_independent_church") {
      if (!email || !password) return json({ error: "E-mail e senha são obrigatórios" }, 400);
      if (!isMaster) return json({ error: "Apenas Master pode criar uma igreja independente" }, 403);
      const name = body.name?.trim();
      if (!name) return json({ error: "Informe o nome da igreja" }, 400);
      const city = body.city?.trim() || null;

      let ministryId: string | null = null;
      let headquartersId: string | null = null;
      let congregationId: string | null = null;
      let authUserId: string | null = null;

      try {
        const { data: ministry, error: mErr } = await admin
          .from("ministries")
          .insert({ name, city })
          .select("id")
          .single();
        if (mErr || !ministry) throw new Error(mErr?.message ?? "Ministério não retornado");
        ministryId = (ministry as { id: string }).id;

        const { data: hq, error: hErr } = await admin
          .from("headquarters")
          .insert({ name, city, ministry_id: ministryId })
          .select("id")
          .single();
        if (hErr || !hq) throw new Error(hErr?.message ?? "Sede não retornada");
        headquartersId = (hq as { id: string }).id;

        const { data: congregation, error: cErr } = await admin
          .from("congregations")
          .insert({ name, headquarters_id: headquartersId, regional_id: null, is_headquarters: true })
          .select("id")
          .single();
        if (cErr || !congregation) throw new Error(cErr?.message ?? "Congregação não retornada");
        congregationId = (congregation as { id: string }).id;

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: display_name ?? name },
        });
        if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar usuário");
        authUserId = created.user.id;

        await admin
          .from("pending_users")
          .update({ status: "approved", decided_by: callerId, decided_at: new Date().toISOString() })
          .eq("user_id", authUserId);

        const { error: roleErr } = await admin.from("user_roles").insert({
          user_id: authUserId,
          role: "secretario_ebd",
          ministry_id: null,
          headquarters_id: headquartersId,
          regional_id: null,
          congregation_id: congregationId,
        });
        if (roleErr) throw new Error(`Falha ao atribuir papel: ${roleErr.message}`);

        return json({ ok: true, ministry_id: ministryId, headquarters_id: headquartersId, congregation_id: congregationId, user_id: authUserId }, 200);
      } catch (e: any) {
        if (authUserId) await admin.auth.admin.deleteUser(authUserId);
        if (congregationId) await admin.from("congregations").delete().eq("id", congregationId);
        if (headquartersId) await admin.from("headquarters").delete().eq("id", headquartersId);
        if (ministryId) await admin.from("ministries").delete().eq("id", ministryId);
        console.error("[create_independent_church] rollback after error:", e?.message ?? e);
        return json({ error: e?.message ?? "Falha ao criar igreja independente" }, 400);
      }
    }

    if (!email || !password) return json({ error: "E-mail e senha são obrigatórios" }, 400);
    if (!role) return json({ error: "Informe o papel do usuário" }, 400);

    const hasMinistry = (mid: string) =>
      callerRoles.some((r) => r.role === "igreja_mae" && r.ministry_id === mid);
    const hasHq = (hid: string) =>
      callerRoles.some((r) => r.role === "igreja_sede" && r.headquarters_id === hid);
    const hasRegional = (rid: string) =>
      callerRoles.some((r) => r.role === "admin_regional" && r.regional_id === rid);
    const hasCong = (cid: string) =>
      callerRoles.some((r) => r.role === "secretario_ebd" && r.congregation_id === cid);

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
        // Admin regional pode criar login de congregação dentro da própria regional.
        if (!allowed && role === "secretario_ebd" && targetRegional) {
          allowed = hasRegional(targetRegional);
        }
      } else if (role === "professor_classe") {
        // Permitido se o caller tem escopo sobre TODAS as classes informadas
        const classIds = Array.isArray(body.class_ids) ? body.class_ids : [];
        if (classIds.length === 0) {
          return json({ error: "Informe ao menos uma classe para o professor" }, 400);
        }
        const { data: classRows } = await admin
          .from("classes")
          .select("id, congregation_id")
          .in("id", classIds);
        if (!classRows || classRows.length !== classIds.length) {
          return json({ error: "Classe(s) inválida(s)" }, 400);
        }
        // Para cada classe, buscar hierarquia da congregação
        let allOk = true;
        for (const c of classRows as any[]) {
          if (!c.congregation_id) { allOk = false; break; }
          const { data: cong } = await admin
            .from("congregations")
            .select("id, regional_id, headquarters_id")
            .eq("id", c.congregation_id)
            .maybeSingle();
          if (!cong) { allOk = false; break; }
          const { data: hq } = await admin
            .from("headquarters")
            .select("ministry_id")
            .eq("id", (cong as any).headquarters_id)
            .maybeSingle();
          const ok =
            hasCong((cong as any).id) ||
            (((cong as any).regional_id) && hasRegional((cong as any).regional_id)) ||
            hasHq((cong as any).headquarters_id) ||
            (hq && hasMinistry((hq as any).ministry_id));
          if (!ok) { allOk = false; break; }
        }
        allowed = allOk;
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

    // Vincula classes do professor (se houver)
    if (role === "professor_classe" && Array.isArray(body.class_ids) && body.class_ids.length > 0) {
      const rows = body.class_ids.map((cid) => ({ user_id: newUserId, class_id: cid }));
      const { error: tcErr } = await admin.from("teacher_classes").insert(rows);
      if (tcErr) {
        await admin.from("user_roles").delete().eq("user_id", newUserId);
        await admin.auth.admin.deleteUser(newUserId);
        return json({ error: `Falha ao vincular classes: ${tcErr.message}` }, 400);
      }
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