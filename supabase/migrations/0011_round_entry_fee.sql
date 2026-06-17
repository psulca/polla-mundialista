-- 0011 — Precio de inscripción POR FECHA (antes era un global fijo de 10 en el código).
-- Cada ronda tiene su propio monto; el pozo de la ronda = inscritos × entry_fee.
alter table rounds add column if not exists entry_fee int not null default 10;
