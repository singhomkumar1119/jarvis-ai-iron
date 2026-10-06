// Server-only helpers for the Jarvis token balance.
// Balances live in public.user_token_balances; only the service role may write.

export const STARTING_BALANCE = 500;
export const CHAT_COST = 1;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getOrCreateBalance(userId: string): Promise<number> {
  const sb = await admin();
  const { data } = await sb
    .from("user_token_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data.balance;
  const { data: created, error } = await sb
    .from("user_token_balances")
    .insert({ user_id: userId, balance: STARTING_BALANCE })
    .select("balance")
    .single();
  if (error || !created) return STARTING_BALANCE;
  return created.balance;
}

/** Spend `cost` tokens with a guarded compare-and-write. Returns remaining balance, or null if insufficient. */
export async function tryConsume(userId: string, cost: number): Promise<number | null> {
  await getOrCreateBalance(userId);
  const sb = await admin();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row } = await sb
      .from("user_token_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();
    if (!row) return null;
    if (row.balance < cost) return null;
    const next = row.balance - cost;
    const { data: updated, error } = await sb
      .from("user_token_balances")
      .update({ balance: next, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("balance", row.balance)
      .select("balance")
      .maybeSingle();
    if (!error && updated) return updated.balance;
  }
  return null;
}
