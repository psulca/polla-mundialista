-- 0006 — Realtime para marcadores en vivo.
--
-- Suma `matches` (y `rounds`) a la publicación de Realtime de Supabase. Cuando el
-- cron escribe un marcador nuevo, Supabase empuja el cambio por websocket a TODOS
-- los navegadores conectados → las pantallas se actualizan solas, sin recargar.
-- El anon ya tiene SELECT sobre estas tablas (RLS), así que Realtime respeta el acceso.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rounds'
  ) then
    alter publication supabase_realtime add table rounds;
  end if;
end $$;
