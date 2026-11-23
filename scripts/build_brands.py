"""Construit brands.json : identifiant de station (prix-carburants) -> enseigne (Total, E.Leclerc, Carrefour...).

Sources :
  - liste officielle des stations (data.economie.gouv.fr, flux instantané v2)
  - OpenStreetMap (Overpass) : tag ref:FR:prix-carburants, sinon station OSM la plus proche (< 300 m)
"""
import json, math, time, urllib.parse, urllib.request

UA = {"User-Agent": "essence-app (github.com/themikolsen-lgtm/Essence)"}
GOV = ("https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/"
       "prix-des-carburants-en-france-flux-instantane-v2/exports/json?select=id,geom,ville")
OVERPASS = ["https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
QUERY = ('[out:json][timeout:300];area["ISO3166-1"="FR"][admin_level=2]->.fr;'
         'nwr["amenity"="fuel"](area.fr);out center tags;')

# Noms d'enseigne harmonisés
ALIASES = {
    "leclerc": "E.Leclerc", "e.leclerc": "E.Leclerc", "e. leclerc": "E.Leclerc",
    "total": "TotalEnergies", "total access": "TotalEnergies Access", "totalenergies": "TotalEnergies",
    "totalenergies access": "TotalEnergies Access", "elf": "Elf", "esso": "Esso", "esso express": "Esso Express",
    "bp": "BP", "shell": "Shell", "avia": "Avia", "agip": "Agip", "eni": "Eni", "dyneff": "Dyneff",
    "intermarche": "Intermarché", "intermarché": "Intermarché", "carrefour": "Carrefour",
    "carrefour market": "Carrefour Market", "carrefour contact": "Carrefour Contact", "carrefour express": "Carrefour Express",
    "super u": "Super U", "hyper u": "Hyper U", "u express": "U Express", "système u": "Système U", "systeme u": "Système U",
    "auchan": "Auchan", "casino": "Casino", "géant casino": "Géant Casino", "netto": "Netto", "cora": "Cora",
    "leader price": "Leader Price", "simply market": "Simply Market", "spar": "Spar", "vito": "Vito",
}

def get(url, data=None, timeout=300):
    req = urllib.request.Request(url, data=data, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

def clean(tags):
    n = (tags.get("brand") or tags.get("name") or tags.get("operator") or "").strip()
    for p in ("station-service ", "station service ", "station ", "relais "):
        if n.lower().startswith(p):
            n = n[len(p):].strip()
    return ALIASES.get(n.lower(), n)

def dist_km(a, b):
    r = math.radians
    h = math.sin(r(b[0]-a[0])/2)**2 + math.cos(r(a[0]))*math.cos(r(b[0]))*math.sin(r(b[1]-a[1])/2)**2
    return 12742 * math.asin(math.sqrt(h))

def main():
    stations = get(GOV)
    print("stations officielles :", len(stations))

    osm = None
    for url in OVERPASS:
        for attempt in range(2):
            try:
                osm = get(url, data=urllib.parse.urlencode({"data": QUERY}).encode())["elements"]
                break
            except Exception as e:
                print("overpass", url, "échec :", e); time.sleep(20)
        if osm: break
    if not osm:
        raise SystemExit("Overpass indisponible")
    print("stations OSM :", len(osm))

    by_ref, grid = {}, {}
    for e in osm:
        tags = e.get("tags", {})
        name = clean(tags)
        if not name: continue
        lat = e.get("lat") or e.get("center", {}).get("lat")
        lon = e.get("lon") or e.get("center", {}).get("lon")
        ref = tags.get("ref:FR:prix-carburants")
        if ref:
            for r in ref.split(";"): by_ref[r.strip()] = name
        if lat is not None:
            grid.setdefault((round(lat, 2), round(lon, 2)), []).append((lat, lon, name))

    brands, via_ref, via_geo = {}, 0, 0
    for s in stations:
        sid = str(s.get("id"))
        if sid in by_ref:
            brands[sid] = by_ref[sid]; via_ref += 1; continue
        g = s.get("geom") or {}
        if g.get("lat") is None: continue
        p = (g["lat"], g["lon"]); best, bd = None, 0.3
        ky, kx = round(p[0], 2), round(p[1], 2)
        for dy in (-0.01, 0, 0.01):
            for dx in (-0.01, 0, 0.01):
                for (la, lo, nm) in grid.get((round(ky+dy, 2), round(kx+dx, 2)), []):
                    d = dist_km(p, (la, lo))
                    if d < bd: bd, best = d, nm
        if best:
            brands[sid] = best; via_geo += 1

    print(f"enseignes trouvées : {len(brands)} / {len(stations)} (ref {via_ref}, proximité {via_geo})")
    with open("brands.json", "w", encoding="utf-8") as f:
        json.dump(brands, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)

if __name__ == "__main__":
    main()
