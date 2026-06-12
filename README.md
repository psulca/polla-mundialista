# Polla Mundial 2026 ⚽️

Webapp de polla (quiniela) para el Mundial 2026. Predicciones de marcadores por
fecha: **3 puntos** al marcador exacto, **1 punto** al resultado.

El diseño completo de producto y UX/UI está en [`docs/DESIGN.md`](docs/DESIGN.md).

## Stack

- **Next.js 16** (App Router) + React 19
- **Supabase** (Postgres + Realtime) — auth propia por **teléfono + PIN**
- **Tailwind v4** + **shadcn/ui** (base-ui)
- **Vitest** para la lógica de dominio
- Deploy en **Vercel**

## Arquitectura (lo importante)

- **Server-centric**: todo lo sensible (jugadores, predicciones) se accede SOLO
  desde el servidor con la `service_role` key. El cliente (`anon`) solo lee datos
  públicos (`teams`, `matches`, `rounds`) para el Realtime del visor.
- **Dos relojes**: el _bloqueo_ de edición (toggle `per_match`/`per_matchday`) es
  distinto del _revelado_ de predicciones (siempre en el kickoff). Ver
  `lib/domain/locking.ts`.
- **Puntaje como vista** de Postgres (`prediction_points`, `leaderboard`), no como
  tabla — siempre correcto, se recalcula solo. Espejo en `lib/domain/scoring.ts`.
- **Resultados en vivo (API-Football, plan GRATIS)**: las páginas **NUNCA** llaman a
  la API — leen siempre de la BD. Truco clave: el plan Free bloquea `?season=` pero SÍ
  responde `?date=` dentro de una ventana de hoy ±1 día. Por eso consultamos por fecha
  y filtramos por liga (1 = Mundial). Dos procesos en `lib/sync-matches.ts`:
  - `syncMatches` (cron `/api/sync`, cada 6 min) — gate inteligente: solo pide las
    fechas de partidos en ventana activa; si no juega nadie, no gasta llamada. Vivo.
  - `reconcileFixtures` (cron `/api/reconcile` 2×/día) — trae
    ayer/hoy/mañana, **corrige los horarios** (openfootball viene en hora local),
    linkea `api_fixture_id` y carga marcadores finales. 3 llamadas.

  Emparejado robusto por **par-de-equipos + kickoff más cercano** (absorbe el
  corrimiento de día UTC vs local). Los marcadores manuales del admin no los pisa la API.
- **Tiempo real al usuario**: cuando el cron escribe en `matches`, **Supabase Realtime**
  empuja el cambio por websocket a todos los navegadores → las pantallas se actualizan
  solas, sin recargar. Ver `components/brand/realtime-refresh.tsx`. El polling hacia la
  API es inevitable (es REST, no empuja); el push al usuario sí es realtime.
- **Regla de eliminatorias**: el marcador se compara a los **90'**. Por eso se usa
  API-Football (`score.fulltime` = tiempo reglamentario, separa alargue y penales).

## Estructura

```
app/                     Rutas (App Router) — pantallas pendientes de diseño
components/ui/           Componentes shadcn
lib/domain/              Lógica PURA y testeada: scoring, locking
lib/auth/                pin (scrypt) + session (jose)
lib/supabase/            admin (service_role) + browser (anon, realtime)
lib/types.ts             Tipos del dominio
scripts/seed.ts          Seed de equipos/fixtures desde openfootball
supabase/migrations/     Esquema SQL (tablas, vistas, RLS)
docs/DESIGN.md           Diseño de producto y UX/UI
```

## Puesta en marcha (local con Docker)

> Este proyecto usa **puertos custom en el rango 55xxx** para convivir con otros
> stacks de Supabase locales sin chocar. `project_id = "polla-mundial"`.

1. **Levantar Supabase local** (la CLI está como devDependency, se usa con `npx`):

   ```bash
   npx supabase start          # API en :55321, Studio en :55323
   npx supabase status         # ver URL y claves
   ```

   La migración `0001_init.sql` se aplica sola al arrancar (`supabase db reset`
   para re-aplicar desde cero).

2. **Variables de entorno** — crea `.env.local` con (claves locales de demo):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY de "npx supabase status -o env">
   SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY de "npx supabase status -o env">
   SESSION_SECRET=<openssl rand -base64 32>
   OPENFOOTBALL_URL=https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
   ```

   Para los **marcadores en vivo** (API-Football), agrega también:

   ```bash
   # Clave de https://dashboard.api-football.com (header x-apisports-key)
   FOOTBALL_API_KEY=<tu_api_key>
   # Protege /api/sync y /api/reconcile en producción. El nombre DEBE ser CRON_SECRET:
   # Vercel lo inyecta solo en los crons como header Authorization: Bearer <valor>
   # (no se puede falsificar). En local no hace falta (los scripts llaman directo).
   CRON_SECRET=<openssl rand -hex 32>
   # Opcionales (defaults: liga 1 = Mundial, temporada 2026)
   # FOOTBALL_API_LEAGUE=1
   # FOOTBALL_API_SEASON=2026
   ```

   **Cómo obtener la clave**: entra a `dashboard.api-football.com`, regístrate y copia
   la API key. El **plan gratis ALCANZA** (100 llamadas/día): bloquea `?season=` pero
   responde `?date=` en la ventana de hoy ±1 día — justo lo que necesitamos. Verificado
   contra la API real: `https://v3.football.api-sports.io`, header `x-apisports-key`,
   liga `1` = Mundial, `score.fulltime` = 90'. El gate + reconcile mantienen el uso muy
   por debajo de las 100/día.

   Para verificar la key sin levantar el server:
   `NODE_OPTIONS='--conditions=react-server' npx tsx --env-file=.env scripts/run-sync.ts`

3. **Seed** de equipos, fechas y los 104 partidos:

   ```bash
   npm run seed
   ```

4. **Dev**

   ```bash
   npm run dev
   ```

## Deploy a producción (cuando toque)

- Crea el proyecto en Supabase cloud y promové el esquema con migraciones:
  `npx supabase link --project-ref <ref>` y `npx supabase db push`.
- **MCP de prod**: en `.mcp.json` reemplaza `REPLACE_WITH_PROD_PROJECT_REF` por el
  ref real. Está configurado **read-only** a propósito — producción se inspecciona,
  no se escribe desde el agente. La autenticación es por OAuth en el navegador.

## Scripts

| Comando             | Qué hace                              |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                |
| `npm test`          | Tests del dominio (Vitest)            |
| `npm run seed`      | Siembra equipos/fixtures              |
| `npm run lint`      | ESLint                                |

## Estado

✅ Scaffold, esquema, lógica de dominio, auth, seed, pantallas, banderas SVG, y el
cron de resultados con API-Football (`/api/sync` + `/api/reconcile`, solo por cron).
⏳ Pendiente: cargar `FOOTBALL_API_KEY` real y verificar el emparejamiento de nombres
contra las respuestas reales de la API (el sync reporta los "sin emparejar").
