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
          return (
            <li key={m.at + m.who} className={nat}>
              <b className="total">{m.total}</b>
              <span className="desc">
                {m.hidden && <span title="Hidden roll">🙈 </span>}
                <span className="who">{m.who}</span> · {m.what}
              </span>
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
