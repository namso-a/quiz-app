'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { debounce } from '@/lib/debounce'
import type { QuizWithQuestions, QuestionWithOptions, AnswerOption, ScoringMode, QuestionType } from '@/types/database'
import Link from 'next/link'

interface Collaborator {
  teacher_id: string
  name: string
  email: string
}

interface Props {
  quiz: QuizWithQuestions
  appUrl: string
  collaborators: Collaborator[]
  isOwner: boolean
}

export default function QuizEditor({ quiz: initialQuiz, appUrl, collaborators, isOwner }: Props) {
  const supabase = createClient()
  const [quiz, setQuiz] = useState(initialQuiz)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : appUrl}/q/${quiz.share_code}`
  const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points ?? 0), 0)

  // Debounced quiz patch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const saveQuiz = useCallback(
    debounce(async (patch: Partial<QuizWithQuestions>) => {
      setSaving(true)
      await supabase.from('quizzes').update(patch).eq('id', quiz.id)
      setSaving(false)
    }, 600),
    [supabase, quiz.id]
  )

  function updateQuiz(patch: Partial<QuizWithQuestions>) {
    setQuiz(prev => ({ ...prev, ...patch }))
    saveQuiz(patch)
  }

  async function togglePublish() {
    const next = !quiz.is_published
    setQuiz(prev => ({ ...prev, is_published: next }))
    await supabase.from('quizzes').update({ is_published: next }).eq('id', quiz.id)
  }

  async function addQuestion() {
    const sort_order = quiz.questions.length
    const { data: q } = await supabase
      .from('questions')
      .insert({ quiz_id: quiz.id, question_text: '', points: 1, sort_order })
      .select()
      .single()
    if (!q) return

    const { data: opt } = await supabase
      .from('answer_options')
      .insert({ question_id: q.id, option_text: '', is_correct: false, sort_order: 0 })
      .select()
      .single()

    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { ...q, answer_options: opt ? [opt] : [] }],
    }))
  }

  async function deleteQuestion(questionId: string) {
    await supabase.from('questions').delete().eq('id', questionId)
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId),
    }))
  }

  async function updateQuestion(questionId: string, patch: Partial<QuestionWithOptions>) {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q => q.id === questionId ? { ...q, ...patch } : q),
    }))
    await supabase.from('questions').update(patch).eq('id', questionId)
  }

  async function addOption(questionId: string) {
    const question = quiz.questions.find(q => q.id === questionId)
    if (!question) return
    const sort_order = question.answer_options.length
    const { data: opt } = await supabase
      .from('answer_options')
      .insert({ question_id: questionId, option_text: '', is_correct: false, sort_order })
      .select()
      .single()
    if (!opt) return
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, answer_options: [...q.answer_options, opt] } : q
      ),
    }))
  }

  async function deleteOption(questionId: string, optionId: string) {
    await supabase.from('answer_options').delete().eq('id', optionId)
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? { ...q, answer_options: q.answer_options.filter(o => o.id !== optionId) }
          : q
      ),
    }))
  }

  async function updateOption(questionId: string, optionId: string, patch: Partial<AnswerOption>) {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? { ...q, answer_options: q.answer_options.map(o => o.id === optionId ? { ...o, ...patch } : o) }
          : q
      ),
    }))
    await supabase.from('answer_options').update(patch).eq('id', optionId)
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3">
          {quiz.questions.length > 0 && (
            <span className="text-xs text-gray-400">
              {quiz.questions.length} spørgsmål · {totalPoints} point i alt
            </span>
          )}
          {saving && <span className="text-xs text-gray-400">Gemmer…</span>}
          <button
            onClick={togglePublish}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              quiz.is_published
                ? 'bg-brand/10 text-brand-dark hover:bg-brand/20'
                : 'bg-brand text-white hover:bg-brand-dark'
            }`}
          >
            {quiz.is_published ? 'Udgivet' : 'Udgiv'}
          </button>
        </div>
      </div>

      {/* Share link (when published) */}
      {quiz.is_published && (
        <div className="mb-6 flex items-center gap-2 bg-brand/5 border border-brand/20 rounded-lg px-4 py-3">
          <span className="text-sm text-brand-dark flex-1 truncate">{shareUrl}</span>
          <button
            onClick={copyLink}
            className="text-xs font-medium text-brand-dark hover:text-brand shrink-0"
          >
            {copied ? 'Kopieret!' : 'Kopiér link'}
          </button>
        </div>
      )}

      {/* Quiz title */}
      <input
        value={quiz.title}
        onChange={e => updateQuiz({ title: e.target.value })}
        placeholder="Quizzens titel"
        className="w-full text-2xl font-bold text-gray-900 bg-transparent border-0 border-b-2 border-transparent focus:border-blue-500 focus:outline-none pb-1 mb-2"
      />
      <textarea
        value={quiz.description ?? ''}
        onChange={e => updateQuiz({ description: e.target.value || null })}
        placeholder="Beskrivelse (valgfri)"
        rows={2}
        className="w-full text-sm text-gray-500 bg-transparent border-0 focus:outline-none resize-none mb-6"
      />

      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Standardbedømmelse</label>
          <select
            value={quiz.scoring_mode}
            onChange={e => updateQuiz({ scoring_mode: e.target.value as ScoringMode })}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="proportional_no_penalty">Delvis point – ingen straf</option>
            <option value="proportional_with_penalty">Delvis point – straf for fejl</option>
            <option value="all_or_nothing">Alt eller intet</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Kan tilpasses per spørgsmål nedenfor</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tidsbegrænsning (minutter)</label>
          <input
            type="number"
            min={1}
            value={quiz.time_limit_minutes ?? ''}
            onChange={e => updateQuiz({ time_limit_minutes: e.target.value ? Number(e.target.value) : null })}
            placeholder="Ingen begrænsning"
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="require_name"
            checked={quiz.require_name}
            onChange={e => updateQuiz({ require_name: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="require_name" className="text-sm text-gray-700">Kræv navn</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="require_email"
            checked={quiz.require_email}
            onChange={e => updateQuiz({ require_email: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="require_email" className="text-sm text-gray-700">Kræv e-mail</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show_answers_after"
            checked={quiz.show_answers_after}
            onChange={e => updateQuiz({ show_answers_after: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="show_answers_after" className="text-sm text-gray-700">Vis score og svar efter indsendelse</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="allow_retake"
            checked={quiz.allow_retake}
            onChange={e => updateQuiz({ allow_retake: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="allow_retake" className="text-sm text-gray-700">Tillad gentagelse</label>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {quiz.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            onUpdate={patch => updateQuestion(question.id, patch)}
            onDelete={() => deleteQuestion(question.id)}
            onAddOption={() => addOption(question.id)}
            onDeleteOption={optId => deleteOption(question.id, optId)}
            onUpdateOption={(optId, patch) => updateOption(question.id, optId, patch)}
          />
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Tilføj spørgsmål
      </button>

      <CollaboratorSection quizId={quiz.id} isOwner={isOwner} initialCollaborators={collaborators} />
    </div>
  )
}

interface QuestionCardProps {
  question: QuestionWithOptions
  index: number
  onUpdate: (patch: Partial<QuestionWithOptions>) => void
  onDelete: () => void
  onAddOption: () => void
  onDeleteOption: (optId: string) => void
  onUpdateOption: (optId: string, patch: Partial<AnswerOption>) => void
}

function QuestionCard({ question, index, onUpdate, onDelete, onAddOption, onDeleteOption, onUpdateOption }: QuestionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-sm font-medium text-gray-400 mt-2.5 shrink-0">Q{index + 1}</span>
        <textarea
          value={question.question_text}
          onChange={e => onUpdate({ question_text: e.target.value })}
          placeholder="Spørgsmålstekst"
          rows={2}
          className="flex-1 text-sm text-gray-900 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={question.points}
            onChange={e => onUpdate({ points: Number(e.target.value) })}
            className="w-16 text-sm text-center border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">pts</span>
          {confirmDelete ? (
            <>
              <button onClick={onDelete} className="text-xs text-red-600 font-medium px-2">Bekræft</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 px-1">Annuller</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Per-question controls: type + scoring mode */}
      <div className="ml-7 mb-3 flex items-center gap-2 flex-wrap">
        <select
          value={question.question_type ?? 'multiple'}
          onChange={e => {
            const qt = e.target.value as QuestionType
            const patch: Partial<QuestionWithOptions> = { question_type: qt }
            // When switching to single, ensure at most one correct answer
            if (qt === 'single') {
              const firstCorrect = question.answer_options.find(o => o.is_correct)
              if (firstCorrect) {
                question.answer_options.forEach(o => {
                  if (o.is_correct && o.id !== firstCorrect.id) onUpdateOption(o.id, { is_correct: false })
                })
              }
            }
            onUpdate(patch)
          }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-500"
        >
          <option value="multiple">Flere svar</option>
          <option value="single">Enkelt svar</option>
        </select>
        <select
          value={question.scoring_mode ?? ''}
          onChange={e => onUpdate({ scoring_mode: (e.target.value as ScoringMode) || null })}
          className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${
            question.scoring_mode ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-400'
          }`}
        >
          <option value="">Bedømmelse: quiz-standard</option>
          <option value="proportional_no_penalty">Delvis point – ingen straf</option>
          <option value="proportional_with_penalty">Delvis point – straf for fejl</option>
          <option value="all_or_nothing">Alt eller intet</option>
        </select>
      </div>

      <div className="space-y-2 ml-7">
        {question.answer_options.map(option => (
          <div key={option.id} className="flex items-center gap-2">
            <input
              type={question.question_type === 'single' ? 'radio' : 'checkbox'}
              name={question.question_type === 'single' ? `editor-q-${question.id}` : undefined}
              checked={option.is_correct}
              onChange={e => {
                if (question.question_type === 'single' && e.target.checked) {
                  // Unmark all others first, then mark this one
                  question.answer_options.forEach(o => {
                    if (o.id !== option.id && o.is_correct) onUpdateOption(o.id, { is_correct: false })
                  })
                }
                onUpdateOption(option.id, { is_correct: e.target.checked })
              }}
              className="rounded text-green-600 shrink-0 accent-green-600"
              title="Markér som korrekt"
            />
            <input
              value={option.option_text}
              onChange={e => onUpdateOption(option.id, { option_text: e.target.value })}
              placeholder="Svarmulighed"
              className={`flex-1 text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                option.is_correct
                  ? 'border-green-300 bg-green-50 focus:ring-green-400'
                  : 'border-gray-200'
              }`}
            />
            {question.answer_options.length > 1 && (
              <button
                onClick={() => onDeleteOption(option.id)}
                className="text-gray-300 hover:text-red-400 transition-colors text-sm"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {question.answer_options.length < 8 && (
          <button
            onClick={onAddOption}
            className="text-xs text-gray-400 hover:text-blue-600 transition-colors ml-6"
          >
            + Tilføj svarmulighed
          </button>
        )}
      </div>
    </div>
  )
}

// ── Collaborator management ───────────────────────────────────────────────────

function CollaboratorSection({
  quizId,
  isOwner,
  initialCollaborators,
}: {
  quizId: string
  isOwner: boolean
  initialCollaborators: { teacher_id: string; name: string; email: string }[]
}) {
  const [collaborators, setCollaborators] = useState(initialCollaborators)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addCollaborator() {
    if (!email) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/collaborators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: quizId, email }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
    } else {
      setCollaborators(prev => [...prev, { teacher_id: data.teacher_id, name: data.name, email: data.email }])
      setEmail('')
    }
    setLoading(false)
  }

  async function removeCollaborator(teacherId: string) {
    await fetch('/api/collaborators', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: quizId, teacher_id: teacherId }),
    })
    setCollaborators(prev => prev.filter(c => c.teacher_id !== teacherId))
  }

  return (
    <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Samarbejdspartnere</h3>

      {collaborators.length === 0 ? (
        <p className="text-xs text-gray-400 mb-3">Ingen samarbejdspartnere endnu.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {collaborators.map(c => (
            <div key={c.teacher_id} className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-800">{c.name}</span>
                <span className="text-xs text-gray-400 ml-2">{c.email}</span>
              </div>
              {isOwner && (
                <button
                  onClick={() => removeCollaborator(c.teacher_id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Fjern
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCollaborator()}
            placeholder="Kollegas e-mail"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addCollaborator}
            disabled={!email || loading}
            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {loading ? '…' : 'Tilføj'}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
