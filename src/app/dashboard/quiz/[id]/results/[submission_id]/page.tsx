import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { scoreQuestion } from '@/lib/scoring'
import Link from 'next/link'
import type { ScoringMode } from '@/types/database'

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; submission_id: string }>
}) {
  const { id: quizId, submission_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Verify quiz ownership
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, scoring_mode, teacher_id')
    .eq('id', quizId)
    .eq('teacher_id', user.id)
    .single()

  if (!quiz) notFound()

  // Fetch submission
  const { data: submission } = await adminClient
    .from('submissions')
    .select('*')
    .eq('id', submission_id)
    .eq('quiz_id', quizId)
    .not('submitted_at', 'is', null)
    .single()

  if (!submission) notFound()

  // Fetch questions with all answer options (including is_correct)
  const { data: questions } = await adminClient
    .from('questions')
    .select('id, question_text, points, sort_order, scoring_mode, question_type, answer_options(id, option_text, is_correct, sort_order)')
    .eq('quiz_id', quizId)
    .order('sort_order')

  // Fetch student's selected answers for this submission
  const { data: studentAnswers } = await adminClient
    .from('student_answers')
    .select('question_id, selected_option_id')
    .eq('submission_id', submission_id)

  const selectedByQuestion = new Map<string, Set<string>>()
  for (const sa of studentAnswers ?? []) {
    if (!selectedByQuestion.has(sa.question_id)) selectedByQuestion.set(sa.question_id, new Set())
    selectedByQuestion.get(sa.question_id)!.add(sa.selected_option_id)
  }

  const pct = submission.max_possible_score
    ? Math.round(((submission.total_score ?? 0) / submission.max_possible_score) * 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/quiz/${quizId}/results`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Tilbage til resultater
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{quiz.title}</h1>
        <div className="flex items-center gap-4 mt-2">
          <span className="font-medium text-gray-800">
            {submission.student_name || '(anonym)'}
          </span>
          {submission.student_email && (
            <span className="text-sm text-gray-400">{submission.student_email}</span>
          )}
          {submission.submitted_at && (
            <span className="text-xs text-gray-400">
              {new Date(submission.submitted_at).toLocaleDateString('da-DK', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* Score summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex items-center gap-6">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Score</p>
          <p className="text-3xl font-bold text-brand">{pct}%</p>
        </div>
        <div className="h-10 border-l border-gray-200" />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Point</p>
          <p className="text-lg font-semibold text-gray-800">
            {submission.total_score ?? 0} / {submission.max_possible_score ?? 0}
          </p>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="space-y-4">
        {(questions ?? []).map((q, index) => {
          const opts = (q.answer_options as { id: string; option_text: string; is_correct: boolean; sort_order: number }[])
            .sort((a, b) => a.sort_order - b.sort_order)
          const selected = selectedByQuestion.get(q.id) ?? new Set()
          const effectiveMode = (q.scoring_mode ?? quiz.scoring_mode) as ScoringMode

          const result = scoreQuestion({
            points: q.points as number,
            scoring_mode: effectiveMode,
            all_options: opts,
            selected_option_ids: Array.from(selected),
          })

          return (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="font-medium text-gray-900 text-sm">
                  {index + 1}. {q.question_text}
                </p>
                <span className={`text-sm font-semibold shrink-0 ml-4 ${
                  result.earned === result.max
                    ? 'text-green-600'
                    : result.earned > 0
                    ? 'text-yellow-600'
                    : 'text-red-500'
                }`}>
                  {result.earned} / {result.max} pt
                </span>
              </div>

              <div className="space-y-1.5">
                {opts.map(opt => {
                  const wasSelected = selected.has(opt.id)
                  const isCorrect = opt.is_correct

                  let icon = ''
                  let className = 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border '

                  if (wasSelected && isCorrect) {
                    icon = '✓'
                    className += 'bg-green-50 border-green-300 text-green-800'
                  } else if (wasSelected && !isCorrect) {
                    icon = '✗'
                    className += 'bg-red-50 border-red-300 text-red-700'
                  } else if (!wasSelected && isCorrect) {
                    icon = '✓'
                    className += 'bg-green-50 border-green-200 text-green-700 opacity-60'
                  } else {
                    icon = ''
                    className += 'border-gray-100 text-gray-500'
                  }

                  return (
                    <div key={opt.id} className={className}>
                      <span className="w-4 text-center font-medium shrink-0">{icon}</span>
                      <span>{opt.option_text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
