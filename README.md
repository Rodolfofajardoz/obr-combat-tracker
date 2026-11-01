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

### Probarla desde otro dispositivo (túnel)

`localhost` solo sirve en tu compu. Para usarla desde el celular u otra máquina, con el `npm run dev` corriendo abre otra terminal:

```bash
npm run tunnel
```

Imprime una URL tipo `https://algo.trycloudflare.com`. En Owlbear agrega `https://algo.trycloudflare.com/manifest.json`. La URL cambia cada vez que se abre el túnel.

## Cómo se usa

1. **Clic derecho** en una ficha del mapa → **Agregar al combate**. Se puede seleccionar varias a la vez.
2. Abre la ventana **Combate** (el ícono de la espada).
3. En cada fila:
   - El número grande es la **iniciativa**. Clic → tira d20 + DES + bono y la guarda. También se puede escribir a mano desde la hoja.
   - Clic en el **nombre** → selecciona la ficha y la cámara va hasta ella.
   - **PG**: escribe un número, o `-7` / `+5`, y Enter. **MN** (maná) igual, cuando la hoja tiene maná máximo.
   - **▼** abre la **hoja**: características, salvaciones, habilidades, estados y notas.
4. En la hoja, cada característica, salvación y habilidad es un botón: **clic = tirada**. El resultado sale abajo en *Tiradas*, y lo ven todos en la sala.
5. Arriba: **Normal / Ventaja / Desventaja** se aplica a la siguiente tirada y luego se apaga solo.
   - **🎲 3D**: con esto encendido, cada tirada lanza un d20 físico dentro de la ventana (librería [dice-box](https://fantasticdice.games/)) y el bono se suma al resultado. Apágalo para tiradas instantáneas. Solo quien tira ve el dado; los demás ven el resultado en *Tiradas*.
   - Los assets del dado viven en `public/assets/dice-box/` (copiados de `node_modules/@3d-dice/dice-box/dist/assets`).
   - La interfaz va en **inglés**. (El diccionario en `src/i18n.ts` conserva el español; para volver a ofrecerlo basta con reponer el botón en `App.tsx`.)
   - **◢** en la esquina inferior derecha: arrástralo para cambiar el tamaño de la ventana. El tamaño se recuerda.
6. Botones del DM: **Siguiente ▶** pasa el turno (y la cámara), **Tirar las que faltan** tira iniciativa a todas las fichas sin número, **Limpiar iniciativa** resetea la ronda.

### Competencias

- Salvaciones: **○** sin competencia · **●** competente.
- Habilidades: **○** → **●** competente → **◆** pericia (clic para ir cambiando).
- La percepción pasiva se calcula sola: 10 + SAB + competencia.

### Jugadores: asignar fichas

En la hoja de una ficha, el DM elige **Jugador** (solo aparecen los conectados a la sala). Ese jugador ve la hoja completa, edita PG y estados, y **tira iniciativa, salvaciones y habilidades** desde su propia ventana; la tirada le sale en su pantalla y el resultado llega a todos. En su lista, sus fichas llevan una barra verde.

### Qué ven los jugadores

- La lista con nombres, iniciativa y estados de las fichas **visibles**.
- CA, PG y la hoja completa solo de sus fichas asignadas, las que ellos crearon, o las que el DM marcó **Visible para todos**.
- Las fichas ocultas (👁) no les aparecen.

## Conjuros y tarjetas

En la hoja, a la izquierda de las habilidades, va la lista de **Spells**. Se buscan en el SRD (Open5e) y se agregan con ➕; al pasar el cursor por uno sale su tarjeta resumida (tiempo, alcance, duración, componentes, descripción). El botón muestra el **costo de maná** según [[Sistema de Maná del Tejido]] (nivel 1 = 2, 2 = 3, 3 = 5… trucos gratis). La regla de repetición (+1 maná por cada vez que se repite el conjuro en el combate) es **opcional**: la casilla *Repeat +1 MP* junto al título de Spells, solo para el DM, apagada por defecto. **Cast** descuenta el maná y manda la **tarjeta animada** a la pantalla de todos (`card.html`, abierta como popover por la página de fondo; se cierra sola a los 14 s o con un clic). *Limpiar iniciativa* reinicia la cuenta de repeticiones. Si no alcanza el maná, el jugador no puede lanzar; el DM sí.

En la hoja solo se guarda el resumen de cada conjuro; la descripción completa se trae del SRD al lanzar.

## Mobs: acciones tirables

Las criaturas del catálogo y del SRD traen sus **acciones** ya estructuradas (`scripts/catalogo.py` y `src/actions.ts` leen el texto: `+6 al golpe` / `+4 to hit`, los dados de daño y la salvación `CD 14`). En la hoja de un mob, en vez de Spells sale **Actions**: cada una con **🎯 +6** (tira d20 + bono, respeta ventaja/desventaja) y **💥 2d6+3** (tira el daño; con dado 3D salen los dados reales). Pasar el cursor muestra el texto completo. Los daños alternativos (versátil: "…, o 1d10+3 a dos manos") se quedan con la primera opción. Los PJ siguen con su hoja y sus conjuros; un mob puede mostrar también Spells con el botoncito *+ Spells*.

**Tiradas ocultas:** el botón **🙈** (solo DM) hace que las siguientes tiradas se queden en tu pantalla; en el registro salen con 🙈. Vuelve a pulsarlo para tirar en público.

## Barras de HP/AC sobre las fichas

El botón **▮ HP** (arriba) dibuja sobre cada ficha, al estilo Owl Trackers, una barra roja redondeada abajo con `11/16` y un círculo azul con la CA en la esquina inferior izquierda. Se dibujan con **items locales** de Owlbear, así que cada quien ve solo las fichas cuya hoja puede ver: el DM todas, un jugador las suyas y las compartidas. Nadie más recibe esos items. Se guarda por navegador.

## Estados = Condition Markers

Los estados de la hoja **son los marcadores de la extensión [Condition Markers](https://github.com/kgbergman/conditionmarkers)** (Keegan). Marcar "Prone" en nuestra hoja crea el mismo marcador sobre la ficha que crearía esa extensión (misma imagen desde `condition-markers.onrender.com`, misma rejilla y tamaño que su versión 1.0.8, mismo metadato `keegan.dev.condition-markers/metadata`), y los marcadores que se ponen desde su menú aparecen en nuestra lista. En la hoja hay un buscador y cuatro grupos: **Conditions** (las 16 estándar), **Buffs**, **Debuffs** (lo que se le pone al objetivo: Hunter's Mark, Hexed, Baned…) y **Other** (Flying, Holding Action, Reaction Used, Stabilized…). Arriba se listan los activos, con ✕ para quitarlos. Las imágenes vienen del servidor de esa extensión, así que conviene tenerla instalada en la sala.

## Perfiles: importar desde Excel

El botón **📋** (solo DM) abre los perfiles guardados. Un perfil es una hoja lista para usar; se guarda en la sala, así que sirve en todas las escenas.

- **Se aplica solo** cuando agregas al combate una ficha que se llama igual que un perfil (sin importar mayúsculas ni acentos).
- También se carga a mano desde la hoja (**Cargar perfil…**), y cualquier hoja se puede guardar como perfil (**💾**).

### Desde Excel

1. Descarga la **plantilla CSV** desde el panel, o arma una hoja con estas columnas (en cualquier orden):

   | Name | STR | DEX | CON | INT | WIS | CHA | Resonance | AC | HP | Mana | Proficiency | InitBonus | Saves | Skills | Notes |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
   | Soleil | 10 | 14 | 12 | 13 | 16 | 18 | 3 | 16 | 26 | 12 | 2 | 0 | INT, WIS | Nature*, Perception, Survival | Druid 3 |

   - Los encabezados, salvaciones y habilidades se aceptan en inglés o en español. Puntuaciones como número (14, no +2). Las columnas que falten se quedan en 10.
   - **Mana** sigue [[Sistema de Maná del Tejido]]: full casters 4 × nivel (niveles 1–4), half casters 3 × nivel, no casters 0.
   - **Resonancia** es la 7ª característica de la campaña: puntuación con la fórmula normal de modificador, tirable como las demás y con salvación propia (`RES` en la columna de salvaciones). **Mana** es el máximo de la reserva; si es 0 o va vacío, no se muestra.
   - **Salvaciones:** FUE, DES, CON, INT, SAB, CAR, RES separadas por coma o espacio.
   - **Habilidades:** separadas por coma; `*` al final = pericia.
2. Dos formas de meterlo:
   - **Copiar y pegar:** selecciona las celdas en Excel (con la fila de encabezados), cópialas y pégalas en el cuadro del panel → *Importar lo pegado*.
   - **Archivo:** *Guardar como → CSV UTF-8* y súbelo con *📂 Archivo*.
3. Si un nombre ya existía, se reemplaza.

Los perfiles también se exportan a CSV o JSON para respaldo. Tope: unos 14 KB en total (alrededor de 40 personajes con notas cortas).

### Catálogo de la campaña y SRD

El panel 📋 tiene cuatro pestañas:

- **Campaña:** todas las criaturas con statblock del vault de Obsidian (`public/catalogo.json`). Se usan tal cual: una ficha que se llame igual se llena sola. **➕** la copia a la sala para editarla.
- **SRD:** buscador de monstruos estándar de D&D 5e (en inglés) vía [Open5e](https://open5e.com/). **➕** lo guarda en la sala.
- **Sala:** los perfiles editables guardados en la sala.
- **Excel:** importar CSV o celdas pegadas.

Orden al agregar una ficha al combate: primero busca en la sala, luego en el catálogo.

Para regenerar el catálogo después de cambiar statblocks en el vault:

```bash
npm run catalogo
```

(`scripts/catalogo.py` lee los bloques ```` ```statblock ```` de Fantasy Statblocks; necesita Python con `pyyaml`. Los bonos de salvación y habilidad se convierten a competencia/pericia; si un bono de la nota no cuadra con la fórmula, lo deja apuntado en las notas del perfil.)

## Dónde se guarda

Todo vive en la escena de Owlbear: la hoja en los metadatos de cada ficha y la ronda/turno en los metadatos de la escena. No hay servidor propio. Si borras la ficha, se va su hoja.

## Publicada (para no depender de tu compu)

Cada push a `main` compila y publica la extensión en GitHub Pages (`.github/workflows/pages.yml`). En Owlbear se agrega:

```
https://rodolfofajardoz.github.io/obr-combat-tracker/manifest.json
```

El workflow compila con `VITE_BASE=/obr-combat-tracker/`, porque Pages sirve el sitio en esa subcarpeta; por eso el código arma sus rutas con `import.meta.env.BASE_URL` y el manifest usa rutas relativas. En local (`npm run dev`) la base sigue siendo `/`.

El repo es público: el código y `public/catalogo.json` (statblocks y notas del vault) los puede leer cualquiera.
