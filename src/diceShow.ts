import OBR from "@owlbear-rodeo/sdk";
import { PLUGIN_ID } from "./types";

/**
 * Dado 3D compartido: quien tira ya sabe el resultado y lo manda a todos; la página de fondo de
 * cada cliente abre dice.html a pantalla completa y los dados caen justo en esos valores.
 */
export const DICE_CHANNEL = `${PLUGIN_ID}/dice`;
export const DICE_POPOVER_ID = `${PLUGIN_ID}/dice-popover`;
/** Lo que tarda el dado en caer: el registro espera esto para no adelantar el resultado */
export const DICE_SETTLE_MS = 3500;

export interface DiceShow {
  /** Dados sin bono, en el orden de `values`: "1d20", "2d20", "2d6+1d8" */
  notation: string;
  values: number[];
  who: string;
  what: string;
  total: number;
  /** Debajo del total: "[12, 7] → 12 + 5" */
  detail: string;
  by: string;
  hidden?: boolean;
}

/** Una tirada oculta solo se muestra en este cliente */
export async function broadcastDice(msg: DiceShow, hidden = false) {
  await OBR.broadcast.sendMessage(DICE_CHANNEL, msg, { destination: hidden ? "LOCAL" : "ALL" });
}

export function onDice(cb: (msg: DiceShow) => void) {
  return OBR.broadcast.onMessage(DICE_CHANNEL, (ev) => cb(ev.data as DiceShow));
}

// El botón 🎲 3D decide si ESTE navegador ve los dados (los suyos y los de los demás)
export const DICE3D_PREF = "combat-tracker.dice3d";

export function readDice3dPref(): boolean {
  try {
    return localStorage.getItem(DICE3D_PREF) !== "off";
  } catch {
    return true;
  }
}

export function writeDice3dPref(on: boolean) {
  try {
    localStorage.setItem(DICE3D_PREF, on ? "on" : "off");
  } catch {
    /* sin almacenamiento, no pasa nada */
  }
}
