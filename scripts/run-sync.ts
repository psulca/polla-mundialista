/**
 * Corre el sync real (API-Football → BD local) una vez. Diagnóstico, NO levanta server.
 * Uso: npx tsx --env-file=.env scripts/run-sync.ts
 */
import { reconcileFixtures } from "@/lib/sync-matches";
import { createAdminClient } from "@/lib/supabase/admin";

(async () => {
  console.log("Corriendo reconcile (ayer/hoy/mañana)…");
  const r = await reconcileFixtures();
  console.log("RESULTADO:", JSON.stringify(r, null, 2));

  // Muestra los partidos que quedaron con marcador en la BD.
  const db = createAdminClient();
  const { data } = await db
    .from("matches")
    .select("home_team_id, away_team_id, status, home_score, away_score, advancer, kickoff_at")
    .neq("status", "scheduled")
    .order("kickoff_at");
  const { data: teams } = await db.from("teams").select("id, code");
  const code = new Map((teams ?? []).map((t) => [t.id, t.code]));
  console.log(`\nPartidos con marcador en la BD (${data?.length ?? 0}):`);
  for (const m of data ?? []) {
    console.log(
      `  ${code.get(m.home_team_id) ?? "?"} ${m.home_score}-${m.away_score} ${code.get(m.away_team_id) ?? "?"} | ${m.status}${m.advancer ? " | avanza:" + m.advancer : ""}`,
    );
  }
})().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
