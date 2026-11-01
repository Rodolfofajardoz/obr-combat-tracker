import DiceBox from "@3d-dice/dice-box";

/** Dado 3D con físicas (dice-box). Se crea una sola vez, la primera vez que hace falta. */
let box: DiceBox | null = null;
let ready: Promise<void> | null = null;

const CONTAINER = "#dice-box";

export function initDice3d(): Promise<void> {
  if (!ready) {
    if (!document.querySelector(CONTAINER)) {
      return Promise.reject(new Error(`No existe ${CONTAINER} en el DOM`));
    }
    box = new DiceBox({
      container: CONTAINER,
      id: "dice-canvas",
      assetPath: `${import.meta.env.BASE_URL}assets/dice-box/`,
      theme: "default",
      themeColor: "#bb99ff",
      scale: 7,
      throwForce: 6,
      spinForce: 5,
      enableShadows: true,
      lightIntensity: 0.9,
      settleTimeout: 4000,
    });
    ready = box.init();
  }
  return ready;
}

/** Tira n d20 en 3D y devuelve los valores en orden */
export async function roll3d(n: number): Promise<number[]> {
  await initDice3d();
  box!.show();
  // Según la versión, roll() resuelve con grupos ({rolls:[{value}]}) o con dados sueltos ({value})
  const res = (await box!.roll(`${n}d20`)) as Array<{ value: number; rolls?: { value: number }[] }>;
  const values = res.flatMap((g) => (Array.isArray(g.rolls) ? g.rolls.map((r) => r.value) : [g.value]));
  if (values.length !== n || values.some((v) => typeof v !== "number")) {
    throw new Error(`Resultado inesperado del dado 3D: ${JSON.stringify(res).slice(0, 200)}`);
  }
  return values;
}

/** Tira varios grupos de dados en 3D ("2d6", "1d8"…) y devuelve los valores en orden */
export async function roll3dGroups(notations: string[]): Promise<number[]> {
  await initDice3d();
  box!.show();
  const res = (await box!.roll(notations as unknown as string)) as Array<{ value: number; rolls?: { value: number }[] }>;
  return res.flatMap((g) => (Array.isArray(g.rolls) ? g.rolls.map((r) => r.value) : [g.value]));
}

export function clearDice3d() {
  box?.clear();
}

export const DICE3D_PREF = "combat-tracker.dice3d";

export function readDice3dPref(): boolean {
  try {
    return localStorage.getItem(DICE3D_PREF) !== "off";
  } catch {
    return true;
  }
}

export function writeDice3dPref(on: boolean) {
  try {
    localStorage.setItem(DICE3D_PREF, on ? "on" : "off");
  } catch {
    /* sin almacenamiento, no pasa nada */
  }
}
