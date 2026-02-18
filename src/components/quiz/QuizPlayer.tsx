'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { QuestionPublic, ScoringMode } from '@/types/database'
import CountdownTimer from './CountdownTimer'

interface QuizMeta {
  id: string
  title: string
  description: string | null
  scoring_mode: ScoringMode
  time_limit_minutes: number | null
  require_name: boolean
  require_email: boolean
  share_code: string
}

interface Props {
  quiz: QuizMeta
  questions: QuestionPublic[]
}

type Phase = 'info' | 'quiz' | 'submitting'

export default function QuizPlayer({ quiz, questions }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>(
    quiz.require_name || quiz.require_email ? 'info' : 'quiz'
  )
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, Set<string>>>({})
  const [error, setError] = useState<string | null>(null)

  async function startQuiz() {
    setError(null)
    const { data, error: err } = await supabase
      .from('submissions')
      .insert({
        quiz_id: quiz.id,
        student_name: studentName || null,
        student_email: studentEmail || null,
      })
      .select()
      .single()

    if (err || !data) {
      setError('Failed to start quiz. Please try again.')
      return
    }

    setSubmissionId(data.id)
    setStartedAt(data.started_at)
    setPhase('quiz')
  }

  function toggleAnswer(questionId: string, optionId: string, correctCount: number, scoringMode: ScoringMode) {
    setAnswers(prev => {
      const current = new Set(prev[questionId] ?? [])
      if (current.has(optionId)) {
        current.delete(optionId)
      } else {
        // Enforce selection limit for proportional_no_penalty
        if (scoringMode === 'proportional_no_penalty' && current.size >= correctCount) {
          // Remove oldest selection and add new one
          const first = Array.from(current)[0]
          current.delete(first)
        }
        current.add(optionId)
      }
      return { ...prev, [questionId]: current }
    })
  }

  async function submitQuiz() {
    if (!submissionId) return
    setPhase('submitting')

    const payload = {
      submission_id: submissionId,
      answers: questions.map(q => ({
        question_id: q.id,
        selected_option_ids: Array.from(answers[q.id] ?? []),
      })),
    }

    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      setError('Submission failed. Please try again.')
      setPhase('quiz')
      return
    }

    router.push(`/q/${quiz.share_code}/result/${submissionId}`)
  }

  // Info collection phase
  if (phase === 'info') {
    const needsName = quiz.require_name
    const needsEmail = quiz.require_email
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{quiz.title}</h1>
          {quiz.description && <p className="text-gray-500 text-sm mb-6">{quiz.description}</p>}
          <div className="space-y-4">
            {needsName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {needsEmail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={e => setStudentEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={startQuiz}
              disabled={(needsName && !studentName) || (needsEmail && !studentEmail)}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Start quiz
            </button>
          </div>
        </div>
      </main>
    )
  }

  // Quiz taking phase
  if (phase === 'quiz') {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
            {quiz.time_limit_minutes && startedAt && (
              <CountdownTimer
                startedAt={startedAt}
                timeLimitMinutes={quiz.time_limit_minutes}
                onExpire={submitQuiz}
              />
            )}
          </div>

          <div className="space-y-6">
            {questions.map((q, index) => {
              const selected = answers[q.id] ?? new Set()
              return (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex justify-between items-start mb-3">
                    <p className="font-medium text-gray-900">
                      {index + 1}. {q.question_text}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0 ml-4">{q.points} pts</span>
                  </div>

                  {/* Effective scoring mode: question override or quiz default */}
                  {(() => {
                    const effectiveMode = q.scoring_mode ?? quiz.scoring_mode
                    return effectiveMode === 'proportional_no_penalty' && q.correct_count > 1 ? (
                      <p className="text-xs text-blue-600 mb-2">
                        Select up to {q.correct_count} answer{q.correct_count > 1 ? 's' : ''}
                      </p>
                    ) : null
                  })()}

                  <div className="space-y-2">
                    {q.answer_options.map(opt => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selected.has(opt.id)
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(opt.id)}
                          onChange={() => toggleAnswer(q.id, opt.id, q.correct_count, q.scoring_mode ?? quiz.scoring_mode)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{opt.option_text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <button
            onClick={submitQuiz}
            className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Submit quiz
          </button>
        </div>
      </main>
    )
  }

  // Submitting phase
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Submitting your answers…</p>
    </main>
  )
}
