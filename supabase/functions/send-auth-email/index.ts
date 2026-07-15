// Send Email Hook for Supabase Auth -> Resend
// Configure in Supabase Dashboard: Auth -> Hooks -> Send Email Hook
// URL: https://<project-ref>.functions.supabase.co/send-auth-email
// Secret: same value as SEND_EMAIL_HOOK_SECRET env var (v1,whsec_...)
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
const FROM_EMAIL = Deno.env.get("AUTH_EMAIL_FROM") ?? "EBD <no-reply@ebd-system-pro.lovable.app>";
const APP_NAME = Deno.env.get("AUTH_EMAIL_APP_NAME") ?? "Sistema EBD";

interface EmailPayload {
  user: { email: string };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "recovery"
      | "magiclink"
      | "invite"
      | "email_change"
      | "email_change_current"
      | "email_change_new"
      | "reauthentication";
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function buildActionUrl(p: EmailPayload["email_data"]) {
  const params = new URLSearchParams({
    token: p.token_hash,
    type: p.email_action_type,
    redirect_to: p.redirect_to || p.site_url,
  });
  return `${p.site_url}/auth/v1/verify?${params.toString()}`;
}

function templateFor(action: EmailPayload["email_data"]["email_action_type"], url: string, token: string) {
  const base = (title: string, intro: string, cta: string) => ({
    subject: `${title} • ${APP_NAME}`,
    html: `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f6f7fb;margin:0;padding:32px">
      <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <tr><td style="padding:28px 32px 8px 32px">
          <h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a">${title}</h1>
          <p style="margin:0 0 20px 0;color:#475569;line-height:1.5;font-size:14px">${intro}</p>
          <p style="margin:24px 0"><a href="${url}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">${cta}</a></p>
          <p style="margin:24px 0 0 0;color:#64748b;font-size:12px;line-height:1.5">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br><span style="word-break:break-all;color:#334155">${url}</span></p>
          ${token ? `<p style="margin:16px 0 0 0;color:#64748b;font-size:12px">Código alternativo: <b style="color:#0f172a;letter-spacing:2px">${token}</b></p>` : ""}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center">Este é um e-mail automático de ${APP_NAME}. Não responda esta mensagem.</td></tr>
      </table>
    </body></html>`,
  });
  switch (action) {
    case "signup":
      return base("Confirme seu cadastro", `Bem-vindo(a) ao ${APP_NAME}. Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.`, "Confirmar cadastro");
    case "recovery":
      return base("Redefinir senha", "Recebemos um pedido para redefinir sua senha. Se foi você, clique no botão abaixo para escolher uma nova senha.", "Redefinir senha");
    case "magiclink":
      return base("Seu link de acesso", "Use o botão abaixo para entrar no sistema sem precisar de senha.", "Entrar");
    case "invite":
      return base("Você foi convidado", `Você foi convidado(a) para acessar o ${APP_NAME}. Clique no botão para criar sua conta.`, "Aceitar convite");
    case "email_change":
    case "email_change_new":
    case "email_change_current":
      return base("Confirme a alteração de e-mail", "Confirme a troca do e-mail cadastrado na sua conta clicando no botão abaixo.", "Confirmar novo e-mail");
    case "reauthentication":
      return {
        subject: `Código de verificação • ${APP_NAME}`,
        html: `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f6f7fb;margin:0;padding:32px">
          <table role="presentation" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 32px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
            <tr><td>
              <h1 style="margin:0 0 8px 0;font-size:20px;color:#0f172a">Código de verificação</h1>
              <p style="margin:0 0 16px 0;color:#475569;font-size:14px">Use o código abaixo para confirmar sua identidade:</p>
              <div style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0f172a;background:#f1f5f9;border-radius:8px;padding:14px;text-align:center">${token}</div>
            </td></tr>
          </table>
        </body></html>`,
      };
    default:
      return base(APP_NAME, "Você recebeu uma notificação da sua conta.", "Abrir");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!RESEND_API_KEY || !HOOK_SECRET) {
    console.error("Missing RESEND_API_KEY or SEND_EMAIL_HOOK_SECRET");
    return new Response(JSON.stringify({ error: "not_configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();
  const headers = Object.fromEntries(req.headers);

  let payload: EmailPayload;
  try {
    const wh = new Webhook(HOOK_SECRET);
    payload = wh.verify(raw, headers) as EmailPayload;
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = buildActionUrl(payload.email_data);
  const { subject, html } = templateFor(payload.email_data.email_action_type, url, payload.email_data.token);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [payload.user.email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend failed [${res.status}]: ${body}`);
    return new Response(JSON.stringify({ error: "resend_failed", status: res.status, details: body }), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});