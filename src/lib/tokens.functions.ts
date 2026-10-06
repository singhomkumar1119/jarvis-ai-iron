import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTokenBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getOrCreateBalance, STARTING_BALANCE } = await import("@/lib/tokens.server");
    const balance = await getOrCreateBalance(context.userId);
    return { balance, starting: STARTING_BALANCE };
  });
