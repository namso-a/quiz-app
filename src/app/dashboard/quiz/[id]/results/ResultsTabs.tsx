'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Submission } from '@/types/database'

interface OptionAggregate {
  id: string
  option_text: string
  is_correct: boolean
  count: number
}

interface QuestionAggregate {
  id: string
  question_text: string
  sort_order: number
  options: OptionAggregate[]
}

interface Props {
  submissions: Submission[]
  aggregateQuestions: QuestionAggregate[]
  quizId: string
}

export default function ResultsTabs({ submissions, aggregateQuestions, quizId }: Props) {
  const [tab, setTab] = useState<'oversigt' | 'besvarelser'>('oversigt')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {(['oversigt', 'besvarelser'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'oversigt' ? 'Oversigt' : 'Individuelle besvarelser'}
          </button>
        ))}
      </div>

      {tab === 'oversigt' && (
        <SummaryView questions={aggregateQuestions} totalSubmissions={submissions.length} />
      )}

      {tab === 'besvarelser' && (
        <SubmissionsTable submissions={submissions} quizId={quizId} />
      )}
    </div>
  )
}

function SummaryView({
  questions,
  totalSubmissions,
}: {
  questions: QuestionAggregate[]
  totalSubmissions: number
}) {
  return (
    <div className="space-y-6">
      {questions.map((q, index) => {
        const maxCount = Math.max(...q.options.map(o => o.count), 1)
        return (
          <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-medium text-gray-900 mb-4 text-sm">
              {index + 1}. {q.question_text}
            </p>
            <div className="space-y-2.5">
              {q.options.map(opt => {
                const pct = totalSubmissions > 0 ? Math.round((opt.count / totalSubmissions) * 100) : 0
                return (
                  <div key={opt.id}>
                    <div className="flex justify-between items-center mb-1 text-sm">
                      <span className={`flex items-center gap-1.5 ${opt.is_correct ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {opt.is_correct && (
                          <span className="text-green-500 text-xs">✓</span>
                        )}
                        {opt.option_text}
                      </span>
                      <span className="text-gray-400 text-xs shrink-0 ml-4">
                        {opt.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${opt.is_correct ? 'bg-brand' : 'bg-gray-300'}`}
                        style={{ width: `${maxCount > 0 ? (opt.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SubmissionsTable({
  submissions,
  quizId,
}: {
  submissions: Submission[]
  quizId: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Elev</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Score</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">%</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Indsendt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {submissions.map(sub => {
            const pct = sub.max_possible_score
              ? Math.round(((sub.total_score ?? 0) / sub.max_possible_score) * 100)
              : 0
            return (
              <tr
                key={sub.id}
                className="hover:bg-gray-50 cursor-pointer"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/quiz/${quizId}/results/${sub.id}`}
                    className="block"
                  >
                    <div className="font-medium text-gray-900 hover:text-brand transition-colors">
                      {sub.student_name || '(anonym)'}
                    </div>
                    {sub.student_email && (
                      <div className="text-gray-400 text-xs">{sub.student_email}</div>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <Link href={`/dashboard/quiz/${quizId}/results/${sub.id}`} className="block">
                    {sub.total_score ?? 0} / {sub.max_possible_score ?? 0}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/quiz/${quizId}/results/${sub.id}`} className="block">
                    <span className={`font-medium ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {pct}%
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  <Link href={`/dashboard/quiz/${quizId}/results/${sub.id}`} className="block">
                    {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('da-DK') : '—'}
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
