import { Combatant } from "../obr";
import { fmt } from "../types";
import type { RollRequest, ExprRequest } from "../App";
import { useT } from "../i18n";

interface Props {
  c: Combatant;
  onRoll: (r: RollRequest) => Promise<unknown>;
  onRollExpr: (r: ExprRequest) => Promise<unknown>;
}

/** Acciones de statblock: un botón para el ataque (d20 + bono) y otro para el daño (expresión de dados) */
export function ActionsPanel({ c, onRoll, onRollExpr }: Props) {
  const { t } = useT();
  const s = c.sheet;
  return (
    <div className="spells actions">
      <div className="spells-head">
        <h3>{t("actions")}</h3>
      </div>
      <ul className="spell-list">
        {s.actions.map((a, i) => (
          <li key={a.name + i} className="spell action">
            <span className="name" title={a.desc}>
              {a.name}
              {a.save && <small className="muted"> · {a.save}</small>}
            </span>
            <span className="btns">
              {a.toHit !== undefined && (
                <button
                  className="cast"
                  title={`${t("attack")}: d20 ${fmt(a.toHit)}`}
                  onClick={() => onRoll({ who: c.name, what: `${a.name} (${t("attack")})`, mod: a.toHit! })}
                >
                  🎯 {fmt(a.toHit)}
                </button>
              )}
              {a.damage && (
                <button
                  className="cast dmg"
                  title={`${t("damage")}: ${a.damage}`}
                  onClick={() => onRollExpr({ who: c.name, what: `${a.name} (${t("damage")})`, expr: a.damage! })}
                >
                  💥 {a.damage}
                </button>
              )}
            </span>
            <div className="spell-hover">
              <b>{a.name}</b>
              <p>{a.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
