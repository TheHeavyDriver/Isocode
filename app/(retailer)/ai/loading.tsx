export default function AiOrderLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading AI order">
      <div className="space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-3 w-full max-w-md" />
      </div>
      <div className="card space-y-3 p-4">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton h-32 w-full rounded-xl" />
        <div className="skeleton h-8 w-full max-w-xs" />
        <div className="skeleton h-11 w-full" />
      </div>
      <div className="card space-y-3 p-4">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-16 w-full rounded-xl" />
        <div className="skeleton h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
