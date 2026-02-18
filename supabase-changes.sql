-- ============================================================
-- Quiz App — Supabase Changes (run after initial setup)
-- ============================================================

-- 1. Drop the auto-approve trigger so you manually control teacher access.
--    New signups will create an auth account but NOT a teachers row.
--    Approve a user by inserting their row manually:
--      INSERT INTO teachers (id, name, email)
--      VALUES ('<user-uuid-from-auth>', 'Name', 'email@school.edu');
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


-- 2. Add archive support to quizzes
-- ============================================================
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;


-- 3. Add per-question scoring mode (NULL = use the quiz's default)
-- ============================================================
ALTER TABLE questions ADD COLUMN IF NOT EXISTS scoring_mode TEXT;
-- Valid values: 'proportional_no_penalty', 'proportional_with_penalty', 'all_or_nothing', or NULL
