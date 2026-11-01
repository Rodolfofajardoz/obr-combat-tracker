import OBR from "@owlbear-rodeo/sdk";
import DiceBox from "@3d-dice/dice-box-threejs";
import { DICE_DONE_CHANNEL, DICE_SETTLE_MS, DicePopover, dicePopoverId } from "./diceShow";
import { lockstep } from "./diceLockstep";

/** Bandeja chica (popover sin fondo): los dados ruedan y caen en los valores que ya se tiraron */
const msg = JSON.parse(decodeURIComponent(location.hash.slice(1))) as DicePopover;
const id = dicePopoverId(msg.slot);
const $ = (id: string) => document.getElementById(id)!;

$("by").textContent = msg.hidden ? `🙈 ${msg.by}` : msg.whisper ? `🤫 ${msg.by}` : msg.by;
$("what").textContent = `${msg.who} · ${msg.what}`;
$("total").textContent = String(msg.total);
$("detail").textContent = msg.detail;

let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  document.body.classList.add("out");
  setTimeout(async () => {
    if (!OBR.isAvailable) return;
    // Avisa a la página de fondo de este cliente que el espacio queda libre
    await OBR.broadcast.sendMessage(DICE_DONE_CHANNEL, { slot: msg.slot }, { destination: "LOCAL" }).catch(() => {});
    OBR.popover.close(id);
  }, 400);
};
const reveal = () => {
  $("caption").classList.add("done");
  setTimeout(close, 2600);
};

document.body.addEventListener("click", close);

// Fuera de Owlbear (abriendo dice.html directo en el navegador) rueda igual, para probar la bandeja
const ready = (cb: () => void) => (OBR.isAvailable ? OBR.onReady(cb) : cb());

ready(async () => {
  try {
    const box = new DiceBox("#dice", {
      theme_customColorset: {
        name: "tejido",
        foreground: "#ffffff",
        background: "#6b3fa0",
        outline: "#1b0f2e",
        texture: "none",
        material: "glass",
      },
      // El tamaño del dado va en píxeles: proporcional a la bandeja
      baseScale: Math.max(30, Math.min(innerWidth, innerHeight) / 3.6),
      strength: 1.3,
      shadows: true,
      sounds: false,
    });
    lockstep(box);
    await box.initialize();
    // Si algo se cuelga, el resultado sale igual a su tiempo
    const fallback = setTimeout(reveal, DICE_SETTLE_MS + 1500);
    await box.roll(`${msg.notation}@${msg.values.join(",")}`);
    clearTimeout(fallback);
    reveal();
  } catch {
    // Sin WebGL: solo el número
    reveal();
  }
});
