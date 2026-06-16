-- Minuto del partido en vivo (e.g. "45", "HT"). Null si no está en juego.
alter table matches add column if not exists live_minute text null;
