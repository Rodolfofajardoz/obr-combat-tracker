import OBR from "@owlbear-rodeo/sdk";
import { setupContextMenu } from "./contextMenu";

// Página de fondo: registra el menú contextual aunque la ventana esté cerrada
OBR.onReady(() => {
  setupContextMenu();
});
