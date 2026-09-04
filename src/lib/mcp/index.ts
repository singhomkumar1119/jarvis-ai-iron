import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listActivityTool from "./tools/list-activity";
import activitySummaryTool from "./tools/activity-summary";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "jarvis-orb",
  title: "Jarvis Orb",
  version: "0.1.0",
  instructions:
    "Tools for the Jarvis Orb assistant app. Use `list_activity` to read recent visitor activity events and `activity_summary` for aggregated stats. Both act as the signed-in Jarvis operator; access is restricted by the app's database policies.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listActivityTool, activitySummaryTool],
});
