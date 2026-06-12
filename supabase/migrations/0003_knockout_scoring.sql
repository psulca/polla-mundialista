-- 0003 — Puntaje de eliminatorias (configurable).
--
-- El MARCADOR se compara SIEMPRE con el resultado a los 90 minutos
-- (tiempo reglamentario). El alargue y los penales NO cambian el marcador.
-- IMPORTANTE para la integración con la API: guardar en home_score/away_score
-- el resultado de los 90' (score.regularTime), NO el fullTime (que incluye alargue).
--
-- Opcional (config knockout_bonus): +1 punto por acertar quién AVANZA en eliminatorias.
--   - Si el partido se define a los 90' (no es empate), el que avanza = ganador del marcador.
--   - Si quedó empatado a los 90' (alargue o penales), se usa `matches.advancer`.

alter table settings add column if not exists knockout_bonus boolean not null default false;
alter table matches add column if not exists advancer text check (advancer in ('home', 'away'));

drop view if exists leaderboard;
drop view if exists prediction_points;

create view prediction_points with (security_invoker = on) as
select
  p.id as prediction_id,
  p.player_id,
  p.match_id,
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
      -- puntos del marcador (3 / 1 / 0)
      (case
        when p.pred_home = m.home_score and p.pred_away = m.away_score then 3
        when sign(p.pred_home - p.pred_away) = sign(m.home_score - m.away_score) then 1
        else 0
      end)
      +
      -- bonus por avanzar (solo eliminatorias y si está activado)
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

create view leaderboard with (security_invoker = on) as
select
  pl.id           as player_id,
  pl.display_name,
  coalesce(sum(pp.points), 0)                     as total_points,
  count(*) filter (where pp.hit_kind = 'exact')   as exact_count,
  count(*) filter (where pp.hit_kind = 'result')  as result_count
from players pl
left join prediction_points pp on pp.player_id = pl.id
where pl.status = 'approved'
group by pl.id, pl.display_name;

-- Las vistas recreadas necesitan el grant explícito (objetos nuevos no lo heredan).
grant select on prediction_points, leaderboard to service_role;
