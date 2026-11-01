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

/** Acepta "12", "+5" o "-7" sobre el valor actual */
export function applyDelta(current: number, text: string): number {
  const t = text.trim();
  if (!t) return current;
  if (/^[+-]\d+$/.test(t)) return current + parseInt(t, 10);
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? current : n;
}
