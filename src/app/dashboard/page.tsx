import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import QuizList from './QuizList'
import type { Quiz } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: rawQuizzes } = await supabase
    .from('quizzes')
    .select('*, questions(count)')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  const quizzes = (rawQuizzes ?? []).map(q => ({
    ...q,
    question_count: (q.questions as unknown as [{ count: number }])?.[0]?.count ?? 0,
  })) as Quiz[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mine quizzer</h1>
        <Link
          href="/dashboard/quiz/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Ny quiz
        </Link>
      </div>
      <QuizList initialQuizzes={quizzes} />
    </div>
  )
}
