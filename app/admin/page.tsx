import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/current-player";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRounds, getMatchesForRound } from "@/lib/data/visor";
import { getRoundEntryPlayerIds, ENTRY_FEE } from "@/lib/data/entries";
import { SectionBanner } from "@/components/brand/section-banner";
import { HScroll } from "@/components/brand/h-scroll";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScoreEditor } from "@/components/admin/score-editor";
import { RejectPlayer } from "@/components/admin/reject-player";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon, EraserIcon, SquareLock02Icon, Coins01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { approvePlayer, toggleRound, setKnockoutBonus, toggleEntry, setEntryFee } from "./actions";
import { fmtPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = ["jugadores", "fechas", "marcadores"] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; ronda?: string; pago?: string }>;
}) {
  await requireAdmin();
  const { t, ronda, pago } = await searchParams;
  const tab = TABS.includes(t as (typeof TABS)[number]) ? (t as (typeof TABS)[number]) : "jugadores";

  return (
    <Suspense key={tab} fallback={<AdminTabSkeleton />}>
      <AdminContent tab={tab} ronda={ronda} pago={pago} />
    </Suspense>
  );
}

async function AdminContent({
  tab,
  ronda,
  pago,
}: {
  tab: (typeof TABS)[number];
  ronda?: string;
  pago?: string;
}) {
  const db = createAdminClient();

  const [{ data: pending }, { data: approved }, rounds, { data: settings }] = await Promise.all([
    db.from("players").select("id, display_name, phone").eq("status", "pending").order("created_at"),
    db.from("players").select("id, display_name, phone").eq("status", "approved").order("display_name"),
    getRounds(),
    db.from("settings").select("knockout_bonus").eq("id", 1).maybeSingle(),
  ]);
  const knockoutBonus = settings?.knockout_bonus ?? false;

  const scoreRound = rounds.find((r) => r.key === ronda) ?? rounds[0];
  const payRound = rounds.find((r) => r.key === pago) ?? rounds.find((r) => r.is_open) ?? rounds[0];
  // Los partidos del tab marcadores se cargan en su propio <Suspense> (skeleton al
  // cambiar de fecha) → no se piden acá para no bloquear el render del admin.
  const entryIds =
    tab === "jugadores" && payRound
      ? await getRoundEntryPlayerIds(payRound.id)
      : new Set<string>();

  const { count: koStarted } = await db
    .from("matches")
    .select("id", { count: "exact", head: true })
    .neq("stage", "group")
    .lte("kickoff_at", new Date().toISOString());
  const knockoutFrozen = (koStarted ?? 0) > 0;

  return (
    <>
      {/* Jugadores y Fechas: la página entera scrollea (un solo scroll) */}
      {tab !== "marcadores" && (
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto flex w-full max-w-md flex-col gap-7 px-4 pb-10 pt-2">
          {tab === "jugadores" && (
            <>
              {/* Aprobar cuentas */}
              <section className="flex flex-col gap-3">
                <SectionBanner accent="magenta" right={`${pending?.length ?? 0}`}>
                  Aprobar jugadores
                </SectionBanner>
                <div className="ring-sticker overflow-hidden rounded-2xl border border-border bg-card">
                  {(!pending || pending.length === 0) && (
                    <p className="px-4 py-5 text-center text-sm text-muted-foreground">
                      No hay jugadores esperando aprobación.
                    </p>
                  )}
                  {pending?.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{p.display_name}</p>
                        <p className="tnum text-xs text-muted-foreground">{fmtPhone(p.phone)}</p>
                      </div>
                      <form action={approvePlayer}>
                        <input type="hidden" name="playerId" value={p.id} />
                        <button className="rounded-lg bg-neon px-3 py-1.5 text-xs font-extrabold uppercase text-black">
                          Aprobar
                        </button>
                      </form>
                      <RejectPlayer playerId={p.id} name={p.display_name} />
                    </div>
                  ))}
                </div>
              </section>

              {/* Pagos por fecha */}
              <section className="flex flex-col gap-3">
                <SectionBanner accent="gold" right={payRound?.label}>
                  Pagos por fecha
                </SectionBanner>
                <p className="-mt-1 text-xs text-muted-foreground">
                  Marca quién pagó cada fecha. Solo los que pagaron entran al pozo y al ranking de esa fecha.
                </p>
                <HScroll className="-mx-4">
                  <div className="flex gap-2 px-4">
                    {rounds.map((r) => (
                      <Link
                        key={r.id}
                        href={`/admin?t=jugadores&pago=${r.key}`}
                        scroll={false}
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                          r.id === payRound?.id ? "bg-gold text-black" : "bg-white/8 text-muted-foreground",
                        )}
                      >
                        {r.label}
                      </Link>
                    ))}
                  </div>
                </HScroll>
                <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <HugeiconsIcon icon={Coins01Icon} size={15} strokeWidth={2} className="text-gold" />
                    Pozo · {entryIds.size} inscritos
                  </span>
                  <span className="font-display tnum text-xl text-gold">S/ {entryIds.size * (payRound?.entry_fee ?? ENTRY_FEE)}</span>
                </div>
                <div className="ring-sticker overflow-hidden rounded-2xl border border-border bg-card">
                  {(!approved || approved.length === 0) && (
                    <p className="px-4 py-5 text-center text-sm text-muted-foreground">
                      Todavía no hay jugadores aprobados.
                    </p>
                  )}
                  {approved?.map((p) => {
                    const entered = entryIds.has(p.id);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{p.display_name}</p>
                          <p className="tnum text-xs text-muted-foreground">{fmtPhone(p.phone)}</p>
                        </div>
                        {entered ? (
                          // Quitar un pago pide confirmación (saca del pozo).
                          <ConfirmSubmit
                            action={toggleEntry}
                            fields={{ roundId: String(payRound?.id ?? ""), playerId: p.id, on: "false" }}
                            title={`¿Quitar el pago de ${p.display_name}?`}
                            description={`Sale del pozo y del ranking de ${payRound?.label}.`}
                            confirmLabel="Quitar"
                            tone="danger"
                            className="flex items-center gap-1.5 rounded-lg bg-neon px-3 py-1.5 text-xs font-extrabold uppercase text-black"
                          >
                            <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
                            Pagó
                          </ConfirmSubmit>
                        ) : (
                          <form action={toggleEntry}>
                            <input type="hidden" name="roundId" value={payRound?.id ?? ""} />
                            <input type="hidden" name="playerId" value={p.id} />
                            <input type="hidden" name="on" value="true" />
                            <button className="rounded-lg bg-white/8 px-3 py-1.5 text-xs font-extrabold uppercase text-muted-foreground">
                              Marcar
                            </button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {tab === "fechas" && (
            <>
              {/* Abrir / cerrar fechas */}
              <section className="flex flex-col gap-3">
                <SectionBanner accent="azure">Abrir / cerrar fechas</SectionBanner>
                <p className="-mt-1 text-xs text-muted-foreground">
                  Abre una fecha para que los jugadores puedan cargar sus pronósticos. Mientras está
                  abierta, predicen; al cerrarla, ya no. (Igual cada partido se congela en su kickoff.)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {rounds.map((r) => (
                    <ConfirmSubmit
                      key={r.id}
                      action={toggleRound}
                      fields={{ roundId: String(r.id), open: (!r.is_open).toString() }}
                      title={r.is_open ? `¿Cerrar ${r.label}?` : `¿Abrir ${r.label}?`}
                      description={
                        r.is_open
                          ? "Los jugadores ya no van a poder cargar ni editar sus pronósticos de esta fecha."
                          : "Los jugadores van a poder cargar sus pronósticos de esta fecha."
                      }
                      confirmLabel={r.is_open ? "Cerrar" : "Abrir"}
                      tone={r.is_open ? "danger" : "default"}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold",
                        r.is_open ? "bg-neon text-black" : "bg-white/8 text-muted-foreground",
                      )}
                    >
                      <span className="truncate">{r.label}</span>
                      <span>{r.is_open ? "Abierta" : "Cerrada"}</span>
                    </ConfirmSubmit>
                  ))}
                </div>
              </section>

              {/* Precio de inscripción por fecha */}
              <section className="flex flex-col gap-3">
                <SectionBanner accent="gold">Precio de inscripción</SectionBanner>
                <p className="-mt-1 text-xs text-muted-foreground">
                  Cuánto pone cada jugador por fecha. El pozo = inscritos × este monto. Por
                  defecto S/ 10; defínelo antes de abrir la fecha.
                </p>
                <div className="ring-sticker overflow-hidden rounded-2xl border border-border bg-card">
                  {rounds.map((r) => (
                    <form
                      key={r.id}
                      action={setEntryFee}
                      className="flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-b-0"
                    >
                      <input type="hidden" name="roundId" value={r.id} />
                      <span className="flex-1 truncate text-sm font-bold">{r.label}</span>
                      <span className="text-sm text-muted-foreground">S/</span>
                      <input
                        name="fee"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        defaultValue={r.entry_fee}
                        className="tnum w-16 rounded-lg border border-border bg-black/30 px-2 py-1 text-center text-sm outline-none focus:border-gold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button className="rounded-lg bg-gold px-3 py-1.5 text-xs font-extrabold uppercase text-black">
                        Guardar
                      </button>
                    </form>
                  ))}
                </div>
              </section>

              {/* Eliminatorias */}
              <section className="flex flex-col gap-3">
                <SectionBanner accent="azure">Eliminatorias</SectionBanner>
                {knockoutFrozen && (
                  <p className="-mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <HugeiconsIcon icon={SquareLock02Icon} size={12} strokeWidth={2} />
                    Las eliminatorias ya arrancaron: el puntaje queda fijo.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {[false, true].map((on) => {
                    const active = knockoutBonus === on;
                    const label = on ? "+1 por avanzar" : "Solo marcador";
                    const sub = on ? "Punto extra por acertar quién pasa" : "Penales no cuentan (recomendado)";
                    const klass = cn(
                      "w-full rounded-xl border px-3 py-3 text-center transition-colors",
                      active
                        ? "border-azure bg-azure/15 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-white/5",
                      knockoutFrozen && !active && "opacity-40",
                    );
                    const inner = (
                      <>
                        <div className="font-display text-base">{label}</div>
                        <div className="mt-0.5 text-[11px] leading-tight">{sub}</div>
                      </>
                    );
                    return knockoutFrozen || active ? (
                      <div key={String(on)} className={klass}>
                        {inner}
                      </div>
                    ) : (
                      <ConfirmSubmit
                        key={String(on)}
                        action={setKnockoutBonus}
                        fields={{ on: String(on) }}
                        title={on ? "¿Activar +1 por avanzar?" : "¿Volver a solo marcador?"}
                        description={
                          on
                            ? "Suma 1 punto extra por acertar quién clasifica. Defínelo antes de que arranquen las eliminatorias."
                            : "Vuelve a contar solo el marcador. Los penales no suman puntos."
                        }
                        confirmLabel="Cambiar"
                        className={klass}
                      >
                        {inner}
                      </ConfirmSubmit>
                    );
                  })}
                </div>
              </section>
            </>
          )}
          </div>
        </ScrollArea>
      )}

      {/* Marcadores: cabecera fija + scroll SOLO en la lista de partidos */}
      {tab === "marcadores" && (
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col px-4 pb-4 pt-2">
          <SectionBanner accent="gold" right={scoreRound?.label}>
            Corregir marcador
          </SectionBanner>
          <p className="mt-2 text-xs text-muted-foreground">
            Solo si necesitas corregir o cargar un marcador a mano.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Edit02Icon} size={13} strokeWidth={2.5} className="text-gold" />
              Editar
            </span>
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={EraserIcon} size={13} strokeWidth={2} />
              Borrar el cargado a mano
            </span>
          </div>
          <HScroll className="-mx-4 mt-3">
            <div className="flex gap-2 px-4">
              {rounds.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin?t=marcadores&ronda=${r.key}`}
                  scroll={false}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                    r.id === scoreRound?.id ? "bg-gold text-black" : "bg-white/8 text-muted-foreground",
                  )}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </HScroll>
          <ScrollArea className="mt-3 min-h-0 flex-1">
            <Suspense key={scoreRound?.id ?? "none"} fallback={<ScoreSkeleton />}>
              <MarcadoresList roundId={scoreRound?.id ?? null} />
            </Suspense>
          </ScrollArea>
        </div>
      )}
    </>
  );
}

function AdminTabSkeleton() {
  return (
    <div className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 pt-2">
      <div className="h-9 shrink-0 animate-pulse rounded-xl bg-white/8" />
      <div className="ring-sticker min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-2.5 h-12 animate-pulse rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}

async function MarcadoresList({ roundId }: { roundId: number | null }) {
  const matches = roundId ? await getMatchesForRound(roundId) : [];
  return (
    <div className="rounded-2xl border border-border bg-card">
      {matches.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No hay partidos en esta fecha.
        </p>
      )}
      {matches.map((m) => (
        <ScoreEditor
          key={m.id}
          id={m.id}
          home={m.home}
          away={m.away}
          homeScore={m.homeScore}
          awayScore={m.awayScore}
          isKnockout={m.stage !== "group"}
          advancer={m.advancer}
        />
      ))}
    </div>
  );
}

function ScoreSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse border-b border-border bg-white/5 last:border-b-0" />
      ))}
    </div>
  );
}
