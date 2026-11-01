"""Extrae los statblocks (Fantasy Statblocks) del vault y genera public/catalogo.json para la extensión.

Campos extra que entiende, además de los de Fantasy Statblocks (para PJ y aliados):
  level: 3            → bono de competencia por nivel; se muestra "lvl 3" en vez de CR
  mana: 12            → maná máximo        resonance: 3 / res_save: true → Resonancia y su salvación
  spells: [nombres]   → conjuros resueltos contra Open5e (SRD 5.2 de 2024 primero, luego 5.1) y guardados en scripts/spells-cache.json
"""
import io, sys, os, re, json, unicodedata, urllib.request, urllib.parse
import yaml
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VA = r"C:\Users\Rodol\OneDrive\Documents\El Juicio del Tejido"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "public", "catalogo.json")
SPELL_CACHE = os.path.join(HERE, "spells-cache.json")

# Conjuros que no están en Open5e (ni 5.1 ni 5.2): texto propio, resumido con nuestras palabras
LOCAL_SPELLS = {
    "blade ward": {"name": "Blade Ward", "slug": "local:blade-ward", "level": 0, "school": "Abjuration", "time": "1 action", "range": "Self",
                   "duration": "Concentration, up to 1 minute", "components": "V, S", "concentration": True, "ritual": False,
                   "desc": "You ward yourself. While the ward lasts, any creature that makes an attack roll against you subtracts 1d4 from the roll."},
    "friends": {"name": "Friends", "slug": "local:friends", "level": 0, "school": "Enchantment", "time": "1 action", "range": "Self",
                "duration": "Concentration, up to 1 minute", "components": "S, M (a bit of makeup)", "concentration": True, "ritual": False,
                "desc": "Pick one creature that isn't hostile to you. For the duration you have advantage on every Charisma check aimed at it. When the spell ends it realizes you used magic on its mood and turns hostile; what it does about it depends on its nature."},
}

def _get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "catalogo.py"}), timeout=25) as r:
        return json.load(r)

def _short(s, n):
    d = re.sub(r"\s+", " ", str(s or "")).strip()
    return d if len(d) <= n else d[:n - 1].rstrip() + "…"

def _from_v2(s):
    comps = ", ".join(c for c, on in (("V", s.get("verbal")), ("S", s.get("somatic")), ("M", s.get("material"))) if on)
    if s.get("material_specified"): comps += f" ({_short(s['material_specified'], 60)})"
    school = s.get("school"); school = school.get("name", "") if isinstance(school, dict) else str(school or "")
    return {"name": s["name"], "slug": f"v2:{s['key']}", "level": int(s.get("level") or 0), "school": school, "time": s.get("casting_time", ""),
            "range": s.get("range_text", ""), "duration": s.get("duration", ""), "components": comps,
            "concentration": bool(s.get("concentration")), "ritual": bool(s.get("ritual")), "desc": _short(s.get("desc"), 280)}

def _from_v1(s):
    comps = s.get("components", "") + (f" ({_short(s['material'], 60)})" if s.get("material") else "")
    return {"name": s["name"], "slug": s["slug"], "level": int(s.get("level_int") or 0), "school": s.get("school", ""), "time": s.get("casting_time", ""),
            "range": s.get("range", ""), "duration": s.get("duration", ""), "components": comps,
            "concentration": s.get("concentration") == "yes", "ritual": s.get("ritual") == "yes", "desc": _short(s.get("desc"), 280)}

_cache = json.load(open(SPELL_CACHE, encoding="utf-8")) if os.path.exists(SPELL_CACHE) else {}
_cache_dirty = False

def resolve_spell(name):
    """Mismo formato que src/spells.ts (toSpell): lo justo para la lista y el hover; la tarjeta completa se trae al lanzar."""
    global _cache_dirty
    key = norm(name)
    if key in _cache: return _cache[key]
    if key in LOCAL_SPELLS: return LOCAL_SPELLS[key]
    found = None
    try:
        q = urllib.parse.quote(name)
        for s in _get(f"https://api.open5e.com/v2/spells/?name__icontains={q}&document__key=srd-2024&limit=20").get("results", []):
            if norm(s["name"]) == key: found = _from_v2(s); break
        if not found:
            for s in _get(f"https://api.open5e.com/v1/spells/?search={q}&document__slug=wotc-srd&limit=20").get("results", []):
                if norm(s["name"]) == key: found = _from_v1(s); break
    except Exception as e:
        print(f"Open5e no respondió para «{name}»: {str(e)[:60]}")
        return None
    if found:
        _cache[key] = found; _cache_dirty = True
    else:
        print(f"Conjuro no encontrado en Open5e: «{name}»")
    return found

def spell_names(raw):
    """spells: ['Fire Bolt', 'Cantrips: Light, Guidance', {'Level 1': 'Bless, Sleep'}] → nombres sueltos"""
    out = []
    for it in raw or []:
        vals = list(it.values()) if isinstance(it, dict) else [it]
        for v in vals:
            s = str(v)
            if ":" in s and not re.match(r"^\s*[\w' -]+:\s*$", s): s = s.split(":", 1)[1]
            out += [x.strip() for x in s.split(",") if x.strip()]
    return out

ABIL = ["str", "dex", "con", "int", "wis", "cha"]
SAVE_NAMES = {
    "strength": "str", "fuerza": "str", "str": "str", "fue": "str",
    "dexterity": "dex", "destreza": "dex", "dex": "dex", "des": "dex",
    "constitution": "con", "constitucion": "con", "con": "con",
    "intelligence": "int", "inteligencia": "int", "int": "int",
    "wisdom": "wis", "sabiduria": "wis", "wis": "wis", "sab": "wis",
    "charisma": "cha", "carisma": "cha", "cha": "cha", "car": "cha",
}
# clave de la extensión: (etiquetas aceptadas, característica)
SKILLS = {
    "acrobatics": (["acrobacias", "acrobatics"], "dex"),
    "arcana": (["arcanos", "arcana"], "int"),
    "athletics": (["atletismo", "athletics"], "str"),
    "deception": (["engano", "deception"], "cha"),
    "history": (["historia", "history"], "int"),
    "insight": (["perspicacia", "insight"], "wis"),
    "intimidation": (["intimidacion", "intimidation"], "cha"),
    "performance": (["interpretacion", "performance"], "cha"),
    "investigation": (["investigacion", "investigation"], "int"),
    "sleight": (["juego de manos", "sleight of hand"], "dex"),
    "medicine": (["medicina", "medicine"], "wis"),
    "nature": (["naturaleza", "nature"], "int"),
    "perception": (["percepcion", "perception"], "wis"),
    "persuasion": (["persuasion"], "cha"),
    "religion": (["religion"], "int"),
    "stealth": (["sigilo", "stealth"], "dex"),
    "survival": (["supervivencia", "survival"], "wis"),
    "animal": (["trato con animales", "animal handling"], "wis"),
}

def norm(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s).strip()

def mod(score): return (score - 10) // 2

def prof_from_cr(cr):
    try:
        c = float(eval(str(cr))) if "/" in str(cr) else float(cr)
    except Exception:
        return 2
    return 2 if c < 5 else 3 if c < 9 else 4 if c < 13 else 5 if c < 17 else 6 if c < 21 else 7 if c < 25 else 8 if c < 29 else 9

def first_int(v, default):
    m = re.search(r"-?\d+", str(v)) if v is not None else None
    return int(m.group()) if m else default

def pairs(lst):
    """saves/skillsaves vienen como lista de dicts de un elemento, o un dict"""
    out = []
    if isinstance(lst, dict):
        lst = [{k: v} for k, v in lst.items()]
    for item in lst or []:
        if isinstance(item, dict):
            for k, v in item.items():
                out.append((str(k), v))
    return out

def short(desc, n=170):
    d = re.sub(r"\s+", " ", str(desc or "")).strip()
    return d if len(d) <= n else d[:n - 1].rstrip() + "…"

USES = re.compile(r"\((\d+)\s*/\s*([^)]+)\)", re.I)
RECHARGES = re.compile(r"\(recharges? after a ([^)]+)\)", re.I)

def resource_from_name(name, desc=""):
    """'Second Wind (1/Short Rest)' → recurso contable (mismas reglas que src/actions.ts). 'Recarga 5–6' no cuenta."""
    uses = USES.search(name); rech = RECHARGES.search(name)
    when = ((uses and uses.group(2)) or (rech and rech.group(1)) or "").lower()
    if not when: return None
    short_rest = re.search(r"corto|short|combate|combat|encuentro|encounter", when)
    long_rest = re.search(r"largo|long|sesi|session|d[ií]a|day|rest", when)
    if not short_rest and not long_rest: return None
    mx = int(uses.group(1)) if uses else 1
    clean = RECHARGES.sub("", USES.sub("", name)).strip()
    r = {"name": clean, "cur": mx, "max": mx, "reset": "short" if short_rest else "long"}
    if str(desc or "").strip(): r["note"] = short(desc, 300)
    return r

def convert(sb, src):
    name = str(sb.get("name", "")).strip()
    if not name: return None
    stats = sb.get("stats") or [10] * 6
    abilities = {a: first_int(stats[i] if i < len(stats) else 10, 10) for i, a in enumerate(ABIL)}
    cr = sb.get("cr", 0)
    level = first_int(sb.get("level"), 0)
    # PJ y aliados con nivel: competencia por nivel; criaturas: por CR
    prof = 2 + (level - 1) // 4 if level > 0 else prof_from_cr(cr)
    notes_bits = []
    mismatches = []

    save_prof = {}
    for k, v in pairs(sb.get("saves")):
        a = SAVE_NAMES.get(norm(k))
        if not a: continue
        bonus = first_int(v, 0)
        save_prof[a] = True
        if bonus != mod(abilities[a]) + prof:
            mismatches.append(f"salv. {a.upper()} +{bonus}")

    skill_prof = {}
    for k, v in pairs(sb.get("skillsaves")):
        nk = norm(k); key = None
        for sk, (labels, ab) in SKILLS.items():
            if nk in labels: key = sk; break
        if not key: continue
        bonus = first_int(v, 0)
        base = mod(abilities[SKILLS[key][1]])
        # elige el nivel (1 o 2) que más se acerque al bono escrito
        lvl = 1 if abs(base + prof - bonus) <= abs(base + 2 * prof - bonus) else 2
        skill_prof[key] = lvl
        if base + lvl * prof != bonus:
            mismatches.append(f"{k} +{bonus}")

    head = " · ".join(x for x in [
        f"lvl {level}" if level > 0 else (f"CR {cr}" if cr not in (None, "") else ""),
        f"{sb.get('size', '')} {sb.get('type', '')}".strip(),
        f"Vel. {sb.get('speed')}" if sb.get("speed") else "",
    ] if x)
    if head: notes_bits.append(head)
    # Rasgos de lectura: datos fijos (velocidad, sentidos, inmunidades) y pasivas / acciones adicionales / reacciones / legendarias.
    # Van estructurados a la hoja (panel Traits); las notas quedan para el encabezado y los avisos.
    traits = []
    for label, key in [("Speed", "speed"), ("Senses", "senses"), ("Resistances", "damage_resistances"), ("Immunities", "damage_immunities"), ("Vulnerabilities", "damage_vulnerabilities"), ("Condition immunities", "condition_immunities")]:
        if sb.get(key): traits.append({"name": label, "desc": re.sub(r"\s+", " ", str(sb[key])).strip(), "kind": "info"})
    for kind, key in [("trait", "traits"), ("bonus", "bonus_actions"), ("reaction", "reactions"), ("legendary", "legendary_actions")]:
        for it in (sb.get(key) or []):
            if not isinstance(it, dict) or not it.get("name"): continue
            traits.append({"name": str(it["name"]).strip(), "desc": short(it.get("desc"), 400), "kind": kind})
    if mismatches:
        notes_bits.append("Bonos de la nota que no cuadran con la fórmula: " + ", ".join(mismatches))

    # Acciones estructuradas: bono de ataque, daño y salvación sacados del texto (mismas reglas que src/actions.ts)
    actions = []
    for it in (sb.get("actions") or []):
        if not isinstance(it, dict): continue
        aname = str(it.get("name", "")).strip(); adesc = re.sub(r"\s+", " ", str(it.get("desc", ""))).strip()
        if not aname: continue
        a = {"name": aname, "desc": adesc if len(adesc) <= 220 else adesc[:219].rstrip() + "…"}
        th = re.search(r"\+\s*(\d+)\s*(?:al\s+(?:ataque|golpe)|to\s+hit)|(?:ataque|attack)\s*\+\s*(\d+)", adesc, re.I)
        if th: a["toHit"] = int(th.group(1) or th.group(2))
        # Suma los dados encadenados ("2d6+3 cortante más 1d6 fuerza"); se detiene en una alternativa (", o 1d10+3 a dos manos")
        dice = []; last = -1
        for m in re.finditer(r"\d+d\d+(?:\s*[+-]\s*\d+)?", adesc, re.I):
            if dice and re.search(r"\b(o|or|vers[aá]til|versatile)\b", adesc[last:m.start()], re.I): break
            dice.append(re.sub(r"\s", "", m.group())); last = m.end()
            if len(dice) == 3: break
        if dice: a["damage"] = " + ".join(dice)
        sv = re.search(r"(?:salvaci[oó]n\s+de\s+)?([A-Za-zÁÉÍÓÚáéíóú]+)\s+(?:CD|DC)\s*(\d+)|(?:CD|DC)\s*(\d+)\s+([A-Za-zÁÉÍÓÚáéíóú]+)|(?:CD|DC)\s*(\d+)", adesc, re.I)
        if sv:
            ability = sv.group(1) or sv.group(4); dc = sv.group(2) or sv.group(3) or sv.group(5)
            a["save"] = f"{ability} DC {dc}" if ability and ability.lower() not in ("o", "or", "de", "the") else f"DC {dc}"
        actions.append(a)

    # Rasgos y acciones con usos contados ("(1/Descanso corto)", "(1/Sesión)") → recursos de la hoja
    resources = []
    for key in ("traits", "actions", "bonus_actions", "reactions"):
        for it in (sb.get(key) or []):
            if not isinstance(it, dict): continue
            r = resource_from_name(str(it.get("name", "")), it.get("desc", ""))
            if r: resources.append(r)

    out = {
        "name": name,
        "source": src,
        "cr": str(cr) if level == 0 else "",
        "actions": actions,
        "resources": resources,
        "traits": traits,
        "abilities": abilities,
        "ac": first_int(sb.get("ac"), 10),
        "maxHp": first_int(sb.get("hp"), 10),
        "prof": prof,
        "initBonus": 0,
        "saveProf": save_prof,
        "skillProf": skill_prof,
        "notes": "\n".join(notes_bits)[:1500],
    }
    if level > 0: out["level"] = level
    if sb.get("mana") is not None: out["maxMana"] = first_int(sb.get("mana"), 0)
    if sb.get("resonance") is not None:
        out["resonance"] = first_int(sb.get("resonance"), 10)
        out["resSaveProf"] = bool(sb.get("res_save"))
    # Solo los bloques con nivel (PJ y aliados) traen listas de conjuros resolubles; en los mobs `spells` suele ser prosa
    if sb.get("spells") and level > 0:
        spells = [sp for sp in (resolve_spell(n) for n in spell_names(sb["spells"])) if sp]
        spells.sort(key=lambda sp: (sp["level"], norm(sp["name"])))
        out["spells"] = spells
    return out

found = {}
order = []
for dp, dn, fn in os.walk(VA):
    if ".obsidian" in dp or os.sep + "GM" + os.sep + "Archive" in dp: continue
    for f in fn:
        if not f.endswith(".md") or f.startswith("(V)"): continue
        path = os.path.join(dp, f)
        text = open(path, encoding="utf-8").read()
        for block in re.findall(r"^```statblock\s*\n(.*?)^```", text, re.M | re.S):
            try:
                sb = yaml.safe_load(block)
            except Exception as e:
                print(f"YAML roto en {f}: {str(e)[:80]}"); continue
            if not isinstance(sb, dict): continue
            p = convert(sb, f[:-3])
            if not p: continue
            key = norm(p["name"])
            prefer = any(os.sep + d + os.sep in path for d in ("Creatures", "NPCs", "Players", "Deities"))
            if key not in found or (prefer and not found[key]["_pref"]):
                p["_pref"] = prefer
                found[key] = p
                if key not in order: order.append(key)

cat = []
for k in order:
    p = found[k]; p.pop("_pref")
    cat.append(p)
cat.sort(key=lambda p: norm(p["name"]))
json.dump(cat, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
if _cache_dirty:
    json.dump(_cache, open(SPELL_CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(cat)} criaturas → {OUT} ({os.path.getsize(OUT)} bytes)\n")
print(f"{'Nombre':38} {'CR':>5} {'CA':>3} {'PG':>4} {'Pf':>2}  salv            hab                         fuente")
for p in cat:
    tag = f"lvl{p['level']}" if p.get("level") else p["cr"]
    print(f"{p['name'][:38]:38} {tag:>5} {p['ac']:>3} {p['maxHp']:>4} {p['prof']:>2}  {','.join(p['saveProf']):15} {','.join(f'{k}{v}' for k,v in p['skillProf'].items())[:27]:27} {p['source'][:30]}")
