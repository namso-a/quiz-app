import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import QuizList from './QuizList'
import type { Quiz } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Quizzes</h1>
        <Link
          href="/dashboard/quiz/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + New Quiz
        </Link>
      </div>
      <QuizList initialQuizzes={(quizzes ?? []) as Quiz[]} />
    </div>
  )
}
