import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { scoreSubmission } from '@/lib/scoring'
import { isTimeLimitExceeded } from '@/lib/time'
import type { SubmitPayload, ScoringMode } from '@/types/database'

export async function POST(request: NextRequest) {
  let body: SubmitPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { submission_id, answers } = body

  if (!submission_id || !Array.isArray(answers)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Fetch submission with quiz details
  const { data: submission, error: subError } = await adminClient
    .from('submissions')
    .select('*, quizzes(scoring_mode, time_limit_minutes, opens_at, closes_at)')
    .eq('id', submission_id)
    .single()

  if (subError || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // 2. Reject if already submitted
  if (submission.submitted_at) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  // 3. Server-side time limit check (we still score it but note the violation)
  const quiz = submission.quizzes as {
    scoring_mode: ScoringMode
    time_limit_minutes: number | null
    opens_at: string | null
    closes_at: string | null
  }

  if (quiz.time_limit_minutes && isTimeLimitExceeded(submission.started_at, quiz.time_limit_minutes)) {
    // Score anyway — client-side timer already forced submission, server records the time
    console.warn(`Submission ${submission_id} exceeded time limit`)
  }

  // 4. Fetch all questions + correct answers using admin client (bypasses RLS)
  // Also fetch scoring_mode per question — null means use quiz default
  const { data: questions, error: qError } = await adminClient
    .from('questions')
    .select('id, points, scoring_mode, answer_options(id, is_correct)')
    .eq('quiz_id', submission.quiz_id)

  if (qError || !questions) {
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
  }

  // 5. Run scoring — per-question scoring_mode overrides quiz default when set
  const scoringInput = questions.map(q => ({
    id: q.id,
    points: q.points as number,
    scoring_mode: (q.scoring_mode ?? quiz.scoring_mode) as ScoringMode,
    all_options: q.answer_options as { id: string; is_correct: boolean }[],
  }))

  const { total_score, max_possible_score, per_question } = scoreSubmission(scoringInput, answers)

  // 6. Update submission with scores and submitted_at timestamp
  const { error: updateError } = await adminClient
    .from('submissions')
    .update({
      total_score,
      max_possible_score,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', submission_id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }

  // 7. Insert student_answers rows
  const answerRows = answers.flatMap(a =>
    a.selected_option_ids.map(option_id => ({
      submission_id,
      question_id: a.question_id,
      selected_option_id: option_id,
    }))
  )

  if (answerRows.length > 0) {
    const { error: answerError } = await adminClient
      .from('student_answers')
      .insert(answerRows)

    if (answerError) {
      console.error('Failed to save student answers:', answerError)
      // Don't fail the request — score is already saved
    }
  }

  return NextResponse.json({ submission_id, total_score, max_possible_score, per_question })
}
