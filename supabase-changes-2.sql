-- Run this in Supabase → SQL Editor

-- Add allow_retake column (true = students can retake, false = one attempt only)
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS allow_retake BOOLEAN DEFAULT TRUE;
