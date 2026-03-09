-- Enable RLS on quiz_collaborators to resolve Supabase security warning.
-- All app queries on this table use the service role (adminClient) which bypasses RLS,
-- so no policies are needed — enabling RLS alone closes the security gap.
ALTER TABLE public.quiz_collaborators ENABLE ROW LEVEL SECURITY;
