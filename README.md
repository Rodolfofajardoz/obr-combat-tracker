# Combate — extensión para Owlbear Rodeo

Tracker de combate para D&D 5e: iniciativa, CA, PG, percepción pasiva, estados y tiradas de característica, salvación y habilidad por ficha.

## Correrlo en tu compu

```bash
npm install
npm run dev
```

Queda en `http://localhost:5173`. En Owlbear Rodeo: **Extensions → Add custom extension** y pega:

```
http://localhost:5173/manifest.json
```

Mientras el `npm run dev` esté corriendo, la extensión funciona para todos en la sala.

## Cómo se usa

1. **Clic derecho** en una ficha del mapa → **Agregar al combate**. Se puede seleccionar varias a la vez.
2. Abre la ventana **Combate** (el ícono de la espada).
3. En cada fila:
   - El número grande es la **iniciativa**. Clic → tira d20 + DES + bono y la guarda. También se puede escribir a mano desde la hoja.
   - Clic en el **nombre** → selecciona la ficha y la cámara va hasta ella.
   - **PG**: escribe un número, o `-7` / `+5`, y Enter.
   - **▼** abre la **hoja**: características, salvaciones, habilidades, estados y notas.
4. En la hoja, cada característica, salvación y habilidad es un botón: **clic = tirada**. El resultado sale abajo en *Tiradas*, y lo ven todos en la sala.
5. Arriba: **Normal / Ventaja / Desventaja** se aplica a la siguiente tirada y luego se apaga solo.
6. Botones del DM: **Siguiente ▶** pasa el turno (y la cámara), **Tirar las que faltan** tira iniciativa a todas las fichas sin número, **Limpiar iniciativa** resetea la ronda.

### Competencias

- Salvaciones: **○** sin competencia · **●** competente.
- Habilidades: **○** → **●** competente → **◆** pericia (clic para ir cambiando).
- La percepción pasiva se calcula sola: 10 + SAB + competencia.

### Qué ven los jugadores

- La lista con nombres, iniciativa y estados de las fichas **visibles**.
- CA, PG y la hoja completa solo de las fichas que ellos crearon, o de las que el DM marcó **Visible para jugadores** en la hoja.
- Las fichas ocultas (👁) no les aparecen.

## Dónde se guarda

Todo vive en la escena de Owlbear: la hoja en los metadatos de cada ficha y la ronda/turno en los metadatos de la escena. No hay servidor propio. Si borras la ficha, se va su hoja.

## Publicarlo (para no depender de tu compu)

```bash
npm run build
```

Sube la carpeta `dist/` a Netlify, Vercel o GitHub Pages y usa `https://tu-sitio/manifest.json` en Owlbear.
