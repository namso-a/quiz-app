import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-6">
          Fredens Akademi
        </p>
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-gray-600 mb-6">Siden blev ikke fundet.</p>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline"
        >
          Gå til forsiden
        </Link>
      </div>
    </main>
  )
}
