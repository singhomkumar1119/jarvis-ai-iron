CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE public.visitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'message',
  channel text,
  content text,
  file_name text,
  file_type text,
  file_size bigint,
  file_path text,
  ip_address text,
  user_agent text,
  device text,
  browser text,
  os text,
  screen text,
  language text,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX visitor_events_created_at_idx ON public.visitor_events (created_at DESC);
CREATE INDEX visitor_events_session_idx ON public.visitor_events (session_id);

GRANT SELECT ON public.visitor_events TO authenticated;
GRANT ALL ON public.visitor_events TO service_role;
ALTER TABLE public.visitor_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read visitor events"
ON public.visitor_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read uploaded files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'));