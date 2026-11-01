import OBR from "@owlbear-rodeo/sdk";
import { setupContextMenu } from "./contextMenu";
import { startBars } from "./bars";
import { CARD_POPOVER_ID, onCast } from "./spells";
import { DICE_DONE_CHANNEL, DICE_SETTLE_MS, DiceShow, canSeeWhisper, dicePopoverId, onDice, readDice3dPref } from "./diceShow";
import { DICE_SLOTS, Rect, Slots, diceSlotRect } from "./diceSlots";

const page = (name: string, payload: unknown) =>
  `${import.meta.env.BASE_URL}${name}#${encodeURIComponent(JSON.stringify(payload))}`;

/** Un popover sin fondo que ocupa justo el rectángulo pedido; el resto del mapa sigue libre */
function openAt(id: string, url: string, r: Rect) {
  OBR.popover.open({
    id,
    url,
    width: Math.round(r.width),
    height: Math.round(r.height),
    anchorReference: "POSITION",
    anchorPosition: { left: Math.round(r.left), top: Math.round(r.top) },
    anchorOrigin: { horizontal: "LEFT", vertical: "TOP" },
    transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
    hidePaper: true,
    disableClickAway: true,
  });
}

// Si la bandeja no avisa que se cerró (se trabó, se perdió el mensaje), su espacio se libera igual
const DICE_SLOT_LIFE_MS = DICE_SETTLE_MS + 2600 + 400 + 3000;
const slotTimers: (ReturnType<typeof setTimeout> | null)[] = Array(DICE_SLOTS).fill(null);

const diceSlots = new Slots<DiceShow>(DICE_SLOTS, async (msg, slot) => {
  const [vw, vh] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
  openAt(dicePopoverId(slot), page("dice.html", { ...msg, slot }), diceSlotRect(slot, vw, vh));
  slotTimers[slot] = setTimeout(() => freeSlot(slot), DICE_SLOT_LIFE_MS);
});

function freeSlot(slot: number) {
  const t = slotTimers[slot];
  if (t) clearTimeout(t);
  slotTimers[slot] = null;
  diceSlots.release(slot);
}

// Página de fondo: corre siempre, aunque la ventana esté cerrada.
OBR.onReady(() => {
  setupContextMenu();
  startBars();

  // Alguien lanzó un conjuro: la tarjeta aparece abajo a la derecha de esta pantalla
  onCast(async (msg) => {
    const [vw, vh] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
    const width = Math.min(300, Math.round(vw * 0.4));
    // Alto provisional: la tarjeta lo ajusta a su contenido en cuanto carga (setHeight)
    const height = Math.min(320, Math.round(vh * 0.6));
    OBR.popover.open({
      id: CARD_POPOVER_ID,
      url: page("card.html", msg),
      width,
      height,
      anchorReference: "POSITION",
      // Pegada a la esquina, dejando libre la barra de herramientas de la derecha y la de abajo
      anchorPosition: { left: vw - 60, top: vh - 72 },
      anchorOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
      transformOrigin: { horizontal: "RIGHT", vertical: "BOTTOM" },
      hidePaper: true,
      disableClickAway: true,
    });
  });

  // Alguien tiró: los dados ruedan en el primer espacio libre de la fila de arriba
  // (si este navegador tiene 🎲 3D encendido)
  onDice(async (msg) => {
    if (!readDice3dPref()) return;
    if (msg.whisper) {
      const [role, id] = await Promise.all([OBR.player.getRole(), OBR.player.getId()]);
      if (!canSeeWhisper(msg.whisper, role, id)) return;
    }
    diceSlots.push(msg);
  });
  OBR.broadcast.onMessage(DICE_DONE_CHANNEL, (ev) => freeSlot((ev.data as { slot: number }).slot));
});
