import OBR from "@owlbear-rodeo/sdk";
import { setupContextMenu } from "./contextMenu";
import { startBars } from "./bars";
import { CARD_POPOVER_ID, onCast } from "./spells";
import { DICE_POPOVER_ID, onDice, readDice3dPref } from "./diceShow";

// Página de fondo: corre siempre, aunque la ventana esté cerrada.
OBR.onReady(() => {
  setupContextMenu();
  startBars();

  // Alguien lanzó un conjuro: la tarjeta aparece en esta pantalla
  onCast((msg) => {
    const url = `${import.meta.env.BASE_URL}card.html#${encodeURIComponent(JSON.stringify(msg))}`;
    OBR.popover.open({
      id: CARD_POPOVER_ID,
      url,
      width: 380,
      // la tarjeta ajusta su altura al contenido en cuanto carga
      height: 320,
      anchorReference: "POSITION",
      anchorPosition: { left: 24, top: 96 },
      anchorOrigin: { horizontal: "LEFT", vertical: "TOP" },
      transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
      hidePaper: true,
      disableClickAway: true,
    });
  });

  // Alguien tiró: los dados ruedan a pantalla completa (si este navegador tiene 🎲 3D encendido)
  onDice(async (msg) => {
    if (!readDice3dPref()) return;
    const [width, height] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
    OBR.popover.open({
      id: DICE_POPOVER_ID,
      url: `${import.meta.env.BASE_URL}dice.html#${encodeURIComponent(JSON.stringify(msg))}`,
      width,
      height,
      anchorReference: "POSITION",
      anchorPosition: { left: 0, top: 0 },
      anchorOrigin: { horizontal: "LEFT", vertical: "TOP" },
      transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
      hidePaper: true,
      disableClickAway: true,
    });
  });
});
