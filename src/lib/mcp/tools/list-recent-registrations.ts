import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_recent_registrations",
  title: "List recent EBD registrations",
  description:
    "List recent EBD class registrations (attendance + offerings) visible to the signed-in user. Optionally filter by class_id and date range (YYYY-MM-DD).",
  inputSchema: {
    class_id: z.number().int().optional().describe("Filter by class id."),
    since: z.string().optional().describe("Include registrations on or after this date (YYYY-MM-DD)."),
    until: z.string().optional().describe("Include registrations on or before this date (YYYY-MM-DD)."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ class_id, since, until, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("registrations")
      .select(
        "id,class_id,registration_date,total_present,visitors,bibles,magazines,offering_cash,offering_pix,hymn,ebd_notes,class_notes,reconciled,created_at"
      )
      .order("registration_date", { ascending: false })
      .limit(limit ?? 50);
    if (typeof class_id === "number") q = q.eq("class_id", class_id);
    if (since) q = q.gte("registration_date", since);
    if (until) q = q.lte("registration_date", until);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { registrations: data ?? [] },
    };
  },
});