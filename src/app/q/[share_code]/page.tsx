import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isQuizOpen } from '@/lib/time'
import QuizPlayer from '@/components/quiz/QuizPlayer'
import type { QuestionPublic } from '@/types/database'

export default async function StudentQuizPage({
  params,
}: {
  params: Promise<{ share_code: string }>
}) {
  const { share_code } = await params
  const supabase = await createClient()

  // Fetch the published quiz
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*')
    .eq('share_code', share_code)
    .eq('is_published', true)
    .single()

  if (!quiz) notFound()

  // Check open/close window
  if (!isQuizOpen(quiz)) {
    const now = new Date()
    const isBeforeOpen = quiz.opens_at && new Date(quiz.opens_at) > now
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
          <p className="text-gray-500">
            {isBeforeOpen
              ? `This quiz opens on ${new Date(quiz.opens_at!).toLocaleDateString()}.`
              : 'This quiz has closed.'}
          </p>
        </div>
      </main>
    )
  }

  // Fetch questions and options, stripping is_correct but keeping scoring_mode
  const { data: questions } = await supabase
    .from('questions')
    .select('id, quiz_id, question_text, points, sort_order, scoring_mode, answer_options(id, question_id, option_text, sort_order, is_correct)')
    .eq('quiz_id', quiz.id)
    .order('sort_order')

  const publicQuestions: QuestionPublic[] = (questions ?? []).map(q => {
    const opts = q.answer_options as { id: string; question_id: string; option_text: string; sort_order: number; is_correct: boolean }[]
    const correct_count = opts.filter(o => o.is_correct).length
    return {
      id: q.id,
      quiz_id: q.quiz_id,
      question_text: q.question_text,
      points: q.points as number,
      sort_order: q.sort_order as number,
      correct_count,
      scoring_mode: (q.scoring_mode ?? null) as import('@/types/database').ScoringMode | null,
      answer_options: opts
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(({ id, question_id, option_text, sort_order }) => ({ id, question_id, option_text, sort_order })),
    }
  })

  return (
    <QuizPlayer
      quiz={{
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        scoring_mode: quiz.scoring_mode,
        time_limit_minutes: quiz.time_limit_minutes,
        require_name: quiz.require_name,
        require_email: quiz.require_email,
        share_code: quiz.share_code,
      }}
      questions={publicQuestions}
    />
  )
}
