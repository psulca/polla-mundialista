-- Polla Mundial 2026 — esquema inicial
-- Modelo server-centric: todo lo sensible (players, predictions) se accede
-- SOLO desde el servidor con service_role. El cliente (anon) solo lee datos
-- públicos (teams, matches, rounds, settings) para Realtime del visor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type stage as enum ('group', 'r32', 'r16', 'qf', 'sf', 'third', 'final');
create type match_status as enum ('scheduled', 'live', 'finished');
create type score_source as enum ('api', 'manual');
create type player_status as enum ('pending', 'approved');
create type lock_mode as enum ('per_match', 'per_matchday');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Selecciones. Sembradas desde openfootball/worldcup.json.
create table teams (
  id            bigint generated always as identity primary key,
  ext_id        text unique,
  name          text not null,
  code          text,             -- 3 letras (ARG, BRA)
  flag_emoji    text,
  group_letter  text,             -- A..L (null en knockout o si aún no se sabe)
  created_at    timestamptz not null default now()
);

-- "Fechas/rondas" que el admin abre.
create table rounds (
  id          bigint generated always as identity primary key,
  key         text unique not null,   -- group_md1, group_md2, group_md3, r32, r16, qf, sf, third, final
  label       text not null,          -- "Fecha 1", "Octavos", "Cuartos", "Final"
  sort_order  int not null default 0,
  is_open     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Partidos. 104 en total. En knockout los equipos pueden ser placeholders
-- (home_label/away_label) hasta que la API resuelve el cruce.
create table matches (
  id            bigint generated always as identity primary key,
  ext_id        text unique,
  round_id      bigint references rounds(id) on delete set null,
  stage         stage not null default 'group',
  matchday      int,                  -- 1..3 en grupos; null en knockout
  group_letter  text,                 -- A..L en grupos
  home_team_id  bigint references teams(id),
  away_team_id  bigint references teams(id),
  home_label    text,                 -- placeholder ("1A", "Ganador W73") si no hay equipo
  away_label    text,
  kickoff_at    timestamptz not null,
  home_score    int,
  away_score    int,
  status        match_status not null default 'scheduled',
  source        score_source not null default 'api',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index matches_round_idx on matches (round_id);
create index matches_kickoff_idx on matches (kickoff_at);

-- Jugadores. Registro = nombre + PIN. Membresía con aprobación del admin.
create table players (
  id                 uuid primary key default gen_random_uuid(),
  display_name       text not null,
  display_name_norm  text generated always as (lower(btrim(display_name))) stored unique,
  pin_hash           text not null,
  status             player_status not null default 'pending',
  is_admin           boolean not null default false,
  created_at         timestamptz not null default now()
);

-- Predicciones. Una por jugador y partido.
create table predictions (
  id          bigint generated always as identity primary key,
  player_id   uuid not null references players(id) on delete cascade,
  match_id    bigint not null references matches(id) on delete cascade,
  pred_home   int not null check (pred_home >= 0 and pred_home <= 99),
  pred_away   int not null check (pred_away >= 0 and pred_away <= 99),
  updated_at  timestamptz not null default now(),
  unique (player_id, match_id)
);
create index predictions_match_idx on predictions (match_id);

-- Ajustes globales (fila única).
create table settings (
  id         int primary key default 1,
  lock_mode  lock_mode not null default 'per_match',
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict do nothing;

-- updated_at automático en matches.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger matches_touch before update on matches
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Vistas (security_invoker => respetan la RLS de las tablas base)
-- ---------------------------------------------------------------------------

-- Cierre y revelado por partido, según lock_mode global.
create view match_deadline with (security_invoker = on) as
select
  m.id as match_id,
  case (select lock_mode from settings where id = 1)
    when 'per_matchday' then min(m.kickoff_at) over (partition by m.round_id)
    else m.kickoff_at
  end as deadline_at,
  m.kickoff_at as reveal_at
from matches m;

-- Puntos por predicción. DEBE coincidir con lib/domain/scoring.ts.
create view prediction_points with (security_invoker = on) as
select
  p.id         as prediction_id,
  p.player_id,
  p.match_id,
  p.pred_home,
  p.pred_away,
  m.home_score,
  m.away_score,
  case
    when m.status <> 'finished' or m.home_score is null or m.away_score is null then null
    when p.pred_home = m.home_score and p.pred_away = m.away_score then 3
    when sign(p.pred_home - p.pred_away) = sign(m.home_score - m.away_score) then 1
    else 0
  end as points,
  case
    when m.status <> 'finished' or m.home_score is null or m.away_score is null then null
    when p.pred_home = m.home_score and p.pred_away = m.away_score then 'exact'
    when sign(p.pred_home - p.pred_away) = sign(m.home_score - m.away_score) then 'result'
    else 'miss'
  end as hit_kind
from predictions p
join matches m on m.id = p.match_id;

-- Leaderboard: total + conteo de exactos y de resultados, por jugador aprobado.
create view leaderboard with (security_invoker = on) as
select
  pl.id           as player_id,
  pl.display_name,
  coalesce(sum(pp.points), 0)                            as total_points,
  count(*) filter (where pp.hit_kind = 'exact')         as exact_count,
  count(*) filter (where pp.hit_kind = 'result')        as result_count
from players pl
left join prediction_points pp on pp.player_id = pl.id
where pl.status = 'approved'
group by pl.id, pl.display_name;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table teams       enable row level security;
alter table rounds      enable row level security;
alter table matches     enable row level security;
alter table settings    enable row level security;
alter table players     enable row level security;
alter table predictions enable row level security;

-- Lectura pública (segura) para el visor / Realtime del cliente.
create policy "public read teams"    on teams    for select to anon, authenticated using (true);
create policy "public read rounds"   on rounds   for select to anon, authenticated using (true);
create policy "public read matches"  on matches  for select to anon, authenticated using (true);
create policy "public read settings" on settings for select to anon, authenticated using (true);

-- players y predictions: SIN políticas para anon/authenticated => acceso denegado.
-- Solo el service_role (servidor) las lee/escribe, y bypassa RLS.

-- ---------------------------------------------------------------------------
-- Grants para la Data API (PostgREST corre COMO estos roles).
-- Ojo: bypassar RLS (service_role) NO es lo mismo que tener privilegios de
-- tabla. El default nuevo de Supabase no auto-expone tablas nuevas, así que
-- los GRANT van explícitos. La RLS sigue controlando QUÉ FILAS se ven.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- Lectura pública (las políticas RLS de arriba limitan las filas).
grant select on teams, rounds, matches, settings to anon, authenticated;

-- El servidor (service_role) maneja todo: tablas y vistas. Bypassa RLS.
grant all on all tables in schema public to service_role;
