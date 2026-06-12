-- Rate limit del login: frena el fuerza-bruta del PIN sin molestar al que se
-- equivoca de verdad. Política: 5 fallos por número en 15 min → bloqueo de 10 min.
-- Un login exitoso limpia la fila.

create table if not exists login_attempts (
  phone           text primary key,
  fail_count      int not null default 0,
  first_failed_at timestamptz,
  locked_until    timestamptz
);

-- Solo el backend (service_role) toca esta tabla; nadie más.
alter table login_attempts enable row level security;
grant select, insert, update, delete on login_attempts to service_role;
