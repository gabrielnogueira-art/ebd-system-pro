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
  name: "list_congregations",
  title: "List congregations",
  description:
    "List EBD congregations the signed-in user has access to. Returns id, name, headquarters_id, regional_id, is_headquarters.",
  inputSchema: {
    search: z.string().optional().describe("Optional case-insensitive substring to match in the congregation name."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("congregations")
      .select("id,name,headquarters_id,regional_id,is_headquarters")
      .order("name", { ascending: true })
      .limit(limit ?? 100);
    if (search && search.trim()) q = q.ilike("name", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { congregations: data ?? [] },
    };
  },
});