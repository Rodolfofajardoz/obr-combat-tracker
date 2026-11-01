import OBR from "@owlbear-rodeo/sdk";
import { PLUGIN_ID, Sheet, Spell } from "./types";

/** Costo de maná por nivel: Sistema de Maná del Tejido */
export const MANA_COST: Record<number, number> = { 0: 0, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 11, 8: 13, 9: 15 };

/** Costo real: base, más 1 por repetición en el combate si la mesa usa esa regla. Los trucos siempre son gratis. */
export function castCost(spell: Spell, sheet: Sheet, repeatCost: boolean): number {
  if (spell.level === 0) return 0;
  return (MANA_COST[spell.level] ?? 0) + (repeatCost ? sheet.casts[spell.name] ?? 0 : 0);
}

export const SPELL_CHANNEL = `${PLUGIN_ID}/cast`;
export const CARD_POPOVER_ID = `${PLUGIN_ID}/card`;

/** Lo que viaja a todos cuando alguien lanza un conjuro: la tarjeta completa */
export interface CastMessage {
  caster: string;
  by: string;
  cost: number;
  spell: Spell & { fullDesc: string; higher: string };
  at: number;
}

export const broadcastCast = (msg: CastMessage) =>
  OBR.broadcast.sendMessage(SPELL_CHANNEL, msg, { destination: "ALL" });

export const onCast = (cb: (msg: CastMessage) => void) =>
  OBR.broadcast.onMessage(SPELL_CHANNEL, (ev) => cb(ev.data as CastMessage));

// ---------- SRD (Open5e) ----------

const SPELLS_URL = "https://api.open5e.com/v1/spells/";

interface Open5eSpell {
  name: string;
  slug: string;
  level_int: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  material: string;
  duration: string;
  concentration: string;
  ritual: string;
  desc: string;
  higher_level: string;
}

const short = (s: string, n: number) => {
  const d = (s ?? "").replace(/\s+/g, " ").trim();
  return d.length <= n ? d : d.slice(0, n - 1).trimEnd() + "…";
};

function toSpell(s: Open5eSpell): Spell {
  return {
    name: s.name,
    slug: s.slug,
    level: Number(s.level_int) || 0,
    school: s.school,
    time: s.casting_time,
    range: s.range,
    duration: s.duration,
    components: s.components + (s.material ? ` (${short(s.material, 60)})` : ""),
    concentration: s.concentration === "yes",
    ritual: s.ritual === "yes",
    desc: short(s.desc, 280),
  };
}

export async function searchSpells(query: string): Promise<Spell[]> {
  const q = query.trim();
  if (!q) return [];
  const r = await fetch(`${SPELLS_URL}?search=${encodeURIComponent(q)}&document__slug=wotc-srd&limit=20`);
  if (!r.ok) throw new Error(`Open5e respondió ${r.status}`);
  const data = (await r.json()) as { results: Open5eSpell[] };
  return data.results.map(toSpell).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

const fullCache = new Map<string, { fullDesc: string; higher: string }>();

/** Descripción completa para la tarjeta; si el SRD no responde, usa la recortada */
export async function fetchSpellFull(spell: Spell): Promise<{ fullDesc: string; higher: string }> {
  const hit = fullCache.get(spell.slug);
  if (hit) return hit;
  try {
    const r = await fetch(`${SPELLS_URL}${encodeURIComponent(spell.slug)}/`);
    if (!r.ok) throw new Error(String(r.status));
    const s = (await r.json()) as Open5eSpell;
    const full = { fullDesc: short(s.desc, 1600), higher: short(s.higher_level, 400) };
    fullCache.set(spell.slug, full);
    return full;
  } catch {
    return { fullDesc: spell.desc, higher: "" };
  }
}

export const levelLabel = (level: number) =>
  level === 0 ? "Cantrip" : `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"} level`;
