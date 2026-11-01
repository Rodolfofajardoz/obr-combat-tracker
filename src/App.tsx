import { useCallback, useEffect, useMemo, useState } from "react";
import OBR, { Player } from "@owlbear-rodeo/sdk";
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
import { parseExpr, rollD20, rollExpr as rollExprInstant } from "./dice";
import { setupContextMenu } from "./contextMenu";
import { Row } from "./components/Row";
import { SheetPanel } from "./components/SheetPanel";
import { RollLog } from "./components/RollLog";
import { ProfilesPanel } from "./components/ProfilesPanel";
import { Profile, loadProfiles, onProfilesChange } from "./profiles";
import { clearDice3d, initDice3d, readDice3dPref, roll3d, roll3dGroups, writeDice3dPref } from "./dice3d";
import { CatalogEntry, loadCatalog } from "./catalog";
import { Lang, LangContext, tr } from "./i18n";
import { ResizeHandle } from "./components/ResizeHandle";
import { applySavedSize } from "./resize";
import { readBarsPref, writeBarsPref } from "./bars";
import { Settings, defaultSettings, loadSettings, onSettingsChange } from "./settings";

export interface RollRequest {
  who: string;
  what: string;
  mod: number;
}
/** Tirada de expresión (daño): "2d6+3 + 1d6" */
export interface ExprRequest {
  who: string;
  what: string;
  expr: string;
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showProfiles, setShowProfiles] = useState(false);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  /** Los demás jugadores conectados (el propio no viene en party) */
  const [party, setParty] = useState<Player[]>([]);
  const [dice3d, setDice3d] = useState(readDice3dPref);
  /** Tirada en curso o recién terminada, para la capa del dado 3D */
  const [rolling, setRolling] = useState<{ what: string; msg?: RollMessage } | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [bars, setBars] = useState(readBarsPref);
  /** Tiradas ocultas: solo las ve el DM que las hace */
  const [hidden, setHidden] = useState(false);
  const toggleBars = () => {
    const next = !bars;
    setBars(next);
    writeBarsPref(next);
    // El evento "storage" no se dispara en la misma pestaña que escribe: avisa al fondo a mano
    window.dispatchEvent(new StorageEvent("storage", { key: "combat-tracker.bars" }));
  };
  // Interfaz solo en inglés (el diccionario conserva el español por si vuelve el botón)
  const lang: Lang = "en";
  const t = useCallback((k: Parameters<typeof tr>[1]) => tr(lang, k), [lang]);

  // Precarga el dado 3D (wasm y texturas) para que la primera tirada no espere
  useEffect(() => {
    if (dice3d) initDice3d().catch(() => setDice3d(false));
  }, [dice3d]);

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
      onProfilesChange(setProfiles),
      onSettingsChange(setSettings),
      OBR.party.onChange(setParty),
    ];
    loadSettings().then(setSettings);
    OBR.party.getPlayers().then(setParty);
    OBR.scene.isReady().then(setReady);
    loadProfiles().then(setProfiles);
    loadCatalog().then(setCatalog);
    applySavedSize();
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
  // Ve la hoja completa (y tira por ella): el DM, el jugador asignado, quien creó la ficha, o todos si está compartida
  const canSee = useCallback(
    (c: Combatant) => isGM || c.sheet.owner === playerId || c.sheet.shared || c.ownerId === playerId,
    [isGM, playerId],
  );

  const ordered = useMemo(
    () => sortCombatants(combatants.filter((c) => isGM || c.visible)),
    [combatants, isGM],
  );

  // ---- tiradas ----
  const roll = useCallback(
    async (req: RollRequest) => {
      let dice: number[];
      let kept: number;
      if (dice3d) {
        // Dado físico: la capa se muestra mientras rueda y se queda con el resultado
        setRolling({ what: `${req.who} · ${req.what}` });
        try {
          dice = await roll3d(mode === "normal" ? 1 : 2);
          kept = mode === "adv" ? Math.max(...dice) : mode === "dis" ? Math.min(...dice) : dice[0];
        } catch {
          // Si el 3D falla (sin WebGL, sin assets), cae al dado instantáneo
          setDice3d(false);
          writeDice3dPref(false);
          ({ dice, kept } = rollD20(mode));
        }
      } else {
        ({ dice, kept } = rollD20(mode));
      }
      const msg: RollMessage = {
        ...req,
        dice,
        kept,
        total: kept + req.mod,
        mode,
        by: playerName,
        at: Date.now(),
        hidden: hidden || undefined,
      };
      if (dice3d) setRolling({ what: `${req.who} · ${req.what}`, msg });
      await broadcastRoll(msg, hidden);
      setMode("normal");
      return msg;
    },
    [mode, playerName, dice3d, hidden],
  );

  /** Daño y otras expresiones: sin ventaja/desventaja, con dado 3D si está activo */
  const rollExpr = useCallback(
    async (req: ExprRequest) => {
      let dice: number[];
      let mod: number;
      let total: number;
      const parsed = parseExpr(req.expr);
      if (dice3d && parsed.terms.length) {
        setRolling({ what: `${req.who} · ${req.what}` });
        try {
          const groups = parsed.terms.map((t) => `${Math.abs(t.count)}d${t.sides}`);
          dice = await roll3dGroups(groups);
          // los dados salen en el mismo orden que los grupos; los negativos restan
          let i = 0;
          let sum = 0;
          for (const t of parsed.terms) {
            for (let k = 0; k < Math.abs(t.count); k++) sum += (t.count < 0 ? -1 : 1) * (dice[i++] ?? 0);
          }
          mod = parsed.mod;
          total = sum + mod;
        } catch {
          setDice3d(false);
          writeDice3dPref(false);
          ({ dice, mod, total } = rollExprInstant(req.expr));
        }
      } else {
        ({ dice, mod, total } = rollExprInstant(req.expr));
      }
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
      };
      if (dice3d) setRolling({ what: `${req.who} · ${req.what}`, msg });
      await broadcastRoll(msg, hidden);
      return msg;
    },
    [playerName, dice3d, hidden],
  );

  const dismissDice = () => {
    clearDice3d();
    setRolling(null);
  };

  const toggleDice3d = () => {
    const next = !dice3d;
    setDice3d(next);
    writeDice3dPref(next);
  };

  const rollInitiative = async (c: Combatant) => {
    const msg = await roll({ who: c.name, what: t("initiative"), mod: initMod(c.sheet) });
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
    // Limpiar iniciativa cierra el combate: también se reinicia la cuenta de conjuros repetidos
    for (const c of combatants) patches[c.id] = { initiative: null, casts: {} };
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

  // Capa del dado 3D: #dice-box tiene que existir SIEMPRE en el DOM (dice-box lo busca al crearse),
  // por eso se renderiza también cuando no hay escena.
  const diceLayer = (
    <div className={`dice-layer ${rolling ? "on" : ""}`} onClick={rolling?.msg ? dismissDice : undefined}>
      <div id="dice-box" />
      {rolling && (
        <div className="dice-caption">
          <span className="what">{rolling.what}</span>
          {rolling.msg ? (
            <span className="result">
              <b>{rolling.msg.total}</b>
              <small>
                {rolling.msg.expr
                  ? `${rolling.msg.expr} → [${rolling.msg.dice.join(", ")}]`
                  : rolling.msg.dice.length > 1
                    ? `[${rolling.msg.dice.join(", ")}] → ${rolling.msg.kept}`
                    : rolling.msg.kept}
                {!rolling.msg.expr && rolling.msg.mod !== 0 && ` ${rolling.msg.mod > 0 ? "+" : "−"} ${Math.abs(rolling.msg.mod)}`}
              </small>
              <em>{t("clickToClose")}</em>
            </span>
          ) : (
            <span className="result rolling">{t("rolling")}</span>
          )}
        </div>
      )}
    </div>
  );

  if (!ready) {
    return (
      <LangContext.Provider value={lang}>
        {diceLayer}
        <div className="empty">{t("noScene")}</div>
        <ResizeHandle />
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={lang}>
    <div className="app">
      {diceLayer}
      <header className="top">
        <div className="round">
          <span className="label">{t("round")}</span>
          <span className="num">{combat.round}</span>
        </div>
        <div className="modes" title={t("advDisTitle")}>
          {(["normal", "adv", "dis"] as RollMode[]).map((m) => (
            <button
              key={m}
              className={`chip ${mode === m ? "on" : ""} ${m}`}
              onClick={() => setMode(m)}
            >
              {t(m)}
            </button>
          ))}
          <button
            className={`chip ${dice3d ? "on" : ""}`}
            onClick={toggleDice3d}
            title={dice3d ? t("dice3dOn") : t("dice3dOff")}
          >
            🎲 3D
          </button>
          <button className={`chip ${bars ? "on" : ""}`} onClick={toggleBars} title={bars ? t("barsOn") : t("barsOff")}>
            ▮ HP
          </button>
          {isGM && (
            <button className={`chip ${hidden ? "on dis" : ""}`} onClick={() => setHidden((v) => !v)} title={hidden ? t("hiddenOn") : t("hiddenOff")}>
              🙈
            </button>
          )}
        </div>
        {isGM && (
          <div className="turns">
            <button
              className={showProfiles ? "on" : ""}
              onClick={() => setShowProfiles((v) => !v)}
              title={t("profilesTitle")}
            >
              📋
            </button>
            <button onClick={() => step(-1)} title={t("prevTurn")}>◀</button>
            <button className="primary" onClick={() => step(1)} title={t("nextTurnTitle")}>
              {t("nextTurn")} ▶
            </button>
          </div>
        )}
      </header>

      {ordered.length === 0 ? (
        <div className="empty">
          {t("emptyList")} <b>{t("addToCombat")}</b>.
          {isGM && (
            <>
              <br />
              <small>{t("emptyHint")}</small>
            </>
          )}
        </div>
      ) : (
        <ul className="list">
          {ordered.map((c) => (
            <Row
              key={c.id}
              c={c}
              isTurn={combat.turnId === c.id}
              full={canSee(c)}
              mine={c.sheet.owner === playerId}
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
          <button onClick={rollMissing}>{t("rollMissing")}</button>
          <button className="danger" onClick={clearCombat}>{t("clearInit")}</button>
        </div>
      )}

      {isGM && showProfiles && (
        <ProfilesPanel profiles={profiles} catalog={catalog} onClose={() => setShowProfiles(false)} />
      )}

      {open && canSee(open) && (
        <SheetPanel
          c={open}
          isGM={isGM}
          playerName={playerName}
          settings={settings}
          profiles={profiles}
          catalog={catalog}
          party={party}
          onRoll={roll}
          onRollExpr={rollExpr}
          onClose={() => setOpenId(null)}
        />
      )}

      <RollLog log={log} />
      <div className="hint">
        {mode !== "normal" && `${t("hintNext")} ${t(mode).toLowerCase()} · `}
        {t("hintName")}
      </div>
      <ResizeHandle />
    </div>
    </LangContext.Provider>
  );
}
