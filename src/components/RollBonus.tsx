import { fmt } from "../types";
import { useT } from "../i18n";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

/** Modificador extra para la próxima tirada de d20: − valor +. Clic en el valor lo vuelve a 0. */
export function RollBonus({ value, onChange }: Props) {
  const { t } = useT();
  return (
    <span className={`bonus ${value ? "on" : ""}`} title={t("bonusTitle")}>
      <button onClick={() => onChange(value - 1)}>−</button>
      <button className="val" onClick={() => onChange(0)}>
        ★ {fmt(value)}
      </button>
      <button onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}
