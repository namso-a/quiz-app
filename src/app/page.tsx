'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  function friendlyError(msg: string): string {
    if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
      return 'Too many attempts — please wait a few minutes before trying again.'
    }
    if (msg.toLowerCase().includes('email not confirmed')) {
      return 'Please confirm your email address before signing in.'
    }
    if (msg.toLowerCase().includes('invalid login')) {
      return 'Incorrect email or password.'
    }
    return msg
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(friendlyError(error.message))
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || email.split('@')[0] } },
      })
      if (error) {
        setError(friendlyError(error.message))
      } else {
        // Don't create a teacher record or redirect — admin must approve.
        setSignupDone(true)
      }
    }

    setLoading(false)
  }

  // After signup: show confirmation message instead of redirecting
  if (signupDone) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 text-sm mb-4">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to verify your address.
          </p>
          <p className="text-gray-500 text-sm">
            After confirming, your account will be reviewed by an administrator
            before you can access the platform.
          </p>
          <button
            onClick={() => { setSignupDone(false); setMode('login') }}
            className="mt-6 text-sm text-blue-600 hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-1">
            Fredens Akademi
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Platform</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Proportional credit. Fair grading. Simple workflow.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex mb-6 border-b border-gray-200">
            <button
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                mode === 'login'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => { setMode('login'); setError(null) }}
            >
              Sign in
            </button>
            <button
              className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                mode === 'signup'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => { setMode('signup'); setError(null) }}
            >
              Request access
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@fredens-akademi.dk"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? 'Please wait…'
                : mode === 'login'
                ? 'Sign in'
                : 'Request access'}
            </button>

            {mode === 'signup' && (
              <p className="text-xs text-gray-400 text-center">
                Access requests are reviewed by an administrator.
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  )
}
