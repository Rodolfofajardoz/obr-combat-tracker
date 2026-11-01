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
  label: string;
  ability: Ability;
}
export const SKILLS: Skill[] = [
  { key: "acrobatics", label: "Acrobacias", ability: "dex" },
  { key: "arcana", label: "Arcanos", ability: "int" },
  { key: "athletics", label: "Atletismo", ability: "str" },
  { key: "deception", label: "Engaño", ability: "cha" },
  { key: "history", label: "Historia", ability: "int" },
  { key: "insight", label: "Perspicacia", ability: "wis" },
  { key: "intimidation", label: "Intimidación", ability: "cha" },
  { key: "performance", label: "Interpretación", ability: "cha" },
  { key: "investigation", label: "Investigación", ability: "int" },
  { key: "sleight", label: "Juego de manos", ability: "dex" },
  { key: "medicine", label: "Medicina", ability: "wis" },
  { key: "nature", label: "Naturaleza", ability: "int" },
  { key: "perception", label: "Percepción", ability: "wis" },
  { key: "persuasion", label: "Persuasión", ability: "cha" },
  { key: "religion", label: "Religión", ability: "int" },
  { key: "stealth", label: "Sigilo", ability: "dex" },
  { key: "survival", label: "Supervivencia", ability: "wis" },
  { key: "animal", label: "Trato con animales", ability: "wis" },
];

export const CONDITIONS = [
  "Agarrado",
  "Apresado",
  "Asustado",
  "Aturdido",
  "Cegado",
  "Concentrando",
  "Derribado",
  "Encantado",
  "Ensordecido",
  "Envenenado",
  "Hechizado",
  "Incapacitado",
  "Inconsciente",
  "Invisible",
  "Paralizado",
  "Petrificado",
  "Agotamiento 1",
  "Agotamiento 2",
  "Agotamiento 3",
];

/** 0 = sin competencia, 1 = competente, 2 = pericia */
export type ProfLevel = 0 | 1 | 2;

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
  /** Si es true, los jugadores ven CA, PG y la hoja completa */
  shared: boolean;
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
  shared: false,
});

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
    conditions: Array.isArray(r.conditions) ? r.conditions : [],
  };
}
