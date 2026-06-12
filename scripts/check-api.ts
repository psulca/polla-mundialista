/**
 * Diagnóstico puntual de API-Football. NO levanta el server.
 * Uso: npx tsx --env-file=.env scripts/check-api.ts
 */
const KEY = process.env.FOOTBALL_API_KEY;
const BASE = process.env.FOOTBALL_API_BASE ?? "https://v3.football.api-sports.io";
const LEAGUE = process.env.FOOTBALL_API_LEAGUE ?? "1";
const SEASON = process.env.FOOTBALL_API_SEASON ?? "2026";

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": KEY ?? "" } });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function show(f: any) {
  const h = f.teams?.home?.name;
  const a = f.teams?.away?.name;
  const st = f.fixture?.status?.short;
  const g = `${f.goals?.home ?? "-"}-${f.goals?.away ?? "-"}`;
  const ft = `${f.score?.fulltime?.home ?? "-"}-${f.score?.fulltime?.away ?? "-"}`;
  console.log(`  ${h} vs ${a} | estado:${st} | goles:${g} | 90':${ft} | ${f.fixture?.date}`);
}

async function main() {
  if (!KEY) {
    console.log("❌ FOOTBALL_API_KEY NO está en el entorno. ¿Reiniciaste algo que lea .env?");
    return;
  }
  console.log(`Key: ${KEY.slice(0, 4)}…${KEY.slice(-4)} (${KEY.length} chars)`);

  // 1) Estado de la cuenta y plan
  const st = await get("/status");
  console.log(`\n=== /status (HTTP ${st.status}) ===`);
  console.log(JSON.stringify(st.json?.response ?? st.json, null, 2));

  // 2) Fixtures del Mundial en la temporada configurada
  const fx = await get(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
  console.log(`\n=== /fixtures?league=${LEAGUE}&season=${SEASON} (HTTP ${fx.status}) ===`);
  console.log("errors:", JSON.stringify(fx.json?.errors));
  console.log("results:", fx.json?.results);
  const arr: any[] = fx.json?.response ?? [];
  if (arr.length) {
    console.log("Primeros 6:");
    arr.slice(0, 6).forEach(show);
    const live = arr.filter((f) => ["1H", "HT", "2H", "ET", "P", "BT"].includes(f.fixture?.status?.short));
    console.log(`\nEn juego ahora: ${live.length}`);
    live.forEach(show);
    const finished = arr.filter((f) => ["FT", "AET", "PEN"].includes(f.fixture?.status?.short));
    console.log(`Terminados: ${finished.length}`);
    finished.slice(0, 6).forEach(show);
  }

  // 3) EN VIVO ahora mismo (todas las ligas) — ¿qué son? ¿está el Mundial?
  const liveAll = await get("/fixtures?live=all");
  console.log(`\n=== /fixtures?live=all (HTTP ${liveAll.status}) ===`);
  console.log("errors:", JSON.stringify(liveAll.json?.errors), "| results:", liveAll.json?.results);
  for (const f of liveAll.json?.response ?? []) {
    console.log(`  [${f.league?.name} ${f.league?.season} | liga ${f.league?.id}] `);
    show(f);
  }

  // 4) league=1 SIN season (lo que pediste)
  const noSeason = await get(`/fixtures?league=${LEAGUE}`);
  console.log(`\n=== /fixtures?league=${LEAGUE} (sin season) (HTTP ${noSeason.status}) ===`);
  console.log("errors:", JSON.stringify(noSeason.json?.errors), "| results:", noSeason.json?.results);
  (noSeason.json?.response ?? []).slice(0, 5).forEach(show);

  // 5) Por fecha de hoy (todas las ligas que jueguen el 2026-06-11)
  const byDate = await get(`/fixtures?date=2026-06-11`);
  console.log(`\n=== /fixtures?date=2026-06-11 (HTTP ${byDate.status}) ===`);
  console.log("errors:", JSON.stringify(byDate.json?.errors), "| results:", byDate.json?.results);
  for (const f of (byDate.json?.response ?? []).slice(0, 10)) {
    console.log(`  [${f.league?.name} ${f.league?.season} | liga ${f.league?.id}] ${f.teams?.home?.name} vs ${f.teams?.away?.name} | ${f.fixture?.status?.short}`);
  }

  // 6) ¿Qué temporadas tiene disponibles la liga 1 en el plan Free?
  const lg = await get(`/leagues?id=${LEAGUE}`);
  const seasons = (lg.json?.response?.[0]?.seasons ?? []).map((s: any) => s.year);
  console.log(`\n=== /leagues?id=${LEAGUE} — temporadas listadas ===`);
  console.log(seasons.join(", "));
}

main().catch((e) => console.error(e));
