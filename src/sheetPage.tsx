import React, { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import OBR, { Player } from "@owlbear-rodeo/sdk";
import { Combatant, toCombatants } from "./obr";
import { RollMode } from "./types";
import { SheetPanel } from "./components/SheetPanel";
import { RollBonus } from "./components/RollBonus";
import { Profile, loadProfiles, onProfilesChange } from "./profiles";
import { CatalogEntry, loadCatalog } from "./catalog";
import { Settings, defaultSettings, loadSettings, onSettingsChange } from "./settings";
import { Lang, LangContext, tr } from "./i18n";
import { useRolls } from "./useRolls";
import {
  SHEET_POPOVER_ID,
  clampSheetPos,
  defaultSheetPos,
  readSheetPos,
  sendSheet,
  writeSheetPos,
} from "./sheetWindow";
import "./index.css";

/** Ventana de la hoja: una ficha, con su propia conexión a la escena. Qué ficha, en el hash de la URL. */
function SheetWindow({ id }: { id: string }) {
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [ready, setReady] = useState(false);
  const [c, setC] = useState<Combatant | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [party, setParty] = useState<Player[]>([]);
  const lang: Lang = "en";
  const t = useCallback((k: Parameters<typeof tr>[1]) => tr(lang, k), [lang]);
  const rolls = useRolls({ role, playerId, playerName });

  useEffect(() => {
    OBR.player.getRole().then(setRole);
    OBR.player.getId().then(setPlayerId);
    OBR.player.getName().then(setPlayerName);
    OBR.theme.getTheme().then((th) => (document.documentElement.dataset.theme = th.mode.toLowerCase()));
    const offs = [
      OBR.player.onChange((p) => {
        setRole(p.role);
        setPlayerName(p.name);
      }),
      OBR.theme.onChange((th) => (document.documentElement.dataset.theme = th.mode.toLowerCase())),
      OBR.scene.onReadyChange(setReady),
      onProfilesChange(setProfiles),
      onSettingsChange(setSettings),
      OBR.party.onChange(setParty),
    ];
    loadSettings().then(setSettings);
    OBR.party.getPlayers().then(setParty);
    OBR.scene.isReady().then(setReady);
    loadProfiles().then(setProfiles);
    loadCatalog().then(setCatalog);
    return () => offs.forEach((off) => off());
  }, []);

  // Solo esta ficha
  useEffect(() => {
    if (!ready) return;
    const pick = (items: Parameters<typeof toCombatants>[0]) => setC(toCombatants(items).find((x) => x.id === id) ?? null);
    OBR.scene.items.getItems().then(pick);
    return OBR.scene.items.onChange(pick);
  }, [ready, id]);

  // La ventana mide lo que mide la hoja (hasta el borde de abajo de la pantalla)
  useEffect(() => {
    let maxH = 10000;
    OBR.viewport.getHeight().then((vh) => {
      const top = (readSheetPos() ?? defaultSheetPos()).top;
      maxH = Math.max(240, vh - top - 16);
      fit();
    });
    const fit = () => OBR.popover.setHeight(SHEET_POPOVER_ID, Math.min(document.documentElement.scrollHeight, maxH));
    const ro = new ResizeObserver(fit);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  const close = () => sendSheet({ action: "close" });

  /** Soltaron la hoja en otro sitio: se guarda y se pide a la página de fondo que la abra ahí */
  const onDrop = async (dx: number, dy: number) => {
    const [vw, vh] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
    const pos = readSheetPos() ?? defaultSheetPos();
    writeSheetPos(clampSheetPos({ left: pos.left + dx, top: pos.top + dy }, vw, vh));
    sendSheet({ action: "open", id });
  };

  const isGM = role === "GM";
  const canSee = !!c && (isGM || c.sheet.owner === playerId || c.sheet.shared || c.ownerId === playerId);

  if (!ready) return <div className="empty">{t("noScene")}</div>;
  if (!c || !canSee)
    return (
      <div className="empty">
        {t("sheetGone")}
        <br />
        <button className="icon" onClick={close}>✕</button>
      </div>
    );

  const tools = (
    <div className="modes sheet-tools">
      {(["normal", "adv", "dis"] as RollMode[]).map((m) => (
        <button key={m} className={`chip ${rolls.mode === m ? "on" : ""} ${m}`} onClick={() => rolls.setMode(m)}>
          {t(m)}
        </button>
      ))}
      <RollBonus value={rolls.bonus} onChange={rolls.setBonus} />
      {(rolls.mode !== "normal" || rolls.bonus !== 0) && (
        <span className="hint next">
          {t("hintNext")} {[rolls.mode !== "normal" && t(rolls.mode).toLowerCase(), rolls.bonus !== 0 && `★ ${rolls.bonus > 0 ? "+" : ""}${rolls.bonus}`].filter(Boolean).join(" ")}
        </span>
      )}
      {isGM ? (
        <button className={`chip ${rolls.hidden ? "on dis" : ""}`} onClick={rolls.toggleHidden} title={rolls.hidden ? t("hiddenOn") : t("hiddenOff")}>
          🙈
        </button>
      ) : (
        <button className={`chip ${rolls.whisper ? "on dis" : ""}`} onClick={rolls.toggleWhisper} title={rolls.whisper ? t("whisperOn") : t("whisperOff")}>
          🤫
        </button>
      )}
    </div>
  );

  return (
    <LangContext.Provider value={lang}>
      <div className="sheet-window">
        <SheetPanel
          c={c}
          isGM={isGM}
          playerName={playerName}
          settings={settings}
          profiles={profiles}
          catalog={catalog}
          party={party}
          onRoll={rolls.roll}
          onRollExpr={rolls.rollExpr}
          onClose={close}
          onDrop={onDrop}
          tools={tools}
        />
      </div>
    </LangContext.Provider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
const id = decodeURIComponent(location.hash.slice(1));

if (OBR.isAvailable && id) {
  OBR.onReady(() => {
    root.render(
      <React.StrictMode>
        <SheetWindow id={id} />
      </React.StrictMode>,
    );
  });
} else {
  root.render(<div className="empty">Esta ventana la abre la lista de combate desde una sala de Owlbear Rodeo.</div>);
}
