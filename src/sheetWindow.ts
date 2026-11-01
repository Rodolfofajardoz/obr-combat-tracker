import OBR from "@owlbear-rodeo/sdk";
import { PLUGIN_ID } from "./types";
import { readSizePref } from "./resize";

/**
 * La hoja vive en su propia ventana (popover) separada de la lista. La página de fondo es la dueña:
 * la lista y la propia hoja le mandan órdenes por un canal local, y ella la abre o la cierra.
 * Owlbear no deja mover una ventana abierta, así que "mover" es cerrarla y abrirla en otro sitio.
 */
export const SHEET_POPOVER_ID = `${PLUGIN_ID}/sheet`;
export const SHEET_CHANNEL = `${PLUGIN_ID}/sheet-window`;
export const SHEET_W = 460;
/** Alto provisional al abrir; la hoja lo ajusta a su contenido en cuanto carga */
export const SHEET_H = 600;

export type SheetCommand = { action: "open"; id: string } | { action: "close" };

export const sendSheet = (cmd: SheetCommand) =>
  OBR.broadcast.sendMessage(SHEET_CHANNEL, cmd, { destination: "LOCAL" });

export const onSheet = (cb: (cmd: SheetCommand) => void) =>
  OBR.broadcast.onMessage(SHEET_CHANNEL, (ev) => cb(ev.data as SheetCommand));

export interface Pos {
  left: number;
  top: number;
}

// Posición guardada por navegador
const POS_KEY = "combat-tracker.sheetPos";

export function readSheetPos(): Pos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const { left, top } = JSON.parse(raw);
    return typeof left === "number" && typeof top === "number" ? { left, top } : null;
  } catch {
    return null;
  }
}

export function writeSheetPos(p: Pos) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: se abre en el sitio de siempre */
  }
}

/** Si nunca se ha movido: a la derecha de la ventana del tracker, a su misma altura */
export function defaultSheetPos(): Pos {
  const trackerW = readSizePref()?.w ?? 460;
  return { left: 18 + trackerW + 10, top: 36 };
}

/** Que la ventana quede entera dentro de la pantalla */
export function clampSheetPos(p: Pos, vw: number, vh: number): Pos {
  const h = Math.min(SHEET_H, vh - 16);
  return {
    left: Math.round(Math.max(0, Math.min(vw - SHEET_W, p.left))),
    top: Math.round(Math.max(0, Math.min(vh - h, p.top))),
  };
}
