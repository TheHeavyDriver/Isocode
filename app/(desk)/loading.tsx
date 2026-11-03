export default function DeskLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading order desk">
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-3 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card flex items-center gap-2.5 p-3">
            <div className="skeleton h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-2 w-16" />
              <div className="skeleton h-4 w-8" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="skeleton h-16 w-full rounded-xl" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="card space-y-2 p-4">
          <div className="flex justify-between gap-3">
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-56" />
              <div className="skeleton h-2.5 w-64" />
            </div>
            <div className="skeleton h-5 w-20" />
          </div>
          <div className="skeleton h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
