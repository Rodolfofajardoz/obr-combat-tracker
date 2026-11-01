import type { Action, Resource } from "./types";

/**
 * Si el nombre de un rasgo dice cuántas veces se usa — "Tomar Aliento (1/Descanso corto)", "Fury (2/Day)",
 * "Leadership (Recharges after a Short or Long Rest)" — lo convierte en un recurso contable. "Recarga 5–6" no cuenta: eso se tira.
 */
const USES = /\((\d+)\s*\/\s*([^)]+)\)/i;
const RECHARGES = /\(recharges? after a ([^)]+)\)/i;
export function resourceFromName(name: string, desc = ""): Resource | undefined {
  const uses = name.match(USES);
  const rech = name.match(RECHARGES);
  const when = (uses?.[2] ?? rech?.[1] ?? "").toLowerCase();
  if (!when) return undefined;
  const shortRest = /corto|short|combate|combat|encuentro|encounter/.test(when);
  const longRest = /largo|long|sesi|session|d[ií]a|day|rest/.test(when);
  if (!shortRest && !longRest) return undefined;
  const max = Number(uses?.[1] ?? 1) || 1;
  const r: Resource = { name: name.replace(USES, "").replace(RECHARGES, "").trim(), cur: max, max, reset: shortRest ? "short" : "long" };
  if (desc.trim()) r.note = short(desc, 300);
  return r;
}

/** Saca del texto de una acción lo que se puede tirar: bono de ataque, daño y salvación. Español e inglés. */
const DICE = /\d+d\d+(?:\s*[+-]\s*\d+)?/gi;
const TO_HIT = /\+\s*(\d+)\s*(?:al\s+(?:ataque|golpe)|to\s+hit)|(?:ataque|attack)\s*\+\s*(\d+)/i;
const SAVE =
  /(?:salvaci[oó]n\s+de\s+)?([A-Za-zÁÉÍÓÚáéíóú]+)\s+(?:CD|DC)\s*(\d+)|(?:CD|DC)\s*(\d+)\s+([A-Za-zÁÉÍÓÚáéíóú]+)|(?:CD|DC)\s*(\d+)/i;

const short = (s: string, n = 220) => {
  const d = (s ?? "").replace(/\s+/g, " ").trim();
  return d.length <= n ? d : d.slice(0, n - 1).trimEnd() + "…";
};

export function parseAction(name: string, desc: string, hint?: { toHit?: number | null; dice?: string; bonus?: number | null }): Action {
  const a: Action = { name: name.trim(), desc: short(desc) };
  const th = desc.match(TO_HIT);
  if (hint?.toHit != null) a.toHit = Number(hint.toHit);
  else if (th) a.toHit = Number(th[1] ?? th[2]);

  if (hint?.dice) {
    a.damage = hint.dice.replace(/\s/g, "") + (hint.bonus ? (hint.bonus > 0 ? `+${hint.bonus}` : `${hint.bonus}`) : "");
  } else {
    // Suma los dados encadenados ("2d6+3 cortante más 1d6 fuerza"); se detiene en una alternativa ("…, o 1d10+3 a dos manos")
    const parts: string[] = [];
    let last = -1;
    for (const m of desc.matchAll(DICE)) {
      if (parts.length && /\b(o|or|vers[aá]til|versatile)\b/i.test(desc.slice(last, m.index))) break;
      parts.push(m[0].replace(/\s/g, ""));
      last = (m.index ?? 0) + m[0].length;
      if (parts.length === 3) break;
    }
    if (parts.length) a.damage = parts.join(" + ");
  }

  const sv = desc.match(SAVE);
  if (sv) {
    const ability = sv[1] ?? sv[4];
    const dc = sv[2] ?? sv[3] ?? sv[5];
    a.save = ability && !/^(o|or|de|the)$/i.test(ability) ? `${ability} DC ${dc}` : `DC ${dc}`;
  }
  return a;
}
