import { useRef, useState } from "react";
import {
  CSV_TEMPLATE,
  Profile,
  mergeProfiles,
  parseImport,
  profilesBytes,
  profilesToCsv,
  saveProfiles,
} from "../profiles";
import { CatalogEntry, filterCatalog, searchSrd } from "../catalog";
import { ABILITIES, fmt, mod } from "../types";
import { ABILITY_SHORT, useT } from "../i18n";

interface Props {
  profiles: Profile[];
  catalog: CatalogEntry[];
  onClose: () => void;
}

const LIMIT = 14000; // los metadatos de sala tienen un tope de ~16 KB

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProfilesPanel({ profiles, catalog, onClose }: Props) {
  const { t, lang } = useT();
  const summary = (p: Profile) =>
    ABILITIES.map((a) => `${ABILITY_SHORT[lang][a]} ${fmt(mod(p.abilities[a]))}`).join(" · ");
  const [tab, setTab] = useState<"sala" | "catalogo" | "srd" | "importar">("catalogo");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [srdQuery, setSrdQuery] = useState("");
  const [srd, setSrd] = useState<CatalogEntry[]>([]);
  const [srdBusy, setSrdBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const bytes = profilesBytes(profiles);

  const saveIncoming = async (incoming: Profile[], label: string) => {
    const merged = mergeProfiles(profiles, incoming);
    if (profilesBytes(merged) > LIMIT) {
      setMsg([`${t("tooBig")} (${profilesBytes(merged)} bytes, ${t("limit")} ${LIMIT}). ${t("tooBigHint")}`]);
      return false;
    }
    await saveProfiles(merged);
    setMsg([label]);
    return true;
  };

  const importText = async (raw: string) => {
    const { profiles: incoming, errors } = parseImport(raw);
    if (!incoming.length) {
      setMsg(errors.length ? errors : [t("noneFound")]);
      return;
    }
    if (await saveIncoming(incoming, `${t("imported")} ${incoming.length} ${t("profilesWord")}`)) {
      setText("");
      if (errors.length) setMsg((m) => [...m, ...errors]);
    }
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => importText(String(r.result ?? ""));
    r.readAsText(f, "utf-8");
  };

  const runSrd = async () => {
    setSrdBusy(true);
    setMsg([]);
    try {
      const res = await searchSrd(srdQuery);
      setSrd(res);
      if (!res.length) setMsg([t("srdEmpty")]);
    } catch (e) {
      setMsg([`${t("srdError")}: ${(e as Error).message}`]);
    } finally {
      setSrdBusy(false);
    }
  };

  // Copia sin los campos extra del catálogo
  const toProfile = (e: CatalogEntry): Profile => {
    const { source: _s, cr: _c, ...p } = e;
    return p;
  };

  const inRoom = (name: string) => profiles.some((p) => p.name === name);

  const EntryRow = ({ e }: { e: CatalogEntry }) => (
    <li>
      <b>{e.name}</b>
      <span>CR {e.cr} · CA {e.ac} · PG {e.maxHp}</span>
      <button
        className="icon"
        title={inRoom(e.name) ? t("inRoom") : t("copyToRoom")}
        disabled={inRoom(e.name)}
        onClick={() => saveIncoming([toProfile(e)], `"${e.name}" ${t("savedToRoom")}`)}
      >
        {inRoom(e.name) ? "✓" : "➕"}
      </button>
      <span className="muted">{summary(e)} · {e.source}</span>
    </li>
  );

  return (
    <section className="sheet profiles">
      <header>
        <h2>{t("profiles")}</h2>
        <button className="icon" onClick={onClose}>✕</button>
      </header>

      <div className="tabs">
        {(
          [
            ["catalogo", `${t("tabCampaign")} (${catalog.length})`],
            ["srd", t("tabSrd")],
            ["sala", `${t("tabRoom")} (${profiles.length})`],
            ["importar", t("tabExcel")],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={`chip ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "catalogo" && (
        <>
          <p className="muted small">{t("campaignHelp")}</p>
          <input className="search" placeholder={t("searchCatalog")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul className="profile-list">
            {filterCatalog(catalog, query).map((e) => (
              <EntryRow key={e.name} e={e} />
            ))}
          </ul>
        </>
      )}

      {tab === "srd" && (
        <>
          <p className="muted small">{t("srdHelp")}</p>
          <div className="import-bar">
            <input
              className="search"
              placeholder="goblin, wolf, ogre, cult fanatic…"
              value={srdQuery}
              onChange={(e) => setSrdQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSrd()}
            />
            <button className="primary" disabled={srdBusy || !srdQuery.trim()} onClick={runSrd}>
              {srdBusy ? "…" : t("search")}
            </button>
          </div>
          <ul className="profile-list">
            {srd.map((e) => (
              <EntryRow key={e.name} e={e} />
            ))}
          </ul>
        </>
      )}

      {tab === "sala" && (
        <>
          <p className="muted small">
            {t("roomHelp")} ({(bytes / 1024).toFixed(1)} / {(LIMIT / 1024).toFixed(0)} KB). {t("roomHelp2")}
          </p>
          {profiles.length === 0 && <p className="muted small">{t("roomEmpty")}</p>}
          <ul className="profile-list">
            {profiles.map((p) => (
              <li key={p.name}>
                <b>{p.name}</b>
                <span>CA {p.ac} · PG {p.maxHp}</span>
                <button className="icon" title={t("delete")} onClick={() => saveProfiles(profiles.filter((x) => x.name !== p.name))}>
                  🗑
                </button>
                <span className="muted">{summary(p)}</span>
              </li>
            ))}
          </ul>
          {profiles.length > 0 && (
            <div className="import-bar">
              <button onClick={() => download("perfiles.csv", "﻿" + profilesToCsv(profiles), "text/csv")}>⬇ CSV</button>
              <button onClick={() => download("perfiles.json", JSON.stringify(profiles, null, 2), "application/json")}>⬇ JSON</button>
            </div>
          )}
        </>
      )}

      {tab === "importar" && (
        <>
          <div className="import-bar">
            <button onClick={() => file.current?.click()}>{t("fileBtn")}</button>
            <input
              ref={file}
              type="file"
              accept=".csv,.txt,.json"
              hidden
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button onClick={() => download("perfiles-plantilla.csv", "﻿" + CSV_TEMPLATE, "text/csv")}>{t("templateBtn")}</button>
          </div>
          <textarea
            rows={4}
            placeholder={`${t("pastePlaceholder")}\nName\tSTR\tDEX\tCON\tINT\tWIS\tCHA\tResonance\tAC\tHP\tMana\tProficiency\tInitBonus\tSaves\tSkills\tNotes`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="import-bar">
            <button className="primary" disabled={!text.trim()} onClick={() => importText(text)}>
              {t("importPasted")}
            </button>
          </div>
          <p className="muted small">{t("importHelp")}</p>
        </>
      )}

      {msg.length > 0 && (
        <ul className="messages">
          {msg.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
