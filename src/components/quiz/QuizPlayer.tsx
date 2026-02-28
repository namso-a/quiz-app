'use client'

import { useState, useEffect } from 'react'
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

interface SavedSession {
  submissionId: string
  startedAt: string
  studentName: string
  studentEmail: string
  answers: Record<string, string[]>
}

function loadSession(shareCode: string): SavedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`quiz_session_${shareCode}`)
    return raw ? (JSON.parse(raw) as SavedSession) : null
  } catch {
    return null
  }
}

export default function QuizPlayer({ quiz, questions }: Props) {
  const supabase = createClient()
  const router = useRouter()

  // Restore session from localStorage on first render (synchronous lazy init)
  const [saved] = useState<SavedSession | null>(() => loadSession(quiz.share_code))

  const [phase, setPhase] = useState<Phase>(() => {
    if (saved) return 'quiz'
    return quiz.require_name || quiz.require_email ? 'info' : 'quiz'
  })
  const [studentName, setStudentName] = useState(saved?.studentName ?? '')
  const [studentEmail, setStudentEmail] = useState(saved?.studentEmail ?? '')
  const [submissionId, setSubmissionId] = useState<string | null>(saved?.submissionId ?? null)
  const [startedAt, setStartedAt] = useState<string | null>(saved?.startedAt ?? null)
  const [answers, setAnswers] = useState<Record<string, Set<string>>>(() => {
    if (!saved) return {}
    return Object.fromEntries(
      Object.entries(saved.answers).map(([k, v]) => [k, new Set(v)])
    )
  })
  const [error, setError] = useState<string | null>(null)

  // Persist session to localStorage on every answer change
  useEffect(() => {
    if (phase !== 'quiz' || !submissionId) return
    try {
      const session: SavedSession = {
        submissionId,
        startedAt: startedAt ?? '',
        studentName,
        studentEmail,
        answers: Object.fromEntries(
          Object.entries(answers).map(([k, v]) => [k, Array.from(v)])
        ),
      }
      localStorage.setItem(`quiz_session_${quiz.share_code}`, JSON.stringify(session))
    } catch {
      // Ignore storage quota errors
    }
  }, [answers, phase, submissionId])

  function clearSession() {
    try { localStorage.removeItem(`quiz_session_${quiz.share_code}`) } catch { /* ignore */ }
  }

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
      setError('Kunne ikke starte quizzen. Prøv igen.')
      return
    }

    setSubmissionId(data.id)
    setStartedAt(data.started_at)
    setPhase('quiz')
  }

  function toggleAnswer(questionId: string, optionId: string, questionType: 'single' | 'multiple') {
    setAnswers(prev => {
      if (questionType === 'single') {
        const current = prev[questionId]
        if (current?.has(optionId) && current.size === 1) {
          return { ...prev, [questionId]: new Set() }
        }
        return { ...prev, [questionId]: new Set([optionId]) }
      }
      const current = new Set(prev[questionId] ?? [])
      if (current.has(optionId)) {
        current.delete(optionId)
      } else {
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
      setError('Indsendelse mislykkedes. Prøv igen.')
      setPhase('quiz')
      return
    }

    clearSession()
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
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
              className="w-full bg-brand text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    const answeredCount = questions.filter(q => (answers[q.id]?.size ?? 0) > 0).length
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
            {quiz.time_limit_minutes && startedAt && (
              <CountdownTimer
                startedAt={startedAt}
                timeLimitMinutes={quiz.time_limit_minutes}
                onExpire={submitQuiz}
              />
            )}
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-brand h-1.5 rounded-full transition-all"
                style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {answeredCount} / {questions.length} besvaret
            </span>
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

                  <div className="space-y-2">
                    {q.answer_options.map(opt => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selected.has(opt.id)
                            ? 'border-brand bg-brand/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type={q.question_type === 'single' ? 'radio' : 'checkbox'}
                          name={q.question_type === 'single' ? `q-${q.id}` : undefined}
                          checked={selected.has(opt.id)}
                          onChange={() => toggleAnswer(q.id, opt.id, q.question_type)}
                          className={q.question_type === 'single' ? 'accent-brand' : 'rounded text-blue-600'}
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
            className="mt-8 w-full bg-brand text-white py-3 rounded-xl text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            Indsend quiz
          </button>
        </div>
      </main>
    )
  }

  // Submitting phase
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Indsender dine svar…</p>
    </main>
  )
}
