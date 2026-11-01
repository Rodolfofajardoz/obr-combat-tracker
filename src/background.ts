import OBR from "@owlbear-rodeo/sdk";
import { setupContextMenu } from "./contextMenu";
import { startBars } from "./bars";
import { CARD_POPOVER_ID, onCast } from "./spells";

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
});
