'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Quiz } from '@/types/database'

interface Props {
  initialQuizzes: Quiz[]
}

const SCORING_LABELS: Record<string, string> = {
  proportional_no_penalty: 'Delvis point – ingen straf',
  proportional_with_penalty: 'Delvis point – straf for fejl',
  all_or_nothing: 'Alt eller intet',
}

export default function QuizList({ initialQuizzes }: Props) {
  const supabase = createClient()
  const [quizzes, setQuizzes] = useState(initialQuizzes)
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const active = quizzes.filter(q => !q.is_archived)
  const archived = quizzes.filter(q => q.is_archived)

  async function archiveQuiz(id: string) {
    await supabase.from('quizzes').update({ is_archived: true, is_published: false }).eq('id', id)
    setQuizzes(prev => prev.map(q => q.id === id ? { ...q, is_archived: true, is_published: false } : q))
  }

  async function unarchiveQuiz(id: string) {
    await supabase.from('quizzes').update({ is_archived: false }).eq('id', id)
    setQuizzes(prev => prev.map(q => q.id === id ? { ...q, is_archived: false } : q))
  }

  async function deleteQuiz(id: string) {
    await supabase.from('quizzes').delete().eq('id', id)
    setQuizzes(prev => prev.filter(q => q.id !== id))
    setConfirmDelete(null)
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500 mb-4">Du har ikke oprettet nogen quizzer endnu.</p>
        <Link href="/dashboard/quiz/new" className="text-blue-600 font-medium hover:underline">
          Opret din første quiz
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Active quizzes */}
      {active.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 mb-4">
          <p className="text-gray-400 text-sm">Alle quizzer er arkiveret.</p>
        </div>
      ) : (
        <div className="grid gap-3 mb-6">
          {active.map(quiz => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              confirmDelete={confirmDelete}
              onArchive={() => archiveQuiz(quiz.id)}
              onDeleteRequest={() => setConfirmDelete(quiz.id)}
              onDeleteCancel={() => setConfirmDelete(null)}
              onDeleteConfirm={() => deleteQuiz(quiz.id)}
            />
          ))}
        </div>
      )}

      {/* Archived section */}
      {archived.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(v => !v)}
            className="text-sm text-gray-400 hover:text-gray-600 mb-3 flex items-center gap-1"
          >
            <span>{showArchived ? '▾' : '▸'}</span>
            Arkiveret ({archived.length})
          </button>
          {showArchived && (
            <div className="grid gap-3">
              {archived.map(quiz => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  confirmDelete={confirmDelete}
                  onArchive={() => unarchiveQuiz(quiz.id)}
                  archiveLabel="Gendan"
                  onDeleteRequest={() => setConfirmDelete(quiz.id)}
                  onDeleteCancel={() => setConfirmDelete(null)}
                  onDeleteConfirm={() => deleteQuiz(quiz.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface CardProps {
  quiz: Quiz
  confirmDelete: string | null
  archiveLabel?: string
  onArchive: () => void
  onDeleteRequest: () => void
  onDeleteCancel: () => void
  onDeleteConfirm: () => void
}

function QuizCard({ quiz, confirmDelete, archiveLabel = 'Arkiver', onArchive, onDeleteRequest, onDeleteCancel, onDeleteConfirm }: CardProps) {
  const isConfirming = confirmDelete === quiz.id

  return (
    <div className={`bg-white rounded-xl border p-5 flex items-center justify-between ${
      quiz.is_archived ? 'border-gray-100 opacity-70' : 'border-gray-200'
    }`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold text-gray-900 truncate">{quiz.title}</h2>
          {!quiz.is_archived && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              quiz.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {quiz.is_published ? 'Udgivet' : 'Kladde'}
            </span>
          )}
          {quiz.is_archived && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700 shrink-0">
              Arkiveret
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
          <span>{SCORING_LABELS[quiz.scoring_mode] ?? quiz.scoring_mode}</span>
          {quiz.question_count !== undefined && (
            <span className="text-gray-300">·</span>
          )}
          {quiz.question_count !== undefined && (
            <span>{quiz.question_count} spørgsmål</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        {!quiz.is_archived && (
          <>
            <Link
              href={`/dashboard/quiz/${quiz.id}/results`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Resultater
            </Link>
            <Link
              href={`/dashboard/quiz/${quiz.id}`}
              className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              Rediger
            </Link>
          </>
        )}

        <button
          onClick={onArchive}
          className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors"
          title={archiveLabel}
        >
          {archiveLabel === 'Arkiver' ? '📦' : '↩'}
        </button>

        {isConfirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onDeleteConfirm}
              className="text-xs text-red-600 font-medium px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Slet
            </button>
            <button
              onClick={onDeleteCancel}
              className="text-xs text-gray-400 px-1 hover:text-gray-600"
            >
              Annuller
            </button>
          </div>
        ) : (
          <button
            onClick={onDeleteRequest}
            className="text-gray-300 hover:text-red-400 transition-colors text-base px-1"
            title="Slet quiz"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
