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
  name: "list_students",
  title: "List students",
  description:
    "List students the signed-in user can see. Filter by class_id and/or active status.",
  inputSchema: {
    class_id: z.number().int().optional().describe("Filter students by class id."),
    active_only: z.boolean().optional().describe("Only return active students (default true)."),
    search: z.string().optional().describe("Optional case-insensitive substring to match in the student's name."),
    limit: z.number().int().min(1).max(500).optional().describe("Max rows to return (default 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ class_id, active_only, search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("students")
      .select("id,name,class_id,active,cargo,phone,birth_date")
      .order("name", { ascending: true })
      .limit(limit ?? 200);
    if (typeof class_id === "number") q = q.eq("class_id", class_id);
    if (active_only !== false) q = q.eq("active", true);
    if (search && search.trim()) q = q.ilike("name", `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { students: data ?? [] },
    };
  },
});