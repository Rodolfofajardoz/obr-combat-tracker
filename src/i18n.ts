import { createContext, useContext } from "react";
import type { Ability } from "./types";

export type Lang = "es" | "en";

/** [español, inglés] */
const D = {
  round: ["Ronda", "Round"],
  normal: ["Normal", "Normal"],
  adv: ["Ventaja", "Advantage"],
  dis: ["Desventaja", "Disadvantage"],
  advDisTitle: ["Ventaja o desventaja para la próxima tirada", "Advantage or disadvantage for the next roll"],
  dice3dOn: [
    "Ves los dados 3D de todos en pantalla: clic para no verlos y que tus tiradas salgan al instante",
    "You see everyone's 3D dice on screen: click to hide them and make your rolls instant",
  ],
  dice3dOff: ["Ver los dados 3D de todos en pantalla", "Show everyone's 3D dice on screen"],
  profilesTitle: ["Perfiles guardados e importar desde Excel", "Saved profiles and Excel import"],
  prevTurn: ["Turno anterior", "Previous turn"],
  nextTurn: ["Siguiente", "Next"],
  nextTurnTitle: ["Siguiente turno", "Next turn"],
  emptyList: ["Clic derecho en una ficha →", "Right-click a token →"],
  addToCombat: ["Agregar al combate", "Add to combat"],
  emptyHint: [
    "Si la ficha se llama igual que un perfil o una criatura del catálogo (📋), la hoja se llena sola.",
    "If the token has the same name as a profile or a catalog creature (📋), the sheet fills itself.",
  ],
  rollMissing: ["🎲 Tirar las que faltan", "🎲 Roll missing"],
  clearInit: ["Limpiar iniciativa", "Clear initiative"],
  noScene: ["No hay ninguna escena abierta.", "No scene is open."],
  hintNext: ["Próxima tirada con", "Next roll with"],
  hintName: ["Clic en el nombre para ver la ficha en el mapa", "Click a name to show the token on the map"],
  resize: ["Arrastra para cambiar el tamaño de la ventana", "Drag to resize the window"],
  // fila
  initiative: ["Iniciativa", "Initiative"],
  rollInit: ["Tirar iniciativa", "Roll initiative"],
  showOnMap: ["Ver en el mapa", "Show on map"],
  hiddenToken: ["Oculta para los jugadores", "Hidden from players"],
  assignedPlayer: ["Jugador asignado", "Assigned player"],
  ac: ["CA", "AC"],
  acTitle: ["Clase de Armadura", "Armor Class"],
  pp: ["PP", "PP"],
  ppTitle: ["Percepción pasiva", "Passive Perception"],
  hp: ["PG", "HP"],
  hpTitle: ["PG: escribe un número, o +5 / -7", "HP: type a number, or +5 / -7"],
  setTurn: ["Poner el turno aquí", "Set turn here"],
  sheet: ["Hoja", "Sheet"],
  dragSheet: ["Arrastra y suelta para mover la hoja: se vuelve a abrir donde la sueltes", "Drag and release to move the sheet: it reopens where you drop it"],
  sheetGone: ["Esta ficha ya no está en la escena, o ya no puedes verla.", "This token is no longer in the scene, or you can no longer see it."],
  // hoja
  player: ["Jugador", "Player"],
  playerTitle: [
    "El jugador asignado ve la hoja completa y puede tirar por esta ficha",
    "The assigned player sees the full sheet and can roll for this token",
  ],
  nobody: ["— nadie (solo DM) —", "— nobody (GM only) —"],
  disconnected: ["jugador desconectado", "disconnected player"],
  onlyConnected: ["Solo aparecen los jugadores conectados a la sala.", "Only players connected to the room are listed."],
  loadProfile: ["Cargar perfil…", "Load profile…"],
  loadProfileTitle: ["Cargar un perfil guardado", "Load a saved profile"],
  groupRoom: ["Sala", "Room"],
  groupCampaign: ["Campaña", "Campaign"],
  saveAsProfile: ["💾 Guardar como perfil", "💾 Save as profile"],
  saveAsProfileTitle: ["Guardar esta hoja como el perfil", "Save this sheet as the profile"],
  sharedAll: ["Visible para todos", "Visible to everyone"],
  sharedAllTitle: [
    "Si está activo, TODOS los jugadores ven CA, PG y la hoja, y pueden tirar por ella",
    "If on, ALL players see AC, HP and the sheet, and can roll for it",
  ],
  check: ["Prueba de", "Check:"],
  hpCur: ["PG", "HP"],
  maxHp: ["PG máx.", "Max HP"],
  tempHp: ["PG temp.", "Temp HP"],
  manaCur: ["Maná", "Mana"],
  prof: ["Competencia", "Proficiency"],
  initBonus: ["Bono inic.", "Init bonus"],
  total: ["total", "total"],
  passivePerc: ["Perc. pasiva", "Passive Perc."],
  saves: ["Salvaciones", "Saving throws"],
  save: ["Salv.", "Save:"],
  skills: ["Habilidades", "Skills"],
  conditions: ["Estados", "Conditions"],
  buffs: ["Buffs y debuffs", "Buffs & debuffs"],
  condSearch: ["Buscar estado…", "Search conditions…"],
  remove: ["Quitar", "Remove"],
  saveShort: ["Salv", "Save"],
  spells: ["Conjuros", "Spells"],
  spellsEmpty: ["Sin conjuros. Búscalos abajo en el SRD y agrégalos con ➕.", "No spells yet. Search the SRD below and add them with ➕."],
  spellSearch: ["Buscar conjuro en el SRD…", "Search SRD spells…"],
  spellNone: ["Nada con ese nombre en el SRD.", "Nothing by that name in the SRD."],
  addSpell: ["Agregar a la hoja", "Add to sheet"],
  cast: ["Lanzar", "Cast"],
  notEnoughMana: ["No alcanza el maná", "Not enough mana"],
  upcast: ["Lanzar a nivel superior", "Cast at a higher level"],
  actions: ["Acciones", "Actions"],
  attack: ["Ataque", "Attack"],
  damage: ["Daño", "Damage"],
  hiddenOn: ["Tiradas ocultas: solo tú las ves. Clic para volver a tiradas públicas", "Hidden rolls: only you see them. Click for public rolls"],
  hiddenOff: ["Tirar oculto (solo lo ves tú)", "Roll hidden (only you see it)"],
  whisperOn: ["Susurro: solo tú y el DM ven tus tiradas. Clic para volver a tiradas públicas", "Whisper: only you and the DM see your rolls. Click for public rolls"],
  whisperOff: ["Susurrar al DM (solo tú y el DM ven la tirada)", "Whisper to DM (only you and the DM see the roll)"],
  repeatCost: ["Repetir +1 MP", "Repeat +1 MP"],
  repeatCostTitle: [
    "Regla opcional: cada vez que se repite un conjuro en el mismo combate cuesta 1 maná más",
    "Optional rule: each repeat of a spell in the same combat costs 1 more mana",
  ],
  barsOn: ["Barras de HP/AC sobre las fichas: activadas", "HP/AC bars over tokens: on"],
  barsOff: ["Barras de HP/AC sobre las fichas: apagadas", "HP/AC bars over tokens: off"],
  markersHint: [
    "Son los marcadores de la extensión Condition Markers: aparecen sobre la ficha y en su menú, y lo que marques allá se ve aquí.",
    "These are the Condition Markers extension's markers: they show on the token and in its menu, and whatever you set there shows here.",
  ],
  notes: ["Notas", "Notes"],
  notesPlaceholder: [
    "Resistencias, rasgos, lo que quieras tener a la mano…",
    "Resistances, traits, anything you want at hand…",
  ],
  profNone: ["Sin competencia", "Not proficient"],
  profYes: ["Competente", "Proficient"],
  profExp: ["Pericia", "Expertise"],
  resonance: ["Resonancia", "Resonance"],
  resShort: ["RES", "RES"],
  mana: ["MN", "MP"],
  manaTitle: ["Maná: escribe un número, o +5 / -3", "Mana: type a number, or +5 / -3"],
  maxMana: ["Maná máx.", "Max mana"],
  // recursos y descansos
  resource: ["Recurso", "Resource"],
  addResource: [
    "Agregar un recurso contable: forma salvaje, puntos de hechicería, inspiración, usos por descanso…",
    "Add a countable resource: wild shape, sorcery points, inspiration, uses per rest…",
  ],
  resourceName: ["Nombre", "Name"],
  resourceMax: ["Usos máximos", "Max uses"],
  resetTitle: ["Cuándo se recupera", "When it recovers"],
  resetShort: ["Descanso corto", "Short rest"],
  resetLong: ["Descanso largo", "Long rest"],
  spend: ["Clic para gastar o recuperar", "Click to spend or recover"],
  edit: ["Editar", "Edit"],
  ok: ["OK", "OK"],
  shortRest: ["Descanso corto", "Short rest"],
  longRest: ["Descanso largo", "Long rest"],
  shortRestTitle: [
    "Descanso corto: recupera los recursos marcados ☕. Los PG se curan a mano (dados de golpe)",
    "Short rest: recovers the resources marked ☕. HP is healed by hand (hit dice)",
  ],
  longRestTitle: [
    "Descanso largo: PG, maná y todos los recursos al máximo; PG temporales a 0",
    "Long rest: HP, mana and every resource to max; temp HP to 0",
  ],
  shortRestAll: ["Descanso corto para toda la lista", "Short rest for everyone on the list"],
  longRestAll: ["Descanso largo para toda la lista: PG, maná y recursos al máximo", "Long rest for everyone on the list: HP, mana and resources to max"],
  shortRestAllDone: ["Descanso corto: toda la lista", "Short rest: everyone on the list"],
  longRestAllDone: ["Descanso largo: toda la lista", "Long rest: everyone on the list"],
  // tiradas
  rolls: ["Tiradas", "Rolls"],
  // perfiles
  profiles: ["Perfiles", "Profiles"],
  tabCampaign: ["Campaña", "Campaign"],
  tabSrd: ["SRD", "SRD"],
  tabRoom: ["Sala", "Room"],
  tabExcel: ["Excel", "Excel"],
  campaignHelp: [
    "Las criaturas con statblock del vault. Si agregas al combate una ficha con el mismo nombre, la hoja se llena sola. ➕ la copia a la sala para editarla.",
    "Creatures with a statblock in the vault. Adding a token with the same name fills its sheet. ➕ copies it to the room so you can edit it.",
  ],
  searchCatalog: ["Buscar: nombre, CR, nota de origen…", "Search: name, CR, source note…"],
  srdHelp: [
    "Monstruos estándar de D&D 5e (SRD, vía Open5e). Los nombres están en inglés. ➕ guarda el monstruo en la sala; luego puedes cambiarle el nombre en la hoja.",
    "Standard D&D 5e monsters (SRD, via Open5e). ➕ saves the monster to the room; you can rename it from the sheet.",
  ],
  search: ["Buscar", "Search"],
  srdEmpty: [
    "Nada en el SRD con ese nombre (está en inglés: goblin, wolf, ogre…).",
    "Nothing in the SRD with that name.",
  ],
  srdError: ["No se pudo consultar Open5e", "Could not reach Open5e"],
  roomHelp: ["Perfiles guardados en esta sala", "Profiles saved in this room"],
  roomHelp2: ["Son los editables; los del catálogo se usan tal cual.", "These are editable; catalog ones are used as they are."],
  roomEmpty: ["Todavía no hay ninguno.", "None yet."],
  delete: ["Borrar", "Delete"],
  fileBtn: ["📂 Archivo CSV o JSON", "📂 CSV or JSON file"],
  templateBtn: ["⬇ Plantilla CSV", "⬇ CSV template"],
  pastePlaceholder: [
    "…o pega aquí las celdas copiadas desde Excel (con la fila de encabezados).",
    "…or paste here the cells copied from Excel (with the header row).",
  ],
  importPasted: ["Importar lo pegado", "Import pasted"],
  importHelp: [
    "Columnas (en inglés o español): Name, STR, DEX, CON, INT, WIS, CHA, Resonance, AC, HP, Mana, Proficiency, InitBonus, Saves, Skills, Notes. Puntuaciones como número (14, no +2). Salvaciones: STR, WIS, RES. Habilidades por coma, * = pericia: Perception, Stealth*.",
    "Columns (English or Spanish): Name, STR, DEX, CON, INT, WIS, CHA, Resonance, AC, HP, Mana, Proficiency, InitBonus, Saves, Skills, Notes. Scores as numbers (14, not +2). Saves: STR, WIS, RES. Skills comma-separated, * = expertise: Perception, Stealth*.",
  ],
  inRoom: ["Ya está en la sala", "Already in the room"],
  copyToRoom: ["Guardar en la sala para poder editarlo", "Save to the room so you can edit it"],
  savedToRoom: ["guardado en la sala.", "saved to the room."],
  imported: ["Importados", "Imported"],
  profilesWord: ["perfil(es).", "profile(s)."],
  noneFound: ["No encontré ningún personaje.", "No characters found."],
  tooBig: ["No cabe en la sala", "Doesn't fit in the room"],
  tooBigHint: ["Borra perfiles o acorta notas.", "Delete profiles or shorten notes."],
  limit: ["tope", "limit"],
} as const satisfies Record<string, readonly [string, string]>;

export type Key = keyof typeof D;

export const tr = (lang: Lang, key: Key) => D[key][lang === "es" ? 0 : 1];

export const ABILITY_SHORT: Record<Lang, Record<Ability, string>> = {
  es: { str: "FUE", dex: "DES", con: "CON", int: "INT", wis: "SAB", cha: "CAR" },
  en: { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" },
};
export const ABILITY_LONG: Record<Lang, Record<Ability, string>> = {
  es: { str: "Fuerza", dex: "Destreza", con: "Constitución", int: "Inteligencia", wis: "Sabiduría", cha: "Carisma" },
  en: { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" },
};

export const LangContext = createContext<Lang>("en");

/** Devuelve `t(key)` y el idioma activo */
export function useT() {
  const lang = useContext(LangContext);
  return { lang, t: (key: Key) => tr(lang, key) };
}

export const LANG_PREF = "combat-tracker.lang";
/** Inglés por defecto; español si el jugador lo eligió */
export function readLangPref(): Lang {
  try {
    return localStorage.getItem(LANG_PREF) === "es" ? "es" : "en";
  } catch {
    return "en";
  }
}
export function writeLangPref(lang: Lang) {
  try {
    localStorage.setItem(LANG_PREF, lang);
  } catch {
    /* sin almacenamiento */
  }
}
