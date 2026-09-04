import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_activity",
  title: "List Jarvis activity",
  description:
    "List recent Jarvis visitor activity events (visits, messages, uploads) for the signed-in operator. Admin access is enforced by the database.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("How many events to return (default 50)."),
    eventType: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Filter by event type, e.g. 'visit', 'message', 'upload'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, eventType }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("visitor_events")
      .select("id, created_at, event_type, channel, content, file_name, device, browser, os, page_path, ip_address")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (eventType) query = query.eq("event_type", eventType);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data?.length) {
      return { content: [{ type: "text", text: "No activity found (or your account is not an admin)." }] };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { events: data, count: data.length },
    };
  },
});
