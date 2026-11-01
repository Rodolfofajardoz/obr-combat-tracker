import { useState } from "react";
import { Combatant, updateSheet } from "../obr";
import { Trait, TraitKind } from "../types";
import { Key, useT } from "../i18n";

interface Props {
  c: Combatant;
}

const KINDS: TraitKind[] = ["trait", "bonus", "reaction", "legendary", "info"];
const KIND_KEY: Record<TraitKind, Key> = {
  trait: "kindTrait",
  bonus: "kindBonus",
  reaction: "kindReaction",
  legendary: "kindLegendary",
  info: "kindInfo",
};

/** Rasgos de lectura: lo que no se tira ni se gasta pero hay que saber para jugar la ficha (Pack Tactics, Multiattack, inmunidades…) */
export function TraitsPanel({ c }: Props) {
  const { t } = useT();
  const s = c.sheet;
  const [form, setForm] = useState<{ idx: number; name: string; desc: string; kind: TraitKind } | null>(null);

  const save = (list: Trait[]) => updateSheet(c.id, { traits: list });
  const remove = (i: number) => save(s.traits.filter((_, j) => j !== i));
  const submit = () => {
    if (!form || !form.name.trim()) return;
    const tr: Trait = { name: form.name.trim(), desc: form.desc.trim(), kind: form.kind };
    const list = [...s.traits];
    if (form.idx >= 0) list[form.idx] = tr;
    else list.push(tr);
    save(list);
    setForm(null);
  };

  // Los datos fijos (velocidad, sentidos, inmunidades) van compactos arriba; el resto, con su texto completo
  const infos = s.traits.map((tr, i) => [tr, i] as const).filter(([tr]) => tr.kind === "info");
  const rest = s.traits.map((tr, i) => [tr, i] as const).filter(([tr]) => tr.kind !== "info");

  return (
    <div className="traits">
      {s.traits.length > 0 && (
        <div className="spells-head">
          <h3>{t("traits")}</h3>
        </div>
      )}
      {infos.length > 0 && (
        <ul className="trait-list info">
          {infos.map(([tr, i]) => (
            <li key={tr.name + i} className="trait info">
              <b>{tr.name}</b> {tr.desc}
              <span className="btns">
                <button className="icon" title={t("edit")} onClick={() => setForm({ idx: i, name: tr.name, desc: tr.desc, kind: "info" })}>✎</button>
                <button className="icon" title={t("remove")} onClick={() => remove(i)}>✕</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {rest.length > 0 && (
        <ul className="trait-list">
          {rest.map(([tr, i]) => (
            <li key={tr.name + i} className={`trait ${tr.kind ?? "trait"}`}>
              <div className="trait-head">
                <b>{tr.name}</b>
                {tr.kind && tr.kind !== "trait" && <span className="tag">{t(KIND_KEY[tr.kind])}</span>}
                <span className="btns">
                  <button className="icon" title={t("edit")} onClick={() => setForm({ idx: i, name: tr.name, desc: tr.desc, kind: tr.kind ?? "trait" })}>✎</button>
                  <button className="icon" title={t("remove")} onClick={() => remove(i)}>✕</button>
                </span>
              </div>
              {tr.desc && <p>{tr.desc}</p>}
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <div className="trait-form">
          <input
            autoFocus
            placeholder={t("resourceName")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as TraitKind })}>
            {KINDS.map((k) => (
              <option key={k} value={k}>{t(KIND_KEY[k])}</option>
            ))}
          </select>
          <button className="primary" onClick={submit}>{t("ok")}</button>
          <button className="icon" onClick={() => setForm(null)}>✕</button>
          <textarea
            className="note"
            rows={3}
            placeholder={t("traitDesc")}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />
        </div>
      ) : (
        <button className="icon small" title={t("addTrait")} onClick={() => setForm({ idx: -1, name: "", desc: "", kind: "trait" })}>
          + {t("trait")}
        </button>
      )}
    </div>
  );
}
