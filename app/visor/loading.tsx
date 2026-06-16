export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-7">
        <div className="h-10 w-20 animate-pulse rounded-lg bg-white/8" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-7 w-20 shrink-0 animate-pulse rounded-full bg-white/8" />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-md px-4 pb-4 pt-4">
        <div className="mb-3 h-10 animate-pulse rounded-full bg-white/8" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-3 h-[88px] animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
