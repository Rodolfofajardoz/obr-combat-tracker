import { RollMessage, fmt } from "../types";
import { useT } from "../i18n";

export function RollLog({ log }: { log: RollMessage[] }) {
  const { t } = useT();
  if (!log.length) return null;
  return (
    <section className="log">
      <h3>{t("rolls")}</h3>
      <ul>
        {log.slice(0, 8).map((m) => {
          const nat = m.expr ? "" : m.kept === 20 ? "crit" : m.kept === 1 ? "fumble" : "";
          // Las privadas llevan borde de color y el ícono a la derecha, pegado al desglose
          const priv = m.hidden ? "hidden" : m.whisper ? "whisper" : "";
          return (
            <li key={m.at + m.who} className={`${nat} ${priv}`}>
              <b className="total">{m.total}</b>
              <span className="desc">
                <span className="who">{m.who}</span> · {m.what}
              </span>
              {m.hidden && <span className="priv" title="Hidden roll">🙈</span>}
              {m.whisper && <span className="priv" title="Whispered to the DM">🤫</span>}
              <span className="detail">
                {m.expr ? (
                  <>
                    {m.expr} [{m.dice.join(", ")}]
                  </>
                ) : (
                  <>
                    d20 {m.dice.length > 1 ? `[${m.dice.join(", ")}]→${m.kept}` : m.kept} {fmt(m.mod)}
                    {m.mode === "adv" && " ▲"}
                    {m.mode === "dis" && " ▼"}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
