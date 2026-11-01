import React from "react";
import ReactDOM from "react-dom/client";
import OBR from "@owlbear-rodeo/sdk";
import App from "./App";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

if (OBR.isAvailable) {
  OBR.onReady(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });
} else {
  root.render(
    <div className="empty">
      Esta página es una extensión de Owlbear Rodeo. Ábrela desde una sala con la URL del
      <code> manifest.json</code>.
    </div>,
  );
}
