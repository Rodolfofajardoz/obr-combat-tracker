import OBR from "@owlbear-rodeo/sdk";
import { CARD_POPOVER_ID, CastMessage, levelLabel } from "./spells";

/** Tarjeta de conjuro: se abre como popover en la pantalla de todos cuando alguien lanza. */
const LIFE_MS = 14000;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paras = (s: string) => esc(s).split(/\n{2,}|(?<=\.)\s{2,}/).map((p) => `<p>${p}</p>`).join("");

function read(): CastMessage | null {
  try {
    const raw = decodeURIComponent(location.hash.slice(1));
    return raw ? (JSON.parse(raw) as CastMessage) : null;
  } catch {
    return null;
  }
}

function render(m: CastMessage) {
  const sp = m.spell;
  const tags = [levelLabel(sp.level), sp.school, sp.concentration ? "Concentration" : "", sp.ritual ? "Ritual" : ""]
    .filter(Boolean)
    .join(" · ");
  document.getElementById("root")!.innerHTML = `
    <div class="card" id="card" style="--life:${LIFE_MS}ms">
      <div class="caster">${esc(m.caster)} casts</div>
      <h1>${esc(sp.name)}</h1>
      <div class="sub">${esc(tags)}</div>
      <div class="meta">
        <span><b>Time</b>${esc(sp.time)}</span>
        <span><b>Range</b>${esc(sp.range)}</span>
        <span><b>Duration</b>${esc(sp.duration)}</span>
        <span><b>Comp.</b>${esc(sp.components)}</span>
      </div>
      <div class="desc">${paras(sp.fullDesc || sp.desc)}${sp.higher ? `<div class="higher"><b>At higher levels.</b> ${esc(sp.higher)}</div>` : ""}</div>
      <div class="foot"><span>${m.cost > 0 ? `<span class="cost">−${m.cost} MP</span>` : "Cantrip"}</span><span>click to close</span></div>
      <div class="bar"><i></i></div>
    </div>`;
}

function close() {
  const card = document.getElementById("card");
  card?.classList.add("out");
  window.setTimeout(() => OBR.popover.close(CARD_POPOVER_ID), 350);
}

const msg = read();
if (msg) render(msg);
document.addEventListener("click", close);

/** El popover se abre con una altura provisional; aquí se ajusta a lo que mide la tarjeta, para no tapar de más */
function fit() {
  const card = document.getElementById("card");
  if (!card) return;
  const h = Math.ceil(card.getBoundingClientRect().height) + 16;
  OBR.popover.setHeight(CARD_POPOVER_ID, Math.min(h, 640));
}

if (OBR.isAvailable) {
  OBR.onReady(() => {
    fit();
    // la animación de entrada escala la tarjeta: vuelve a medir cuando termina
    window.setTimeout(fit, 600);
    window.setTimeout(close, LIFE_MS);
  });
}
