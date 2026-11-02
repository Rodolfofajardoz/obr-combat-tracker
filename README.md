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
   - **▼** abre la **hoja** en su propia ventana (`sheet.html`), a la derecha de la lista: características, salvaciones, habilidades, estados y notas. Una sola hoja abierta a la vez; se cierra con ✕ o con ▲ en la lista. **Arrastra su cabecera y suelta** para moverla: Owlbear no permite mover una ventana abierta, así que mientras arrastras nada se mueve y, al soltar, la hoja se cierra y vuelve a abrirse donde la dejaste (la posición se recuerda por navegador). La página de fondo es la dueña de esa ventana: la lista y la hoja le mandan *open*/*close* por un canal local (`src/sheetWindow.ts`). Ventaja/desventaja, 🙈 y 🤫 están en las dos ventanas y son el mismo ajuste (`src/rollPrefs.ts`, en sessionStorage).
4. En la hoja, cada característica, salvación y habilidad es un botón: **clic = tirada**. El resultado sale abajo en *Tiradas*, y lo ven todos en la sala.
5. Arriba: **Normal / Ventaja / Desventaja** se aplica a la siguiente tirada y luego se apaga solo.
   - **Dados 3D para todos:** cada tirada (iniciativa, salvación, habilidad, ataque, daño) se tira primero al instante y luego se manda a toda la sala; en cada pantalla se abre `dice.html` en una bandeja chica en la fila de arriba del mapa y los dados ruedan y caen justo en esos valores ([dice-box-threejs](https://github.com/3d-dice/dice-box-threejs), que permite fijar el resultado con `2d6@3,5`). Encima sale quién tiró, qué, y el total. Se cierra solo o con un clic. El registro espera ~3.5 s para no adelantar el resultado.
   - **Cinco espacios arriba:** la fila tiene cinco bandejas (`src/diceSlots.ts`); cada tirada toma la primera libre en el orden en que llega, y si las cinco están ocupadas espera en cola hasta que una se desocupe. No son por jugador: quien tira dos veces seguidas ocupa dos. La fila va pegada al borde derecho (dejando libre la barra de herramientas), así lo que sobra queda a la izquierda, lejos de la ventana del tracker; en pantallas angostas se achica y, si hace falta, pasa a dos filas. Cada bandeja es un popover aparte que se cierra solo (o con un clic) y avisa a la página de fondo para liberar su espacio.
   - **🎲 3D** decide si **tú** ves los dados (los tuyos y los de los demás); se guarda por navegador. Apagado, tus tiradas salen al instante en el registro. Las tiradas ocultas (🙈) solo ruedan en tu pantalla.
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

En la hoja, a la izquierda de las habilidades, va la lista de **Spells**. Se buscan en el SRD (Open5e) y se agregan con ➕; al pasar el cursor por uno sale su tarjeta resumida (tiempo, alcance, duración, componentes, descripción). El botón muestra el **costo de maná** según [[Sistema de Maná del Tejido]] (nivel 1 = 2, 2 = 3, 3 = 5… trucos gratis). La regla de repetición (+1 maná por cada vez que se repite el conjuro en el combate) es **opcional**: la casilla *Repeat +1 MP* junto al título de Spells, solo para el DM, apagada por defecto. **Cast** descuenta el maná y manda la **tarjeta animada** a la pantalla de todos (`card.html`, abierta como popover en la esquina inferior derecha por la página de fondo, con el alto ajustado al contenido; se cierra sola a los 14 s o con un clic, y un conjuro nuevo reemplaza a la tarjeta anterior). *Limpiar iniciativa* reinicia la cuenta de repeticiones. Si no alcanza el maná, el jugador no puede lanzar; el DM sí.

**A nivel superior:** el botoncito **▴** junto al costo despliega los niveles por encima del propio (hasta 9), cada uno con su costo según la misma tabla de maná; clic en uno lanza el conjuro a ese nivel. La tarjeta muestra el nivel al que se lanzó, con el nivel original entre paréntesis, y su sección *At higher levels* dice qué cambia.

En la hoja solo se guarda el resumen de cada conjuro; la descripción completa se trae del SRD. Para que la tarjeta salga **al instante**: con la hoja abierta los textos completos de sus conjuros se precargan en segundo plano; al lanzar no se espera ni a Open5e ni a la escritura de la hoja (la tarjeta viaja con el texto que haya y, si le falta el completo, ella misma lo rellena al llegar); y la página de fondo deja `card.html`, `dice.html` y `sheet.html` con sus scripts ya en la caché del navegador al entrar a la sala.

### Auras de la tarjeta

Cada tarjeta lleva un **tema** (`src/cardFx.ts`): colores de borde, brillo y títulos, un glifo de marca de agua y partículas en un `<canvas>` detrás del texto. El tema sale primero de **lo que hace el conjuro** y, si no hace daño ni cura, de su **escuela**:

| Tema | Cómo se detecta | Aura |
|---|---|---|
| fire / cold / lightning / thunder / acid / poison / necrotic / radiant / psychic / force | "X damage" en el texto (el primero que aparezca); si el texto no lo dice, pistas en el nombre (Ice Knife, Flame Blade…) | brasas que suben · nieve · chispas y un rayo ocasional · ondas de choque · gotas · burbujas · volutas de humo · destellos · ondas concéntricas · puntos en órbita |
| prism | tres o más tipos de daño en la misma frase (Chromatic Orb) | estrellas que cambian de color |
| heal | "regains … hit points" | motas verdes |
| evocation / abjuration / illusion / enchantment / conjuration / divination / transmutation | la escuela | brasas · anillo de runas que gira · niebla tornasol · destellos rosa · órbita · estrellas · formas que se deforman |

Las partículas son decorativas: hasta ~60 vivas, se precalientan para que la tarjeta aparezca ya con su aura, se detienen al cerrar y no existen si el sistema pide menos movimiento (`prefers-reduced-motion`). Las animaciones CSS por tema (parpadeo del título en lightning, cambio de tono del aura en illusion/prism) tampoco. Nada de esto sale del rectángulo de la tarjeta: es un popover, y Owlbear no deja dibujar fuera.

## Mobs: acciones tirables

Las criaturas del catálogo y del SRD traen sus **acciones** ya estructuradas (`scripts/catalogo.py` y `src/actions.ts` leen el texto: `+6 al golpe` / `+4 to hit`, los dados de daño y la salvación `CD 14`). En la hoja de un mob, en vez de Spells sale **Actions**: cada una con **🎯 +6** (tira d20 + bono, respeta ventaja/desventaja) y **💥 2d6+3** (tira el daño; con dado 3D salen los dados reales). Pasar el cursor muestra el texto completo. Los daños alternativos (versátil: "…, o 1d10+3 a dos manos") se quedan con la primera opción. Los PJ siguen con su hoja y sus conjuros; un mob puede mostrar también Spells con el botoncito *+ Spells*.

**Iniciativa a mano:** clic en el número la tira; **doble clic** lo vuelve un campo para escribirla (Enter o salir del campo la guarda, Esc cancela). Acepta decimales para desempatar o mover a alguien entre dos (14.5 va entre 15 y 14) y vacío la borra. La lista se reordena sola en cuanto se guarda: no hace falta un botón de "actualizar orden", el orden es siempre el de los números.

**Modificador extra:** junto a Normal/Advantage/Disadvantage va **− ★ +0 +**: un bono o penalización para la **próxima tirada de d20** (ataque, prueba o salvación) que no está en la hoja, como el +1 de una reliquia. Se suma al modificador de la tirada, sale marcado con ★ en el desglose y se borra al tirar; clic en el valor lo deja en 0. No afecta a las tiradas de daño. Como ventaja/desventaja, es el mismo ajuste en la lista y en la ventana de la hoja.

**Tiradas ocultas:** el botón **🙈** (solo DM) hace que las siguientes tiradas se queden en tu pantalla; en el registro salen con 🙈. Vuelve a pulsarlo para tirar en público.

**Susurro al DM:** los jugadores tienen en su lugar el botón **🤫**: mientras está encendido, sus tiradas (dados y registro) solo las ven ese jugador y el DM; los demás no reciben nada. En el registro, las tiradas privadas llevan el ícono a la derecha, junto al desglose, y un borde izquierdo de color: rojo las ocultas (🙈), morado los susurros (🤫). El mensaje viaja a todos con el id del jugador, y cada ventana decide si lo muestra (`canSeeWhisper` en `src/diceShow.ts`).

## Los PJ en el catálogo

Los cinco PJ viven como statblock en sus notas del vault (`Campaign/Characters/Players/Party1/*.md`, sección *Bloque en mesa*) y entran al catálogo como cualquier criatura, con tres campos extra que entiende `scripts/catalogo.py`: `level` (bono de competencia por nivel; el catálogo muestra *lvl 3* en vez de CR), `mana` y `resonance` / `res_save`, y `spells` (lista de nombres, por líneas tipo `"Level 1: Bless, Sleep"`). Los conjuros se resuelven contra Open5e —primero el **SRD 5.2 de 2024** (API v2, slugs `v2:…`; trae Chromatic Orb, Ice Knife y el texto de las reglas nuevas), luego el 5.1— y se guardan en `scripts/spells-cache.json` para no volver a pedirlos. Los que no están en ningún SRD (Blade Ward, Friends) van escritos a mano en el script como `local:…`. La tarjeta al lanzar sabe de dónde traer el texto completo según el prefijo del slug. En las hojas de PJ no van armas: solo puntuaciones, salvaciones, habilidades, maná, Resonancia, recursos, rasgos y conjuros de clase; al subir de nivel se edita el bloque y se vuelve a correr el catálogo.

## Rasgos de lectura (Traits)

Arriba de Actions/Spells va **Traits**: lo que no se tira ni se gasta pero hay que saber para jugar la ficha. Dos partes: los **datos fijos** en una línea cada uno (Speed, Senses, Resistances, Immunities, Vulnerabilities, Condition immunities) y los **rasgos** con su texto completo, etiquetados cuando no son pasivas: *Bonus action*, *Reaction*, *Legendary*. Así un mob que nunca usaste (Pack Tactics, Multiattack, Nimble Escape, inmune a fuego…) se lee entero desde la hoja. Catálogo y SRD los traen solos (`traits`, `bonus_actions`, `reactions`, `legendary_actions` del statblock; `special_abilities` y demás de Open5e); el botoncito **+ Trait** agrega los propios, con nombre, tipo y texto, y ✎ / ✕ editan o quitan. Las notas de cada criatura ya no repiten esa lista: quedan para el encabezado (CR, tamaño, tipo) y los avisos.

## Recursos y descansos

Debajo de los números de combate va la lista de **recursos contables**: forma salvaje, puntos de hechicería, inspiración bárdica, puntos de foco, usos de un rasgo… Cada uno es un nombre, un máximo, cuándo se recupera (☕ descanso corto o 🌙 descanso largo) y una nota opcional con qué hace; al pasar el cursor por la fila sale el nombre, los usos y esa nota. Hasta 12 usos se dibujan como puntos (clic en uno para gastar o recuperar hasta ahí); con más, un contador − / +. Si la hoja no tiene recursos, no se muestra nada: solo el botoncito **+ Resource** para agregar el primero, y ✎ / ✕ en cada fila para editarlo o quitarlo.

Los perfiles del catálogo y del SRD traen los suyos solos: `scripts/catalogo.py` y `src/actions.ts` leen el nombre de cada rasgo o acción y convierten `(1/Descanso corto)`, `(2/Sesión)`, `(1/Day)` o `(Recharges after a Short or Long Rest)` en un recurso, con el texto del rasgo como nota (*Sesión* y *Día* cuentan como descanso largo; *Recarga 5–6* no, eso se tira). Al cargar el perfil empiezan llenos. Los statblocks de PJ y aliados del vault van en inglés para que armas y rasgos salgan igual que el resto de la interfaz.

Botones **☕ Short rest** y **🌙 Long rest** en cada hoja; en la barra del DM (abajo de la lista) los mismos para **toda la lista**. El corto rellena los recursos ☕ y nada más: los PG se curan a mano, porque la hoja no lleva dados de golpe. El largo pone PG y maná al máximo, PG temporales a 0, rellena todos los recursos y reinicia la cuenta de conjuros repetidos (según [[Sistema de Maná del Tejido]], el maná solo vuelve con descanso largo). Cada descanso avisa con una notificación de Owlbear.

### Los overlays y el mapa

Dados y tarjeta son popovers de Owlbear, o sea iframes: el navegador no deja pasar clics a través de un iframe, ni por sus partes transparentes, así que el rectángulo que ocupa cada uno bloquea el mapa debajo mientras está abierto. Por eso cada uno ocupa solo lo que necesita (la bandeja es chica y la tarjeta mide su contenido), viven en los bordes y se cierran solos; el resto del mapa sigue libre para mover la cámara, hacer zoom y mover fichas.

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

El workflow compila con `VITE_BASE=/obr-combat-tracker/`, porque Pages sirve el sitio en esa subcarpeta; por eso el código arma sus rutas con `import.meta.env.BASE_URL`, y el `manifest.json` de la raíz es una plantilla: `vite.config.ts` le antepone la base a sus rutas al compilar (y al servirlo en `npm run dev`). En local (`npm run dev`) la base sigue siendo `/`.

El repo es público: el código y `public/catalogo.json` (statblocks y notas del vault) los puede leer cualquiera.
