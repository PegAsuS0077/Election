/** Reusable animate-pulse skeleton primitives. */
function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700 ${className ?? ""}`}
    />
  );
}

export function SummaryCardsSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800"
        >
          <SkeletonBox className="h-4 w-24" />
          <SkeletonBox className="mt-3 h-7 w-32" />
          <SkeletonBox className="mt-2 h-4 w-20" />
        </div>
      ))}
    </section>
  );
}

export function SeatShareBarsSkeleton() {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
      <SkeletonBox className="h-5 w-40 mb-6" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="mb-5">
          <div className="flex justify-between mb-2">
            <SkeletonBox className="h-4 w-32" />
            <SkeletonBox className="h-4 w-8" />
          </div>
          <SkeletonBox className="h-3 w-full rounded-full" />
        </div>
      ))}
    </section>
  );
}

export function TableRowsSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <tr key={i}>
          <td colSpan={7} className="py-3 px-1">
            <div className="flex gap-4">
              <SkeletonBox className="h-5 flex-1" />
              <SkeletonBox className="h-5 flex-1" />
              <SkeletonBox className="h-5 flex-[2]" />
              <SkeletonBox className="h-5 flex-[2]" />
              <SkeletonBox className="h-5 w-16" />
              <SkeletonBox className="h-5 w-20" />
              <SkeletonBox className="h-5 w-24" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
