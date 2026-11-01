import { useCallback, useEffect, useMemo, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import {
  Combatant,
  broadcastRoll,
  focusItem,
  onRoll,
  readCombat,
  setCombat,
  sortCombatants,
  toCombatants,
  updateSheet,
  updateSheets,
} from "./obr";
import { Combat, RollMessage, RollMode, Sheet, initMod } from "./types";
import { rollD20 } from "./dice";
import { setupContextMenu } from "./contextMenu";
import { Row } from "./components/Row";
import { SheetPanel } from "./components/SheetPanel";
import { RollLog } from "./components/RollLog";

export interface RollRequest {
  who: string;
  what: string;
  mod: number;
}

export default function App() {
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [ready, setReady] = useState(false);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [combat, setCombatState] = useState<Combat>({ round: 1, turnId: null });
  const [mode, setMode] = useState<RollMode>("normal");
  const [openId, setOpenId] = useState<string | null>(null);
  const [log, setLog] = useState<RollMessage[]>([]);

  // Conexión con Owlbear
  useEffect(() => {
    OBR.player.getRole().then(setRole);
    OBR.player.getId().then(setPlayerId);
    OBR.player.getName().then(setPlayerName);
    OBR.theme.getTheme().then((t) => document.documentElement.dataset.theme = t.mode.toLowerCase());
    const offs = [
      OBR.player.onChange((p) => {
        setRole(p.role);
        setPlayerName(p.name);
      }),
      OBR.theme.onChange((t) => (document.documentElement.dataset.theme = t.mode.toLowerCase())),
      OBR.scene.onReadyChange(setReady),
      onRoll((m) => setLog((l) => [m, ...l].slice(0, 30))),
    ];
    OBR.scene.isReady().then(setReady);
    setupContextMenu();
    return () => offs.forEach((off) => off());
  }, []);

  // Fichas y metadatos de la escena
  useEffect(() => {
    if (!ready) return;
    OBR.scene.items.getItems().then((items) => setCombatants(toCombatants(items)));
    OBR.scene.getMetadata().then((m) => setCombatState(readCombat(m)));
    const offItems = OBR.scene.items.onChange((items) => setCombatants(toCombatants(items)));
    const offMeta = OBR.scene.onMetadataChange((m) => setCombatState(readCombat(m)));
    return () => {
      offItems();
      offMeta();
    };
  }, [ready]);

  const isGM = role === "GM";
  const canSee = useCallback(
    (c: Combatant) => isGM || c.sheet.shared || c.ownerId === playerId,
    [isGM, playerId],
  );

  const ordered = useMemo(
    () => sortCombatants(combatants.filter((c) => isGM || c.visible)),
    [combatants, isGM],
  );

  // ---- tiradas ----
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
      };
      await broadcastRoll(msg);
      setMode("normal");
      return msg;
    },
    [mode, playerName],
  );

  const rollInitiative = async (c: Combatant) => {
    const msg = await roll({ who: c.name, what: "Iniciativa", mod: initMod(c.sheet) });
    await updateSheet(c.id, { initiative: msg.total });
  };

  const rollMissing = async () => {
    const patches: Record<string, Partial<Sheet>> = {};
    for (const c of ordered) {
      if (c.sheet.initiative !== null) continue;
      const { kept } = rollD20("normal");
      patches[c.id] = { initiative: kept + initMod(c.sheet) };
    }
    await updateSheets(patches);
    if (combat.turnId === null) {
      const first = sortCombatants(
        ordered.map((c) => (patches[c.id] ? { ...c, sheet: { ...c.sheet, ...patches[c.id] } } : c)),
      )[0];
      if (first) await setCombat({ round: 1, turnId: first.id });
    }
  };

  const clearCombat = async () => {
    const patches: Record<string, Partial<Sheet>> = {};
    for (const c of combatants) patches[c.id] = { initiative: null };
    await updateSheets(patches);
    await setCombat({ round: 1, turnId: null });
  };

  // ---- turnos ----
  const step = async (dir: 1 | -1) => {
    const list = ordered.filter((c) => c.sheet.initiative !== null);
    if (!list.length) return;
    const idx = list.findIndex((c) => c.id === combat.turnId);
    let next = idx === -1 ? 0 : idx + dir;
    let round = combat.round;
    if (next >= list.length) {
      next = 0;
      round += 1;
    } else if (next < 0) {
      next = list.length - 1;
      round = Math.max(1, round - 1);
    }
    await setCombat({ round, turnId: list[next].id });
    focusItem(list[next].id);
  };

  const open = openId ? combatants.find((c) => c.id === openId) : undefined;

  if (!ready) return <div className="empty">No hay ninguna escena abierta.</div>;

  return (
    <div className="app">
      <header className="top">
        <div className="round">
          <span className="label">Ronda</span>
          <span className="num">{combat.round}</span>
        </div>
        <div className="modes" title="Ventaja o desventaja para la próxima tirada">
          {(["normal", "adv", "dis"] as RollMode[]).map((m) => (
            <button
              key={m}
              className={`chip ${mode === m ? "on" : ""} ${m}`}
              onClick={() => setMode(m)}
            >
              {m === "normal" ? "Normal" : m === "adv" ? "Ventaja" : "Desventaja"}
            </button>
          ))}
        </div>
        {isGM && (
          <div className="turns">
            <button onClick={() => step(-1)} title="Turno anterior">◀</button>
            <button className="primary" onClick={() => step(1)} title="Siguiente turno">
              Siguiente ▶
            </button>
          </div>
        )}
      </header>

      {ordered.length === 0 ? (
        <div className="empty">
          Clic derecho en una ficha → <b>Agregar al combate</b>.
        </div>
      ) : (
        <ul className="list">
          {ordered.map((c) => (
            <Row
              key={c.id}
              c={c}
              isTurn={combat.turnId === c.id}
              full={canSee(c)}
              isGM={isGM}
              open={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              onFocus={() => focusItem(c.id)}
              onRollInit={() => rollInitiative(c)}
              onSetTurn={() => setCombat({ ...combat, turnId: c.id })}
            />
          ))}
        </ul>
      )}

      {isGM && ordered.length > 0 && (
        <div className="gm-bar">
          <button onClick={rollMissing}>🎲 Tirar las que faltan</button>
          <button className="danger" onClick={clearCombat}>Limpiar iniciativa</button>
        </div>
      )}

      {open && canSee(open) && (
        <SheetPanel c={open} isGM={isGM} onRoll={roll} onClose={() => setOpenId(null)} />
      )}

      <RollLog log={log} />
      <div className="hint">
        {mode !== "normal" && `Próxima tirada con ${mode === "adv" ? "ventaja" : "desventaja"} · `}
        Clic en el nombre para ver la ficha en el mapa
      </div>
    </div>
  );
}
