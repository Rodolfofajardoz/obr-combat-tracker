import { useState } from "react";
import { Combatant, updateSheet } from "../obr";
import { fmt, initMod, passivePerception } from "../types";
import { applyDelta } from "../dice";

interface Props {
  c: Combatant;
  isTurn: boolean;
  full: boolean;
  isGM: boolean;
  open: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onRollInit: () => void;
  onSetTurn: () => void;
}

export function Row({ c, isTurn, full, isGM, open, onToggle, onFocus, onRollInit, onSetTurn }: Props) {
  const s = c.sheet;
  const [hpText, setHpText] = useState<string | null>(null);

  const commitHp = () => {
    if (hpText === null) return;
    const hp = Math.max(0, Math.min(s.maxHp + 999, applyDelta(s.hp, hpText)));
    updateSheet(c.id, { hp });
    setHpText(null);
  };

  const hpClass = s.hp <= 0 ? "dead" : s.hp <= s.maxHp / 2 ? "bloodied" : "";

  return (
    <li className={`row ${isTurn ? "turn" : ""} ${!c.visible ? "hidden-token" : ""} ${open ? "open" : ""}`}>
      <button
        className="init"
        title={`Tirar iniciativa (d20 ${fmt(initMod(s))})`}
        onClick={onRollInit}
        disabled={!full}
      >
        {s.initiative ?? "—"}
      </button>

      <div className="name-wrap">
        <button className="name" onClick={onFocus} title="Ver en el mapa">
          {isTurn && <span className="marker">▶</span>}
          {c.name}
          {!c.visible && <span className="eye" title="Oculta para los jugadores">👁</span>}
        </button>
        {s.conditions.length > 0 && (
          <div className="conds">
            {s.conditions.map((k) => (
              <span key={k} className="cond">{k}</span>
            ))}
          </div>
        )}
      </div>

      {full ? (
        <>
          <div className="stat" title="Clase de Armadura">
            <span className="label">CA</span>
            <span>{s.ac}</span>
          </div>
          <div className="stat" title="Percepción pasiva">
            <span className="label">PP</span>
            <span>{passivePerception(s)}</span>
          </div>
          <div className={`stat hp ${hpClass}`} title="PG: escribe un número, o +5 / -7">
            <span className="label">PG</span>
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
        </>
      ) : (
        <div className="stat muted">·</div>
      )}

      {isGM && !isTurn && (
        <button className="icon" onClick={onSetTurn} title="Poner el turno aquí">⤵</button>
      )}
      <button className={`icon ${open ? "on" : ""}`} onClick={onToggle} disabled={!full} title="Hoja">
        {open ? "▲" : "▼"}
      </button>
    </li>
  );
}
