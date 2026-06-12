-- 0007 — Modelo "por fecha": cada ronda (fecha de grupos o fase de eliminatoria)
-- es una competencia independiente, con su propio pozo y ranking. Además hay un
-- ranking general acumulado. Y el modo de cierre pasa a ser por ronda.

-- 1) Modo de cierre por ronda (antes era global en settings). Backfill del global.
alter table rounds add column if not exists lock_mode text not null default 'per_match';
update rounds set lock_mode = coalesce((select lock_mode from settings where id = 1), 'per_match');

-- 2) Inscripciones por fecha: una fila = el jugador pagó y compite en esa ronda.
--    El pozo de una ronda = jugadores inscritos × monto.
create table if not exists round_entries (
  round_id   bigint not null references rounds(id) on delete cascade,
  player_id  uuid   not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (round_id, player_id)
);
alter table round_entries enable row level security;
grant select, insert, delete on round_entries to service_role;

-- 3) Vistas de puntaje, ahora conscientes de la ronda.
drop view if exists leaderboard;
drop view if exists round_leaderboard;
drop view if exists prediction_points;

create view prediction_points with (security_invoker = on) as
select
  p.id as prediction_id,
  p.player_id,
  p.match_id,
  m.round_id,
  p.pred_home,
  p.pred_away,
  m.home_score,
  m.away_score,
  case
    when m.status <> 'finished' or m.home_score is null or m.away_score is null then null
    when p.pred_home = m.home_score and p.pred_away = m.away_score then 'exact'
    when sign(p.pred_home - p.pred_away) = sign(m.home_score - m.away_score) then 'result'
    else 'miss'
  end as hit_kind,
  case
    when m.status <> 'finished' or m.home_score is null or m.away_score is null then null
    else
      (case
        when p.pred_home = m.home_score and p.pred_away = m.away_score then 3
        when sign(p.pred_home - p.pred_away) = sign(m.home_score - m.away_score) then 1
        else 0
      end)
      +
      (case
        when m.stage = 'group'
          or not (select knockout_bonus from settings where id = 1)
          or sign(p.pred_home - p.pred_away) = 0 then 0
        when m.home_score <> m.away_score then
          case when sign(p.pred_home - p.pred_away) = sign(m.home_score - m.away_score) then 1 else 0 end
        when m.advancer = 'home' and p.pred_home > p.pred_away then 1
        when m.advancer = 'away' and p.pred_away > p.pred_home then 1
        else 0
      end)
  end as points
from predictions p
join matches m on m.id = p.match_id;

-- Ranking POR FECHA: solo jugadores inscritos en esa ronda, con sus puntos de
-- los partidos de esa ronda. (left join → un inscripto sin pronósticos sale en 0.)
create view round_leaderboard with (security_invoker = on) as
select
  re.round_id,
  pl.id           as player_id,
  pl.display_name,
  coalesce(sum(pp.points), 0)                     as total_points,
  count(*) filter (where pp.hit_kind = 'exact')   as exact_count,
  count(*) filter (where pp.hit_kind = 'result')  as result_count
from round_entries re
join players pl on pl.id = re.player_id and pl.status = 'approved'
left join prediction_points pp
  on pp.player_id = re.player_id and pp.round_id = re.round_id
group by re.round_id, pl.id, pl.display_name;

-- Ranking GENERAL: acumulado de cada jugador sobre las fechas en las que se inscribió.
create view leaderboard with (security_invoker = on) as
select
  player_id,
  display_name,
  sum(total_points) as total_points,
  sum(exact_count)  as exact_count,
  sum(result_count) as result_count
from round_leaderboard
group by player_id, display_name;

-- Las vistas recreadas necesitan el grant explícito (objetos nuevos no lo heredan).
grant select on prediction_points, round_leaderboard, leaderboard to service_role;
