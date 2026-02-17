function buildCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(v => {
    if (v == null) return ''
    const str = String(v)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }).join(',')
}

export interface CsvExportData {
  questions: { id: string; question_text: string; points: number }[]
  submissions: Array<{
    student_name: string | null
    student_email: string | null
    total_score: number | null
    max_possible_score: number | null
    per_question_scores: Record<string, number>
  }>
}

export function buildResultsCsv(data: CsvExportData): string {
  const headers = [
    'Student Name',
    'Student Email',
    ...data.questions.map((q, i) => `Q${i + 1} (${q.points}pts)`),
    'Total Score',
    'Max Score',
    'Percentage',
  ]

  const rows = data.submissions.map(sub => {
    const percentage = sub.max_possible_score && sub.max_possible_score > 0
      ? Math.round(((sub.total_score ?? 0) / sub.max_possible_score) * 100)
      : 0
    return buildCsvRow([
      sub.student_name,
      sub.student_email,
      ...data.questions.map(q => sub.per_question_scores[q.id] ?? 0),
      sub.total_score ?? 0,
      sub.max_possible_score ?? 0,
      `${percentage}%`,
    ])
  })

  return [buildCsvRow(headers), ...rows].join('\n')
}
