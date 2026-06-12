-- 0005 — Sincronización con API-Football (datos en vivo).
--
-- Arquitectura: las páginas SIEMPRE leen de esta base, NUNCA de la API.
-- Un proceso programado (cron) llama a la API cada cierto tiempo y escribe acá.
-- Así, no importa cuántas veces entren los jugadores: la API se llama una sola vez.
--
-- api_fixture_id: id del partido en API-Football. La primera sync lo resuelve por
--   nombre + fecha y lo guarda; las siguientes hacen match directo por id (rápido).
-- last_sync_at: cuándo corrió la última sincronización (para mostrar en admin).

alter table matches add column if not exists api_fixture_id bigint;
alter table settings add column if not exists last_sync_at timestamptz;

create index if not exists matches_api_fixture_id_idx on matches (api_fixture_id);
