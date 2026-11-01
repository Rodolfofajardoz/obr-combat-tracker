import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { PLUGIN_ID } from "./types";

/** Ajustes de mesa, guardados en la sala (los cambia el DM, los ven todos) */
export const SETTINGS_KEY = `${PLUGIN_ID}/settings`;

export interface Settings {
  /** Regla de repetición: cada vez que se repite un conjuro en el combate cuesta +1 maná */
  repeatCost: boolean;
}

export const defaultSettings = (): Settings => ({ repeatCost: false });

export function readSettings(meta: Metadata): Settings {
  const raw = (meta[SETTINGS_KEY] ?? {}) as Partial<Settings>;
  return { ...defaultSettings(), ...raw };
}

export const loadSettings = async () => readSettings(await OBR.room.getMetadata());

export async function saveSettings(patch: Partial<Settings>) {
  const cur = await loadSettings();
  await OBR.room.setMetadata({ [SETTINGS_KEY]: { ...cur, ...patch } });
}

export const onSettingsChange = (cb: (s: Settings) => void) =>
  OBR.room.onMetadataChange((m) => cb(readSettings(m)));
