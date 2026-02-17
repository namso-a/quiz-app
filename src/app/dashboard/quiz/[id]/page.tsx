import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuizEditor from '@/components/editor/QuizEditor'
import type { QuizWithQuestions } from '@/types/database'

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`
      *,
      questions(
        *,
        answer_options(*)
      )
    `)
    .eq('id', id)
    .eq('teacher_id', user.id)
    .single()

  if (!quiz) notFound()

  // Sort questions and options by sort_order
  const sortedQuiz: QuizWithQuestions = {
    ...quiz,
    questions: [...quiz.questions]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(q => ({
        ...q,
        answer_options: [...q.answer_options].sort((a, b) => a.sort_order - b.sort_order),
      })),
  }

  return <QuizEditor quiz={sortedQuiz} appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''} />
}
