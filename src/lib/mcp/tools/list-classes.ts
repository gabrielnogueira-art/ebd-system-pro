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
  name: "list_classes",
  title: "List classes",
  description:
    "List EBD classes the signed-in user can see. Optionally filter by congregation_id.",
  inputSchema: {
    congregation_id: z.string().uuid().optional().describe("Filter classes by congregation UUID."),
    limit: z.number().int().min(1).max(500).optional().describe("Max rows to return (default 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ congregation_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("classes")
      .select("id,name,congregation_id,teacher_student_id")
      .order("name", { ascending: true })
      .limit(limit ?? 200);
    if (congregation_id) q = q.eq("congregation_id", congregation_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { classes: data ?? [] },
    };
  },
});