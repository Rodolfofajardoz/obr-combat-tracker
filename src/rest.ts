import type { Sheet } from "./types";

/** Descanso corto: vuelven los recursos marcados "por descanso corto". Los PG se curan a mano (dados de golpe). */
export const shortRest = (s: Sheet): Partial<Sheet> => ({
  resources: s.resources.map((r) => (r.reset === "short" ? { ...r, cur: r.max } : r)),
});

/** Descanso largo: PG y maná al máximo, PG temporales a cero, todos los recursos llenos y la cuenta de conjuros repetidos en cero */
export const longRest = (s: Sheet): Partial<Sheet> => ({
  hp: s.maxHp,
  tempHp: 0,
  mana: s.maxMana,
  casts: {},
  resources: s.resources.map((r) => ({ ...r, cur: r.max })),
});
