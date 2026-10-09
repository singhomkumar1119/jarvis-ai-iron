import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, PageHeader, Panel } from "@/components/jarvis/Shell";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Chat History — Jarvis" },
      { name: "description", content: "Your private Jarvis chat history, visible only to your signed-in account." },
      { property: "og:title", content: "Chat History — Jarvis" },
      { property: "og:description", content: "Private, per-account conversation history with Jarvis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const qc = useQueryClient();
  const { data: email } = useQuery({
    queryKey: ["me-email"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.email ?? "",
  });
  const { data = [], isLoading } = useQuery({
    queryKey: ["chat-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_history")
        .select("id, question, answer, model, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  async function remove(id?: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const q = supabase.from("chat_history").delete().eq("user_id", u.user.id);
    const { error } = id ? await q.eq("id", id) : await q;
    if (error) return toast.error("Couldn't delete");
    toast(id ? "Chat deleted" : "History cleared");
    qc.invalidateQueries({ queryKey: ["chat-history"] });
  }

  return (
    <Page>
      <PageHeader title="Chat History" subtitle={email ? `Only chats from ${email}` : "Your chats"} />
      <div className="space-y-4">
        {data.length > 0 && (
          <button
            onClick={() => remove()}
            className="flex items-center gap-2 rounded-full border border-destructive/40 px-3 py-1.5 text-[11px] text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <p className="glass rounded-3xl px-5 py-10 text-center text-sm text-muted-foreground">
            No saved chats yet. Talk to Jarvis and your chats will appear here.
          </p>
        )}
        {data.map((c) => (
          <Panel key={c.id}>
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{new Date(c.created_at).toLocaleString()}</span>
              <button aria-label="Delete chat" onClick={() => remove(c.id)} className="hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm font-medium text-foreground">{c.question}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-6">{c.answer}</p>
          </Panel>
        ))}
      </div>
    </Page>
  );
}
