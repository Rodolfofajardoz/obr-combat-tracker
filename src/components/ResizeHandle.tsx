import { useRef } from "react";
import { requestSize, writeSizePref, MIN_W, MAX_W, MIN_H, MAX_H } from "../resize";
import { useT } from "../i18n";

/** Esquina inferior derecha: arrastrar cambia el tamaño de la ventana de Owlbear */
export function ResizeHandle() {
  const { t } = useT();
  const start = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  return (
    <div
      className="resize-handle"
      title={t("resize")}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.screenX, y: e.screenY, w: window.innerWidth, h: window.innerHeight };
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        // screenX/Y en vez de clientX/Y: la ventana crece bajo el puntero y las coordenadas de cliente se mueven
        requestSize(clamp(s.w + (e.screenX - s.x), MIN_W, MAX_W), clamp(s.h + (e.screenY - s.y), MIN_H, MAX_H));
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (s) writeSizePref(clamp(s.w + (e.screenX - s.x), MIN_W, MAX_W), clamp(s.h + (e.screenY - s.y), MIN_H, MAX_H));
      }}
      onPointerCancel={() => (start.current = null)}
    >
      ◢
    </div>
  );
}
