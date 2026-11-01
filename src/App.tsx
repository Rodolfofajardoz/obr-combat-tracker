import { useCallback, useEffect, useMemo, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import {
  Combatant,
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
import { RollLog } from "./components/RollLog";
import { ProfilesPanel } from "./components/ProfilesPanel";
import { Profile, loadProfiles, onProfilesChange } from "./profiles";
import { canSeeWhisper } from "./diceShow";
import { CatalogEntry, loadCatalog } from "./catalog";
import { Lang, LangContext, tr } from "./i18n";
import { ResizeHandle } from "./components/ResizeHandle";
import { applySavedSize } from "./resize";
import { readBarsPref, writeBarsPref } from "./bars";
import { useRolls } from "./useRolls";
import { onSheet, sendSheet } from "./sheetWindow";

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
  /** Ficha cuya hoja está abierta en la ventana aparte (lo dice la página de fondo) */
  const [openId, setOpenId] = useState<string | null>(null);
  const [log, setLog] = useState<RollMessage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showProfiles, setShowProfiles] = useState(false);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [bars, setBars] = useState(readBarsPref);
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
      onSheet((cmd) => setOpenId(cmd.action === "open" ? cmd.id : null)),
    ];
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
  // Un susurro viaja a todos pero cada ventana muestra solo los que le tocan: los del DM, todos
  const visibleLog = useMemo(() => log.filter((m) => canSeeWhisper(m.whisper, role, playerId)), [log, role, playerId]);
  // Modo, privacidad y las tiradas en sí se comparten con la ventana de la hoja
  const rolls = useRolls({ role, playerId, playerName });
  const { mode, setMode, hidden, toggleHidden, whisper, toggleWhisper, dice3d, toggleDice3d } = rolls;

  const rollInitiative = async (c: Combatant) => {
    const msg = await rolls.roll({ who: c.name, what: t("initiative"), mod: initMod(c.sheet) });
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

  if (!ready) {
    return (
      <LangContext.Provider value={lang}>
        <div className="empty">{t("noScene")}</div>
        <ResizeHandle />
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={lang}>
    <div className="app">
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
          {isGM ? (
            <button className={`chip ${hidden ? "on dis" : ""}`} onClick={toggleHidden} title={hidden ? t("hiddenOn") : t("hiddenOff")}>
              🙈
            </button>
          ) : (
            <button className={`chip ${whisper ? "on dis" : ""}`} onClick={toggleWhisper} title={whisper ? t("whisperOn") : t("whisperOff")}>
              🤫
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
              onToggle={() => sendSheet(openId === c.id ? { action: "close" } : { action: "open", id: c.id })}
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

      <RollLog log={visibleLog} />
      <div className="hint">
        {mode !== "normal" && `${t("hintNext")} ${t(mode).toLowerCase()} · `}
        {t("hintName")}
      </div>
      <ResizeHandle />
    </div>
    </LangContext.Provider>
  );
}
