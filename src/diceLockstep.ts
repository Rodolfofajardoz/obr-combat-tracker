/**
 * dice-box-threejs simula la tirada entera, cambia las caras para que salga el valor pedido y luego la repite
 * en pantalla. Al simular revisa en cada paso qué dados ya se detuvieron (y los congela); al animar solo lo
 * revisa una vez por cuadro, así que con cuadros lentos un dado que ya se había detenido puede recibir otro
 * golpe y caer en otra cara. Esto hace la revisión en cada paso también durante la animación.
 */
export function lockstep(box: object) {
  const b = box as { world: { step: (dt: number) => void }; animstate: string; throwFinished: () => boolean };
  const step = b.world.step.bind(b.world);
  b.world.step = (dt: number) => {
    step(dt);
    if (b.animstate === "throw") b.throwFinished();
  };
}
