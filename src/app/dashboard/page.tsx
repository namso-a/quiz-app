import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
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

      {!quizzes || quizzes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-4">You haven&apos;t created any quizzes yet.</p>
          <Link
            href="/dashboard/quiz/new"
            className="text-blue-600 font-medium hover:underline"
          >
            Create your first quiz
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {(quizzes as Quiz[]).map(quiz => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuizCard({ quiz }: { quiz: Quiz }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">{quiz.title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            quiz.is_published
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {quiz.is_published ? 'Published' : 'Draft'}
          </span>
        </div>
        {quiz.description && (
          <p className="text-sm text-gray-500 mt-0.5">{quiz.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {quiz.scoring_mode === 'proportional_no_penalty' && 'Proportional (no penalty)'}
          {quiz.scoring_mode === 'proportional_with_penalty' && 'Proportional (with penalty)'}
          {quiz.scoring_mode === 'all_or_nothing' && 'All or nothing'}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <Link
          href={`/dashboard/quiz/${quiz.id}/results`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Results
        </Link>
        <Link
          href={`/dashboard/quiz/${quiz.id}`}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  )
}
