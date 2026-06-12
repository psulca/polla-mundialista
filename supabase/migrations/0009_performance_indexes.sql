-- 0009 — Índices de performance para las queries del data layer.
--
-- YA CUBIERTOS por índices/constraints existentes (no se duplican):
--   matches(round_id)        → matches_round_idx (0001)
--   matches(kickoff_at)      → matches_kickoff_idx (0001)
--   predictions(match_id)    → predictions_match_idx (0001)
--   predictions(player_id)   → unique (player_id, match_id) (0001): player_id
--                              es la columna líder del índice único compuesto.
--   round_entries(round_id)  → primary key (round_id, player_id) (0007): round_id
--                              es la columna líder del índice del PK.

-- Lookups de round_entries por jugador (player_id es la SEGUNDA columna del PK,
-- así que el índice del PK no sirve para este filtro).
create index if not exists round_entries_player_id_idx on round_entries (player_id);

-- players filtra por status en admin (pending/approved), visor de partido
-- (approved) y en las vistas leaderboard/round_leaderboard.
create index if not exists players_status_idx on players (status);
