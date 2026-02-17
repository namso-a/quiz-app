import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateUniqueShareCode } from '@/lib/share-code'

export default async function NewQuizPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const share_code = await generateUniqueShareCode(async (code) => {
    const { data } = await supabase
      .from('quizzes')
      .select('id')
      .eq('share_code', code)
      .single()
    return !!data
  })

  const { data: quiz } = await supabase
    .from('quizzes')
    .insert({
      teacher_id: user.id,
      title: 'Untitled Quiz',
      scoring_mode: 'proportional_no_penalty',
      share_code,
    })
    .select()
    .single()

  if (!quiz) redirect('/dashboard')

  redirect(`/dashboard/quiz/${quiz.id}`)
}
