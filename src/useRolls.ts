import { useCallback, useEffect, useState } from "react";
import { broadcastRoll } from "./obr";
import { RollMessage, RollMode } from "./types";
import { parseExpr, rollD20, rollExpr as rollExprInstant } from "./dice";
import { DICE_SETTLE_MS, DiceShow, broadcastDice, readDice3dPref, writeDice3dPref } from "./diceShow";
import { RollPrefs, onRollPrefs, readRollPrefs, writeRollPrefs } from "./rollPrefs";
import type { ExprRequest, RollRequest } from "./App";

interface Me {
  role: "GM" | "PLAYER";
  playerId: string;
  playerName: string;
}

/** Todo lo de tirar: el modo, lo privado, los dados 3D y las dos tiradas. Lo usan la lista y la ventana de la hoja. */
export function useRolls({ role, playerId, playerName }: Me) {
  const [prefs, setPrefs] = useState<RollPrefs>(readRollPrefs);
  const [dice3d, setDice3d] = useState(readDice3dPref);
  useEffect(() => onRollPrefs(setPrefs), []);

  const update = useCallback((patch: Partial<RollPrefs>) => {
    const next = { ...readRollPrefs(), ...patch };
    setPrefs(next);
    writeRollPrefs(next);
  }, []);

  const isGM = role === "GM";
  const { mode, hidden, whisper } = prefs;
  // Un susurro viaja a todos pero cada ventana muestra solo los que le tocan: los del DM, todos
  const whisperTo = whisper && !isGM ? playerId : undefined;

  /** Manda los dados a la pantalla de todos; si aquí se ven en 3D, espera a que caigan antes de publicar el resultado */
  const showDice = useCallback(
    async (show: Omit<DiceShow, "by" | "hidden" | "whisper">) => {
      if (!show.values.length) return;
      await broadcastDice({ ...show, by: playerName, hidden: hidden || undefined, whisper: whisperTo }, hidden);
      if (dice3d) await new Promise((r) => setTimeout(r, DICE_SETTLE_MS));
    },
    [playerName, hidden, whisperTo, dice3d],
  );

  const roll = useCallback(
    async (req: RollRequest) => {
      const { dice, kept } = rollD20(mode);
      const msg: RollMessage = {
        ...req,
        dice,
        kept,
        total: kept + req.mod,
        mode,
        by: playerName,
        at: Date.now(),
        hidden: hidden || undefined,
        whisper: whisperTo,
      };
      // Ventaja/desventaja vale para una sola tirada
      if (mode !== "normal") update({ mode: "normal" });
      const bonus = req.mod ? ` ${req.mod > 0 ? "+" : "−"} ${Math.abs(req.mod)}` : "";
      await showDice({
        notation: `${dice.length}d20`,
        values: dice,
        who: req.who,
        what: req.what,
        total: msg.total,
        detail: (dice.length > 1 ? `[${dice.join(", ")}] → ${kept}` : `${kept}`) + bonus,
      });
      await broadcastRoll(msg, hidden);
      return msg;
    },
    [mode, playerName, hidden, whisperTo, showDice, update],
  );

  /** Daño y otras expresiones: sin ventaja/desventaja, con dado 3D si está activo */
  const rollExpr = useCallback(
    async (req: ExprRequest) => {
      const { dice, mod, total } = rollExprInstant(req.expr);
      const msg: RollMessage = {
        who: req.who,
        what: req.what,
        dice,
        kept: total - mod,
        mod,
        total,
        mode: "normal",
        by: playerName,
        at: Date.now(),
        expr: req.expr,
        hidden: hidden || undefined,
        whisper: whisperTo,
      };
      // Los dados salen en el orden de los grupos de la expresión
      await showDice({
        notation: parseExpr(req.expr).terms.map((t) => `${Math.abs(t.count)}d${t.sides}`).join("+"),
        values: dice,
        who: req.who,
        what: req.what,
        total,
        detail: `${req.expr} → [${dice.join(", ")}]`,
      });
      await broadcastRoll(msg, hidden);
      return msg;
    },
    [playerName, hidden, whisperTo, showDice],
  );

  const toggleDice3d = () => {
    const next = !dice3d;
    setDice3d(next);
    writeDice3dPref(next);
  };

  return {
    mode,
    setMode: (m: RollMode) => update({ mode: m }),
    hidden,
    toggleHidden: () => update({ hidden: !hidden }),
    whisper,
    toggleWhisper: () => update({ whisper: !whisper }),
    dice3d,
    toggleDice3d,
    roll,
    rollExpr,
  };
}
