import type { RollMode } from "./types";

const d20 = () => Math.floor(Math.random() * 20) + 1;

export function rollD20(mode: RollMode): { dice: number[]; kept: number } {
  if (mode === "normal") {
    const r = d20();
    return { dice: [r], kept: r };
  }
  const a = d20();
  const b = d20();
  return { dice: [a, b], kept: mode === "adv" ? Math.max(a, b) : Math.min(a, b) };
}

export interface DiceTerm {
  count: number;
  sides: number;
}
export interface ParsedExpr {
  terms: DiceTerm[];
  mod: number;
}

/** "2d6+3 + 1d6 - 1" → dados y bono fijo. Ignora lo que no entienda. */
export function parseExpr(expr: string): ParsedExpr {
  const terms: DiceTerm[] = [];
  let mod = 0;
  const re = /([+-]?)\s*(?:(\d+)d(\d+)|(\d+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr))) {
    const sign = m[1] === "-" ? -1 : 1;
    if (m[2]) terms.push({ count: sign * Number(m[2]), sides: Number(m[3]) });
    else mod += sign * Number(m[4]);
  }
  return { terms, mod };
}

/** Tira una expresión al instante */
export function rollExpr(expr: string): { dice: number[]; mod: number; total: number } {
  const { terms, mod } = parseExpr(expr);
  const dice: number[] = [];
  let sum = 0;
  for (const t of terms) {
    const n = Math.abs(t.count);
    const sign = t.count < 0 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const v = Math.floor(Math.random() * t.sides) + 1;
      dice.push(v);
      sum += sign * v;
    }
  }
  return { dice, mod, total: sum + mod };
}

/** Acepta "12", "+5" o "-7" sobre el valor actual */
export function applyDelta(current: number, text: string): number {
  const t = text.trim();
  if (!t) return current;
  if (/^[+-]\d+$/.test(t)) return current + parseInt(t, 10);
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? current : n;
}
