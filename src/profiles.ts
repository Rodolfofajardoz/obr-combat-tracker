import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import {
  ABILITIES,
  ABILITY_LABEL,
  ABILITY_NAME,
  Ability,
  PLUGIN_ID,
  ProfLevel,
  SKILLS,
  Sheet,
  Spell,
  Action,
  Resource,
  defaultSheet,
} from "./types";
import { ABILITY_LONG, ABILITY_SHORT } from "./i18n";

export const PROFILES_KEY = `${PLUGIN_ID}/profiles`;

/** Un perfil es una hoja sin estado de combate: lo que se puede preparar antes de jugar */
export interface Profile {
  name: string;
  abilities: Record<Ability, number>;
  ac: number;
  maxHp: number;
  prof: number;
  initBonus: number;
  saveProf: Partial<Record<Ability, boolean>>;
  skillProf: Partial<Record<string, ProfLevel>>;
  notes: string;
  /** Opcionales: los perfiles viejos y el catálogo no los traen */
  maxMana?: number;
  resonance?: number;
  resSaveProf?: boolean;
  spells?: Spell[];
  actions?: Action[];
  /** Recursos con su máximo; al cargar el perfil empiezan llenos */
  resources?: Resource[];
}

/** Sin acentos, sin mayúsculas, sin espacios sobrantes: para comparar nombres */
export const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// ---------- guardado en la sala (compartido, sobrevive entre escenas) ----------

export function readProfiles(meta: Metadata): Profile[] {
  const raw = meta[PROFILES_KEY];
  return Array.isArray(raw) ? (raw as Profile[]) : [];
}

export async function loadProfiles(): Promise<Profile[]> {
  return readProfiles(await OBR.room.getMetadata());
}

export async function saveProfiles(list: Profile[]) {
  const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
  await OBR.room.setMetadata({ [PROFILES_KEY]: sorted });
}

export function onProfilesChange(cb: (list: Profile[]) => void) {
  return OBR.room.onMetadataChange((m) => cb(readProfiles(m)));
}

/** Reemplaza los que tengan el mismo nombre y agrega los nuevos */
export function mergeProfiles(current: Profile[], incoming: Profile[]): Profile[] {
  const byName = new Map(current.map((p) => [norm(p.name), p]));
  for (const p of incoming) byName.set(norm(p.name), p);
  return [...byName.values()];
}

export function findProfile(list: Profile[], name: string): Profile | undefined {
  const n = norm(name);
  return list.find((p) => norm(p.name) === n);
}

export const profilesBytes = (list: Profile[]) => new Blob([JSON.stringify(list)]).size;

// ---------- perfil ↔ hoja ----------

export function profileToSheet(p: Profile, base: Sheet = defaultSheet()): Sheet {
  return {
    ...base,
    abilities: { ...p.abilities },
    ac: p.ac,
    maxHp: p.maxHp,
    hp: Math.min(base.hp === defaultSheet().hp ? p.maxHp : base.hp, p.maxHp),
    prof: p.prof,
    initBonus: p.initBonus,
    saveProf: { ...p.saveProf },
    skillProf: { ...p.skillProf },
    notes: p.notes,
    maxMana: p.maxMana ?? 0,
    mana: p.maxMana ?? 0,
    resonance: p.resonance ?? 10,
    resSaveProf: p.resSaveProf ?? false,
    spells: p.spells ?? base.spells,
    casts: {},
    actions: p.actions ?? base.actions,
    resources: p.resources ? p.resources.map((r) => ({ ...r, cur: r.max })) : base.resources,
  };
}

export function sheetToProfile(name: string, s: Sheet): Profile {
  return {
    name,
    abilities: { ...s.abilities },
    ac: s.ac,
    maxHp: s.maxHp,
    prof: s.prof,
    initBonus: s.initBonus,
    saveProf: { ...s.saveProf },
    skillProf: { ...s.skillProf },
    notes: s.notes,
    maxMana: s.maxMana,
    resonance: s.resonance,
    resSaveProf: s.resSaveProf,
    spells: s.spells,
    actions: s.actions,
    resources: s.resources,
  };
}

// ---------- CSV (exportado desde Excel) ----------

export const CSV_HEADER =
  "Name;STR;DEX;CON;INT;WIS;CHA;Resonance;AC;HP;Mana;Proficiency;InitBonus;Saves;Skills;Notes";

export const CSV_TEMPLATE =
  CSV_HEADER +
  "\n" +
  "Soleil;10;14;12;13;16;18;3;16;26;12;2;0;INT, WIS;Nature*, Animal Handling, Medicine, Perception, Survival;Druid 3. * = expertise\n" +
  "Goblin;8;14;10;10;8;8;;15;7;;2;0;;Stealth*;Example enemy\n";

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["nombre", "name", "personaje", "ficha", "token"],
  str: ["fue", "str", "fuerza", "strength"],
  dex: ["des", "dex", "destreza", "dexterity"],
  con: ["con", "constitucion", "constitution"],
  int: ["int", "inteligencia", "intelligence"],
  wis: ["sab", "wis", "sabiduria", "wisdom"],
  cha: ["car", "cha", "carisma", "charisma"],
  ac: ["ca", "ac", "armadura", "clase de armadura"],
  maxHp: ["pg", "hp", "pg max", "pgmax", "vida", "puntos de golpe"],
  prof: ["competencia", "comp", "prof", "pb", "bono de competencia", "proficiency", "proficiency bonus"],
  initBonus: ["bonoiniciativa", "bono iniciativa", "iniciativa", "init", "inic", "initbonus", "init bonus", "initiative"],
  resonance: ["resonancia", "resonance", "res"],
  maxMana: ["mana", "mana max", "maná", "mp", "puntos de mana"],
  saves: ["salvaciones", "salv", "saves", "tiradas de salvacion"],
  skills: ["habilidades", "hab", "skills"],
  notes: ["notas", "notes", "nota"],
};

function detectDelimiter(firstLine: string): string {
  const counts = [";", ",", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ";";
}

function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const delim = detectDelimiter(clean.split("\n")[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function abilityFromToken(tok: string): Ability | undefined {
  const t = norm(tok);
  return ABILITIES.find(
    (a) => a === t || norm(ABILITY_LABEL[a]) === t || norm(ABILITY_NAME[a]) === t || norm(ABILITY_LONG.en[a]) === t,
  );
}

function skillFromToken(tok: string): string | undefined {
  const t = norm(tok);
  return SKILLS.find((s) => s.key === t || norm(s.label) === t || norm(s.en) === t)?.key;
}

const splitList = (cell: string) => cell.split(/[,|/\n]+/).map((x) => x.trim()).filter(Boolean);

const toInt = (cell: string | undefined, fallback: number) => {
  const m = (cell ?? "").match(/-?\d+/);
  return m ? parseInt(m[0], 10) : fallback;
};

export function parseCsv(text: string): { profiles: Profile[]; errors: string[] } {
  const errors: string[] = [];
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { profiles: [], errors: ["El CSV necesita una fila de encabezados y al menos un personaje."] };

  // Mapear cada columna a un campo conocido
  const header = rows[0].map(norm);
  const col: Record<string, number> = {};
  header.forEach((h, i) => {
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(h) && col[field] === undefined) col[field] = i;
    }
  });
  if (col.name === undefined) {
    return { profiles: [], errors: [`No encontré la columna "Nombre". Encabezados leídos: ${rows[0].join(" | ")}`] };
  }
  const get = (r: string[], f: string) => (col[f] === undefined ? undefined : r[col[f]]);

  const profiles: Profile[] = [];
  rows.slice(1).forEach((r, idx) => {
    const name = (get(r, "name") ?? "").trim();
    if (!name) {
      errors.push(`Fila ${idx + 2}: sin nombre, la salté.`);
      return;
    }
    const d = defaultSheet();
    const abilities = { ...d.abilities };
    for (const a of ABILITIES) abilities[a] = toInt(get(r, a), 10);

    const saveProf: Partial<Record<Ability, boolean>> = {};
    let resSaveProf = false;
    for (const tok of splitList((get(r, "saves") ?? "").replace(/\s+/g, ","))) {
      const a = abilityFromToken(tok);
      if (a) saveProf[a] = true;
      else if (["res", "resonancia", "resonance"].includes(norm(tok))) resSaveProf = true;
      else errors.push(`${name}: salvación "${tok}" no reconocida.`);
    }

    const skillProf: Partial<Record<string, ProfLevel>> = {};
    for (const tok of splitList(get(r, "skills") ?? "")) {
      const m = tok.match(/^(.*?)\s*(\*|:\s*2|:\s*1)?$/);
      const key = skillFromToken(m?.[1] ?? tok);
      if (!key) {
        errors.push(`${name}: habilidad "${tok}" no reconocida.`);
        continue;
      }
      skillProf[key] = m?.[2]?.includes("*") || m?.[2]?.includes("2") ? 2 : 1;
    }

    profiles.push({
      name,
      abilities,
      ac: toInt(get(r, "ac"), d.ac),
      maxHp: toInt(get(r, "maxHp"), d.maxHp),
      prof: toInt(get(r, "prof"), d.prof),
      initBonus: toInt(get(r, "initBonus"), 0),
      saveProf,
      skillProf,
      notes: (get(r, "notes") ?? "").trim(),
      resonance: toInt(get(r, "resonance"), 10),
      maxMana: toInt(get(r, "maxMana"), 0),
      resSaveProf,
    });
  });
  return { profiles, errors };
}

/** Acepta CSV o el JSON que exporta el propio panel */
export function parseImport(text: string): { profiles: Profile[]; errors: string[] } {
  const t = text.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      const raw = JSON.parse(t);
      const list = Array.isArray(raw) ? raw : [raw];
      const ok = list.filter((p) => p && typeof p.name === "string");
      return { profiles: ok as Profile[], errors: ok.length === list.length ? [] : ["Algunas entradas del JSON no tenían nombre."] };
    } catch {
      return { profiles: [], errors: ["El JSON no se pudo leer."] };
    }
  }
  return parseCsv(t);
}

export function profilesToCsv(list: Profile[]): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = list.map((p) =>
    [
      q(p.name),
      ...ABILITIES.map((a) => p.abilities[a]),
      p.resonance ?? "",
      p.ac,
      p.maxHp,
      p.maxMana ?? "",
      p.prof,
      p.initBonus,
      q(
        [...ABILITIES.filter((a) => p.saveProf[a]).map((a) => ABILITY_SHORT.en[a]), ...(p.resSaveProf ? ["RES"] : [])].join(", "),
      ),
      q(
        SKILLS.filter((s) => (p.skillProf[s.key] ?? 0) > 0)
          .map((s) => s.en + (p.skillProf[s.key] === 2 ? "*" : ""))
          .join(", "),
      ),
      q(p.notes),
    ].join(";"),
  );
  return [CSV_HEADER, ...lines].join("\n") + "\n";
}
