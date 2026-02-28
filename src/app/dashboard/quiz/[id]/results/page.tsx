import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { Quiz, Submission } from '@/types/database'
import ResultsTabs from './ResultsTabs'

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()

  if (!quiz) notFound()

  // Fetch all submitted submissions
  const { data: submissions } = await adminClient
    .from('submissions')
    .select('*')
    .eq('quiz_id', id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  const q = quiz as Quiz
  const subs = (submissions ?? []) as Submission[]

  const avgScore = subs.length > 0
    ? Math.round(subs.reduce((sum, s) => sum + (s.total_score ?? 0), 0) / subs.length * 10) / 10
    : null

  const avgPct = subs.length > 0 && subs[0].max_possible_score
    ? Math.round(subs.reduce((sum, s) => sum + ((s.total_score ?? 0) / (s.max_possible_score ?? 1)), 0) / subs.length * 100)
    : null

  // Fetch aggregate data for the summary tab
  const { data: questions } = await adminClient
    .from('questions')
    .select('id, question_text, sort_order, answer_options(id, option_text, is_correct, sort_order)')
    .eq('quiz_id', id)
    .order('sort_order')

  // Fetch all student_answers for this quiz's submissions
  const submissionIds = subs.map(s => s.id)
  const { data: allAnswers } = submissionIds.length > 0
    ? await adminClient
        .from('student_answers')
        .select('question_id, selected_option_id')
        .in('submission_id', submissionIds)
    : { data: [] }

  // Count selections per option
  const selectionCounts = new Map<string, number>()
  for (const ans of allAnswers ?? []) {
    selectionCounts.set(ans.selected_option_id, (selectionCounts.get(ans.selected_option_id) ?? 0) + 1)
  }

  // Build aggregate questions structure
  const aggregateQuestions = (questions ?? []).map(q => ({
    id: q.id,
    question_text: q.question_text,
    sort_order: q.sort_order as number,
    options: (q.answer_options as { id: string; option_text: string; is_correct: boolean; sort_order: number }[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(o => ({
        id: o.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        count: selectionCounts.get(o.id) ?? 0,
      })),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/dashboard/quiz/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Rediger quiz
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{q.title} — Resultater</h1>
        </div>
        {subs.length > 0 && (
          <a
            href={`/api/results/${id}/export`}
            className="text-sm bg-brand text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-dark transition-colors"
          >
            Eksporter CSV
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Besvarelser" value={subs.length} />
        <StatCard label="Gennemsnitlig score" value={avgScore ?? '—'} />
        <StatCard label="Gennemsnit %" value={avgPct != null ? `${avgPct}%` : '—'} />
      </div>

      {subs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">Ingen besvarelser endnu.</p>
          {q.is_published && (
            <p className="text-sm text-gray-400 mt-2">
              Del quizlinket med eleverne for at begynde at indsamle besvarelser.
            </p>
          )}
          {!q.is_published && (
            <p className="text-sm text-gray-400 mt-2">
              <Link href={`/dashboard/quiz/${id}`} className="text-blue-600 hover:underline">
                Udgiv quizzen
              </Link>{' '}
              for at gøre den tilgængelig for elever.
            </p>
          )}
        </div>
      ) : (
        <ResultsTabs
          submissions={subs}
          aggregateQuestions={aggregateQuestions}
          quizId={id}
        />
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
