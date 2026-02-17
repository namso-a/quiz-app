import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { buildResultsCsv } from '@/lib/csv'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quiz_id: string }> }
) {
  const { quiz_id } = await params

  // 1. Auth check — must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Verify quiz ownership
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, teacher_id')
    .eq('id', quiz_id)
    .eq('teacher_id', user.id)
    .single()

  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 3. Fetch questions
  const { data: questions } = await adminClient
    .from('questions')
    .select('id, question_text, points')
    .eq('quiz_id', quiz_id)
    .order('sort_order')

  // 4. Fetch completed submissions
  const { data: submissions } = await adminClient
    .from('submissions')
    .select('id, student_name, student_email, total_score, max_possible_score')
    .eq('quiz_id', quiz_id)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: true })

  const csv = buildResultsCsv({
    questions: questions ?? [],
    submissions: (submissions ?? []).map(sub => ({
      student_name: sub.student_name,
      student_email: sub.student_email,
      total_score: sub.total_score,
      max_possible_score: sub.max_possible_score,
      per_question_scores: {},
    })),
  })

  const filename = `${quiz.title.replace(/[^a-z0-9]/gi, '-')}-results.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
