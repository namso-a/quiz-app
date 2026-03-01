-- Add quiz collaborators table so teachers can share quizzes with colleagues
CREATE TABLE IF NOT EXISTS quiz_collaborators (
  quiz_id    UUID NOT NULL REFERENCES quizzes(id)  ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (quiz_id, teacher_id)
);
