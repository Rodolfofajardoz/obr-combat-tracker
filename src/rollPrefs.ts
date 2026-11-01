import { RollMode } from "./types";

/**
 * Preferencias de tirada (ventaja/desventaja, oculta, susurro) compartidas entre la lista y la ventana
 * de la hoja: viven en sessionStorage, que las dos ventanas del mismo navegador ven, y se borra al
 * cerrar la pestaña, así nadie se queda con 🙈 encendido de una sesión a otra.
 */
const KEY = "combat-tracker.rollPrefs";

export interface RollPrefs {
  mode: RollMode;
  hidden: boolean;
  whisper: boolean;
}

export const DEFAULT_PREFS: RollPrefs = { mode: "normal", hidden: false, whisper: false };

export function readRollPrefs(): RollPrefs {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeRollPrefs(p: RollPrefs) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: queda solo en memoria */
  }
  // El evento "storage" no se dispara en la ventana que escribe: se avisa a mano
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

export function onRollPrefs(cb: (p: RollPrefs) => void) {
  const h = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb(readRollPrefs());
  };
  window.addEventListener("storage", h);
  return () => window.removeEventListener("storage", h);
}
