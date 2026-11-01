import OBR, { AttachmentBehavior, Image, Item, Math2, Vector2, buildCurve, buildShape, buildText, isImage } from "@owlbear-rodeo/sdk";
import { PLUGIN_ID, SHEET_KEY, canSeeSheet, readSheet } from "./types";

/**
 * HP y CA sobre las fichas, dibujados igual que Owl Trackers (mismas medidas, colores y
 * opacidades, tomadas de su código): barra roja redondeada abajo con "11/16" y burbuja azul
 * con la CA en la esquina inferior izquierda. Pero por permisos: cada cliente dibuja SOLO las
 * fichas cuya hoja puede ver (el DM todas; un jugador las suyas y las compartidas), con items
 * locales (OBR.scene.local), que nunca salen de este navegador.
 */
const BAR_KEY = `${PLUGIN_ID}/bar`;
export const BARS_PREF = "combat-tracker.bars";
/** Cambia este sufijo si cambia la forma de los dibujos: los viejos se borran solos */
const VERSION = "v3";

// Constantes de Owl Trackers (compoundItemHelpers.ts)
const FONT = "Roboto, sans-serif";
const BEHAVIORS: AttachmentBehavior[] = ["ROTATION", "VISIBLE", "COPY", "SCALE"];
const TEXT_VERTICAL_OFFSET = -1.2;
const BUBBLE_DIAMETER = 30;
const BUBBLE_OPACITY = 0.7;
const CIRCLE_FONT_SIZE = BUBBLE_DIAMETER - 8;
const REDUCED_CIRCLE_FONT_SIZE = BUBBLE_DIAMETER - 15;
const CIRCLE_TEXT_HEIGHT = BUBBLE_DIAMETER + 2;
const BAR_PADDING = 2;
const FILL_OPACITY = 0.8;
const BAR_HEIGHT = 20;
const BACKGROUND_OPACITY = 0.7;
const BAR_CORNER_RADIUS = BAR_HEIGHT / 2;
const HP_COLOR = "#ab2022"; // rojo de Owl Trackers
const AC_COLOR = "#5092a3"; // azul de Owl Trackers

export function readBarsPref(): boolean {
  try {
    return localStorage.getItem(BARS_PREF) !== "off";
  } catch {
    return true;
  }
}
export function writeBarsPref(on: boolean) {
  try {
    localStorage.setItem(BARS_PREF, on ? "on" : "off");
  } catch {
    /* sin almacenamiento */
  }
}

// ---------- geometría (mathHelpers.ts de Owl Trackers) ----------

function drawArc(center: Vector2, radius: number, startAngle: number, arcAngle: number, arcPoints: number): Vector2[] {
  arcPoints--;
  const pts: Vector2[] = [];
  const step = arcAngle / arcPoints;
  let angle = startAngle;
  for (let i = 0; i <= arcPoints; i++) {
    pts.push({ x: center.x + radius * Math.cos(angle), y: center.y - radius * Math.sin(angle) });
    angle += step;
  }
  return pts;
}

/** Rectángulo redondeado como curva; `fill` entre 0 y 1 dibuja solo la parte izquierda */
function roundedRectangle(maxLength: number, height: number, radius: number, fill = 1, n = 6): Vector2[] {
  if (radius * 2 > height) radius = height * 0.5;
  if (fill >= 1) {
    return [
      { x: radius, y: 0 },
      { x: maxLength - radius, y: 0 },
      ...drawArc({ x: maxLength - radius, y: radius }, radius, Math.PI * 0.5, -Math.PI * 0.5, n),
      ...drawArc({ x: maxLength - radius, y: height - radius }, radius, 0, -Math.PI * 0.5, n),
      { x: maxLength - radius, y: height },
      { x: radius, y: height },
      ...drawArc({ x: radius, y: height - radius }, radius, -Math.PI * 0.5, -Math.PI * 0.5, n),
      ...drawArc({ x: radius, y: radius }, radius, -Math.PI, -Math.PI * 0.5, n),
    ];
  }
  const barLength = fill * maxLength;
  if (barLength < radius) {
    const a = Math.acos((radius - barLength) / radius);
    return [
      ...drawArc({ x: radius, y: height - radius }, radius, Math.PI + a, -a, n),
      ...drawArc({ x: radius, y: radius }, radius, Math.PI, -a, n),
    ];
  }
  const remaining = maxLength - barLength;
  if (remaining < radius) {
    const a = Math.acos((radius - remaining) / radius);
    return [
      { x: radius, y: 0 },
      { x: maxLength - radius, y: 0 },
      ...drawArc({ x: maxLength - radius, y: radius }, radius, Math.PI * 0.5, -Math.PI * 0.5 + a, n),
      ...drawArc({ x: maxLength - radius, y: height - radius }, radius, -a, -Math.PI * 0.5 + a, n),
      { x: maxLength - radius, y: height },
      { x: radius, y: height },
      ...drawArc({ x: radius, y: height - radius }, radius, -Math.PI * 0.5, -Math.PI * 0.5, n),
      ...drawArc({ x: radius, y: radius }, radius, -Math.PI, -Math.PI * 0.5, n),
    ];
  }
  return [
    { x: radius, y: 0 },
    { x: barLength, y: 0 },
    { x: barLength, y: height },
    { x: radius, y: height },
    ...drawArc({ x: radius, y: height - radius }, radius, -Math.PI * 0.5, -Math.PI * 0.5, n),
    ...drawArc({ x: radius, y: radius }, radius, -Math.PI, -Math.PI * 0.5, n),
  ];
}

const fillPortion = (value: number, max: number) => (value <= 0 ? 0 : value >= max ? 1 : value / max);

function imageCenter(image: Image, sceneDpi: number): Vector2 {
  let c: Vector2 = { x: image.image.width / 2, y: image.image.height / 2 };
  c = Math2.subtract(c, image.grid.offset);
  c = Math2.multiply(c, sceneDpi / image.grid.dpi);
  c = Math2.multiply(c, image.scale);
  c = Math2.rotate(c, { x: 0, y: 0 }, image.rotation);
  return Math2.add(c, image.position);
}

function imageBounds(image: Image, sceneDpi: number) {
  const k = sceneDpi / image.grid.dpi;
  return {
    width: Math.max(Math.abs(image.image.width * k * image.scale.x), sceneDpi),
    height: Math.max(Math.abs(image.image.height * k * image.scale.y), sceneDpi),
  };
}

// ---------- dibujo ----------

interface Built {
  id: string;
  item: Item;
}

function buildFor(token: Item, sceneDpi: number): Built[] {
  if (!isImage(token)) return [];
  const s = readSheet(token.metadata[SHEET_KEY]);
  if (!s) return [];
  const bounds = imageBounds(token, sceneDpi);
  const origin = imageCenter(token, sceneDpi);
  const meta = (kind: string) => ({ [BAR_KEY]: { token: token.id, kind, v: VERSION } });
  const id = (kind: string) => `${token.id}-ct-${VERSION}-${kind}`;

  // Barra de HP, pegada al borde inferior (createTrackerBar)
  const barOrigin = { x: origin.x, y: origin.y + bounds.height / 2 };
  const barPos = { x: barOrigin.x - bounds.width / 2 + BAR_PADDING, y: barOrigin.y - BAR_HEIGHT };
  const barWidth = bounds.width - BAR_PADDING * 2;

  const barBg = buildCurve()
    .fillColor("black")
    .fillOpacity(BACKGROUND_OPACITY)
    .strokeWidth(0)
    .position(barPos)
    .attachedTo(token.id)
    .layer("ATTACHMENT")
    .locked(true)
    .id(id("bar-bg"))
    .visible(true)
    .disableAttachmentBehavior(BEHAVIORS)
    .disableHit(true)
    .metadata(meta("bar-bg"))
    .tension(0)
    .closed(true)
    .points(roundedRectangle(barWidth, BAR_HEIGHT, BAR_CORNER_RADIUS))
    .build();

  const barFill = buildCurve()
    .fillColor(HP_COLOR)
    .fillOpacity(FILL_OPACITY)
    .strokeWidth(0)
    .strokeOpacity(0)
    .position(barPos)
    .attachedTo(token.id)
    .layer("ATTACHMENT")
    .locked(true)
    .id(id("bar-fill"))
    .visible(true)
    .disableAttachmentBehavior(BEHAVIORS)
    .disableHit(true)
    .metadata(meta("bar-fill"))
    .tension(0)
    .closed(true)
    .points(roundedRectangle(barWidth, BAR_HEIGHT, BAR_CORNER_RADIUS, fillPortion(s.hp, s.maxHp)))
    .build();

  const barText = buildText()
    .position({ x: barPos.x, y: barPos.y + TEXT_VERTICAL_OFFSET - 5.3 })
    .plainText(`${s.hp}/${s.maxHp}`)
    .textAlign("CENTER")
    .textAlignVertical("MIDDLE")
    .fontSize(BAR_HEIGHT + 2)
    .fontFamily(FONT)
    .textType("PLAIN")
    .height(BAR_HEIGHT + 8)
    .width(barWidth)
    .fontWeight(400)
    .attachedTo(token.id)
    .fillOpacity(1)
    .layer("TEXT")
    .locked(true)
    .id(id("bar-text"))
    .visible(true)
    .disableAttachmentBehavior(BEHAVIORS)
    .disableHit(true)
    .metadata(meta("bar-text"))
    .build();

  // Burbuja de CA: primera posición de BubblePosition, con una barra debajo
  const bubble = {
    x: origin.x + 2 - bounds.width / 2 + BUBBLE_DIAMETER / 2,
    y: origin.y - (2 + BUBBLE_DIAMETER / 2) - BAR_HEIGHT + bounds.height / 2,
  };
  const acText = String(s.ac);

  const bubbleShape = buildShape()
    .width(BUBBLE_DIAMETER)
    .height(BUBBLE_DIAMETER)
    .shapeType("CIRCLE")
    .fillColor(AC_COLOR)
    .fillOpacity(BUBBLE_OPACITY)
    .strokeColor(AC_COLOR)
    .strokeOpacity(0.5)
    .strokeWidth(0)
    .position(bubble)
    .attachedTo(token.id)
    .layer("ATTACHMENT")
    .locked(true)
    .id(id("bubble-bg"))
    .visible(true)
    .disableAttachmentBehavior(BEHAVIORS)
    .disableHit(true)
    .metadata(meta("bubble-bg"))
    .build();

  const bubbleText = buildText()
    .position({ x: bubble.x - BUBBLE_DIAMETER / 2, y: bubble.y - BUBBLE_DIAMETER / 2 + TEXT_VERTICAL_OFFSET })
    .plainText(acText.length > 3 ? "…" : acText)
    .textAlign("CENTER")
    .textAlignVertical("MIDDLE")
    .fontSize(acText.length === 3 ? REDUCED_CIRCLE_FONT_SIZE : CIRCLE_FONT_SIZE)
    .fontFamily(FONT)
    .textType("PLAIN")
    .height(CIRCLE_TEXT_HEIGHT)
    .width(BUBBLE_DIAMETER)
    .fontWeight(400)
    .attachedTo(token.id)
    .layer("TEXT")
    .locked(true)
    .id(id("bubble-text"))
    .visible(true)
    .disableAttachmentBehavior(BEHAVIORS)
    .disableHit(true)
    .metadata(meta("bubble-text"))
    .build();

  return [barBg, barFill, barText, bubbleShape, bubbleText].map((item) => ({ id: item.id, item }));
}

let timer: number | null = null;

/** Arranca el seguimiento (en la página de fondo). Reconstruye las barras cuando cambia la escena o el jugador. */
export function startBars() {
  let playerId = "";
  let role: "GM" | "PLAYER" = "PLAYER";
  let enabled = readBarsPref();

  const schedule = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      rebuild().catch(() => undefined);
    }, 120);
  };

  const rebuild = async () => {
    const existing = await OBR.scene.local.getItems((i) => i.metadata[BAR_KEY] !== undefined);
    const ready = await OBR.scene.isReady();
    const wanted = new Map<string, Item>();
    if (ready && enabled) {
      const [items, dpi] = await Promise.all([OBR.scene.items.getItems(), OBR.scene.grid.getDpi()]);
      const isGM = role === "GM";
      for (const it of items) {
        const s = readSheet(it.metadata[SHEET_KEY]);
        if (!s) continue;
        if (!isGM && !it.visible) continue;
        if (!canSeeSheet(s, it.createdUserId, playerId, isGM)) continue;
        for (const b of buildFor(it, dpi)) wanted.set(b.id, b.item);
      }
    }
    const existingIds = new Set(existing.map((i) => i.id));
    // Todo lo que no se quiere (incluidos dibujos de versiones anteriores) se borra
    const toDelete = existing.filter((i) => !wanted.has(i.id)).map((i) => i.id);
    const toAdd = [...wanted.values()].filter((i) => !existingIds.has(i.id));
    const toUpdate = [...wanted.values()].filter((i) => existingIds.has(i.id));
    if (toDelete.length) await OBR.scene.local.deleteItems(toDelete);
    if (toAdd.length) await OBR.scene.local.addItems(toAdd);
    if (toUpdate.length) {
      await OBR.scene.local.updateItems(
        toUpdate.map((i) => i.id),
        (drafts) => {
          for (const d of drafts) {
            const w = wanted.get(d.id);
            if (!w) continue;
            const src = w as unknown as Record<string, unknown>;
            const dst = d as unknown as Record<string, unknown>;
            dst.position = w.position;
            for (const key of ["points", "width", "height", "style", "text"]) {
              if (key in src) dst[key] = src[key];
            }
          }
        },
      );
    }
  };

  OBR.player.getId().then((id) => {
    playerId = id;
    schedule();
  });
  OBR.player.getRole().then((r) => {
    role = r;
    schedule();
  });
  OBR.player.onChange((p) => {
    if (p.id !== playerId || p.role !== role) {
      playerId = p.id;
      role = p.role;
      schedule();
    }
  });
  OBR.scene.onReadyChange(schedule);
  OBR.scene.items.onChange(schedule);
  // El botón de la ventana principal escribe en localStorage; ambos iframes comparten origen
  window.addEventListener("storage", (e) => {
    if (e.key === BARS_PREF) {
      enabled = readBarsPref();
      schedule();
    }
  });
  schedule();
}
