import { ReactNode, useRef, useState } from "react";
import { Combatant, updateSheet } from "../obr";
import {
  ABILITIES,
  ProfLevel,
  SKILLS,
  Sheet,
  abilityMod,
  fmt,
  initMod,
  resMod,
  resSaveMod,
  saveMod,
  skillMod,
} from "../types";
import type { RollRequest } from "../App";
import { Profile, mergeProfiles, profileToSheet, saveProfiles, sheetToProfile } from "../profiles";
import type { CatalogEntry } from "../catalog";
import type { Player } from "@owlbear-rodeo/sdk";
import { ABILITY_LONG, ABILITY_SHORT, useT } from "../i18n";
import { MARKERS, MARKER_GROUPS, MarkerGroup, markerLabel, toggleMarker } from "../markers";
import { SpellsPanel } from "./SpellsPanel";
import { ActionsPanel } from "./ActionsPanel";
import { ResourcesPanel } from "./ResourcesPanel";
import type { Settings } from "../settings";
import type { ExprRequest } from "../App";

interface Props {
  c: Combatant;
  isGM: boolean;
  playerName: string;
  settings: Settings;
  profiles: Profile[];
  catalog: CatalogEntry[];
  party: Player[];
  onRoll: (r: RollRequest) => Promise<unknown>;
  onRollExpr: (r: ExprRequest) => Promise<unknown>;
  onClose: () => void;
  /** En su propia ventana: arrastrar la cabecera y soltar la mueve (dx, dy en píxeles) */
  onDrop?: (dx: number, dy: number) => void;
  /** Botones de tirada (ventaja, oculta…) cuando la hoja va en su propia ventana */
  tools?: ReactNode;
}

const PROF_MARK: Record<ProfLevel, string> = { 0: "○", 1: "●", 2: "◆" };

export function SheetPanel({ c, isGM, playerName, settings, profiles, catalog, party, onRoll, onRollExpr, onClose, onDrop, tools }: Props) {
  const { t, lang } = useT();
  const s = c.sheet;
  // Arrastre de la cabecera: nada se mueve hasta soltar (Owlbear no mueve ventanas en vivo)
  const drag = useRef<{ x: number; y: number } | null>(null);
  const dragProps = onDrop
    ? {
        className: "drag",
        title: t("dragSheet"),
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
          if ((e.target as HTMLElement).closest("button,input,label,select")) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          // screenX/Y: la ventana se cierra y reabre, así que las coordenadas de cliente no sirven
          drag.current = { x: e.screenX, y: e.screenY };
        },
        onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          const dx = e.screenX - d.x;
          const dy = e.screenY - d.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) onDrop(dx, dy);
        },
        onPointerCancel: () => (drag.current = null),
      }
    : {};
  // Mobs y PNJ del catálogo traen acciones: se muestran esas; los PJ, sus conjuros
  const [showSpells, setShowSpells] = useState(false);
  const isMob = s.actions.length > 0;
  const set = (patch: Partial<Sheet>) => updateSheet(c.id, patch);
  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
  };
  const short = ABILITY_SHORT[lang];
  const long = ABILITY_LONG[lang];
  const profTitle: Record<ProfLevel, string> = { 0: t("profNone"), 1: t("profYes"), 2: t("profExp") };

  // value del select: "sala:Nombre" o "cat:Nombre"
  const applyProfile = (value: string) => {
    const [kind, ...rest] = value.split(":");
    const name = rest.join(":");
    const p = kind === "sala" ? profiles.find((x) => x.name === name) : catalog.find((x) => x.name === name);
    if (p) updateSheet(c.id, (cur) => profileToSheet(p, cur));
  };
  const saveAsProfile = async () => {
    await saveProfiles(mergeProfiles(profiles, [sheetToProfile(c.name, s)]));
  };

  // Los estados son marcadores de Condition Markers pegados a la ficha
  const [condQuery, setCondQuery] = useState("");
  const toggleCondition = (name: string) => toggleMarker(c.id, name, !c.conditions.includes(name));
  const q = condQuery.trim().toLowerCase();
  const matches = (name: string) => !q || markerLabel(name, lang).toLowerCase().includes(q);
  const markerChips = (group: MarkerGroup) =>
    MARKERS.filter((m) => m.group === group && matches(m.name)).map((m) => (
      <button
        key={m.name}
        className={`chip ${c.conditions.includes(m.name) ? "on" : ""}`}
        onClick={() => toggleCondition(m.name)}
      >
        {markerLabel(m.name, lang)}
      </button>
    ));

  const cycleSkill = (key: string) => {
    const cur = s.skillProf[key] ?? 0;
    const next = ((cur + 1) % 3) as ProfLevel;
    set({ skillProf: { ...s.skillProf, [key]: next } });
  };

  const players = party.filter((p) => p.role === "PLAYER");

  /** Una columna: etiqueta/mod (tirada), puntuación, y debajo la salvación alineada */
  const AbilityBox = ({
    label,
    name,
    mod,
    score,
    onScore,
    saveMod: sm,
    saveProf,
    onSaveProf,
    accent,
  }: {
    label: string;
    name: string;
    mod: number;
    score: number;
    onScore: (v: number) => void;
    saveMod: number;
    saveProf: boolean;
    onSaveProf: () => void;
    accent?: boolean;
  }) => (
    <div className={`ability ${accent ? "res" : ""}`}>
      <button className="roll" title={`${t("check")} ${name}`} onClick={() => onRoll({ who: c.name, what: name, mod })}>
        <span className="label">{label}</span>
        <span className="mod">{fmt(mod)}</span>
      </button>
      <input type="number" value={score} onChange={(e) => onScore(num(e.target.value, score))} />
      <div className="save" title={`${t("save")} ${name}`}>
        <button className={`prof ${saveProf ? "on" : ""}`} title={saveProf ? t("profYes") : t("profNone")} onClick={onSaveProf}>
          {saveProf ? "●" : "○"}
        </button>
        <button className="roll-save" onClick={() => onRoll({ who: c.name, what: `${t("save")} ${name}`, mod: sm })}>
          <span className="label">{t("saveShort")}</span>
          <b>{fmt(sm)}</b>
        </button>
      </div>
    </div>
  );

  return (
    <section className="sheet">
      <header {...dragProps}>
        <h2>{c.name}</h2>
        {isGM && (
          <label className="share" title={t("sharedAllTitle")}>
            <input type="checkbox" checked={s.shared} onChange={(e) => set({ shared: e.target.checked })} />
            {t("sharedAll")}
          </label>
        )}
        <button className="icon" onClick={onClose}>✕</button>
      </header>
      {tools}

      {isGM && (
        <div className="profile-bar owner-bar">
          <label>
            <span className="label">{t("player")}</span>
            <select
              value={s.owner ?? ""}
              title={t("playerTitle")}
              onChange={(e) => {
                const p = party.find((x) => x.id === e.target.value);
                set({ owner: p ? p.id : null, ownerName: p ? p.name : "" });
              }}
            >
              <option value="">{t("nobody")}</option>
              {s.owner && !party.some((p) => p.id === s.owner) && (
                <option value={s.owner}>{s.ownerName || t("disconnected")}</option>
              )}
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          {players.length === 0 && <small className="muted">{t("onlyConnected")}</small>}
        </div>
      )}

      {isGM && (
        <div className="profile-bar">
          <select value="" onChange={(e) => applyProfile(e.target.value)} title={t("loadProfileTitle")}>
            <option value="">{t("loadProfile")}</option>
            {profiles.length > 0 && (
              <optgroup label={t("groupRoom")}>
                {profiles.map((p) => (
                  <option key={p.name} value={`sala:${p.name}`}>{p.name}</option>
                ))}
              </optgroup>
            )}
            {catalog.length > 0 && (
              <optgroup label={t("groupCampaign")}>
                {catalog.map((p) => (
                  <option key={p.name} value={`cat:${p.name}`}>{p.name} (CR {p.cr})</option>
                ))}
              </optgroup>
            )}
          </select>
          <button onClick={saveAsProfile} title={`${t("saveAsProfileTitle")} "${c.name}"`}>
            {t("saveAsProfile")}
          </button>
        </div>
      )}

      {/* Características con su salvación debajo, alineada */}
      <div className="abilities">
        {ABILITIES.map((a) => (
          <AbilityBox
            key={a}
            label={short[a]}
            name={long[a]}
            mod={abilityMod(s, a)}
            score={s.abilities[a]}
            onScore={(v) => set({ abilities: { ...s.abilities, [a]: v } })}
            saveMod={saveMod(s, a)}
            saveProf={!!s.saveProf[a]}
            onSaveProf={() => set({ saveProf: { ...s.saveProf, [a]: !s.saveProf[a] } })}
          />
        ))}
        <AbilityBox
          label={t("resShort")}
          name={t("resonance")}
          mod={resMod(s)}
          score={s.resonance}
          onScore={(v) => set({ resonance: v })}
          saveMod={resSaveMod(s)}
          saveProf={s.resSaveProf}
          onSaveProf={() => set({ resSaveProf: !s.resSaveProf })}
          accent
        />
      </div>

      {/* Números de combate */}
      <div className="grid4">
        <Field label={t("hpCur")} value={s.hp} onChange={(v) => set({ hp: Math.max(0, v) })} />
        <Field label={t("maxHp")} value={s.maxHp} onChange={(v) => set({ maxHp: v, hp: Math.min(s.hp, v) })} />
        <Field label={t("tempHp")} value={s.tempHp} onChange={(v) => set({ tempHp: v })} />
        <Field label={t("manaCur")} value={s.mana} onChange={(v) => set({ mana: Math.max(0, Math.min(v, s.maxMana)) })} />
        <Field
          label={t("maxMana")}
          value={s.maxMana}
          onChange={(v) => set({ maxMana: v, mana: s.maxMana === 0 ? v : Math.min(s.mana, v) })}
        />
        <Field label={t("ac")} value={s.ac} onChange={(v) => set({ ac: v })} />
        <Field label={t("prof")} value={s.prof} onChange={(v) => set({ prof: v })} />
        <Field label={t("initBonus")} value={s.initBonus} onChange={(v) => set({ initBonus: v })} hint={`${t("total")} ${fmt(initMod(s))}`} />
      </div>

      {/* Recursos de clase (solo si los hay) y descansos */}
      <ResourcesPanel c={c} />

      {/* Izquierda: conjuros · Derecha: habilidades con ancho fijo */}
      <div className="sheet-body">
        <div>
          {isMob && <ActionsPanel c={c} onRoll={onRoll} onRollExpr={onRollExpr} />}
          {(!isMob || showSpells || s.spells.length > 0) && (
            <SpellsPanel c={c} isGM={isGM} playerName={playerName} settings={settings} />
          )}
          {isMob && !showSpells && s.spells.length === 0 && (
            <button className="icon small" onClick={() => setShowSpells(true)}>+ {t("spells")}</button>
          )}
        </div>
        <div className="skills-col">
          <h3>{t("skills")}</h3>
          <ul className="rolls">
            {SKILLS.map((sk) => {
              const lvl = s.skillProf[sk.key] ?? 0;
              const label = lang === "es" ? sk.label : sk.en;
              return (
                <li key={sk.key}>
                  <button className={`prof l${lvl}`} title={profTitle[lvl]} onClick={() => cycleSkill(sk.key)}>
                    {PROF_MARK[lvl]}
                  </button>
                  <button className="roll" onClick={() => onRoll({ who: c.name, what: label, mod: skillMod(s, sk) })}>
                    <span>
                      {label} <small>({short[sk.ability]})</small>
                    </span>
                    <b>{fmt(skillMod(s, sk))}</b>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Estados = marcadores de Condition Markers */}
      <div className="cond-head">
        <h3>{t("conditions")}</h3>
        <input className="search" placeholder={t("condSearch")} value={condQuery} onChange={(e) => setCondQuery(e.target.value)} />
      </div>
      {c.conditions.length > 0 && (
        <div className="cond-grid active">
          {c.conditions.map((name, i) => (
            <button key={name + i} className="chip on" title={t("remove")} onClick={() => toggleCondition(name)}>
              {markerLabel(name, lang)} ✕
            </button>
          ))}
        </div>
      )}
      <div className="cond-groups">
        {MARKER_GROUPS.map((g) => {
          const chips = markerChips(g.key);
          if (!chips.length) return null;
          return (
            <div key={g.key}>
              <h4>{g.label}</h4>
              <div className="cond-grid">{chips}</div>
            </div>
          );
        })}
      </div>
      <p className="muted small">{t("markersHint")}</p>

      <h3>{t("notes")}</h3>
      <textarea rows={2} value={s.notes} placeholder={t("notesPlaceholder")} onChange={(e) => set({ notes: e.target.value })} />
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
