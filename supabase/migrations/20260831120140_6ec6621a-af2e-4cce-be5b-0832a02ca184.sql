CREATE TABLE public.invite_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Invito',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invite_sites TO anon;
GRANT SELECT ON public.invite_sites TO authenticated;
GRANT ALL ON public.invite_sites TO service_role;
ALTER TABLE public.invite_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view invites" ON public.invite_sites FOR SELECT USING (true);