import OBR from "@owlbear-rodeo/sdk";
import { CARD_POPOVER_ID, CastMessage, fetchSpellFull, levelLabel } from "./spells";
import { cardTheme, startFx } from "./cardFx";

/** Tarjeta de conjuro: se abre como popover en la pantalla de todos cuando alguien lanza. */
const LIFE_MS = 14000;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paras = (s: string) => esc(s).split(/\n{2,}|(?<=\.)\s{2,}/).map((p) => `<p>${p}</p>`).join("");
const descHtml = (sp: CastMessage["spell"]) =>
  paras(sp.fullDesc || sp.desc) + (sp.higher ? `<div class="higher"><b>At higher levels.</b> ${esc(sp.higher)}</div>` : "");

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
  // Lanzado a nivel superior: se ve el nivel al que se lanzó y, entre paréntesis, el nivel propio del conjuro
  const lvl = m.level ?? sp.level;
  const level = lvl > sp.level ? `${levelLabel(lvl)} ↑ (${levelLabel(sp.level)} spell)` : levelLabel(sp.level);
  const tags = [level, sp.school, sp.concentration ? "Concentration" : "", sp.ritual ? "Ritual" : ""]
    .filter(Boolean)
    .join(" · ");
  // Aura: colores, glifo y partículas según el daño que hace el conjuro o, si no, su escuela
  const theme = cardTheme(sp);
  document.getElementById("root")!.innerHTML = `
    <div class="card${OBR.isAvailable ? " pre" : ""}" id="card" data-theme="${theme.key}" style="--life:${LIFE_MS}ms; --c1:${theme.c1}; --c2:${theme.c2}">
      <canvas class="fx" id="fx"></canvas>
      <div class="glyph">${theme.glyph}</div>
      <div class="in">
        <div class="caster">${esc(m.caster)} casts</div>
        <h1>${esc(sp.name)}</h1>
        <div class="sub">${esc(tags)}</div>
        <div class="meta">
          <span><b>Time</b>${esc(sp.time)}</span>
          <span><b>Range</b>${esc(sp.range)}</span>
          <span><b>Duration</b>${esc(sp.duration)}</span>
          <span><b>Comp.</b>${esc(sp.components)}</span>
        </div>
        <div class="desc" id="desc">${descHtml(sp)}</div>
        <div class="foot"><span>${m.cost > 0 ? `<span class="cost">−${m.cost} MP</span>` : "Cantrip"}</span><span>click to close</span></div>
        <div class="bar"><i></i></div>
      </div>
    </div>`;
  stopFx = startFx(document.getElementById("fx") as HTMLCanvasElement, theme);

  // Quien lanzó no esperó a Open5e: la tarjeta sale con el resumen y el texto completo se rellena al llegar
  if (!sp.fullDesc) {
    fetchSpellFull(sp).then((full) => {
      if (!full.fullDesc || full.fullDesc === sp.desc) return;
      const el = document.getElementById("desc");
      if (!el) return;
      el.innerHTML = descHtml({ ...sp, ...full });
      fit();
    });
  }
}

let stopFx: () => void = () => {};

function close() {
  const card = document.getElementById("card");
  card?.classList.add("out");
  window.setTimeout(() => {
    stopFx();
    if (OBR.isAvailable) OBR.popover.close(CARD_POPOVER_ID);
  }, 350);
}

const msg = read();
if (msg) render(msg);
document.addEventListener("click", close);

/** El popover se abre con una altura provisional; aquí se ajusta a lo que mide la tarjeta, para no tapar de más */
async function fit() {
  const card = document.getElementById("card");
  if (!card || !OBR.isAvailable) return;
  const h = Math.ceil(card.getBoundingClientRect().height) + 16;
  await OBR.popover.setHeight(CARD_POPOVER_ID, Math.min(h, 640));
}

/** La tarjeta aparece (y arranca su animación de entrada) solo cuando la ventana ya mide lo que ella mide */
function reveal() {
  requestAnimationFrame(() => document.getElementById("card")?.classList.remove("pre"));
}

if (OBR.isAvailable) {
  OBR.onReady(() => {
    // Si Owlbear tardara en responder, la tarjeta se muestra igual pasado un momento
    const fallback = window.setTimeout(reveal, 400);
    fit().finally(() => {
      window.clearTimeout(fallback);
      reveal();
    });
    // la animación de entrada escala la tarjeta: vuelve a medir cuando termina
    window.setTimeout(fit, 700);
    window.setTimeout(close, LIFE_MS);
  });
}
