import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { Quiz, Submission } from '@/types/database'

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/dashboard/quiz/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Edit quiz
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{q.title} — Results</h1>
        </div>
        {subs.length > 0 && (
          <a
            href={`/api/results/${id}/export`}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Export CSV
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Submissions" value={subs.length} />
        <StatCard label="Average score" value={avgScore ?? '—'} />
        <StatCard label="Average %" value={avgPct != null ? `${avgPct}%` : '—'} />
      </div>

      {/* Submissions table */}
      {subs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No submissions yet.</p>
          {q.is_published && (
            <p className="text-sm text-gray-400 mt-2">
              Share the quiz link with students to start collecting responses.
            </p>
          )}
          {!q.is_published && (
            <p className="text-sm text-gray-400 mt-2">
              <Link href={`/dashboard/quiz/${id}`} className="text-blue-600 hover:underline">
                Publish the quiz
              </Link>{' '}
              to make it available to students.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Student</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Score</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">%</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.map(sub => {
                const pct = sub.max_possible_score
                  ? Math.round(((sub.total_score ?? 0) / sub.max_possible_score) * 100)
                  : 0
                return (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{sub.student_name || '(anonymous)'}</div>
                      {sub.student_email && (
                        <div className="text-gray-400 text-xs">{sub.student_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {sub.total_score ?? 0} / {sub.max_possible_score ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
