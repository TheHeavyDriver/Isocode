export default function ShopLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading catalogue">
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-3 w-40" />
      </div>
      <div className="card space-y-3 p-4">
        <div className="flex justify-between">
          <div className="skeleton h-8 w-32" />
          <div className="skeleton h-8 w-28" />
        </div>
        <div className="skeleton h-1.5 w-full" />
      </div>
      <div className="skeleton h-16 w-full rounded-xl" />
      <div className="skeleton h-12 w-full" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton h-9 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton aspect-[4/5] w-full rounded-xl" />
            <div className="skeleton h-2.5 w-16" />
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-2/3" />
            <div className="skeleton h-5 w-24" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
