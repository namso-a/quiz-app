export default function DashboardLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="grid gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="flex gap-2 ml-4">
              <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
