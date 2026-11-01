import { useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { Combatant, updateSheet } from "../obr";
import { ResetOn, Resource } from "../types";
import { useT } from "../i18n";
import { longRest, shortRest } from "../rest";

interface Props {
  c: Combatant;
}

/** Hasta aquí se dibujan puntos; con más usos, un contador */
const MAX_PIPS = 12;

/** Recursos contables de la hoja (forma salvaje, puntos de hechicería, "1/Descanso corto"…) y los botones de descanso */
export function ResourcesPanel({ c }: Props) {
  const { t } = useT();
  const s = c.sheet;
  // idx -1 = nuevo; si no, el recurso que se edita
  const [form, setForm] = useState<{ idx: number; name: string; max: number; reset: ResetOn } | null>(null);

  const save = (list: Resource[]) => updateSheet(c.id, { resources: list });
  const setCur = (i: number, cur: number) =>
    save(s.resources.map((r, j) => (j === i ? { ...r, cur: Math.max(0, Math.min(r.max, cur)) } : r)));
  const remove = (i: number) => save(s.resources.filter((_, j) => j !== i));
  const submit = () => {
    if (!form || !form.name.trim()) return;
    const max = Math.max(1, form.max);
    const list = [...s.resources];
    if (form.idx >= 0) list[form.idx] = { ...list[form.idx], name: form.name.trim(), max, reset: form.reset, cur: Math.min(list[form.idx].cur, max) };
    else list.push({ name: form.name.trim(), max, reset: form.reset, cur: max });
    save(list);
    setForm(null);
  };
  const rest = async (kind: ResetOn) => {
    await updateSheet(c.id, (cur) => ({ ...cur, ...(kind === "short" ? shortRest(cur) : longRest(cur)) }));
    OBR.notification.show(`${c.name}: ${t(kind === "short" ? "shortRest" : "longRest")}`);
  };

  return (
    <div className="resources">
      {s.resources.length > 0 && (
        <ul className="res-list">
          {s.resources.map((r, i) => (
            <li key={r.name + i} className="res-row">
              <span className="name" title={r.name}>{r.name}</span>
              {r.max <= MAX_PIPS ? (
                <span className="pips" title={t("spend")}>
                  {Array.from({ length: r.max }, (_, k) => (
                    <button key={k} className={k < r.cur ? "on" : ""} onClick={() => setCur(i, k < r.cur ? k : k + 1)}>
                      {k < r.cur ? "●" : "○"}
                    </button>
                  ))}
                </span>
              ) : (
                <span className="counter">
                  <button onClick={() => setCur(i, r.cur - 1)}>−</button>
                  <b>{r.cur} / {r.max}</b>
                  <button onClick={() => setCur(i, r.cur + 1)}>+</button>
                </span>
              )}
              <span className="when" title={t("resetTitle")}>{r.reset === "short" ? "☕" : "🌙"}</span>
              <span className="btns">
                <button className="icon" title={t("edit")} onClick={() => setForm({ idx: i, name: r.name, max: r.max, reset: r.reset })}>✎</button>
                <button className="icon" title={t("remove")} onClick={() => remove(i)}>✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="rest-bar">
        <button onClick={() => rest("short")} title={t("shortRestTitle")}>☕ {t("shortRest")}</button>
        <button onClick={() => rest("long")} title={t("longRestTitle")}>🌙 {t("longRest")}</button>
        {!form && (
          <button className="icon small" title={t("addResource")} onClick={() => setForm({ idx: -1, name: "", max: 1, reset: "long" })}>
            + {t("resource")}
          </button>
        )}
      </div>

      {form && (
        <div className="res-form">
          <input
            autoFocus
            placeholder={t("resourceName")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <input
            type="number"
            min={1}
            title={t("resourceMax")}
            value={form.max}
            onChange={(e) => setForm({ ...form, max: parseInt(e.target.value, 10) || 1 })}
          />
          <select value={form.reset} title={t("resetTitle")} onChange={(e) => setForm({ ...form, reset: e.target.value as ResetOn })}>
            <option value="short">☕ {t("resetShort")}</option>
            <option value="long">🌙 {t("resetLong")}</option>
          </select>
          <button className="primary" onClick={submit}>{t("ok")}</button>
          <button className="icon" onClick={() => setForm(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
