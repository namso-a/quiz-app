'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { debounce } from '@/lib/debounce'
import type { QuizWithQuestions, QuestionWithOptions, AnswerOption, ScoringMode } from '@/types/database'
import Link from 'next/link'

interface Props {
  quiz: QuizWithQuestions
  appUrl: string
}

export default function QuizEditor({ quiz: initialQuiz, appUrl }: Props) {
  const supabase = createClient()
  const [quiz, setQuiz] = useState(initialQuiz)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${appUrl}/q/${quiz.share_code}`

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
          {saving && <span className="text-xs text-gray-400">Saving…</span>}
          <button
            onClick={togglePublish}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              quiz.is_published
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {quiz.is_published ? 'Published' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Share link (when published) */}
      {quiz.is_published && (
        <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <span className="text-sm text-green-700 flex-1 truncate">{shareUrl}</span>
          <button
            onClick={copyLink}
            className="text-xs font-medium text-green-700 hover:text-green-900 shrink-0"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      {/* Quiz title */}
      <input
        value={quiz.title}
        onChange={e => updateQuiz({ title: e.target.value })}
        placeholder="Quiz title"
        className="w-full text-2xl font-bold text-gray-900 bg-transparent border-0 border-b-2 border-transparent focus:border-blue-500 focus:outline-none pb-1 mb-2"
      />
      <textarea
        value={quiz.description ?? ''}
        onChange={e => updateQuiz({ description: e.target.value || null })}
        placeholder="Description (optional)"
        rows={2}
        className="w-full text-sm text-gray-500 bg-transparent border-0 focus:outline-none resize-none mb-6"
      />

      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Scoring mode</label>
          <select
            value={quiz.scoring_mode}
            onChange={e => updateQuiz({ scoring_mode: e.target.value as ScoringMode })}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="proportional_no_penalty">Proportional (no penalty)</option>
            <option value="proportional_with_penalty">Proportional (with penalty)</option>
            <option value="all_or_nothing">All or nothing</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Time limit (minutes)</label>
          <input
            type="number"
            min={1}
            value={quiz.time_limit_minutes ?? ''}
            onChange={e => updateQuiz({ time_limit_minutes: e.target.value ? Number(e.target.value) : null })}
            placeholder="No limit"
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
          <label htmlFor="require_name" className="text-sm text-gray-700">Require name</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="require_email"
            checked={quiz.require_email}
            onChange={e => updateQuiz({ require_email: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="require_email" className="text-sm text-gray-700">Require email</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show_answers_after"
            checked={quiz.show_answers_after}
            onChange={e => updateQuiz({ show_answers_after: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="show_answers_after" className="text-sm text-gray-700">Show answers after submit</label>
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
        + Add question
      </button>
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
          placeholder="Question text"
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
              <button onClick={onDelete} className="text-xs text-red-600 font-medium px-2">Confirm</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 px-1">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-gray-300 hover:text-red-400 transition-colors ml-1">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 ml-7">
        {question.answer_options.map(option => (
          <div key={option.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={option.is_correct}
              onChange={e => onUpdateOption(option.id, { is_correct: e.target.checked })}
              className="rounded text-green-600 shrink-0"
              title="Mark as correct"
            />
            <input
              value={option.option_text}
              onChange={e => onUpdateOption(option.id, { option_text: e.target.value })}
              placeholder="Answer option"
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
            + Add option
          </button>
        )}
      </div>
    </div>
  )
}
