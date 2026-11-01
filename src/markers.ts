import OBR, { Image, Item, buildImage, isImage } from "@owlbear-rodeo/sdk";
import type { Lang } from "./i18n";

/**
 * Integración con la extensión "Condition Markers" (Keegan, keegan.dev.condition-markers).
 * Un estado es una imagen pegada a la ficha con este metadato; se crea igual que lo hace esa
 * extensión, así que ella los reconoce y nosotros reconocemos los suyos.
 */
export const CM_KEY = "keegan.dev.condition-markers/metadata";
const PREFIX = "Condition Marker - ";
/** Donde está publicada la extensión (versión de la tienda, 1.0.8); de ahí salen las imágenes */
const IMG_BASE = "https://condition-markers.onrender.com/images/";
/** Tamaño en píxeles de cada imagen de marcador y DPI con el que la extensión los mete */
const MARKER_PX = 150;
const MARKER_DPI = MARKER_PX / 0.16; // 937.5: un marcador mide 0.16 celdas
const PER_ROW = 5;

export type MarkerGroup = "condition" | "buff" | "debuff" | "other";
export const MARKER_GROUPS: { key: MarkerGroup; label: string }[] = [
  { key: "condition", label: "Conditions" },
  { key: "buff", label: "Buffs" },
  { key: "debuff", label: "Debuffs" },
  { key: "other", label: "Other" },
];

export interface Marker {
  /** Nombre exacto que usa Condition Markers (con sus guiones) */
  name: string;
  es?: string;
  group: MarkerGroup;
}

// Los 62 marcadores de Condition Markers 1.0.8, agrupados.
// Un debuff es lo que se le pone al objetivo (Hunter's Mark, Hexed, Baned…).
export const MARKERS: Marker[] = [
  { name: "Blinded", es: "Cegado", group: "condition" },
  { name: "Charmed", es: "Encantado", group: "condition" },
  { name: "Concen-trating", es: "Concentrando", group: "condition" },
  { name: "Deafened", es: "Ensordecido", group: "condition" },
  { name: "Exhausted", es: "Agotado", group: "condition" },
  { name: "Frightened", es: "Asustado", group: "condition" },
  { name: "Grappled", es: "Agarrado", group: "condition" },
  { name: "Incapaci-tated", es: "Incapacitado", group: "condition" },
  { name: "Invisible", es: "Invisible", group: "condition" },
  { name: "Paralyzed", es: "Paralizado", group: "condition" },
  { name: "Petrified", es: "Petrificado", group: "condition" },
  { name: "Poisoned", es: "Envenenado", group: "condition" },
  { name: "Prone", es: "Derribado", group: "condition" },
  { name: "Restrained", es: "Apresado", group: "condition" },
  { name: "Stunned", es: "Aturdido", group: "condition" },
  { name: "Un-conscious", es: "Inconsciente", group: "condition" },

  { name: "Advantage", es: "Ventaja", group: "buff" },
  { name: "Ancestral Protectors", group: "buff" },
  { name: "Armor of Agathys", group: "buff" },
  { name: "Bear's Endurance", group: "buff" },
  { name: "Blessed", es: "Bendecido", group: "buff" },
  { name: "Blink", group: "buff" },
  { name: "Blur", group: "buff" },
  { name: "Bull's Strength", group: "buff" },
  { name: "Cat's Grace", group: "buff" },
  { name: "Divine Favor", group: "buff" },
  { name: "Dodge", es: "Esquivar", group: "buff" },
  { name: "Eagle's Splendor", group: "buff" },
  { name: "Fox's Cunning", group: "buff" },
  { name: "Hastened", es: "Acelerado", group: "buff" },
  { name: "Insightful Fighting", group: "buff" },
  { name: "Inspired", es: "Inspirado", group: "buff" },
  { name: "Mage Armor", group: "buff" },
  { name: "Mirror Image", group: "buff" },
  { name: "Owl's Wisdom", group: "buff" },
  { name: "Raging", es: "Furia", group: "buff" },
  { name: "Sanctuary", es: "Santuario", group: "buff" },
  { name: "Shell Defense", group: "buff" },
  { name: "Shield of Faith", group: "buff" },
  { name: "Spirit Guardians", group: "buff" },
  { name: "Symbiotic Entity", group: "buff" },
  { name: "Truesight", group: "buff" },
  { name: "Warding Bond", group: "buff" },

  { name: "Baned", group: "debuff" },
  { name: "Cause of Fear", group: "debuff" },
  { name: "Compelled Duel", group: "debuff" },
  { name: "Confused", es: "Confundido", group: "debuff" },
  { name: "Dis-advantage", es: "Desventaja", group: "debuff" },
  { name: "Hexblade's Curse", group: "debuff" },
  { name: "Hexed", group: "debuff" },
  { name: "Hunter's Mark", group: "debuff" },
  { name: "On Fire", es: "En llamas", group: "debuff" },
  { name: "Possessed", es: "Poseído", group: "debuff" },
  { name: "Slayer's Prey", group: "debuff" },

  { name: "Bleeding Out", es: "Desangrándose", group: "other" },
  { name: "Flying", es: "Volando", group: "other" },
  { name: "Highlighted", es: "Resaltado", group: "other" },
  { name: "Holding Action", es: "Acción preparada", group: "other" },
  { name: "Reaction Used", es: "Reacción usada", group: "other" },
  { name: "Shifted", group: "other" },
  { name: "Stabilized", es: "Estabilizado", group: "other" },
  { name: "Summoning", es: "Invocando", group: "other" },
];

/** Etiqueta para mostrar: sin los guiones de corte de Condition Markers */
export function markerLabel(name: string, lang: Lang): string {
  const m = MARKERS.find((x) => x.name === name);
  if (lang === "es" && m?.es) return m.es;
  return name.replace(/-/g, "");
}

export function isMarker(item: Item): boolean {
  const m = item.metadata[CM_KEY];
  return !!item.attachedTo && !!m && typeof m === "object" && (m as { enabled?: boolean }).enabled === true;
}

export const markerName = (item: Item) => (item.name.startsWith(PREFIX) ? item.name.slice(PREFIX.length) : item.name);

/** id de ficha → nombres de sus marcadores, en el orden de la escena */
export function markersByToken(items: Item[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const it of items) {
    if (!isMarker(it)) continue;
    const list = map.get(it.attachedTo!) ?? [];
    list.push(markerName(it));
    map.set(it.attachedTo!, list);
  }
  return map;
}

const slug = (name: string) => name.toLowerCase().replace(/['-]/g, "").replace(/ /g, "_");

/**
 * Misma rejilla que Condition Markers 1.0.8: 5 por fila desde la esquina superior izquierda,
 * en píxeles de la imagen de la ficha, convertidos a unidades de escena con el DPI.
 */
function markerPosition(token: Image, count: number, sceneDpi: number) {
  const cell = token.image.width / PER_ROW;
  const px = (count % PER_ROW) * cell - token.grid.offset.x;
  const py = Math.floor(count / PER_ROW) * cell - token.grid.offset.y;
  const k = sceneDpi / token.grid.dpi;
  const sx = px * k * token.scale.x;
  const sy = py * k * token.scale.y;
  const th = (token.rotation * Math.PI) / 180;
  return {
    x: token.position.x + (sx * Math.cos(th) - sy * Math.sin(th)),
    y: token.position.y + (sx * Math.sin(th) + sy * Math.cos(th)),
  };
}

/** El marcador se escala para medir lo mismo sin importar el tamaño de la imagen de la ficha */
function markerScale(token: Image) {
  const s = token.image.width / token.grid.dpi;
  return { x: token.scale.x * s, y: Math.abs(token.scale.x) * s };
}

async function attachedMarkers(tokenId: string): Promise<Item[]> {
  const att = await OBR.scene.items.getItemAttachments([tokenId]);
  return att.filter((a) => isMarker(a) && a.attachedTo === tokenId);
}

export async function addMarker(tokenId: string, name: string) {
  const [token] = await OBR.scene.items.getItems([tokenId]);
  if (!token || !isImage(token)) return;
  const existing = await attachedMarkers(tokenId);
  if (existing.some((m) => markerName(m) === name)) return;
  const sceneDpi = await OBR.scene.grid.getDpi();
  const marker = buildImage(
    { url: `${IMG_BASE}${slug(name)}.png`, width: MARKER_PX, height: MARKER_PX, mime: "image/jpg" },
    { dpi: MARKER_DPI, offset: { x: 0, y: 0 } },
  )
    .scale(markerScale(token))
    .rotation(token.rotation)
    .position(markerPosition(token, existing.length, sceneDpi))
    .attachedTo(token.id)
    .locked(true)
    .name(PREFIX + name)
    .metadata({ [CM_KEY]: { enabled: true } })
    .layer("ATTACHMENT")
    .disableHit(false)
    .visible(token.visible)
    .build();
  await OBR.scene.items.addItems([marker]);
}

export async function removeMarker(tokenId: string, name: string) {
  const existing = await attachedMarkers(tokenId);
  const gone = existing.filter((m) => markerName(m) === name).map((m) => m.id);
  if (!gone.length) return;
  await OBR.scene.items.deleteItems(gone);
  // Reacomoda los que quedan, como hace Condition Markers
  const [token] = await OBR.scene.items.getItems([tokenId]);
  if (!token || !isImage(token)) return;
  const rest = existing.filter((m) => !gone.includes(m.id));
  if (!rest.length) return;
  const sceneDpi = await OBR.scene.grid.getDpi();
  await OBR.scene.items.updateItems(
    rest.map((m) => m.id),
    (items) => {
      items.forEach((it, i) => {
        const p = markerPosition(token, i, sceneDpi);
        it.position.x = p.x;
        it.position.y = p.y;
      });
    },
  );
}

export const toggleMarker = (tokenId: string, name: string, on: boolean) =>
  on ? addMarker(tokenId, name) : removeMarker(tokenId, name);
