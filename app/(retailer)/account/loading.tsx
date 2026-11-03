export default function AccountLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading account">
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-3 w-72" />
      </div>
      <div className="card flex items-center gap-3 p-4">
        <div className="skeleton h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-3 w-32" />
        </div>
      </div>
      <div className="skeleton h-24 w-full rounded-2xl" />
      <div className="card space-y-3 p-4">
        <div className="skeleton h-5 w-32" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex justify-between gap-3">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="card space-y-3 p-4">
        <div className="skeleton h-5 w-28" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-11 w-full" />
      </div>
    </div>
  );
}
