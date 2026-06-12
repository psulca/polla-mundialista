import { describe, it, expect } from "vitest";
import { lockAt, isLocked, isRevealed, canSubmitPrediction } from "./locking";

const FIRST = new Date("2026-06-15T18:00:00Z"); // primer partido de la ronda
const THIS = new Date("2026-06-15T21:00:00Z"); // este partido (3h después)

const timing = { kickoffAt: THIS, roundFirstKickoffAt: FIRST };

describe("lockAt", () => {
  it("per_match usa el kickoff del propio partido", () => {
    expect(lockAt(timing, "per_match").getTime()).toBe(THIS.getTime());
  });
  it("per_matchday usa el primer partido de la ronda", () => {
    expect(lockAt(timing, "per_matchday").getTime()).toBe(FIRST.getTime());
  });
});

describe("isLocked", () => {
  it("per_match: bloquea recién en el kickoff propio", () => {
    expect(isLocked(timing, "per_match", new Date("2026-06-15T20:59:59Z"))).toBe(false);
    expect(isLocked(timing, "per_match", new Date("2026-06-15T21:00:00Z"))).toBe(true);
  });
  it("per_matchday: bloquea al arrancar el primer partido de la ronda", () => {
    // a las 18:30 el primer partido ya arrancó => bloqueado, aunque este sea a las 21
    expect(isLocked(timing, "per_matchday", new Date("2026-06-15T18:30:00Z"))).toBe(true);
    expect(isLocked(timing, "per_matchday", new Date("2026-06-15T17:59:59Z"))).toBe(false);
  });
});

describe("isRevealed", () => {
  it("revela siempre en el kickoff del partido, sin importar el modo", () => {
    expect(isRevealed(THIS, new Date("2026-06-15T20:59:59Z"))).toBe(false);
    expect(isRevealed(THIS, new Date("2026-06-15T21:00:00Z"))).toBe(true);
  });
});

describe("canSubmitPrediction", () => {
  const now = new Date("2026-06-15T12:00:00Z"); // antes de todo
  it("permite si la ronda está abierta y no está bloqueado", () => {
    expect(canSubmitPrediction({ timing, mode: "per_match", roundIsOpen: true, now })).toBe(true);
  });
  it("rechaza si la ronda está cerrada", () => {
    expect(canSubmitPrediction({ timing, mode: "per_match", roundIsOpen: false, now })).toBe(false);
  });
  it("rechaza si ya está bloqueado aunque la ronda esté abierta", () => {
    const late = new Date("2026-06-15T21:30:00Z");
    expect(canSubmitPrediction({ timing, mode: "per_match", roundIsOpen: true, now: late })).toBe(false);
  });
});
