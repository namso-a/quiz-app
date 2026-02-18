import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SignOutButton from './SignOutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Check if this user has been approved (teacher record exists)
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!teacher) {
    // User is authenticated but not yet approved by admin
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-6">
            Fredens Akademi
          </p>
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-3xl mb-4">⏳</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Awaiting approval</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your account has been created. An administrator needs to approve your
              access before you can use the platform. This usually happens within one business day.
            </p>
            <SignOutButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
              Quiz Platform
            </Link>
            <span className="text-xs text-blue-600 font-medium hidden sm:block">
              Fredens Akademi
            </span>
          </div>
          <SignOutButton />
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
