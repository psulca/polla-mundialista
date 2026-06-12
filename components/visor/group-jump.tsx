"use client";

export function GroupJump({ groups }: { groups: string[] }) {
  if (groups.length === 0) return null;
  return (
    <div className="my-2 flex flex-wrap gap-1">
      {groups.map((g) => (
        <button
          key={g}
          onClick={() =>
            document
              .getElementById(`grupo-${g}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="font-display size-7 rounded-md bg-white/8 text-sm text-muted-foreground transition-colors hover:bg-white/16 hover:text-foreground"
          aria-label={`Ir al grupo ${g}`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}
