import { useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { Combatant, updateSheet } from "../obr";
import { Spell } from "../types";
import { broadcastCast, castCost, fetchSpellFull, levelLabel, searchSpells } from "../spells";
import { useT } from "../i18n";
import { Settings, saveSettings } from "../settings";

interface Props {
  c: Combatant;
  isGM: boolean;
  playerName: string;
  settings: Settings;
}

export function SpellsPanel({ c, isGM, playerName, settings }: Props) {
  const { t } = useT();
  const s = c.sheet;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Spell[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [casting, setCasting] = useState<string | null>(null);

  const known = new Set(s.spells.map((x) => x.name));

  const search = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await searchSpells(query);
      setResults(r);
      if (!r.length) setMsg(t("spellNone"));
    } catch (e) {
      setMsg(`${t("srdError")}: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const add = (sp: Spell) =>
    updateSheet(c.id, (cur) => ({
      ...cur,
      spells: [...cur.spells.filter((x) => x.name !== sp.name), sp].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name)),
    }));
  const remove = (name: string) => updateSheet(c.id, (cur) => ({ ...cur, spells: cur.spells.filter((x) => x.name !== name) }));

  const cast = async (sp: Spell) => {
    const cost = castCost(sp, s, settings.repeatCost);
    if (cost > s.mana && !isGM) {
      setMsg(`${t("notEnoughMana")} (${cost} MP)`);
      return;
    }
    setCasting(sp.name);
    try {
      const full = await fetchSpellFull(sp);
      await updateSheet(c.id, (cur) => ({
        ...cur,
        mana: Math.max(0, cur.mana - cost),
        casts: sp.level === 0 ? cur.casts : { ...cur.casts, [sp.name]: (cur.casts[sp.name] ?? 0) + 1 },
      }));
      await broadcastCast({ caster: c.name, by: playerName, cost, spell: { ...sp, ...full }, at: Date.now() });
      OBR.notification.show(`${c.name}: ${sp.name}${cost ? ` (−${cost} MP)` : ""}`, "INFO");
    } finally {
      setCasting(null);
    }
  };

  const Hover = ({ sp }: { sp: Spell }) => (
    <div className="spell-hover">
      <b>{sp.name}</b>
      <div className="meta">
        {levelLabel(sp.level)} · {sp.school}
        {sp.concentration && " · Concentration"}
        {sp.ritual && " · Ritual"}
      </div>
      <div className="meta">
        <span>⏱ {sp.time}</span> <span>📏 {sp.range}</span> <span>⌛ {sp.duration}</span> <span>✋ {sp.components}</span>
      </div>
      <p>{sp.desc}</p>
    </div>
  );

  return (
    <div className="spells">
      <div className="spells-head">
        <h3>{t("spells")}</h3>
        {isGM && (
          <label className="share" title={t("repeatCostTitle")}>
            <input
              type="checkbox"
              checked={settings.repeatCost}
              onChange={(e) => saveSettings({ repeatCost: e.target.checked })}
            />
            {t("repeatCost")}
          </label>
        )}
      </div>
      {s.spells.length === 0 && <p className="muted small">{t("spellsEmpty")}</p>}
      <ul className="spell-list">
        {s.spells.map((sp) => {
          const cost = castCost(sp, s, settings.repeatCost);
          const n = settings.repeatCost ? s.casts[sp.name] ?? 0 : 0;
          const short = cost > s.mana;
          return (
            <li key={sp.name} className="spell">
              <span className="lvl" title={levelLabel(sp.level)}>{sp.level === 0 ? "C" : sp.level}</span>
              <span className="name">
                {sp.name}
                {sp.concentration && <small title="Concentration"> ©</small>}
                {n > 0 && <small className="muted"> ×{n + 1}</small>}
              </span>
              <button
                className={`cast ${short ? "short" : ""}`}
                disabled={casting !== null}
                title={short ? `${t("notEnoughMana")} (${cost} MP)` : `${t("cast")} · ${cost} MP`}
                onClick={() => cast(sp)}
              >
                {casting === sp.name ? "…" : cost > 0 ? `${cost} MP` : t("cast")}
              </button>
              <button className="icon" title={t("remove")} onClick={() => remove(sp.name)}>✕</button>
              <Hover sp={sp} />
            </li>
          );
        })}
      </ul>

      <div className="import-bar">
        <input
          className="search"
          placeholder={t("spellSearch")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className="primary" disabled={busy || !query.trim()} onClick={search}>
          {busy ? "…" : "+"}
        </button>
      </div>
      {results.length > 0 && (
        <ul className="spell-list results">
          {results.map((sp) => (
            <li key={sp.slug} className="spell">
              <span className="lvl">{sp.level === 0 ? "C" : sp.level}</span>
              <span className="name">{sp.name} <small className="muted">{sp.school}</small></span>
              <button className="icon" disabled={known.has(sp.name)} title={t("addSpell")} onClick={() => add(sp)}>
                {known.has(sp.name) ? "✓" : "➕"}
              </button>
              <Hover sp={sp} />
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="messages small">{msg}</p>}
    </div>
  );
}
