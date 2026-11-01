import OBR from "@owlbear-rodeo/sdk";
import { PLUGIN_ID, SHEET_KEY } from "./types";
import { addToCombat, removeFromCombat } from "./obr";
import { loadProfiles } from "./profiles";
import { loadCatalog } from "./catalog";

/** Clic derecho en una ficha → agregar o quitar del combate */
export async function setupContextMenu() {
  await OBR.contextMenu.create({
    id: `${PLUGIN_ID}/toggle`,
    // Mismo patrón que el ejemplo oficial: gana el primer ícono cuyo filtro cumple.
    // "Agregar" exige que la ficha no tenga hoja; "Quitar" es el resto.
    icons: [
      {
        icon: `${import.meta.env.BASE_URL}icon-add.svg`,
        label: "Agregar al combate",
        filter: {
          // Cualquier imagen, sin importar la capa (así también sirve para props o monturas)
          every: [
            { key: "type", value: "IMAGE" },
            { key: ["metadata", SHEET_KEY], value: undefined },
          ],
          permissions: ["UPDATE"],
        },
      },
      {
        icon: `${import.meta.env.BASE_URL}icon-remove.svg`,
        label: "Quitar del combate",
        filter: {
          every: [{ key: "type", value: "IMAGE" }],
          permissions: ["UPDATE"],
        },
      },
    ],
    async onClick(context) {
      const inCombat = context.items.filter((i) => i.metadata[SHEET_KEY] !== undefined);
      const outCombat = context.items.filter((i) => i.metadata[SHEET_KEY] === undefined);
      // Si todos ya están, se quitan; si no, se agregan los que faltan
      if (outCombat.length === 0) return removeFromCombat(inCombat.map((i) => i.id));
      // Primero los perfiles de la sala (editables), luego el catálogo de la campaña
      const [profiles, catalog] = await Promise.all([loadProfiles(), loadCatalog()]);
      const applied = await addToCombat(outCombat.map((i) => i.id), [...profiles, ...catalog]);
      if (applied.length) {
        OBR.notification.show(`Perfil aplicado: ${applied.join(", ")}`, "SUCCESS");
      }
    },
  });
}
