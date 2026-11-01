"""Extrae los statblocks (Fantasy Statblocks) del vault y genera public/catalogo.json para la extensión."""
import io, sys, os, re, json, unicodedata
import yaml
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VA = r"C:\Users\Rodol\OneDrive\Documents\El Juicio del Tejido"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "catalogo.json")

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

def resource_from_name(name):
    """'Tomar Aliento (1/Descanso corto)' → recurso contable (mismas reglas que src/actions.ts). 'Recarga 5–6' no cuenta."""
    uses = USES.search(name); rech = RECHARGES.search(name)
    when = ((uses and uses.group(2)) or (rech and rech.group(1)) or "").lower()
    if not when: return None
    short_rest = re.search(r"corto|short|combate|combat|encuentro|encounter", when)
    long_rest = re.search(r"largo|long|sesi|session|d[ií]a|day|rest", when)
    if not short_rest and not long_rest: return None
    mx = int(uses.group(1)) if uses else 1
    clean = RECHARGES.sub("", USES.sub("", name)).strip()
    return {"name": clean, "cur": mx, "max": mx, "reset": "short" if short_rest else "long"}

def convert(sb, src):
    name = str(sb.get("name", "")).strip()
    if not name: return None
    stats = sb.get("stats") or [10] * 6
    abilities = {a: first_int(stats[i] if i < len(stats) else 10, 10) for i, a in enumerate(ABIL)}
    cr = sb.get("cr", 0)
    prof = prof_from_cr(cr)
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
        f"CR {cr}" if cr not in (None, "") else "",
        f"{sb.get('size', '')} {sb.get('type', '')}".strip(),
        f"Vel. {sb.get('speed')}" if sb.get("speed") else "",
    ] if x)
    if head: notes_bits.append(head)
    for label, key in [("Resist.", "damage_resistances"), ("Inmune", "damage_immunities"), ("Vulnerable", "damage_vulnerabilities"), ("Inmune a", "condition_immunities"), ("Sentidos", "senses")]:
        if sb.get(key): notes_bits.append(f"{label}: {sb[key]}")
    for label, key in [("Rasgos", "traits"), ("Acciones", "actions"), ("Acción adicional", "bonus_actions"), ("Reacciones", "reactions"), ("Legendarias", "legendary_actions")]:
        items = sb.get(key) or []
        if isinstance(items, list) and items:
            lines = [f"• {it.get('name', '')}: {short(it.get('desc'))}" for it in items if isinstance(it, dict)]
            if lines: notes_bits.append(f"{label}:\n" + "\n".join(lines))
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
            r = resource_from_name(str(it.get("name", "")))
            if r: resources.append(r)

    return {
        "name": name,
        "source": src,
        "cr": str(cr),
        "actions": actions,
        "resources": resources,
        "abilities": abilities,
        "ac": first_int(sb.get("ac"), 10),
        "maxHp": first_int(sb.get("hp"), 10),
        "prof": prof,
        "initBonus": 0,
        "saveProf": save_prof,
        "skillProf": skill_prof,
        "notes": "\n".join(notes_bits)[:1500],
    }

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
            prefer = os.sep + "Creatures" + os.sep in path or os.sep + "NPCs" + os.sep in path
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
print(f"{len(cat)} criaturas → {OUT} ({os.path.getsize(OUT)} bytes)\n")
print(f"{'Nombre':38} {'CR':>4} {'CA':>3} {'PG':>4} {'Pf':>2}  salv            hab                         fuente")
for p in cat:
    print(f"{p['name'][:38]:38} {p['cr']:>4} {p['ac']:>3} {p['maxHp']:>4} {p['prof']:>2}  {','.join(p['saveProf']):15} {','.join(f'{k}{v}' for k,v in p['skillProf'].items())[:27]:27} {p['source'][:30]}")
