import { useEffect, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { Combatant, updateSheet } from "../obr";
import { Spell } from "../types";
import { broadcastCast, castCost, cachedSpellFull, levelLabel, prefetchSpellFull, searchSpells } from "../spells";
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
  /** Conjuro con el menú de nivel superior abierto */
  const [upcast, setUpcast] = useState<string | null>(null);

  const known = new Set(s.spells.map((x) => x.name));

  // Con la hoja abierta, los textos completos se traen por adelantado: al lanzar, la tarjeta ya los tiene
  const spellKey = s.spells.map((x) => x.slug).join("|");
  useEffect(() => {
    prefetchSpellFull(s.spells);
  }, [spellKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** Lanza el conjuro; `level` mayor que el suyo = a nivel superior, con el costo de ese nivel */
  const cast = async (sp: Spell, level = sp.level) => {
    const cost = castCost(sp, s, settings.repeatCost, level);
    if (cost > s.mana && !isGM) {
      setMsg(`${t("notEnoughMana")} (${cost} MP)`);
      return;
    }
    setCasting(sp.name);
    setUpcast(null);
    try {
      // La tarjeta sale ya: con el texto completo si está en caché; si no, ella misma lo completa al abrirse.
      // No se espera a Open5e ni a la escritura de la hoja.
      const full = cachedSpellFull(sp) ?? { fullDesc: "", higher: "" };
      await Promise.all([
        broadcastCast({ caster: c.name, by: playerName, cost, level, spell: { ...sp, ...full }, at: Date.now() }),
        updateSheet(c.id, (cur) => ({
          ...cur,
          mana: Math.max(0, cur.mana - cost),
          casts: sp.level === 0 ? cur.casts : { ...cur.casts, [sp.name]: (cur.casts[sp.name] ?? 0) + 1 },
        })),
      ]);
      const lvl = level > sp.level ? ` (${levelLabel(level)})` : "";
      OBR.notification.show(`${c.name}: ${sp.name}${lvl}${cost ? ` (−${cost} MP)` : ""}`, "INFO");
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
              {sp.level > 0 && sp.level < 9 ? (
                <button
                  className={`icon ${upcast === sp.name ? "on" : ""}`}
                  title={t("upcast")}
                  disabled={casting !== null}
                  onClick={() => setUpcast((v) => (v === sp.name ? null : sp.name))}
                >
                  ▴
                </button>
              ) : (
                <span />
              )}
              <button className="icon" title={t("remove")} onClick={() => remove(sp.name)}>✕</button>
              {upcast === sp.name && (
                <div className="upcast">
                  <small className="muted">{t("upcast")}:</small>
                  {Array.from({ length: 9 - sp.level }, (_, i) => sp.level + 1 + i).map((lv) => {
                    const lvCost = castCost(sp, s, settings.repeatCost, lv);
                    const lvShort = lvCost > s.mana;
                    return (
                      <button
                        key={lv}
                        className={`cast ${lvShort ? "short" : ""}`}
                        title={lvShort ? `${t("notEnoughMana")} (${lvCost} MP)` : `${t("cast")} · ${levelLabel(lv)} · ${lvCost} MP`}
                        onClick={() => cast(sp, lv)}
                      >
                        {lv} · {lvCost} MP
                      </button>
                    );
                  })}
                </div>
              )}
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
