import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import QuizList from './QuizList'
import type { Quiz } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Owned quizzes
  const { data: rawQuizzes } = await supabase
    .from('quizzes')
    .select('*, questions(count)')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  const quizzes = (rawQuizzes ?? []).map(q => ({
    ...q,
    question_count: (q.questions as unknown as [{ count: number }])?.[0]?.count ?? 0,
  })) as Quiz[]

  // Shared quizzes (collaborator)
  const { data: collabRows } = await adminClient
    .from('quiz_collaborators')
    .select('quiz_id')
    .eq('teacher_id', user.id)

  const sharedIds = (collabRows ?? []).map(c => c.quiz_id as string)

  const sharedQuizzes: Quiz[] = []
  if (sharedIds.length > 0) {
    const { data: rawShared } = await adminClient
      .from('quizzes')
      .select('*, questions(count)')
      .in('id', sharedIds)
      .order('created_at', { ascending: false })

    sharedQuizzes.push(
      ...(rawShared ?? []).map(q => ({
        ...q,
        question_count: (q.questions as unknown as [{ count: number }])?.[0]?.count ?? 0,
      })) as Quiz[]
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mine quizzer</h1>
        <Link
          href="/dashboard/quiz/new"
          className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
        >
          + Ny quiz
        </Link>
      </div>

      <QuizList initialQuizzes={quizzes} />

      {sharedQuizzes.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Delt med mig</h2>
          <div className="space-y-3">
            {sharedQuizzes.map(quiz => (
              <div
                key={quiz.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">{quiz.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {quiz.question_count} spørgsmål
                    {quiz.is_published
                      ? ' · Udgivet'
                      : quiz.is_archived
                      ? ' · Arkiveret'
                      : ' · Kladde'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/quiz/${quiz.id}/results`}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Resultater
                  </Link>
                  <Link
                    href={`/dashboard/quiz/${quiz.id}`}
                    className="text-sm font-medium text-brand hover:text-brand-dark transition-colors"
                  >
                    Rediger
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
