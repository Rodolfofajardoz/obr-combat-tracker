import OBR from "@owlbear-rodeo/sdk";
import { PLUGIN_ID, SHEET_KEY } from "./types";
import { addToCombat, removeFromCombat } from "./obr";

/** Clic derecho en una ficha → agregar o quitar del combate */
export async function setupContextMenu() {
  await OBR.contextMenu.create({
    id: `${PLUGIN_ID}/toggle`,
    icons: [
      {
        icon: "/icon-add.svg",
        label: "Agregar al combate",
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: ["metadata", SHEET_KEY], value: undefined },
          ],
        },
      },
      {
        icon: "/icon-remove.svg",
        label: "Quitar del combate",
        filter: {
          every: [{ key: ["metadata", SHEET_KEY], value: undefined, operator: "!=" }],
        },
      },
    ],
    onClick(context) {
      const inCombat = context.items.filter((i) => i.metadata[SHEET_KEY] !== undefined);
      const outCombat = context.items.filter((i) => i.metadata[SHEET_KEY] === undefined);
      // Si todos ya están, se quitan; si no, se agregan los que faltan
      if (outCombat.length === 0) return removeFromCombat(inCombat.map((i) => i.id));
      return addToCombat(outCombat.map((i) => i.id));
    },
  });
}
