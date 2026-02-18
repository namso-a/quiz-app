export type ScoringMode =
  | 'proportional_no_penalty'
  | 'proportional_with_penalty'
  | 'all_or_nothing'

export interface Teacher {
  id: string
  name: string
  email: string
  created_at: string
}

export interface Quiz {
  id: string
  teacher_id: string
  title: string
  description: string | null
  scoring_mode: ScoringMode
  time_limit_minutes: number | null
  require_name: boolean
  require_email: boolean
  show_answers_after: boolean
  allow_retake: boolean
  opens_at: string | null
  closes_at: string | null
  is_published: boolean
  is_archived: boolean
  share_code: string
  created_at: string
  updated_at: string
  question_count?: number
}

export interface Question {
  id: string
  quiz_id: string
  question_text: string
  points: number
  // null = inherit the quiz's scoring_mode
  scoring_mode: ScoringMode | null
  sort_order: number
  created_at: string
}

export interface AnswerOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  sort_order: number
}

// Stripped version sent to student browser — no is_correct
export interface AnswerOptionPublic {
  id: string
  question_id: string
  option_text: string
  sort_order: number
}

// Public question type: correct_count for selection limit, scoring_mode for UI hints
export interface QuestionPublic {
  id: string
  quiz_id: string
  question_text: string
  points: number
  sort_order: number
  correct_count: number
  scoring_mode: ScoringMode | null  // null = use quiz default
  answer_options: AnswerOptionPublic[]
}

export interface Submission {
  id: string
  quiz_id: string
  student_name: string | null
  student_email: string | null
  total_score: number | null
  max_possible_score: number | null
  started_at: string
  submitted_at: string | null
}

export interface StudentAnswer {
  id: string
  submission_id: string
  question_id: string
  selected_option_id: string
}

// Composite types used in UI
export interface QuestionWithOptions extends Question {
  answer_options: AnswerOption[]
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithOptions[]
}

export interface SubmissionWithAnswers extends Submission {
  student_answers: StudentAnswer[]
}

// Shape sent to the submit API route
export interface SubmitPayload {
  submission_id: string
  answers: { question_id: string; selected_option_ids: string[] }[]
}

// Shape returned from the submit API route (per-question score details)
export interface QuestionScoreResult {
  earned: number
  max: number
  correct_count: number
  total_correct: number
}

export interface SubmitResponse {
  submission_id: string
  total_score: number
  max_possible_score: number
  per_question: Record<string, QuestionScoreResult>
}
