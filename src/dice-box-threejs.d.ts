// @3d-dice/dice-box-threejs no trae tipos; esto es lo mínimo que usamos.
declare module "@3d-dice/dice-box-threejs" {
  export default class DiceBox {
    constructor(selector: string, config?: Record<string, unknown>);
    initialize(): Promise<void>;
    /** "2d6@3,5" cae en esos valores */
    roll(notation: string): Promise<unknown>;
    clearDice(): void;
  }
}
