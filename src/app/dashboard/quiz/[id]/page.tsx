import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import QuizEditor from '@/components/editor/QuizEditor'
import type { QuizWithQuestions } from '@/types/database'

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Fetch quiz without teacher filter (we check access below)
  const { data: quiz } = await supabase
    .from('quizzes')
    .select(`*, questions(*, answer_options(*))`)
    .eq('id', id)
    .single()

  if (!quiz) notFound()

  const isOwner = quiz.teacher_id === user.id

  if (!isOwner) {
    const { data: collab } = await adminClient
      .from('quiz_collaborators')
      .select('teacher_id')
      .eq('quiz_id', id)
      .eq('teacher_id', user.id)
      .single()
    if (!collab) notFound()
  }

  // Fetch current collaborators with teacher info
  const { data: collabData } = await adminClient
    .from('quiz_collaborators')
    .select('teacher_id, teachers(name, email)')
    .eq('quiz_id', id)

  const collaborators = (collabData ?? []).map(c => {
    const t = (c.teachers as unknown as { name: string; email: string } | null)
    return {
      teacher_id: c.teacher_id as string,
      name: t?.name ?? '',
      email: t?.email ?? '',
    }
  })

  const sortedQuiz: QuizWithQuestions = {
    ...quiz,
    questions: [...quiz.questions]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(q => ({
        ...q,
        answer_options: [...q.answer_options].sort((a, b) => a.sort_order - b.sort_order),
      })),
  }

  return (
    <QuizEditor
      quiz={sortedQuiz}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
      collaborators={collaborators}
      isOwner={isOwner}
    />
  )
}
