-- Add question_type column to support single-answer (radio) questions
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(10) DEFAULT 'multiple'
  CHECK (question_type IN ('single', 'multiple'));
