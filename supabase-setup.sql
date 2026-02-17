-- ============================================================
-- Quiz App — Supabase Database Setup
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Teachers (extends Supabase Auth)
CREATE TABLE teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  title TEXT NOT NULL,
  description TEXT,
  scoring_mode TEXT NOT NULL DEFAULT 'proportional_no_penalty',
    -- 'proportional_no_penalty' | 'proportional_with_penalty' | 'all_or_nothing'
  time_limit_minutes INTEGER,
  require_name BOOLEAN DEFAULT TRUE,
  require_email BOOLEAN DEFAULT FALSE,
  show_answers_after BOOLEAN DEFAULT TRUE,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT FALSE,
  share_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  points NUMERIC(5,2) NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Answer Options
CREATE TABLE answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Submissions (one per student per quiz)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id),
  student_name TEXT,
  student_email TEXT,
  total_score NUMERIC(7,2),
  max_possible_score NUMERIC(7,2),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  UNIQUE(quiz_id, student_email)
);

-- Student Answers
CREATE TABLE student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  selected_option_id UUID NOT NULL REFERENCES answer_options(id),
  UNIQUE(submission_id, selected_option_id)
);

-- ============================================================
-- Auto-update updated_at on quizzes
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;

-- TEACHERS
CREATE POLICY "teachers_select_own" ON teachers FOR SELECT USING (id = auth.uid());
CREATE POLICY "teachers_insert_own" ON teachers FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "teachers_update_own" ON teachers FOR UPDATE USING (id = auth.uid());

-- QUIZZES
CREATE POLICY "quizzes_teacher_all" ON quizzes FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "quizzes_public_read" ON quizzes FOR SELECT USING (is_published = TRUE);

-- QUESTIONS
CREATE POLICY "questions_teacher_all" ON questions FOR ALL USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.teacher_id = auth.uid())
);
CREATE POLICY "questions_public_read" ON questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.is_published = TRUE)
);

-- ANSWER OPTIONS
CREATE POLICY "answer_options_teacher_all" ON answer_options FOR ALL USING (
  EXISTS (
    SELECT 1 FROM questions
    JOIN quizzes ON quizzes.id = questions.quiz_id
    WHERE questions.id = answer_options.question_id AND quizzes.teacher_id = auth.uid()
  )
);
CREATE POLICY "answer_options_public_read" ON answer_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM questions
    JOIN quizzes ON quizzes.id = questions.quiz_id
    WHERE questions.id = answer_options.question_id AND quizzes.is_published = TRUE
  )
);

-- SUBMISSIONS
CREATE POLICY "submissions_teacher_read" ON submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = submissions.quiz_id AND quizzes.teacher_id = auth.uid())
);
CREATE POLICY "submissions_insert_anon" ON submissions FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "submissions_select_own" ON submissions FOR SELECT USING (TRUE);

-- STUDENT ANSWERS
CREATE POLICY "student_answers_teacher_read" ON student_answers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM submissions
    JOIN quizzes ON quizzes.id = submissions.quiz_id
    WHERE submissions.id = student_answers.submission_id AND quizzes.teacher_id = auth.uid()
  )
);
CREATE POLICY "student_answers_insert_anon" ON student_answers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "student_answers_select_own" ON student_answers FOR SELECT USING (TRUE);
