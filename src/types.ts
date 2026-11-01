export const PLUGIN_ID = "com.eljuicio.combat-tracker";
export const SHEET_KEY = `${PLUGIN_ID}/sheet`;
export const COMBAT_KEY = `${PLUGIN_ID}/combat`;
export const ROLL_CHANNEL = `${PLUGIN_ID}/roll`;

export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";
export const ABILITIES: Ability[] = ["str", "dex", "con", "int", "wis", "cha"];
export const ABILITY_LABEL: Record<Ability, string> = {
  str: "FUE",
  dex: "DES",
  con: "CON",
  int: "INT",
  wis: "SAB",
  cha: "CAR",
};
export const ABILITY_NAME: Record<Ability, string> = {
  str: "Fuerza",
  dex: "Destreza",
  con: "Constitución",
  int: "Inteligencia",
  wis: "Sabiduría",
  cha: "Carisma",
};

export interface Skill {
  key: string;
  /** etiqueta en español */
  label: string;
  /** etiqueta en inglés */
  en: string;
  ability: Ability;
}
export const SKILLS: Skill[] = [
  { key: "acrobatics", label: "Acrobacias", en: "Acrobatics", ability: "dex" },
  { key: "arcana", label: "Arcanos", en: "Arcana", ability: "int" },
  { key: "athletics", label: "Atletismo", en: "Athletics", ability: "str" },
  { key: "deception", label: "Engaño", en: "Deception", ability: "cha" },
  { key: "history", label: "Historia", en: "History", ability: "int" },
  { key: "insight", label: "Perspicacia", en: "Insight", ability: "wis" },
  { key: "intimidation", label: "Intimidación", en: "Intimidation", ability: "cha" },
  { key: "performance", label: "Interpretación", en: "Performance", ability: "cha" },
  { key: "investigation", label: "Investigación", en: "Investigation", ability: "int" },
  { key: "sleight", label: "Juego de manos", en: "Sleight of Hand", ability: "dex" },
  { key: "medicine", label: "Medicina", en: "Medicine", ability: "wis" },
  { key: "nature", label: "Naturaleza", en: "Nature", ability: "int" },
  { key: "perception", label: "Percepción", en: "Perception", ability: "wis" },
  { key: "persuasion", label: "Persuasión", en: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religión", en: "Religion", ability: "int" },
  { key: "stealth", label: "Sigilo", en: "Stealth", ability: "dex" },
  { key: "survival", label: "Supervivencia", en: "Survival", ability: "wis" },
  { key: "animal", label: "Trato con animales", en: "Animal Handling", ability: "wis" },
];

/** Los estados se guardan por clave; la etiqueta depende del idioma */
export interface Condition {
  key: string;
  es: string;
  en: string;
}
export const CONDITIONS: Condition[] = [
  { key: "grappled", es: "Agarrado", en: "Grappled" },
  { key: "restrained", es: "Apresado", en: "Restrained" },
  { key: "frightened", es: "Asustado", en: "Frightened" },
  { key: "stunned", es: "Aturdido", en: "Stunned" },
  { key: "blinded", es: "Cegado", en: "Blinded" },
  { key: "concentrating", es: "Concentrando", en: "Concentrating" },
  { key: "prone", es: "Derribado", en: "Prone" },
  { key: "charmed", es: "Encantado", en: "Charmed" },
  { key: "deafened", es: "Ensordecido", en: "Deafened" },
  { key: "poisoned", es: "Envenenado", en: "Poisoned" },
  { key: "hexed", es: "Hechizado", en: "Hexed" },
  { key: "incapacitated", es: "Incapacitado", en: "Incapacitated" },
  { key: "unconscious", es: "Inconsciente", en: "Unconscious" },
  { key: "invisible", es: "Invisible", en: "Invisible" },
  { key: "paralyzed", es: "Paralizado", en: "Paralyzed" },
  { key: "petrified", es: "Petrificado", en: "Petrified" },
  { key: "exhaustion1", es: "Agotamiento 1", en: "Exhaustion 1" },
  { key: "exhaustion2", es: "Agotamiento 2", en: "Exhaustion 2" },
  { key: "exhaustion3", es: "Agotamiento 3", en: "Exhaustion 3" },
];
export const conditionLabel = (key: string, lang: "es" | "en") =>
  CONDITIONS.find((c) => c.key === key)?.[lang] ?? key;

/** 0 = sin competencia, 1 = competente, 2 = pericia */
export type ProfLevel = 0 | 1 | 2;

/** Un conjuro guardado en la hoja: lo justo para la lista y el hover; la tarjeta completa se trae del SRD al lanzar */
export interface Spell {
  name: string;
  slug: string;
  level: number;
  school: string;
  time: string;
  range: string;
  duration: string;
  components: string;
  concentration: boolean;
  ritual: boolean;
  /** Descripción recortada (~280 letras) para el hover */
  desc: string;
}

/** Una acción de statblock, con lo tirable ya extraído del texto */
export interface Action {
  name: string;
  desc: string;
  /** Bono al ataque (+6) */
  toHit?: number;
  /** Daño como expresión de dados: "2d6+3", o "2d6+3 + 1d6" si hay varios tipos */
  damage?: string;
  /** Salvación que pide, tal cual aparece: "Destreza CD 14", "DC 14 Wisdom" */
  save?: string;
}

export interface Sheet {
  initiative: number | null;
  /** Bonificador extra a la iniciativa, aparte del modificador de DES */
  initBonus: number;
  ac: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  abilities: Record<Ability, number>;
  prof: number;
  saveProf: Partial<Record<Ability, boolean>>;
  skillProf: Partial<Record<string, ProfLevel>>;
  conditions: string[];
  notes: string;
  /** Maná: reserva actual y máxima. Con maxMana 0 no se muestra */
  mana: number;
  maxMana: number;
  /** Resonancia: 7ª característica de la campaña, con la fórmula normal de modificador */
  resonance: number;
  resSaveProf: boolean;
  spells: Spell[];
  /** Veces que se lanzó cada conjuro en este combate (la repetición sube el costo) */
  casts: Record<string, number>;
  /** Acciones de statblock (mobs y PNJ del catálogo) */
  actions: Action[];
  /** Si es true, todos los jugadores ven CA, PG y la hoja completa */
  shared: boolean;
  /** Jugador dueño de la ficha (id de Owlbear): ve la hoja y tira por ella */
  owner: string | null;
  ownerName: string;
}

export const defaultSheet = (): Sheet => ({
  initiative: null,
  initBonus: 0,
  ac: 10,
  hp: 10,
  maxHp: 10,
  tempHp: 0,
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  prof: 2,
  saveProf: {},
  skillProf: {},
  conditions: [],
  notes: "",
  mana: 0,
  maxMana: 0,
  resonance: 10,
  resSaveProf: false,
  spells: [],
  casts: {},
  actions: [],
  shared: false,
  owner: null,
  ownerName: "",
});

export const resMod = (s: Sheet) => mod(s.resonance);
export const resSaveMod = (s: Sheet) => resMod(s) + (s.resSaveProf ? s.prof : 0);

export const mod = (score: number) => Math.floor((score - 10) / 2);
export const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export const abilityMod = (s: Sheet, a: Ability) => mod(s.abilities[a]);
export const saveMod = (s: Sheet, a: Ability) =>
  abilityMod(s, a) + (s.saveProf[a] ? s.prof : 0);
export const skillMod = (s: Sheet, sk: Skill) =>
  abilityMod(s, sk.ability) + (s.skillProf[sk.key] ?? 0) * s.prof;
export const passivePerception = (s: Sheet) =>
  10 + skillMod(s, SKILLS.find((k) => k.key === "perception")!);
export const initMod = (s: Sheet) => abilityMod(s, "dex") + s.initBonus;

export interface Combat {
  round: number;
  turnId: string | null;
}

export type RollMode = "normal" | "adv" | "dis";

export interface RollMessage {
  who: string;
  what: string;
  dice: number[];
  kept: number;
  mod: number;
  total: number;
  mode: RollMode;
  by: string;
  at: number;
  /** Tirada de daño u otra expresión ("2d6+3"): dice son todos los dados, mod el bono fijo */
  expr?: string;
  /** Tirada oculta del DM: solo la ve quien la hizo */
  hidden?: boolean;
}

/** Fusiona lo guardado con los valores por defecto, por si cambia el formato */
export function readSheet(raw: unknown): Sheet | null {
  if (!raw || typeof raw !== "object") return null;
  const d = defaultSheet();
  const r = raw as Partial<Sheet>;
  return {
    ...d,
    ...r,
    abilities: { ...d.abilities, ...(r.abilities ?? {}) },
    saveProf: r.saveProf ?? {},
    skillProf: r.skillProf ?? {},
    // Ya no se usa: los estados viven como marcadores de Condition Markers en la escena
    conditions: Array.isArray(r.conditions) ? r.conditions : [],
    spells: Array.isArray(r.spells) ? r.spells : [],
    casts: r.casts && typeof r.casts === "object" ? r.casts : {},
    actions: Array.isArray(r.actions) ? r.actions : [],
  };
}

/** Quién ve la hoja completa de una ficha: el DM, el jugador asignado, quien la creó, o todos si está compartida */
export const canSeeSheet = (s: Sheet, createdUserId: string, playerId: string, isGM: boolean) =>
  isGM || s.owner === playerId || s.shared || createdUserId === playerId;
