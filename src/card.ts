import OBR from "@owlbear-rodeo/sdk";
import { CARD_BOTTOM_GAP, CARD_LIFE_MS, CARD_POPOVER_ID, CastMessage, fetchSpellFull, levelLabel } from "./spells";
import { CardTheme, cardTheme, startFx } from "./cardFx";

/** Tarjeta de conjuro: se abre como popover en la pantalla de todos cuando alguien lanza. */
/** Lo más que la tarjeta espera a su texto completo antes de aparecer */
const TEXT_WAIT_MS = 300;

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
    <div class="card${OBR.isAvailable ? " pre" : ""}" id="card" data-theme="${theme.key}" style="--life:${CARD_LIFE_MS}ms; --c1:${theme.c1}; --c2:${theme.c2}">
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
}

let stopFx: () => void = () => {};

/** Cambia el aura de una tarjeta ya abierta */
function applyTheme(theme: CardTheme) {
  const card = document.getElementById("card");
  if (!card) return;
  card.dataset.theme = theme.key;
  card.style.setProperty("--c1", theme.c1);
  card.style.setProperty("--c2", theme.c2);
  card.querySelector(".glyph")!.textContent = theme.glyph;
  stopFx();
  stopFx = startFx(document.getElementById("fx") as HTMLCanvasElement, theme);
}

/**
 * Si el texto completo no venía en el mensaje (quien lanzó no esperó a Open5e), se trae aquí. Con él se
 * rellena la descripción y "At higher levels", y se recalcula el aura: el resumen de la hoja está
 * cortado y puede no llegar a decir qué daño hace el conjuro.
 */
async function completeText(m: CastMessage) {
  if (m.spell.fullDesc) return;
  const full = await fetchSpellFull(m.spell);
  const el = document.getElementById("desc");
  if (!el) return;
  const spell = { ...m.spell, ...full };
  el.innerHTML = descHtml(spell);
  const theme = cardTheme(spell);
  if (theme.key !== document.getElementById("card")?.dataset.theme) applyTheme(theme);
}

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
  const desc = document.getElementById("desc");
  if (!card || !desc || !OBR.isAvailable) return;
  // Lo que cabe entre el borde de arriba de la pantalla y el punto donde se ancla la tarjeta
  const room = Math.max(160, (await OBR.viewport.getHeight()) - CARD_BOTTOM_GAP - 8);
  // offsetHeight es el alto de diseño: no lo altera la escala de la animación de entrada.
  // 16 = el padding del body. En pantallas bajas cede la descripción, que tiene su propio scroll.
  desc.style.maxHeight = "";
  const over = card.offsetHeight + 16 - room;
  if (over > 0) desc.style.maxHeight = `${Math.max(80, desc.offsetHeight - over)}px`;
  await OBR.popover.setHeight(CARD_POPOVER_ID, Math.min(card.offsetHeight + 16, room));
}

/** La tarjeta aparece (y arranca su animación de entrada) solo cuando la ventana ya mide lo que ella mide */
function reveal() {
  requestAnimationFrame(() => document.getElementById("card")?.classList.remove("pre"));
}

if (OBR.isAvailable) {
  OBR.onReady(() => {
    // Aquí y no antes: al completar el texto se vuelve a medir, y el SDK no acepta mensajes hasta estar listo
    const text = msg ? completeText(msg).catch(() => {}) : Promise.resolve();
    // Si el texto completo no venía, se le da un instante para salir ya entera y sin cambiar de tamaño a la vista.
    // Y si Owlbear tardara en responder, la tarjeta se muestra igual pasado un momento.
    const fallback = window.setTimeout(reveal, TEXT_WAIT_MS + 400);
    Promise.race([text, new Promise((r) => window.setTimeout(r, TEXT_WAIT_MS))])
      .then(fit)
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(fallback);
        reveal();
      });
    // Open5e tardó más que la espera: la tarjeta ya se ve, se vuelve a medir con el texto nuevo
    text.then(fit).catch(() => {});
    window.setTimeout(close, CARD_LIFE_MS);
  });
} else if (msg) {
  completeText(msg).catch(() => {});
}
