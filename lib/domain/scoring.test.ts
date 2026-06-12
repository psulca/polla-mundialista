import { describe, it, expect } from "vitest";
import { outcome, scorePrediction, classify } from "./scoring";

describe("outcome", () => {
  it("identifica ganador local, visitante y empate", () => {
    expect(outcome({ home: 2, away: 1 })).toBe("home");
    expect(outcome({ home: 0, away: 3 })).toBe("away");
    expect(outcome({ home: 1, away: 1 })).toBe("draw");
  });
});

describe("scorePrediction", () => {
  it("marcador exacto => 3", () => {
    expect(scorePrediction({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(3);
    expect(scorePrediction({ home: 0, away: 0 }, { home: 0, away: 0 })).toBe(3);
  });

  it("resultado acertado pero marcador distinto => 1", () => {
    // gana local en ambos, distinto marcador
    expect(scorePrediction({ home: 2, away: 0 }, { home: 1, away: 0 })).toBe(1);
    // empate en ambos, distinto marcador
    expect(scorePrediction({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe(1);
    // gana visitante en ambos
    expect(scorePrediction({ home: 0, away: 1 }, { home: 1, away: 3 })).toBe(1);
  });

  it("resultado errado => 0", () => {
    // predijo local, ganó visitante
    expect(scorePrediction({ home: 2, away: 1 }, { home: 0, away: 1 })).toBe(0);
    // predijo empate, ganó local
    expect(scorePrediction({ home: 1, away: 1 }, { home: 2, away: 0 })).toBe(0);
  });

  it("exacto tiene prioridad sobre resultado", () => {
    // un marcador exacto nunca debe contar como simple resultado
    expect(scorePrediction({ home: 3, away: 1 }, { home: 3, away: 1 })).toBe(3);
  });
});

describe("classify", () => {
  it("coincide con la categoría de scorePrediction", () => {
    expect(classify({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe("exact");
    expect(classify({ home: 2, away: 0 }, { home: 1, away: 0 })).toBe("result");
    expect(classify({ home: 2, away: 1 }, { home: 0, away: 1 })).toBe("miss");
  });
});
