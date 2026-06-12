# Polla Mundial 2026 — Diseño de Producto y UX/UI

> Documento de diseño. Fuente de verdad antes de escribir código.
> Grupo cerrado de amigos. Predicciones de marcadores por fecha/ronda del Mundial 2026.

---

## 1. Reglas de producto (lo que NO se negocia)

### Puntaje
- **Marcador exacto** (local y visitante exactos): **3 puntos**.
- **Resultado acertado** (mismo ganador, o empate): **1 punto**.
- **Errado**: 0 puntos.

> El puntaje NO se guarda en tabla. Se calcula en una **vista** de Postgres sobre
> `predictions` + `matches`. Solo cuentan partidos con `status = finished`.

### Identidad y membresía
- Registro: **Nombre + PIN de 4 dígitos.** Sin email, sin teléfono, sin SMS.
- Membresía con pago (10 soles, gestionado FUERA de la app, por WhatsApp):
  - El jugador se registra → queda **`pending`**.
  - Paga y manda pantallazo al grupo de WhatsApp.
  - El **admin lo aprueba** → **`approved`**. Solo los `approved` pueden predecir.

### Los dos relojes (concepto central)
| Reloj | Qué hace | Cuándo dispara |
|---|---|---|
| **🔒 Bloqueo** | Congela la edición de la predicción | Según `lock_mode` (toggle admin) |
| **👁️ Revelado** | Las predicciones ajenas se vuelven visibles | SIEMPRE en el kickoff de cada partido |

- **`lock_mode` (toggle global, admin):**
  - `per_match`: cada predicción se bloquea en el kickoff de su propio partido. *(default)*
  - `per_matchday`: toda la ronda se bloquea al iniciar su primer partido.
- **Anti-cheat:** tu predicción es visible solo para vos hasta el kickoff. Imposible copiar
  o cambiar tras el bloqueo. Al kickoff todos ven todo, en tiempo real.

### Todo lo crítico se valida en el SERVIDOR
- Cierre y revelado se evalúan con la **hora del servidor**, nunca la del navegador.
- Reforzado con RLS en Supabase + validación en Server Action.

---

## 2. Estructura del torneo (Mundial 2026 — 48 selecciones)

**Fase de grupos**
- 12 grupos (A–L) de 4 equipos = 48 selecciones.
- 3 jornadas (round-robin). 24 partidos por jornada → **72 partidos**.

**Fase eliminatoria** (rondas de bracket, NO round-robin)
- Round of 32: 2 primeros de cada grupo (24) + 8 mejores terceros = 32 → 16 partidos.
- Octavos (R16): 8 · Cuartos: 4 · Semis: 2 · Tercer puesto: 1 · Final: 1 → **32 partidos**.

**Total: 104 partidos.** Los cruces de eliminatoria se resuelven solos cuando la API
actualiza el fixture (no se hardcodea el bracket).

### Concepto de "fecha/ronda"
Las "fechas" que el admin abre son **rounds**:
`Fecha 1 · Fecha 2 · Fecha 3 · Octavos (R32) · Octavos (R16) · Cuartos · Semis · Final`.

---

## 3. Estrategia de datos (clave del rendimiento y costo)

> Para PUNTUAR solo se necesita el **marcador final**, no el minuto a minuto.
> El "en vivo" del visor es cosmético y degrada con gracia.

| Necesidad | Fuente |
|---|---|
| Equipos, grupos, banderas, fixtures, horarios (seed) | `openfootball/worldcup.json` (gratis, sin key, dominio público) |
| Resultados finales | `football-data.org` free (incluye Mundial, 10 req/min), poleado por **Vercel Cron** |
| Red de seguridad | **Override manual del admin** (`source = manual` gana sobre `api`) |

**Pipeline de auto-scoring:**
1. Vercel Cron poll cada N min durante rondas activas → actualiza `matches` (score, status).
2. La vista de puntos recalcula sola.
3. Supabase Realtime empuja leaderboard y visor a todos los clientes.
4. El admin puede sobrescribir cualquier marcador en cualquier momento.

---

## 4. Modelo de datos

```
teams        (id, ext_id, name, code, flag_url, group_letter)
matches      (id, ext_id,
              stage,          -- group | r32 | r16 | qf | sf | third | final
              matchday,       -- 1..3 en grupos; null en knockout
              round_id,       -- FK a rounds
              group_letter,   -- A..L en grupos; null en knockout
              home_team_id, away_team_id,   -- null/placeholder hasta resolver bracket
              kickoff_at,
              home_score, away_score,
              status,         -- scheduled | live | finished
              source)         -- api | manual
rounds       (id, key, label, is_open)   -- "fechas" que abre el admin
players      (id, display_name UNIQUE, pin_hash, status, is_admin)
                                          -- status: pending | approved
predictions  (id, player_id, match_id, pred_home, pred_away, updated_at)
              UNIQUE(player_id, match_id)
settings     (lock_mode)                  -- per_match | per_matchday
```

**Derivados (vistas), no tablas:**
- `match_deadline` → según `lock_mode`.
- `prediction_points` → 3 / 1 / 0 por predicción de partido finalizado.
- `leaderboard` → SUM de puntos + COUNT exactos + COUNT resultados, por jugador.

**Reglas de escritura de predicción (servidor):** se acepta solo si
`player.status = approved` Y `round.is_open` Y `now() < match_deadline`.

---

## 5. Mapa de pantallas

```
/login            Registro / ingreso (nombre + PIN)
/                 Home — estado de la ronda activa + accesos
/predicciones     Cargar / editar marcadores de la ronda abierta
/visor            Visor en vivo — marcadores reales + revelado de picks
/visor/[match]    Detalle de partido — todas las predicciones + puntos
/ranking          Leaderboard (tabs: general / exactos / resultados)
/admin            Solo organizador (ver §7)
```

Navegación mobile (bottom tab bar): **Home · Predicciones · Visor · Ranking**.

---

## 6. Detalle por pantalla

### 6.1 `/login` — Registro / Ingreso
- Input grande de **nombre** + **PIN de 4 dígitos** (teclado numérico).
- Nombre nuevo → registro (queda `pending`). Existente → pide PIN.
- Si `pending`: pantalla "Esperando aprobación del admin · paga e informa por WhatsApp".

### 6.2 `/` — Home
- **Hero de la ronda activa** con `CountdownBadge`: abierta (cierra en `hh:mm:ss`) /
  en juego / cerrada.
- Si está `pending`: banner de "tu acceso está pendiente de aprobación".
- **Tu estado**: "Cargaste 6/8 predicciones" → CTA **Completar predicciones**.
- Accesos rápidos: Visor · Ranking.

### 6.3 `/predicciones` — Cargar marcadores (input clave)
- Solo rondas con `is_open = true`. Lista de partidos. Cada `MatchCard`:
  - `🇦🇷 ARG  [ - ]  vs  [ - ]  URU 🇺🇾` + hora + mini-countdown de cierre.
  - `ScoreStepper`: input numérico grande con +/- (tap-friendly).
- **Autosave por partido** + indicador "Guardado ✓".
- Partido bloqueado → **🔒 candado**, no editable, muestra tu pick congelado.
- En knockout sin cruce resuelto aún: tarjeta "por definir".

### 6.4 `/visor` — Visor en vivo
- Partidos de la ronda con **marcador real** + `StatusPill` (scheduled/live/finished).
- **Revelado:** antes del kickoff las predicciones ajenas están ocultas
  (`🔒 Se revela al iniciar · 8 ya predijeron`). La tuya siempre visible.
- Al kickoff se revelan todas, en tiempo real (Supabase Realtime).

### 6.5 `/visor/[match]` — Detalle de partido
- Marcador real grande + status.
- Grilla de **todas las predicciones**: `Nombre · 2-1 · 🟡 +3 / +1 / 0`.
- Filtros: **Marcador exacto** · **Solo resultado** · **Todos**.

### 6.6 `/ranking` — Leaderboard
- Tabs: **General** · **Marcadores exactos** · **Resultados**.
- `LeaderboardRow`: `# · Nombre · Puntos · (X exactos · Y resultados)`. Resalta al usuario.
- Actualización en vivo a medida que entran resultados.

### 6.7 `/admin` — Organizador
- **Participantes**: lista de `pending` → botón **Aprobar** / Rechazar.
- **Rondas**: abrir/cerrar cada fecha o ronda (`is_open`).
- **Marcadores**: override manual de score + status por partido.
- **Ajustes**: toggle `lock_mode` (per_match ⇄ per_matchday).
- **Sync**: estado del último poll de la API (seed/refresh fixtures y resultados).
- Acceso restringido por `is_admin`.

---

## 7. Sistema visual

- **Mobile-first**, dark mode por defecto. Vibe mundialista, banderas, verde cancha.
- **Acento dorado** reservado SOLO para el marcador exacto (3 pts) — que se sienta especial.
- Números tabulares para marcadores y rankings alineados.
- Animación de "flip" en el revelado al kickoff.

### Componentes reutilizables
`MatchCard` · `ScoreStepper` · `CountdownBadge` · `RevealLock` · `PredictionRow` ·
`LeaderboardRow` · `StatusPill`

---

## 8. Estados a diseñar (no olvidar ninguno)
- **Empty** (sin predicciones / sin puntos) · **Pendiente** (membresía no aprobada) ·
  **Abierto** · **Bloqueado** · **En vivo** · **Finalizado** · **Por definir** (cruce knockout no resuelto).

---

## 9. Flujo completo

1. Me registro (nombre + PIN) → quedo `pending`.
2. Pago 10 soles, mando pantallazo por WhatsApp → admin me **aprueba**.
3. Admin **abre la Fecha 1**. Cargo mis marcadores (autosave).
4. Llega el kickoff → mi predicción se bloquea y se revela a todos.
5. La API (o el admin) carga marcadores → visor y ranking se actualizan solos.
6. Reviso quién acertó exacto / solo resultado. El ranking premia a ambos.
7. El admin abre la siguiente ronda. Se repite hasta la Final.
```

---

## Fuentes consultadas (APIs)
- openfootball/worldcup.json — https://github.com/openfootball/worldcup.json
- football-data.org coverage/pricing — https://www.football-data.org/coverage
- worldcup2026 (community API) — https://github.com/rezarahiminia/worldcup2026
