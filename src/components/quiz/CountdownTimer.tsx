'use client'

import { useState, useEffect } from 'react'
import { secondsRemaining } from '@/lib/time'

interface Props {
  startedAt: string
  timeLimitMinutes: number
  onExpire: () => void
}

export default function CountdownTimer({ startedAt, timeLimitMinutes, onExpire }: Props) {
  const [secs, setSecs] = useState(() => secondsRemaining(startedAt, timeLimitMinutes))
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (expired) return
    const interval = setInterval(() => {
      const remaining = secondsRemaining(startedAt, timeLimitMinutes)
      setSecs(remaining)
      if (remaining <= 0 && !expired) {
        setExpired(true)
        clearInterval(interval)
        onExpire()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, timeLimitMinutes, onExpire, expired])

  const minutes = Math.floor(secs / 60)
  const seconds = Math.floor(secs % 60)
  const isUrgent = secs <= 60

  return (
    <div className={`px-3 py-1.5 rounded-lg text-sm font-mono font-medium ${
      isUrgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
    }`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  )
}
