import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function StudentResultPage({
  params,
}: {
  params: Promise<{ share_code: string; id: string }>
}) {
  const { share_code, id } = await params
  const supabase = await createClient()

  // Verify the quiz exists and is published
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, description, share_code, show_answers_after')
    .eq('share_code', share_code)
    .eq('is_published', true)
    .single()

  if (!quiz) notFound()

  // Fetch the submission
  const { data: submission } = await adminClient
    .from('submissions')
    .select('*')
    .eq('id', id)
    .eq('quiz_id', quiz.id)
    .single()

  if (!submission || !submission.submitted_at) notFound()

  // Fetch student answers
  const { data: studentAnswers } = await adminClient
    .from('student_answers')
    .select('question_id, selected_option_id')
    .eq('submission_id', id)

  // Fetch questions
  const { data: questions } = await adminClient
    .from('questions')
    .select('id, question_text, points, sort_order, answer_options(id, option_text, is_correct, sort_order)')
    .eq('quiz_id', quiz.id)
    .order('sort_order')

  const selectedByQuestion: Record<string, Set<string>> = {}
  for (const sa of (studentAnswers ?? [])) {
    if (!selectedByQuestion[sa.question_id]) selectedByQuestion[sa.question_id] = new Set()
    selectedByQuestion[sa.question_id].add(sa.selected_option_id)
  }

  const pct = submission.max_possible_score
    ? Math.round(((submission.total_score ?? 0) / submission.max_possible_score) * 100)
    : 0

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{quiz.title}</h1>
          {submission.student_name && (
            <p className="text-gray-500 text-sm mb-4">{submission.student_name}</p>
          )}
          <div className="text-5xl font-bold text-blue-600 mb-1">{pct}%</div>
          <p className="text-gray-500">
            {submission.total_score} / {submission.max_possible_score} point
          </p>
        </div>

        {quiz.show_answers_after && questions && (
          <div className="space-y-4">
            {questions.map((q, index) => {
              const selected = selectedByQuestion[q.id] ?? new Set()
              const opts = (q.answer_options as { id: string; option_text: string; is_correct: boolean; sort_order: number }[])
                .sort((a, b) => a.sort_order - b.sort_order)

              return (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="font-medium text-gray-900 mb-3">
                    {index + 1}. {q.question_text}
                  </p>
                  <div className="space-y-2">
                    {opts.map(opt => {
                      const wasSelected = selected.has(opt.id)
                      let style = 'border-gray-200 bg-gray-50 text-gray-500'
                      if (opt.is_correct && wasSelected) style = 'border-green-400 bg-green-50 text-green-800'
                      else if (opt.is_correct && !wasSelected) style = 'border-green-300 bg-green-50 text-green-700'
                      else if (!opt.is_correct && wasSelected) style = 'border-red-300 bg-red-50 text-red-700'

                      return (
                        <div key={opt.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${style}`}>
                          <span className="w-4 text-center">
                            {opt.is_correct ? '✓' : wasSelected ? '✗' : ''}
                          </span>
                          {opt.option_text}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href={`/q/${share_code}`} className="text-sm text-blue-600 hover:underline">
            Tag quizzen igen
          </Link>
        </div>
      </div>
    </main>
  )
}
