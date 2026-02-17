import type { ScoringMode, AnswerOption } from '@/types/database'

export interface QuestionScoringInput {
  points: number
  scoring_mode: ScoringMode
  all_options: Pick<AnswerOption, 'id' | 'is_correct'>[]
  selected_option_ids: string[]
}

export interface QuestionScoringResult {
  earned: number
  max: number
  correct_count: number
  total_correct: number
}

export function scoreQuestion(input: QuestionScoringInput): QuestionScoringResult {
  const { points, scoring_mode, all_options, selected_option_ids } = input
  const selectedSet = new Set(selected_option_ids)

  const correct_options = all_options.filter(o => o.is_correct)
  const N = correct_options.length

  if (N === 0) {
    return { earned: points, max: points, correct_count: 0, total_correct: 0 }
  }

  const correct_selected = correct_options.filter(o => selectedSet.has(o.id)).length
  const wrong_selected = all_options.filter(o => !o.is_correct && selectedSet.has(o.id)).length

  let earned = 0

  if (scoring_mode === 'proportional_no_penalty') {
    earned = (correct_selected / N) * points

  } else if (scoring_mode === 'proportional_with_penalty') {
    earned = Math.max(0, ((correct_selected - wrong_selected) / N) * points)

  } else if (scoring_mode === 'all_or_nothing') {
    const selected_all_correct = correct_selected === N
    const selected_no_wrong = wrong_selected === 0
    earned = (selected_all_correct && selected_no_wrong) ? points : 0
  }

  earned = Math.round(earned * 100) / 100

  return { earned, max: points, correct_count: correct_selected, total_correct: N }
}

export function scoreSubmission(
  questions: Array<{
    id: string
    points: number
    scoring_mode: ScoringMode
    all_options: Pick<AnswerOption, 'id' | 'is_correct'>[]
  }>,
  answers: Array<{ question_id: string; selected_option_ids: string[] }>
): { total_score: number; max_possible_score: number; per_question: Record<string, QuestionScoringResult> } {
  const answerMap = new Map(answers.map(a => [a.question_id, a.selected_option_ids]))

  let total_score = 0
  let max_possible_score = 0
  const per_question: Record<string, QuestionScoringResult> = {}

  for (const q of questions) {
    const selected_option_ids = answerMap.get(q.id) ?? []
    const result = scoreQuestion({
      points: q.points,
      scoring_mode: q.scoring_mode,
      all_options: q.all_options,
      selected_option_ids,
    })
    total_score += result.earned
    max_possible_score += result.max
    per_question[q.id] = result
  }

  return {
    total_score: Math.round(total_score * 100) / 100,
    max_possible_score: Math.round(max_possible_score * 100) / 100,
    per_question,
  }
}
