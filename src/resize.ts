import OBR from "@owlbear-rodeo/sdk";

/** Tamaño de la ventana (popover) guardado por navegador */
const SIZE_PREF = "combat-tracker.size";
export const MIN_W = 340;
export const MAX_W = 1000;
export const MIN_H = 420;
export const MAX_H = 1100;

const clamp = (v: number, lo: number, hi: number) => Math.round(Math.max(lo, Math.min(hi, v)));

export function readSizePref(): { w: number; h: number } | null {
  try {
    const raw = localStorage.getItem(SIZE_PREF);
    if (!raw) return null;
    const { w, h } = JSON.parse(raw);
    return { w: clamp(w, MIN_W, MAX_W), h: clamp(h, MIN_H, MAX_H) };
  } catch {
    return null;
  }
}

export function writeSizePref(w: number, h: number) {
  try {
    localStorage.setItem(SIZE_PREF, JSON.stringify({ w, h }));
  } catch {
    /* sin almacenamiento */
  }
}

let pending: { w: number; h: number } | null = null;
let scheduled = false;

/** Pide el nuevo tamaño a Owlbear, como mucho una vez por frame */
export function requestSize(w: number, h: number) {
  pending = { w: clamp(w, MIN_W, MAX_W), h: clamp(h, MIN_H, MAX_H) };
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    if (!pending) return;
    const { w, h } = pending;
    pending = null;
    OBR.action.setWidth(w);
    OBR.action.setHeight(h);
  });
}

export async function applySavedSize() {
  const s = readSizePref();
  if (s) {
    await OBR.action.setWidth(s.w);
    await OBR.action.setHeight(s.h);
  }
}
