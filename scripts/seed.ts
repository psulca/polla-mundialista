/**
 * Seed de equipos, rondas y partidos desde openfootball/worldcup.json.
 * Uso: npm run seed   (carga .env.local automáticamente vía --env-file)
 *
 * Idempotente: hace upsert por ext_id / key, así que se puede correr varias
 * veces (p. ej. cuando openfootball resuelve los cruces de knockout).
 */
import { createClient } from "@supabase/supabase-js";

// --- Cliente service_role (servidor/script) -------------------------------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENFOOTBALL_URL =
  process.env.OPENFOOTBALL_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/** Un upsert sin chequear el error es un upsert en el que no se puede confiar. */
function check(label: string, error: { message: string } | null): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

// --- Tipos del JSON de openfootball ---------------------------------------
interface OFScore {
  ft?: [number, number];
  ht?: [number, number];
}
interface OFMatch {
  round?: string; // "Matchday 1", "Round of 16", "Final"...
  date?: string; // "2026-06-11"
  time?: string; // "19:00"
  team1?: string;
  team2?: string;
  group?: string; // "Group A"
  score?: OFScore;
}
interface OFData {
  name?: string;
  matches: OFMatch[];
}

// --- País -> ISO2 (para bandera). Ampliable. -------------------------------
const ISO2: Record<string, string> = {
  Argentina: "AR", Brazil: "BR", Uruguay: "UY", Colombia: "CO", Ecuador: "EC",
  Peru: "PE", Chile: "CL", Paraguay: "PY", Bolivia: "BO", Venezuela: "VE",
  France: "FR", Spain: "ES", Germany: "DE", England: "GB", Portugal: "PT",
  Netherlands: "NL", Italy: "IT", Belgium: "BE", Croatia: "HR", Switzerland: "CH",
  Denmark: "DK", Poland: "PL", Serbia: "RS", Austria: "AT", "Czech Republic": "CZ",
  Ukraine: "UA", Sweden: "SE", Norway: "NO", Scotland: "GB", Wales: "GB",
  Turkey: "TR", Hungary: "HU", Greece: "GR", Romania: "RO", Slovakia: "SK",
  "United States": "US", USA: "US", Mexico: "MX", Canada: "CA", "Costa Rica": "CR",
  Panama: "PA", Honduras: "HN", Jamaica: "JM",
  Japan: "JP", "South Korea": "KR", "Korea Republic": "KR", "Saudi Arabia": "SA",
  Iran: "IR", Australia: "AU", Qatar: "QA", "United Arab Emirates": "AE", Iraq: "IQ",
  Uzbekistan: "UZ", Jordan: "JO",
  Morocco: "MA", Senegal: "SN", Tunisia: "TN", Nigeria: "NG", Cameroon: "CM",
  Ghana: "GH", Egypt: "EG", Algeria: "DZ", "Ivory Coast": "CI", "South Africa": "ZA",
  "Cape Verde": "CV", "New Zealand": "NZ",
  "Bosnia & Herzegovina": "BA", Haiti: "HT", "Curaçao": "CW", "DR Congo": "CD",
};

// Códigos FIFA de 3 letras (los icónicos del fútbol).
const FIFA: Record<string, string> = {
  "Czech Republic": "CZE", Mexico: "MEX", "South Africa": "RSA", "South Korea": "KOR",
  "Bosnia & Herzegovina": "BIH", Canada: "CAN", Qatar: "QAT", Switzerland: "SUI",
  Brazil: "BRA", Haiti: "HAI", Morocco: "MAR", Scotland: "SCO",
  Australia: "AUS", Paraguay: "PAR", Turkey: "TUR", USA: "USA",
  "Curaçao": "CUW", Ecuador: "ECU", Germany: "GER", "Ivory Coast": "CIV",
  Japan: "JPN", Netherlands: "NED", Sweden: "SWE", Tunisia: "TUN",
  Belgium: "BEL", Egypt: "EGY", Iran: "IRN", "New Zealand": "NZL",
  "Cape Verde": "CPV", "Saudi Arabia": "KSA", Spain: "ESP", Uruguay: "URU",
  France: "FRA", Iraq: "IRQ", Norway: "NOR", Senegal: "SEN",
  Algeria: "ALG", Argentina: "ARG", Austria: "AUT", Jordan: "JOR",
  Colombia: "COL", "DR Congo": "COD", Portugal: "POR", Uzbekistan: "UZB",
  Croatia: "CRO", England: "ENG", Ghana: "GHA", Panama: "PAN",
};

// Banderas que ISO2 no resuelve bien (naciones del Reino Unido).
const FLAG_OVERRIDE: Record<string, string> = {
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
};

/** Código para flag-icons (ISO2 en minúscula + subdivisiones del Reino Unido). */
const FLAG_CODE_OVERRIDE: Record<string, string> = {
  England: "gb-eng",
  Scotland: "gb-sct",
  Wales: "gb-wls",
};

/** Devuelve el código que entiende flag-icons (pe, ar, gb-eng…) o null. */
function flagCode(name: string): string | null {
  if (FLAG_CODE_OVERRIDE[name]) return FLAG_CODE_OVERRIDE[name];
  const iso2 = ISO2[name];
  return iso2 ? iso2.toLowerCase() : null;
}

function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/** Heurística: ¿es un país real o un placeholder de bracket ("Winner Group A")? */
function isRealTeam(name: string): boolean {
  if (ISO2[name]) return true;
  return !/winner|runner|group|place|loser|\d/i.test(name);
}

// --- Mapeo de ronda/stage --------------------------------------------------
interface RoundInfo {
  key: string;
  label: string;
  stage: string;
  matchday: number | null;
  sort: number;
}

/** Clave estable de un partido (idéntica a su ext_id). */
function matchKey(m: OFMatch): string {
  return slug(`${m.date}-${m.team1 ?? ""}-vs-${m.team2 ?? ""}`);
}

/** Mapea una ronda de eliminatoria desde el label de openfootball. */
function knockoutRound(m: OFMatch): RoundInfo {
  const r = (m.round ?? "").toLowerCase();
  if (r.includes("round of 32")) return { key: "r32", label: "Dieciseisavos", stage: "r32", matchday: null, sort: 10 };
  if (r.includes("round of 16")) return { key: "r16", label: "Octavos", stage: "r16", matchday: null, sort: 11 };
  if (r.includes("quarter")) return { key: "qf", label: "Cuartos", stage: "qf", matchday: null, sort: 12 };
  if (r.includes("semi")) return { key: "sf", label: "Semifinales", stage: "sf", matchday: null, sort: 13 };
  if (r.includes("third")) return { key: "third", label: "Tercer puesto", stage: "third", matchday: null, sort: 14 };
  if (r.includes("final")) return { key: "final", label: "Final", stage: "final", matchday: null, sort: 15 };
  return { key: "tbd", label: m.round ?? "Por definir", stage: "group", matchday: null, sort: 99 };
}

/**
 * openfootball numera la fase de grupos por DÍA calendario (Matchday 1..17),
 * no por jornada de grupo. Nosotros queremos las 3 JORNADAS por grupo: dentro
 * de cada grupo ordenamos los 6 partidos por fecha y los agrupamos de a 2.
 * Devuelve un mapa partido -> ronda.
 */
function classifyRounds(matches: OFMatch[]): Map<string, RoundInfo> {
  const byMatch = new Map<string, RoundInfo>();
  const groups = new Map<string, OFMatch[]>();

  for (const m of matches) {
    if (m.group) {
      const g = m.group.replace("Group ", "");
      let arr = groups.get(g);
      if (!arr) groups.set(g, (arr = []));
      arr.push(m);
    } else {
      byMatch.set(matchKey(m), knockoutRound(m));
    }
  }

  for (const ms of groups.values()) {
    ms.sort((a, b) =>
      `${a.date} ${a.time ?? ""}`.localeCompare(`${b.date} ${b.time ?? ""}`),
    );
    ms.forEach((m, i) => {
      const md = Math.floor(i / 2) + 1; // 2 partidos por grupo en cada jornada
      byMatch.set(matchKey(m), {
        key: `group_md${md}`,
        label: `Fecha ${md}`,
        stage: "group",
        matchday: md,
        sort: md,
      });
    });
  }

  return byMatch;
}

function kickoff(m: OFMatch): string {
  const date = m.date ?? "2026-06-11";
  const time = /^\d{2}:\d{2}/.test(m.time ?? "") ? m.time!.slice(0, 5) : "12:00";
  // openfootball no siempre trae offset; tomamos UTC y el cron de football-data corrige.
  const d = new Date(`${date}T${time}:00Z`);
  return isNaN(d.getTime()) ? new Date(`${date}T12:00:00Z`).toISOString() : d.toISOString();
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// --- Ejecución -------------------------------------------------------------
async function main() {
  console.log("Descargando fixture desde openfootball…");
  const res = await fetch(OPENFOOTBALL_URL);
  if (!res.ok) throw new Error(`openfootball respondió ${res.status}`);
  const data = (await res.json()) as OFData;
  const matches = data.matches ?? [];
  console.log(`  ${matches.length} partidos en el fixture.`);

  // 1) Equipos
  const teamNames = new Set<string>();
  for (const m of matches) {
    for (const n of [m.team1, m.team2]) {
      if (n && isRealTeam(n)) teamNames.add(n);
    }
  }
  const teamRows = [...teamNames].map((name) => {
    const iso2 = ISO2[name];
    return {
      ext_id: slug(name),
      name,
      code: FIFA[name] ?? iso2 ?? name.slice(0, 3).toUpperCase(),
      flag_emoji: FLAG_OVERRIDE[name] ?? (iso2 ? flagEmoji(iso2) : null),
      country_code: flagCode(name),
      group_letter:
        matches.find((m) => m.team1 === name || m.team2 === name)?.group?.replace("Group ", "") ??
        null,
    };
  });
  check("teams", (await db.from("teams").upsert(teamRows, { onConflict: "ext_id" })).error);
  console.log(`  ${teamRows.length} equipos sembrados.`);

  const { data: teams } = await db.from("teams").select("id, ext_id");
  const teamId = new Map((teams ?? []).map((t) => [t.ext_id as string, t.id as number]));

  // 2) Rondas (jornadas derivadas por grupo + eliminatorias)
  const roundByMatch = classifyRounds(matches);
  const roundMap = new Map<string, RoundInfo>();
  for (const ri of roundByMatch.values()) {
    roundMap.set(ri.key, ri);
  }
  const roundRows = [...roundMap.values()].map((r) => ({
    key: r.key,
    label: r.label,
    sort_order: r.sort,
    is_open: false,
  }));
  check("rounds", (await db.from("rounds").upsert(roundRows, { onConflict: "key" })).error);
  console.log(`  ${roundRows.length} rondas sembradas.`);

  const { data: rounds } = await db.from("rounds").select("id, key");
  const roundId = new Map((rounds ?? []).map((r) => [r.key as string, r.id as number]));

  // 3) Partidos
  const matchRows = matches.map((m) => {
    const ri = roundByMatch.get(matchKey(m))!;
    const t1 = m.team1 ?? "";
    const t2 = m.team2 ?? "";
    const ft = m.score?.ft;
    return {
      ext_id: slug(`${m.date}-${t1}-vs-${t2}`),
      round_id: roundId.get(ri.key) ?? null,
      stage: ri.stage,
      matchday: ri.matchday,
      group_letter: m.group?.replace("Group ", "") ?? null,
      home_team_id: isRealTeam(t1) ? teamId.get(slug(t1)) ?? null : null,
      away_team_id: isRealTeam(t2) ? teamId.get(slug(t2)) ?? null : null,
      home_label: isRealTeam(t1) ? null : t1,
      away_label: isRealTeam(t2) ? null : t2,
      kickoff_at: kickoff(m),
      home_score: ft ? ft[0] : null,
      away_score: ft ? ft[1] : null,
      status: ft ? "finished" : "scheduled",
      source: "api",
    };
  });
  // Upsert por lotes para no pasar límites.
  for (let i = 0; i < matchRows.length; i += 200) {
    check("matches", (await db.from("matches").upsert(matchRows.slice(i, i + 200), { onConflict: "ext_id" })).error);
  }
  console.log(`  ${matchRows.length} partidos sembrados.`);
  console.log("Seed completo ✓");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
