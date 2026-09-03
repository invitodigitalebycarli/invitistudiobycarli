DROP POLICY IF EXISTS "Anyone can view invites" ON public.invite_sites;

ALTER TABLE public.invite_sites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invite_sites FROM anon, authenticated;
GRANT ALL ON public.invite_sites TO service_role;