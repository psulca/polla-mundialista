-- 0004 — Código de país para banderas SVG (flag-icons).
--
-- Las banderas dejan de ser emoji (se ven distinto en cada dispositivo y las del
-- Reino Unido quedan rotas) y pasan a SVG auto-alojados. flag-icons usa el código
-- ISO2 en minúscula (pe, ar, br...) y subdivisiones para UK (gb-eng, gb-sct, gb-wls).
-- El seed llena esta columna; flag_emoji queda como respaldo histórico.

alter table teams add column if not exists country_code text;
