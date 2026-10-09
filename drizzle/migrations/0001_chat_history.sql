CREATE TABLE public.chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'chat',
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_history_user_created_idx ON public.chat_history (user_id, created_at DESC);
GRANT SELECT, DELETE ON public.chat_history TO authenticated;
GRANT ALL ON public.chat_history TO service_role;
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own chat history" ON public.chat_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own chat history" ON public.chat_history FOR DELETE TO authenticated USING (auth.uid() = user_id);