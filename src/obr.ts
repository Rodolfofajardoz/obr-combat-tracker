import OBR, { Item, Image, Metadata } from "@owlbear-rodeo/sdk";
import {
  Combat,
  COMBAT_KEY,
  defaultSheet,
  ROLL_CHANNEL,
  RollMessage,
  Sheet,
  SHEET_KEY,
  readSheet,
} from "./types";
import { Profile, findProfile, profileToSheet } from "./profiles";
import { markersByToken } from "./markers";

export interface Combatant {
  id: string;
  name: string;
  visible: boolean;
  ownerId: string;
  sheet: Sheet;
  /** Marcadores de Condition Markers pegados a la ficha */
  conditions: string[];
}

export const itemName = (item: Item) => {
  const text = (item as Image).text?.plainText?.trim();
  return text || item.name || "Sin nombre";
};

export function toCombatants(items: Item[]): Combatant[] {
  const out: Combatant[] = [];
  const markers = markersByToken(items);
  for (const it of items) {
    const sheet = readSheet(it.metadata[SHEET_KEY]);
    if (!sheet) continue;
    out.push({
      id: it.id,
      name: itemName(it),
      visible: it.visible,
      ownerId: it.createdUserId,
      sheet,
      conditions: markers.get(it.id) ?? [],
    });
  }
  return out;
}

/** Orden de iniciativa: mayor primero; empate → mayor DES; sin tirar al final */
export function sortCombatants(list: Combatant[]): Combatant[] {
  return [...list].sort((a, b) => {
    const ai = a.sheet.initiative;
    const bi = b.sheet.initiative;
    if (ai === null && bi === null) return a.name.localeCompare(b.name);
    if (ai === null) return 1;
    if (bi === null) return -1;
    if (bi !== ai) return bi - ai;
    return b.sheet.abilities.dex - a.sheet.abilities.dex || a.name.localeCompare(b.name);
  });
}

export async function updateSheet(id: string, patch: Partial<Sheet> | ((s: Sheet) => Sheet)) {
  await OBR.scene.items.updateItems([id], (items) => {
    for (const it of items) {
      const cur = readSheet(it.metadata[SHEET_KEY]) ?? defaultSheet();
      it.metadata[SHEET_KEY] = typeof patch === "function" ? patch(cur) : { ...cur, ...patch };
    }
  });
}

export async function updateSheets(patches: Record<string, Partial<Sheet>>) {
  const ids = Object.keys(patches);
  if (!ids.length) return;
  await OBR.scene.items.updateItems(ids, (items) => {
    for (const it of items) {
      const cur = readSheet(it.metadata[SHEET_KEY]) ?? defaultSheet();
      it.metadata[SHEET_KEY] = { ...cur, ...patches[it.id] };
    }
  });
}

/** Agrega fichas al combate. Si hay un perfil con el mismo nombre, lo aplica. Devuelve los nombres con perfil. */
export async function addToCombat(ids: string[], profiles: Profile[] = []): Promise<string[]> {
  const applied: string[] = [];
  await OBR.scene.items.updateItems(ids, (items) => {
    for (const it of items) {
      if (it.metadata[SHEET_KEY]) continue;
      const p = findProfile(profiles, itemName(it));
      it.metadata[SHEET_KEY] = p ? profileToSheet(p) : defaultSheet();
      if (p) applied.push(itemName(it));
    }
  });
  return applied;
}

export async function removeFromCombat(ids: string[]) {
  await OBR.scene.items.updateItems(ids, (items) => {
    for (const it of items) delete it.metadata[SHEET_KEY];
  });
}

export function readCombat(meta: Metadata): Combat {
  const raw = meta[COMBAT_KEY] as Partial<Combat> | undefined;
  return { round: raw?.round ?? 1, turnId: raw?.turnId ?? null };
}

export async function setCombat(c: Combat) {
  await OBR.scene.setMetadata({ [COMBAT_KEY]: c });
}

/** Selecciona la ficha y lleva la cámara hasta ella */
export async function focusItem(id: string) {
  const [item] = await OBR.scene.items.getItems([id]);
  if (!item) return;
  const dpi = await OBR.scene.grid.getDpi();
  const r = dpi * 4;
  await OBR.player.select([id], true);
  await OBR.viewport.animateToBounds({
    min: { x: item.position.x - r, y: item.position.y - r },
    max: { x: item.position.x + r, y: item.position.y + r },
    center: item.position,
    width: r * 2,
    height: r * 2,
  });
}

/** Una tirada oculta solo llega a este cliente */
export async function broadcastRoll(msg: RollMessage, hidden = false) {
  await OBR.broadcast.sendMessage(ROLL_CHANNEL, msg, { destination: hidden ? "LOCAL" : "ALL" });
}

export function onRoll(cb: (msg: RollMessage) => void) {
  return OBR.broadcast.onMessage(ROLL_CHANNEL, (ev) => cb(ev.data as RollMessage));
}
