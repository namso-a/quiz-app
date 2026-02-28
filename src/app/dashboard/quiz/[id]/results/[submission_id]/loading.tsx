export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      {/* Back link + title */}
      <div className="mb-6">
        <div className="h-4 w-36 bg-gray-200 rounded mb-3" />
        <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
        <div className="flex gap-4">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Score card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex items-center gap-6">
        <div>
          <div className="h-3 w-12 bg-gray-200 rounded mb-2" />
          <div className="h-9 w-16 bg-gray-200 rounded" />
        </div>
        <div className="h-10 border-l border-gray-200" />
        <div>
          <div className="h-3 w-12 bg-gray-200 rounded mb-2" />
          <div className="h-6 w-20 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Question cards */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex justify-between mb-4">
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-10 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
