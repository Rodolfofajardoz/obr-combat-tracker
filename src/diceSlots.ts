/**
 * Las tiradas se reparten en una fila de espacios arriba del mapa: cada tirada toma el primer espacio
 * libre en el orden en que llega; cuando no queda ninguno, espera en cola hasta que uno se desocupa.
 * Los espacios no son de nadie: el mismo jugador puede ocupar varios si tira seguido.
 */
export const DICE_SLOTS = 5;

export class Slots<T> {
  private busy: boolean[];
  private queue: T[] = [];

  constructor(n: number, private show: (item: T, slot: number) => void) {
    this.busy = Array(n).fill(false);
  }

  push(item: T) {
    const slot = this.busy.indexOf(false);
    if (slot < 0) {
      this.queue.push(item);
      return;
    }
    this.busy[slot] = true;
    this.show(item, slot);
  }

  release(slot: number) {
    if (!this.busy[slot]) return;
    this.busy[slot] = false;
    const next = this.queue.shift();
    if (next !== undefined) this.push(next);
  }

  get pending() {
    return this.queue.length;
  }
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Márgenes en píxeles de la interfaz de Owlbear: la barra de íconos y la ventana del tracker a la
// izquierda, la barra de herramientas a la derecha. Entre medio cabe la fila de espacios.
const LEFT = 236;
const RIGHT = 56;
const TOP = 8;
const GAP = 10;

/** Dónde va el espacio `slot` de la fila, según el tamaño de la pantalla */
export function diceSlotRect(slot: number, vw: number, vh: number): Rect {
  const avail = vw - LEFT - RIGHT - GAP * (DICE_SLOTS - 1);
  const width = Math.floor(Math.max(90, Math.min(220, avail / DICE_SLOTS)));
  const height = Math.round(Math.max(70, Math.min(width * 0.78, vh * 0.3)));
  const fit = (left: number) => Math.max(1, Math.floor((vw - left - RIGHT + GAP) / (width + GAP)));
  // En pantallas angostas la fila arranca pegada al borde izquierdo, y si aun así no caben los cinco
  // espacios, los que sobran pasan a una segunda fila
  let left = LEFT;
  let cols = fit(left);
  if (cols < DICE_SLOTS) {
    left = 4;
    cols = Math.min(DICE_SLOTS, fit(left));
  }
  const col = slot % cols;
  const row = Math.floor(slot / cols);
  return { left: left + col * (width + GAP), top: TOP + row * (height + GAP), width, height };
}
