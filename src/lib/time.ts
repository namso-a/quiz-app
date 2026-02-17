export function isQuizOpen(quiz: { opens_at: string | null; closes_at: string | null }): boolean {
  const now = new Date()
  if (quiz.opens_at && new Date(quiz.opens_at) > now) return false
  if (quiz.closes_at && new Date(quiz.closes_at) < now) return false
  return true
}

export function isTimeLimitExceeded(started_at: string, time_limit_minutes: number): boolean {
  const elapsed = (Date.now() - new Date(started_at).getTime()) / 1000 / 60
  return elapsed > time_limit_minutes
}

export function secondsRemaining(started_at: string, time_limit_minutes: number): number {
  const elapsed = (Date.now() - new Date(started_at).getTime()) / 1000
  return Math.max(0, time_limit_minutes * 60 - elapsed)
}
