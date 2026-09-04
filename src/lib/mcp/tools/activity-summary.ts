import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

type Row = {
  event_type: string | null;
  device: string | null;
  browser: string | null;
  session_id: string | null;
  created_at: string;
};

function tally(values: (string | null)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) {
    const key = value ?? "unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export default defineTool({
  name: "activity_summary",
  title: "Summarize Jarvis activity",
  description:
    "Summarize Jarvis visitor activity over a recent time window: totals by event type, device, browser, and unique sessions.",
  inputSchema: {
    days: z.number().int().min(1).max(90).optional().describe("How many days back to summarize (default 7)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const window = days ?? 7;
    const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000).toISOString();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("visitor_events")
      .select("event_type, device, browser, session_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []) as Row[];
    const summary = {
      windowDays: window,
      totalEvents: rows.length,
      uniqueSessions: new Set(rows.map((r) => r.session_id ?? "unknown")).size,
      byEventType: tally(rows.map((r) => r.event_type)),
      byDevice: tally(rows.map((r) => r.device)),
      byBrowser: tally(rows.map((r) => r.browser)),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
