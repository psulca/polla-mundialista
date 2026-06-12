-- 0002 — Identidad por número de teléfono.
-- El número es único e identifica al jugador. El nombre es solo una etiqueta
-- para mostrar y PUEDE repetirse (dos personas con el mismo nombre).

alter table players add column if not exists phone text;
alter table players add column if not exists phone_verified boolean not null default false;

-- El nombre deja de ser único.
alter table players drop column if exists display_name_norm;

-- El teléfono es la identidad única.
create unique index if not exists players_phone_key on players (phone);
