import { useState } from "react";
import { Combatant, updateSheet } from "../obr";
import { fmt, initMod } from "../types";
import { applyDelta } from "../dice";
import { useT } from "../i18n";
import { markerLabel } from "../markers";

interface Props {
  c: Combatant;
  isTurn: boolean;
  full: boolean;
  /** La ficha está asignada al jugador que la ve */
  mine: boolean;
  isGM: boolean;
  open: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onRollInit: () => void;
  onSetTurn: () => void;
}

export function Row({ c, isTurn, full, mine, isGM, open, onToggle, onFocus, onRollInit, onSetTurn }: Props) {
  const { t, lang } = useT();
  const s = c.sheet;
  const [hpText, setHpText] = useState<string | null>(null);
  const [manaText, setManaText] = useState<string | null>(null);
  // Iniciativa escrita a mano (doble clic en el número): acepta decimales para desempatar, vacío la borra
  const [initText, setInitText] = useState<string | null>(null);
  const commitInit = () => {
    if (initText === null) return;
    const n = parseFloat(initText.replace(",", "."));
    updateSheet(c.id, { initiative: Number.isNaN(n) ? null : Math.round(n * 100) / 100 });
    setInitText(null);
  };

  const commitHp = () => {
    if (hpText === null) return;
    const hp = Math.max(0, Math.min(s.maxHp + 999, applyDelta(s.hp, hpText)));
    updateSheet(c.id, { hp });
    setHpText(null);
  };
  const commitMana = () => {
    if (manaText === null) return;
    const mana = Math.max(0, Math.min(s.maxMana, applyDelta(s.mana, manaText)));
    updateSheet(c.id, { mana });
    setManaText(null);
  };

  const hpClass = s.hp <= 0 ? "dead" : s.hp <= s.maxHp / 2 ? "bloodied" : "";

  return (
    <li className={`row ${isTurn ? "turn" : ""} ${!c.visible ? "hidden-token" : ""} ${open ? "open" : ""} ${mine ? "mine" : ""}`}>
      {initText !== null ? (
        <input
          className="init"
          autoFocus
          value={initText}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setInitText(e.target.value)}
          onBlur={commitInit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setInitText(null);
          }}
        />
      ) : (
        <button
          className="init"
          title={`${t("rollInit")} (d20 ${fmt(initMod(s))}) · ${t("initEdit")}`}
          onClick={onRollInit}
          onDoubleClick={() => full && setInitText(s.initiative === null ? "" : String(s.initiative))}
          disabled={!full}
        >
          {s.initiative ?? "—"}
        </button>
      )}

      <div className="name-wrap">
        <button className="name" onClick={onFocus} title={t("showOnMap")}>
          {isTurn && <span className="marker">▶</span>}
          {c.name}
          {!c.visible && <span className="eye" title={t("hiddenToken")}>👁</span>}
          {isGM && s.ownerName && <span className="owner" title={t("assignedPlayer")}>{s.ownerName}</span>}
        </button>
        {c.conditions.length > 0 && (
          <div className="conds">
            {c.conditions.map((k, i) => (
              <span key={k + i} className="cond">{markerLabel(k, lang)}</span>
            ))}
          </div>
        )}
      </div>

      {full ? (
        <>
          <div className="stat" title={t("acTitle")}>
            <span className="label">{t("ac")}</span>
            <span>{s.ac}</span>
          </div>
          <div className={`stat hp ${hpClass}`} title={t("hpTitle")}>
            <span className="label">{t("hp")}</span>
            <input
              value={hpText ?? s.hp}
              onFocus={(e) => {
                setHpText(String(s.hp));
                e.target.select();
              }}
              onChange={(e) => setHpText(e.target.value)}
              onBlur={commitHp}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setHpText(null);
              }}
            />
            <span className="max">/{s.maxHp}{s.tempHp > 0 && <em> +{s.tempHp}</em>}</span>
          </div>
          {s.maxMana > 0 && (
            <div className="stat hp mana" title={t("manaTitle")}>
              <span className="label">{t("mana")}</span>
              <input
                value={manaText ?? s.mana}
                onFocus={(e) => {
                  setManaText(String(s.mana));
                  e.target.select();
                }}
                onChange={(e) => setManaText(e.target.value)}
                onBlur={commitMana}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setManaText(null);
                }}
              />
              <span className="max">/{s.maxMana}</span>
            </div>
          )}
        </>
      ) : (
        <div className="stat muted">·</div>
      )}

      {isGM && !isTurn && (
        <button className="icon" onClick={onSetTurn} title={t("setTurn")}>⤵</button>
      )}
      <button className={`icon ${open ? "on" : ""}`} onClick={onToggle} disabled={!full} title={t("sheet")}>
        {open ? "▲" : "▼"}
      </button>
    </li>
  );
}
