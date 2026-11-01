import { RollMessage, fmt } from "../types";

export function RollLog({ log }: { log: RollMessage[] }) {
  if (!log.length) return null;
  return (
    <section className="log">
      <h3>Tiradas</h3>
      <ul>
        {log.slice(0, 8).map((m) => {
          const nat = m.kept === 20 ? "crit" : m.kept === 1 ? "fumble" : "";
          return (
            <li key={m.at + m.who} className={nat}>
              <b className="total">{m.total}</b>
              <span className="desc">
                <span className="who">{m.who}</span> · {m.what}
              </span>
              <span className="detail">
                d20 {m.dice.length > 1 ? `[${m.dice.join(", ")}]→${m.kept}` : m.kept} {fmt(m.mod)}
                {m.mode === "adv" && " ▲"}
                {m.mode === "dis" && " ▼"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
