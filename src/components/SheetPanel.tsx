import { Combatant, updateSheet } from "../obr";
import {
  ABILITIES,
  ABILITY_LABEL,
  ABILITY_NAME,
  CONDITIONS,
  ProfLevel,
  SKILLS,
  Sheet,
  abilityMod,
  fmt,
  initMod,
  passivePerception,
  saveMod,
  skillMod,
} from "../types";
import type { RollRequest } from "../App";

interface Props {
  c: Combatant;
  isGM: boolean;
  onRoll: (r: RollRequest) => Promise<unknown>;
  onClose: () => void;
}

const PROF_MARK: Record<ProfLevel, string> = { 0: "○", 1: "●", 2: "◆" };
const PROF_TITLE: Record<ProfLevel, string> = { 0: "Sin competencia", 1: "Competente", 2: "Pericia" };

export function SheetPanel({ c, isGM, onRoll, onClose }: Props) {
  const s = c.sheet;
  const set = (patch: Partial<Sheet>) => updateSheet(c.id, patch);
  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
  };

  const toggleCondition = (k: string) =>
    set({
      conditions: s.conditions.includes(k)
        ? s.conditions.filter((x) => x !== k)
        : [...s.conditions, k],
    });

  const cycleSkill = (key: string) => {
    const cur = s.skillProf[key] ?? 0;
    const next = ((cur + 1) % 3) as ProfLevel;
    set({ skillProf: { ...s.skillProf, [key]: next } });
  };

  return (
    <section className="sheet">
      <header>
        <h2>{c.name}</h2>
        {isGM && (
          <label className="share" title="Si está activo, los jugadores ven CA, PG y la hoja">
            <input type="checkbox" checked={s.shared} onChange={(e) => set({ shared: e.target.checked })} />
            Visible para jugadores
          </label>
        )}
        <button className="icon" onClick={onClose}>✕</button>
      </header>

      {/* Características: clic en la etiqueta = prueba de característica */}
      <div className="abilities">
        {ABILITIES.map((a) => (
          <div key={a} className="ability">
            <button
              className="roll"
              title={`Prueba de ${ABILITY_NAME[a]}`}
              onClick={() => onRoll({ who: c.name, what: ABILITY_NAME[a], mod: abilityMod(s, a) })}
            >
              <span className="label">{ABILITY_LABEL[a]}</span>
              <span className="mod">{fmt(abilityMod(s, a))}</span>
            </button>
            <input
              type="number"
              value={s.abilities[a]}
              onChange={(e) =>
                set({ abilities: { ...s.abilities, [a]: num(e.target.value, s.abilities[a]) } })
              }
            />
          </div>
        ))}
      </div>

      {/* Números de combate */}
      <div className="grid4">
        <Field label="CA" value={s.ac} onChange={(v) => set({ ac: v })} />
        <Field label="PG máx." value={s.maxHp} onChange={(v) => set({ maxHp: v, hp: Math.min(s.hp, v) })} />
        <Field label="PG temp." value={s.tempHp} onChange={(v) => set({ tempHp: v })} />
        <Field label="Competencia" value={s.prof} onChange={(v) => set({ prof: v })} />
        <Field label="Bono inic." value={s.initBonus} onChange={(v) => set({ initBonus: v })} hint={`total ${fmt(initMod(s))}`} />
        <div className="field ro">
          <span className="label">Perc. pasiva</span>
          <span className="val">{passivePerception(s)}</span>
        </div>
      </div>

      <div className="two-col">
        {/* Salvaciones */}
        <div>
          <h3>Salvaciones</h3>
          <ul className="rolls">
            {ABILITIES.map((a) => (
              <li key={a}>
                <button
                  className={`prof ${s.saveProf[a] ? "on" : ""}`}
                  title={s.saveProf[a] ? "Competente" : "Sin competencia"}
                  onClick={() => set({ saveProf: { ...s.saveProf, [a]: !s.saveProf[a] } })}
                >
                  {s.saveProf[a] ? "●" : "○"}
                </button>
                <button
                  className="roll"
                  onClick={() => onRoll({ who: c.name, what: `Salv. ${ABILITY_NAME[a]}`, mod: saveMod(s, a) })}
                >
                  <span>{ABILITY_NAME[a]}</span>
                  <b>{fmt(saveMod(s, a))}</b>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Habilidades */}
        <div>
          <h3>Habilidades</h3>
          <ul className="rolls">
            {SKILLS.map((sk) => {
              const lvl = s.skillProf[sk.key] ?? 0;
              return (
                <li key={sk.key}>
                  <button className={`prof l${lvl}`} title={PROF_TITLE[lvl]} onClick={() => cycleSkill(sk.key)}>
                    {PROF_MARK[lvl]}
                  </button>
                  <button
                    className="roll"
                    onClick={() => onRoll({ who: c.name, what: sk.label, mod: skillMod(s, sk) })}
                  >
                    <span>
                      {sk.label} <small>({ABILITY_LABEL[sk.ability]})</small>
                    </span>
                    <b>{fmt(skillMod(s, sk))}</b>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Estados */}
      <h3>Estados</h3>
      <div className="cond-grid">
        {CONDITIONS.map((k) => (
          <button
            key={k}
            className={`chip ${s.conditions.includes(k) ? "on" : ""}`}
            onClick={() => toggleCondition(k)}
          >
            {k}
          </button>
        ))}
      </div>

      <h3>Notas</h3>
      <textarea
        rows={2}
        value={s.notes}
        placeholder="Resistencias, rasgos, lo que quieras tener a la mano…"
        onChange={(e) => set({ notes: e.target.value })}
      />
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
