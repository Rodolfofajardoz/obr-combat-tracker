/**
 * Aura de la tarjeta de conjuro: un tema (colores, glifo, animación CSS) según el tipo de daño que hace
 * el conjuro o, si no hace daño, según su escuela; y encima partículas en un canvas que vive detrás del texto.
 * Todo es decorativo: si el navegador pide menos movimiento, no hay partículas.
 */

export type FxKind =
  | "embers" | "snow" | "sparks" | "drops" | "bubbles" | "wisps" | "sparkles" | "ripples"
  | "orbit" | "motes" | "runes" | "mist" | "stars" | "morph" | "prism" | "shock";

export interface CardTheme {
  key: string;
  /** Color principal (borde, glifo, títulos) y secundario (destellos) */
  c1: string;
  c2: string;
  /** Glifo de marca de agua */
  glyph: string;
  fx: FxKind;
}

const T = (key: string, c1: string, c2: string, glyph: string, fx: FxKind): CardTheme => ({ key, c1, c2, glyph, fx });

/** Por tipo de daño o de efecto: manda sobre la escuela */
const DAMAGE: Record<string, CardTheme> = {
  fire: T("fire", "#ff7a3d", "#ffd166", "🔥", "embers"),
  cold: T("cold", "#8fd8ff", "#ffffff", "❄", "snow"),
  lightning: T("lightning", "#ffe66d", "#9fe0ff", "⚡", "sparks"),
  thunder: T("thunder", "#b8c4ff", "#ffffff", "◎", "shock"),
  acid: T("acid", "#9bff5a", "#eaffb0", "⌁", "drops"),
  poison: T("poison", "#7ddc5a", "#2f8f3a", "☠", "bubbles"),
  necrotic: T("necrotic", "#a86bff", "#3a1457", "☽", "wisps"),
  radiant: T("radiant", "#ffe08a", "#fff8dc", "☀", "sparkles"),
  psychic: T("psychic", "#ff6ad5", "#b58cff", "◉", "ripples"),
  force: T("force", "#b39dff", "#e6dcff", "✶", "orbit"),
  heal: T("heal", "#7cf5a3", "#eafff1", "✚", "motes"),
  prism: T("prism", "#ffffff", "#ffb3ec", "◈", "prism"),
};

/** Por escuela, cuando el conjuro no hace daño ni cura */
const SCHOOL: Record<string, CardTheme> = {
  evocation: T("evocation", "#ff9a5c", "#ffd9a8", "✦", "embers"),
  abjuration: T("abjuration", "#5aa9ff", "#d6ebff", "⬡", "runes"),
  necromancy: DAMAGE.necrotic,
  illusion: T("illusion", "#d58cff", "#8cf0ff", "◐", "mist"),
  enchantment: T("enchantment", "#ff8ad8", "#ffd6f2", "❥", "sparkles"),
  conjuration: T("conjuration", "#b388ff", "#dcd0ff", "⟡", "orbit"),
  divination: T("divination", "#ffd86b", "#fff3c4", "✧", "stars"),
  transmutation: T("transmutation", "#7fe0c2", "#ffd27f", "⟲", "morph"),
};

const DEFAULT = T("arcane", "#a98bff", "#dcd0ff", "✦", "stars");

const TYPES = ["fire", "cold", "lightning", "thunder", "acid", "poison", "necrotic", "radiant", "psychic", "force"];
const DAMAGE_RE = new RegExp(`\\b(${TYPES.join("|")})\\s+damage\\b`, "gi");
/** Pistas en el nombre, para cuando el texto no dice "X damage" (Ice Knife, Flame Blade…) */
const NAME_HINT: [RegExp, string][] = [
  [/\b(ice|frost|cold|snow|sleet|freez|chill)/i, "cold"],
  [/\b(fire|flame|burning|scorching|fireball|immolat)/i, "fire"],
  [/\b(lightning|shock|storm)/i, "lightning"],
  [/\bthunder/i, "thunder"],
  [/\bacid/i, "acid"],
  [/\bpoison|venom|stinking/i, "poison"],
  [/\b(necro|blight|wither|vampir|inflict)/i, "necrotic"],
  [/\b(radiant|sacred|holy|sun|daylight|guiding)/i, "radiant"],
  [/\b(psychic|mind|dissonant)/i, "psychic"],
  [/\bforce|missile/i, "force"],
  [/\b(cure|heal|restor|revivif|mass healing)/i, "heal"],
];

/** Tema de un conjuro: primero por lo que hace (daño, curación), luego por su escuela */
export function cardTheme(spell: { school: string; desc: string; fullDesc?: string; name: string }): CardTheme {
  const text = `${spell.fullDesc || ""} ${spell.desc || ""}`;
  // "Choose Acid, Cold, Fire, Lightning…": tres o más tipos en la misma frase es un prisma
  for (const sentence of text.split(/[.;:]\s/)) {
    const found = TYPES.filter((t) => new RegExp(`\\b${t}\\b`, "i").test(sentence));
    if (found.length >= 3) return DAMAGE.prism;
  }
  const types: string[] = [];
  for (const m of text.matchAll(DAMAGE_RE)) {
    const t = m[1].toLowerCase();
    if (!types.includes(t)) types.push(t);
  }
  if (types.length) return DAMAGE[types[0]];
  if (/\b(regains?|restores?)\b[^.]{0,40}\bhit points\b/i.test(text) || /\bhit points equal to\b/i.test(text)) return DAMAGE.heal;
  // El nombre solo cuenta cuando el texto no dijo de qué tipo es el daño; "Faerie Fire" ilumina, no quema
  if (!/\bfaerie\b/i.test(spell.name)) for (const [re, key] of NAME_HINT) if (re.test(spell.name)) return DAMAGE[key];
  return SCHOOL[(spell.school || "").toLowerCase().trim()] ?? DEFAULT;
}

// ---------- partículas ----------

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  /** ángulo o fase, según el efecto */
  a: number;
  c: string;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <X>(xs: X[]) => xs[Math.floor(Math.random() * xs.length)];

/** Cuántas partículas vivas quiere cada efecto y cada cuánto nace una (ms) */
const RATE: Record<FxKind, [number, number]> = {
  embers: [55, 70], snow: [45, 110], sparks: [40, 60], drops: [18, 260], bubbles: [26, 220], wisps: [16, 260],
  sparkles: [30, 120], ripples: [6, 700], orbit: [24, 150], motes: [36, 110], runes: [0, 1e9], mist: [10, 500],
  stars: [40, 140], morph: [8, 600], prism: [40, 90], shock: [5, 900],
};

export function startFx(canvas: HTMLCanvasElement, theme: CardTheme): () => void {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return () => {};
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const kind = theme.fx;
  const colors = [theme.c1, theme.c2];
  let W = 0;
  let H = 0;
  let render = () => {};
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // cambiar el tamaño del bitmap lo borra: se vuelve a pintar en vez de esperar al siguiente cuadro
    render();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const ps: P[] = [];
  const [cap, every] = RATE[kind];
  let acc = 0;
  let t = 0;
  let last = performance.now();
  let raf = 0;
  let failed = false;

  const spawn = (): P => {
    const c = pick(colors);
    switch (kind) {
      case "embers":
        return { x: rnd(0, W), y: H + 4, vx: rnd(-8, 8), vy: rnd(-26, -60), r: rnd(1.2, 3), life: 0, max: rnd(1.6, 3.2), a: rnd(0, 6.3), c };
      case "snow":
        return { x: rnd(-10, W), y: -4, vx: rnd(4, 14), vy: rnd(12, 26), r: rnd(1.5, 3.2), life: 0, max: rnd(5, 9), a: rnd(0, 6.3), c };
      case "sparks":
        return { x: rnd(0, W), y: rnd(0, H), vx: rnd(-60, 60), vy: rnd(-60, 60), r: rnd(0.8, 2), life: 0, max: rnd(0.25, 0.7), a: 0, c };
      case "drops":
        return { x: rnd(6, W - 6), y: -2, vx: 0, vy: rnd(10, 30), r: rnd(1.5, 3), life: 0, max: 6, a: 0, c };
      case "bubbles":
        return { x: rnd(4, W - 4), y: H + 4, vx: rnd(-4, 4), vy: rnd(-10, -22), r: rnd(2, 6), life: 0, max: rnd(4, 7), a: rnd(0, 6.3), c };
      case "wisps":
        return { x: rnd(0, W), y: H * rnd(0.5, 1.05), vx: rnd(-6, 6), vy: rnd(-8, -18), r: rnd(10, 26), life: 0, max: rnd(3, 5), a: rnd(0, 6.3), c };
      case "sparkles":
      case "stars":
        return { x: rnd(0, W), y: rnd(0, H), vx: 0, vy: kind === "sparkles" ? rnd(-6, -14) : 0, r: rnd(1, 3.2), life: 0, max: rnd(0.8, 2.2), a: rnd(0, 6.3), c };
      case "ripples":
        return { x: rnd(W * 0.2, W * 0.8), y: rnd(H * 0.2, H * 0.8), vx: 0, vy: 0, r: 0, life: 0, max: rnd(1.6, 2.4), a: 0, c };
      case "shock":
        return { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 0, life: 0, max: 1.4, a: 0, c };
      case "orbit":
        return { x: 0, y: 0, vx: rnd(0.4, 1.1) * (Math.random() < 0.5 ? 1 : -1), vy: 0, r: rnd(1, 2.4), life: 0, max: rnd(4, 8), a: rnd(0, 6.3), c };
      case "motes":
        return { x: rnd(0, W), y: H + 4, vx: rnd(-4, 4), vy: rnd(-10, -22), r: rnd(1.5, 3.5), life: 0, max: rnd(3, 5), a: rnd(0, 6.3), c };
      case "mist":
        return { x: rnd(-20, W + 20), y: rnd(0, H), vx: rnd(-6, 6), vy: rnd(-2, 2), r: rnd(30, 70), life: 0, max: rnd(5, 8), a: rnd(0, 360), c };
      case "morph":
        return { x: rnd(W * 0.1, W * 0.9), y: rnd(H * 0.1, H * 0.9), vx: rnd(-5, 5), vy: rnd(-5, 5), r: rnd(8, 18), life: 0, max: rnd(4, 7), a: rnd(0, 6.3), c };
      case "prism":
        return { x: rnd(0, W), y: rnd(0, H), vx: rnd(-8, 8), vy: rnd(-14, -4), r: rnd(1.2, 2.8), life: 0, max: rnd(1.5, 3), a: rnd(0, 360), c };
      default:
        return { x: 0, y: 0, vx: 0, vy: 0, r: 0, life: 0, max: 1, a: 0, c };
    }
  };

  /** Nacen, se mueven y mueren; sin dibujar (también sirve para precalentar) */
  const step = (dt: number) => {
    t += dt;
    acc += dt * 1000;
    while (acc >= every && ps.length < cap) {
      acc -= every;
      ps.push(spawn());
    }
    if (acc > every) acc = every;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) {
        ps.splice(i, 1);
        continue;
      }
      switch (kind) {
        case "embers":
          p.x += (p.vx + Math.sin(t * 3 + p.a) * 12) * dt;
          p.y += p.vy * dt;
          break;
        case "snow":
          p.x += (p.vx + Math.sin(t * 1.2 + p.a) * 10) * dt;
          p.y += p.vy * dt;
          p.a += dt;
          break;
        case "drops":
          p.vy += 60 * dt;
          p.y += p.vy * dt;
          break;
        case "bubbles":
        case "motes":
          p.x += (p.vx + Math.sin(t * 2 + p.a) * 8) * dt;
          p.y += p.vy * dt;
          break;
        case "orbit":
          p.a += p.vx * dt;
          break;
        default:
          p.x += p.vx * dt;
          p.y += p.vy * dt;
      }
    }
  };

  const star = (x: number, y: number, r: number, points = 4) => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 ? r * 0.38 : r;
      const an = (Math.PI * i) / points;
      ctx.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad);
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawOne = (p: P) => {
    // k: 0→1 vida; fade in y out
    const k = p.life / p.max;
    const f = Math.min(1, k * 4, (1 - k) * 2.5);
    ctx.globalAlpha = Math.max(0, f);
    ctx.fillStyle = p.c;
    ctx.strokeStyle = p.c;
    switch (kind) {
      case "embers":
      case "motes":
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.3);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      case "snow":
        ctx.globalAlpha *= 0.8;
        star(p.x, p.y, p.r, 6);
        break;
      case "sparks":
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
        break;
      case "drops":
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * 0.7, p.r * 1.6, 0, 0, 6.3);
        ctx.fill();
        break;
      case "bubbles":
        ctx.lineWidth = 1;
        ctx.globalAlpha *= 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.3);
        ctx.stroke();
        break;
      case "wisps":
        ctx.globalAlpha *= 0.16;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + k), 0, 6.3);
        ctx.fill();
        break;
      case "sparkles":
      case "stars":
      case "prism":
        if (kind === "prism") ctx.fillStyle = `hsl(${(p.a + t * 60) % 360}, 100%, 75%)`;
        star(p.x, p.y, p.r * (0.6 + 0.4 * Math.sin(k * Math.PI)), 4);
        break;
      case "ripples":
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = (1 - k) * 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 + k * 70, 0, 6.3);
        ctx.stroke();
        break;
      case "shock":
        ctx.lineWidth = 2;
        ctx.globalAlpha = (1 - k) * 0.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 10 + k * W * 0.6, 6 + k * H * 0.6, 0, 0, 6.3);
        ctx.stroke();
        break;
      case "orbit": {
        const x = W / 2 + Math.cos(p.a) * W * 0.42;
        const y = H / 2 + Math.sin(p.a) * H * 0.42;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.c;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, 6.3);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
      case "mist":
        ctx.globalAlpha *= 0.12;
        ctx.fillStyle = `hsl(${(p.a + t * 20) % 360}, 90%, 75%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.3);
        ctx.fill();
        break;
      case "morph": {
        ctx.globalAlpha *= 0.35;
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const an = (i / 24) * 6.2832;
          const rr = p.r * (1 + 0.25 * Math.sin(an * 3 + p.a + t * 2.5));
          ctx.lineTo(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "runes":
        break;
    }
    ctx.globalAlpha = 1;
  };

  /** Runas: un anillo doble de marcas que gira, sin partículas */
  const drawRunes = () => {
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.46;
    ctx.strokeStyle = theme.c1;
    ctx.lineWidth = 1.2;
    for (let ring = 0; ring < 2; ring++) {
      const rr = R * (ring ? 0.78 : 1);
      const dir = ring ? -1 : 1;
      const n = ring ? 18 : 28;
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 1.5 + ring);
      for (let i = 0; i < n; i++) {
        const an = (i / n) * 6.2832 + t * 0.25 * dir;
        const x = cx + Math.cos(an) * rr * 1.15;
        const y = cy + Math.sin(an) * rr * 0.75;
        const len = ring ? 4 : 7;
        ctx.beginPath();
        ctx.moveTo(x, y - len);
        ctx.lineTo(x, y + len);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  /** Relámpago: de vez en cuando un rayo cruza la tarjeta */
  const drawBolt = () => {
    ctx.strokeStyle = theme.c2;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 10;
    ctx.shadowColor = theme.c1;
    ctx.beginPath();
    let x = rnd(W * 0.2, W * 0.8);
    let y = 0;
    ctx.moveTo(x, y);
    while (y < H) {
      x += rnd(-18, 18);
      y += rnd(10, 26);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  };

  render = () => {
    ctx.clearRect(0, 0, W, H);
    if (kind === "runes") drawRunes();
    for (const p of ps) drawOne(p);
    if (kind === "sparks" && Math.random() < 0.012) drawBolt();
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      step(dt);
      render();
    } catch (e) {
      // Decorativo: si algo falla, se apaga sin molestar a la tarjeta
      if (!failed) console.error("cardFx", e);
      failed = true;
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  // Precalentar: que la tarjeta aparezca ya con su aura en vez de vacía los primeros segundos
  for (let i = 0; i < 60; i++) step(0.05);
  render();
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
