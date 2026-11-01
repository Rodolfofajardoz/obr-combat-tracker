// @3d-dice/dice-box no trae tipos; esto es lo mínimo que usamos.
declare module "@3d-dice/dice-box" {
  export interface DieResult {
    groupId: number;
    rollId: number;
    sides: number;
    value: number;
  }
  export interface RollGroup {
    id: number;
    qty: number;
    sides: number;
    value: number;
    rolls: DieResult[];
  }
  export default class DiceBox {
    constructor(config: Record<string, unknown>);
    init(): Promise<void>;
    roll(notation: string | string[], options?: { theme?: string; newStartPoint?: boolean }): Promise<RollGroup[]>;
    clear(): void;
    hide(className?: string): void;
    show(): void;
    updateConfig(config: Record<string, unknown>): void;
  }
}
