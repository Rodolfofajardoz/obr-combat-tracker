import OBR from "@owlbear-rodeo/sdk";
import { PLUGIN_ID, Sheet, Spell } from "./types";

/** Costo de maná por nivel: Sistema de Maná del Tejido */
export const MANA_COST: Record<number, number> = { 0: 0, 1: 2, 2: 3, 3: 5, 4: 6, 5: 7, 6: 9, 7: 11, 8: 13, 9: 15 };

/**
 * Costo real: el del nivel al que se lanza (un conjuro se puede lanzar a nivel superior), más 1 por
 * repetición en el combate si la mesa usa esa regla. Los trucos siempre son gratis.
 */
export function castCost(spell: Spell, sheet: Sheet, repeatCost: boolean, level = spell.level): number {
  if (spell.level === 0) return 0;
  return (MANA_COST[level] ?? 0) + (repeatCost ? sheet.casts[spell.name] ?? 0 : 0);
}

export const SPELL_CHANNEL = `${PLUGIN_ID}/cast`;
export const CARD_POPOVER_ID = `${PLUGIN_ID}/card`;
/** Cuánto vive la tarjeta en pantalla */
export const CARD_LIFE_MS = 14000;
/** Distancia del borde de abajo de la pantalla a la tarjeta: deja libre la barra de herramientas */
export const CARD_BOTTOM_GAP = 72;

/** Lo que viaja a todos cuando alguien lanza un conjuro: la tarjeta completa */
export interface CastMessage {
  caster: string;
  by: string;
  cost: number;
  /** Nivel al que se lanzó; mayor que spell.level cuando se lanza a nivel superior */
  level?: number;
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

// SRD 5.2 (reglas 2024) vive en la API v2; sus slugs se guardan como "v2:<key>" para saber de dónde traer la tarjeta
const SPELLS_V2_URL = "https://api.open5e.com/v2/spells/";

interface Open5eSpellV2 {
  key: string;
  name: string;
  level: number;
  school: { name: string } | string;
  casting_time: string;
  range_text: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  material_specified: string;
  desc: string;
  higher_level: string;
}

function toSpellV2(s: Open5eSpellV2): Spell {
  const comps = [s.verbal && "V", s.somatic && "S", s.material && "M"].filter(Boolean).join(", ");
  return {
    name: s.name,
    slug: `v2:${s.key}`,
    level: Number(s.level) || 0,
    school: typeof s.school === "string" ? s.school : s.school?.name ?? "",
    time: s.casting_time,
    range: s.range_text,
    duration: s.duration,
    components: comps + (s.material_specified ? ` (${short(s.material_specified, 60)})` : ""),
    concentration: !!s.concentration,
    ritual: !!s.ritual,
    desc: short(s.desc, 280),
  };
}

/** Busca primero en el SRD 5.1 (v1); si no hay nada, en el SRD 5.2 de 2024 (v2), que trae Chromatic Orb, Ice Knife… */
export async function searchSpells(query: string): Promise<Spell[]> {
  const q = query.trim();
  if (!q) return [];
  const r = await fetch(`${SPELLS_URL}?search=${encodeURIComponent(q)}&document__slug=wotc-srd&limit=20`);
  if (!r.ok) throw new Error(`Open5e respondió ${r.status}`);
  const data = (await r.json()) as { results: Open5eSpell[] };
  let list = data.results.map(toSpell);
  if (!list.length) {
    const r2 = await fetch(`${SPELLS_V2_URL}?name__icontains=${encodeURIComponent(q)}&document__key=srd-2024&limit=20`);
    if (r2.ok) list = ((await r2.json()) as { results: Open5eSpellV2[] }).results.map(toSpellV2);
  }
  return list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

export interface SpellFull {
  fullDesc: string;
  higher: string;
}

const fullCache = new Map<string, SpellFull>();
const inflight = new Map<string, Promise<SpellFull>>();

/** Texto completo si ya se trajo (o el conjuro es local); null si habría que pedirlo a Open5e */
export function cachedSpellFull(spell: Spell): SpellFull | null {
  if (spell.slug.startsWith("local:")) return { fullDesc: spell.desc, higher: "" };
  return fullCache.get(spell.slug) ?? null;
}

/** Trae por adelantado los textos de una lista (los que falten), de pocos en pocos para no saturar Open5e */
export function prefetchSpellFull(spells: Spell[]): void {
  const pending = spells.filter((sp) => !cachedSpellFull(sp));
  let i = 0;
  const next = (): Promise<void> => {
    const sp = pending[i++];
    return sp ? fetchSpellFull(sp).then(next, next) : Promise.resolve();
  };
  for (let k = 0; k < 3; k++) void next();
}

/** Descripción completa para la tarjeta; si el SRD no responde (o el conjuro es local), usa la de la hoja */
export function fetchSpellFull(spell: Spell): Promise<SpellFull> {
  const hit = cachedSpellFull(spell);
  if (hit) return Promise.resolve(hit);
  // Dos pedidos del mismo conjuro a la vez comparten una sola petición
  let p = inflight.get(spell.slug);
  if (!p) {
    p = fetchFull(spell).finally(() => inflight.delete(spell.slug));
    inflight.set(spell.slug, p);
  }
  return p;
}

async function fetchFull(spell: Spell): Promise<SpellFull> {
  try {
    let full: SpellFull;
    if (spell.slug.startsWith("v2:")) {
      const r = await fetch(`${SPELLS_V2_URL}${encodeURIComponent(spell.slug.slice(3))}/`);
      if (!r.ok) throw new Error(String(r.status));
      const s = (await r.json()) as Open5eSpellV2;
      full = { fullDesc: short(s.desc, 1600), higher: short(s.higher_level, 400) };
    } else {
      const r = await fetch(`${SPELLS_URL}${encodeURIComponent(spell.slug)}/`);
      if (!r.ok) throw new Error(String(r.status));
      const s = (await r.json()) as Open5eSpell;
      full = { fullDesc: short(s.desc, 1600), higher: short(s.higher_level, 400) };
    }
    fullCache.set(spell.slug, full);
    return full;
  } catch {
    return { fullDesc: spell.desc, higher: "" };
  }
}

export const levelLabel = (level: number) =>
  level === 0 ? "Cantrip" : `${level}${level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th"} level`;
