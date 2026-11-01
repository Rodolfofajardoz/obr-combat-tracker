import { Profile, findProfile, norm } from "./profiles";
import { ABILITIES, Ability, Action, ProfLevel, Resource, SKILLS, Trait, TraitKind, mod } from "./types";
import { parseAction, resourceFromName } from "./actions";

/** Entrada del catálogo: un perfil más de dónde salió */
export interface CatalogEntry extends Profile {
  source: string;
  cr: string;
  /** PJ y aliados: nivel en vez de CR */
  level?: number;
}

/** "CR 3" para criaturas, "lvl 3" para PJ y aliados */
export const catalogTag = (e: CatalogEntry) => (e.level ? `lvl ${e.level}` : `CR ${e.cr}`);

// ---------- catálogo de la campaña (public/catalogo.json, generado desde el vault) ----------

let catalogPromise: Promise<CatalogEntry[]> | null = null;

export function loadCatalog(): Promise<CatalogEntry[]> {
  if (!catalogPromise) {
    catalogPromise = fetch(`${import.meta.env.BASE_URL}catalogo.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }
  return catalogPromise;
}

/** Busca por nombre primero en los perfiles de la sala y luego en el catálogo */
export function findAnyProfile(profiles: Profile[], catalog: Profile[], name: string): Profile | undefined {
  return findProfile(profiles, name) ?? findProfile(catalog, name);
}

export function filterCatalog(list: CatalogEntry[], query: string): CatalogEntry[] {
  const q = norm(query);
  if (!q) return list;
  return list.filter((e) => norm(`${e.name} ${e.source} ${catalogTag(e)}`).includes(q));
}

// ---------- SRD (Open5e) ----------

const SRD_URL = "https://api.open5e.com/v1/monsters/";

interface Open5eMonster {
  name: string;
  slug: string;
  size: string;
  type: string;
  armor_class: number;
  hit_points: number;
  challenge_rating: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  strength_save: number | null;
  dexterity_save: number | null;
  constitution_save: number | null;
  intelligence_save: number | null;
  wisdom_save: number | null;
  charisma_save: number | null;
  skills: Record<string, number>;
  speed: Record<string, number | boolean>;
  senses: string;
  damage_resistances: string;
  damage_immunities: string;
  damage_vulnerabilities: string;
  condition_immunities: string;
  special_abilities: { name: string; desc: string }[] | string;
  actions: { name: string; desc: string; attack_bonus?: number | null; damage_dice?: string; damage_bonus?: number | null }[] | string;
  reactions: { name: string; desc: string }[] | string;
  legendary_actions: { name: string; desc: string }[] | string;
}

const SAVE_FIELD: Record<Ability, keyof Open5eMonster> = {
  str: "strength_save",
  dex: "dexterity_save",
  con: "constitution_save",
  int: "intelligence_save",
  wis: "wisdom_save",
  cha: "charisma_save",
};
const SCORE_FIELD: Record<Ability, keyof Open5eMonster> = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma",
};
// Open5e usa nombres ingleses en minúscula; algunos con espacio
const SRD_SKILL: Record<string, string> = {
  acrobatics: "acrobatics",
  arcana: "arcana",
  athletics: "athletics",
  deception: "deception",
  history: "history",
  insight: "insight",
  intimidation: "intimidation",
  performance: "performance",
  investigation: "investigation",
  "sleight of hand": "sleight",
  medicine: "medicine",
  nature: "nature",
  perception: "perception",
  persuasion: "persuasion",
  religion: "religion",
  stealth: "stealth",
  survival: "survival",
  "animal handling": "animal",
};

export function profFromCr(cr: string | number): number {
  const s = String(cr);
  const c = s.includes("/") ? Number(s.split("/")[0]) / Number(s.split("/")[1]) : Number(s);
  if (Number.isNaN(c)) return 2;
  return c < 5 ? 2 : c < 9 ? 3 : c < 13 ? 4 : c < 17 ? 5 : c < 21 ? 6 : c < 25 ? 7 : c < 29 ? 8 : 9;
}

const short = (s: string, n = 170) => {
  const d = s.replace(/\s+/g, " ").trim();
  return d.length <= n ? d : d.slice(0, n - 1).trimEnd() + "…";
};

export function srdToProfile(m: Open5eMonster): CatalogEntry {
  const abilities = {} as Record<Ability, number>;
  for (const a of ABILITIES) abilities[a] = Number(m[SCORE_FIELD[a]]) || 10;
  const prof = profFromCr(m.challenge_rating);

  const saveProf: Partial<Record<Ability, boolean>> = {};
  for (const a of ABILITIES) if (m[SAVE_FIELD[a]] != null) saveProf[a] = true;

  const skillProf: Partial<Record<string, ProfLevel>> = {};
  const mismatches: string[] = [];
  for (const [k, bonus] of Object.entries(m.skills ?? {})) {
    const key = SRD_SKILL[k.toLowerCase()];
    if (!key) continue;
    const sk = SKILLS.find((s) => s.key === key)!;
    const base = mod(abilities[sk.ability]);
    const lvl: ProfLevel = Math.abs(base + prof - bonus) <= Math.abs(base + 2 * prof - bonus) ? 1 : 2;
    skillProf[key] = lvl;
    if (base + lvl * prof !== bonus) mismatches.push(`${sk.label} +${bonus}`);
  }

  const speed = Object.entries(m.speed ?? {})
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  const notes = [
    [`CR ${m.challenge_rating}`, `${m.size} ${m.type}`.trim()].filter(Boolean).join(" · "),
    mismatches.length && `Bonos del SRD que no cuadran con la fórmula: ${mismatches.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1500);

  // Rasgos de lectura: datos fijos y pasivas / reacciones / legendarias (las acciones van aparte, tirables)
  const info = (name: string, desc: string | undefined): Trait[] => (desc ? [{ name, desc, kind: "info" }] : []);
  const list = (kind: TraitKind, items: Open5eMonster["reactions"]): Trait[] =>
    Array.isArray(items) ? items.map((a) => ({ name: a.name, desc: short(a.desc, 400), kind })) : [];
  const traits: Trait[] = [
    ...info("Speed", speed),
    ...info("Senses", m.senses),
    ...info("Resistances", m.damage_resistances),
    ...info("Immunities", m.damage_immunities),
    ...info("Vulnerabilities", m.damage_vulnerabilities),
    ...info("Condition immunities", m.condition_immunities),
    ...list("trait", m.special_abilities),
    ...list("reaction", m.reactions),
    ...list("legendary", m.legendary_actions),
  ];

  // Acciones tirables: el SRD ya trae bono y dados; lo demás se saca del texto
  const actions: Action[] = Array.isArray(m.actions)
    ? m.actions.map((a) => parseAction(a.name, a.desc, { toHit: a.attack_bonus, dice: a.damage_dice, bonus: a.damage_bonus }))
    : [];
  // Rasgos con usos contados ("Leadership (Recharges after a Short or Long Rest)") se vuelven recursos
  const resources = [...(Array.isArray(m.special_abilities) ? m.special_abilities : []), ...(Array.isArray(m.actions) ? m.actions : [])]
    .map((a) => resourceFromName(a.name, a.desc))
    .filter((r): r is Resource => !!r);

  return {
    name: m.name,
    source: "SRD",
    cr: String(m.challenge_rating),
    abilities,
    ac: Number(m.armor_class) || 10,
    maxHp: Number(m.hit_points) || 10,
    prof,
    initBonus: 0,
    saveProf,
    skillProf,
    notes,
    actions,
    resources,
    traits,
  };
}

export async function searchSrd(query: string): Promise<CatalogEntry[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${SRD_URL}?search=${encodeURIComponent(q)}&document__slug=wotc-srd&limit=25`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open5e respondió ${r.status}`);
  const data = (await r.json()) as { results: Open5eMonster[] };
  return data.results.map(srdToProfile);
}
