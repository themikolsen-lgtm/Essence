"""Construit irve/*.json : bornes de recharge publiques (base nationale IRVE consolidée, data.gouv.fr),
regroupées par station et découpées en tuiles de 0,5° pour un chargement rapide dans l'application.

Champs par station :
  n nom, o enseigne/opérateur, a adresse, la/lo coordonnées, p puissance max (kW),
  k prises ("2" Type 2, "C" Combo CCS, "D" CHAdeMO, "E" domestique), q nombre de points de charge,
  g gratuit (1/0), t tarification (texte), h horaires
"""
import csv, io, json, math, os, re, sys, urllib.request
from collections import defaultdict

UA = {"User-Agent": "essence-app (github.com/themikolsen-lgtm/Essence)"}
DATASETS = ["fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques", "5448d3e0c751df01f85d0572"]
log = open("irve_log.txt", "w", encoding="utf-8")

def say(*a):
    print(*a); print(*a, file=log); log.flush()

def get(url, timeout=300):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()

def find_csv():
    for ds in DATASETS:
        try:
            meta = json.loads(get(f"https://www.data.gouv.fr/api/1/datasets/{ds}/"))
        except Exception as e:
            say("métadonnées", ds, "échec :", e); continue
        res = [r for r in meta.get("resources", []) if (r.get("format") or "").lower() == "csv"]
        say("ressources CSV :", [r.get("title") for r in res][:10])
        # la consolidation la plus récente (jamais la documentation)
        res = [r for r in res if "documentation" not in (r.get("title") or "").lower()]
        cand = [r for r in res if "dernière version" in (r.get("title") or "").lower()] or \
               [r for r in res if "consolidation" in (r.get("title") or "").lower()] or res
        cand.sort(key=lambda r: r.get("last_modified") or "", reverse=True)
        if cand:
            say("fichier retenu :", cand[0].get("title"), cand[0].get("url"))
            return cand[0]["url"]
    raise SystemExit("jeu de données IRVE introuvable")

def fnum(v):
    try: return float(str(v).replace(",", "."))
    except: return None

def truthy(v):
    return str(v).strip().lower() in ("true", "1", "vrai", "oui", "yes")

def main():
    raw = get(find_csv(), timeout=600).decode("utf-8-sig", errors="replace")
    rows = csv.DictReader(io.StringIO(raw))
    say("colonnes :", rows.fieldnames)
    st = {}
    n = 0
    for r in rows:
        n += 1
        lat = fnum(r.get("consolidated_latitude")); lon = fnum(r.get("consolidated_longitude"))
        if lat is None or lon is None:
            m = re.findall(r"-?\d+(?:\.\d+)?", r.get("coordonneesXY") or "")
            if len(m) >= 2: lon, lat = float(m[0]), float(m[1])
        if lat is None or not (-90 < lat < 90) or not (-180 < lon < 180): continue
        key = (r.get("id_station_itinerance") or "").strip() or f"{round(lat,5)},{round(lon,5)}"
        s = st.get(key)
        if not s:
            o = (r.get("nom_enseigne") or "").strip() or (r.get("nom_operateur") or "").strip() or (r.get("nom_amenageur") or "").strip()
            s = st[key] = {"n": (r.get("nom_station") or "").strip()[:80], "o": o[:60],
                           "a": ((r.get("adresse_station") or "").strip())[:120],
                           "la": round(lat, 5), "lo": round(lon, 5), "p": 0, "k": set(), "q": 0,
                           "g": 1 if truthy(r.get("gratuit")) else 0,
                           "t": (r.get("tarification") or "").strip()[:160], "h": (r.get("horaires") or "").strip()[:60]}
        p = fnum(r.get("puissance_nominale")) or 0
        if p > 1000: p = p / 1000  # certains déclarent en W
        s["p"] = max(s["p"], round(p, 1)); s["q"] += 1
        if truthy(r.get("prise_type_2")): s["k"].add("2")
        if truthy(r.get("prise_type_combo_ccs")): s["k"].add("C")
        if truthy(r.get("prise_type_chademo")): s["k"].add("D")
        if truthy(r.get("prise_type_ef")): s["k"].add("E")
        if not s["t"] and r.get("tarification"): s["t"] = r["tarification"].strip()[:160]
    say("lignes :", n, "stations :", len(st))

    tiles = defaultdict(list)
    for s in st.values():
        s["k"] = "".join(sorted(s["k"]))
        tiles[f"{math.floor(s['la']*2)}_{math.floor(s['lo']*2)}"].append(s)
    os.makedirs("irve", exist_ok=True)
    for f in os.listdir("irve"): os.remove(os.path.join("irve", f))
    for k, lst in tiles.items():
        with open(f"irve/{k}.json", "w", encoding="utf-8") as f:
            json.dump(lst, f, ensure_ascii=False, separators=(",", ":"))
    with open("irve/index.json", "w") as f:
        json.dump(sorted(tiles), f, separators=(",", ":"))
    say("tuiles :", len(tiles))

if __name__ == "__main__":
    try: main()
    except SystemExit: raise
    except Exception as e:
        say("ERREUR :", repr(e)); raise
