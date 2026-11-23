{
const FUELS = {gazole:"Gazole",e10:"SP95-E10",sp95:"SP95",sp98:"SP98",e85:"E85 (bioéthanol)",gplc:"GPL"};
const FUEL_NAME = {e:"Essence",d:"Diesel",h:"Hybride essence",g:"GPL / essence",x:"Électrique"};
const FUEL_KEYS = {e:["e10","sp95","sp98","e85"],h:["e10","sp95","sp98"],d:["gazole"],g:["gplc","e10","sp95","sp98"],x:[]};
const API = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records";
const $ = id => document.getElementById(id);
const store = {get(k){try{return JSON.parse(localStorage.getItem("essence_"+k))}catch(e){return null}},set(k,v){try{localStorage.setItem("essence_"+k,JSON.stringify(v))}catch(e){}}};
const fmt = (n,d=2) => n.toLocaleString("fr-FR",{minimumFractionDigits:d,maximumFractionDigits:d});
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[-_/+(),]/g," ").replace(/\s+/g," ").trim();
const ROMAN = {i:"1",ii:"2",iii:"3",iv:"4",v:"5",vi:"6",vii:"7",viii:"8"};
let origin = null, map = null, layer = null, car = null;
const BRANDS = fetch("brands.json?d="+new Date().toISOString().slice(0,10)).then(r=>r.ok?r.json():{}).catch(()=>({}));

// ---------- recherche de voiture ----------
const ENTRIES = [];
(window.CAR_DB||[]).forEach(([brand,model,gen,y1,y2,alias,engines])=>{
  const genNums = gen.split("/").map(g=>ROMAN[g.toLowerCase()]||"").join(" ");
  engines.forEach(([eng,fuel,conso])=>{
    const words = norm(`${brand} ${model} ${gen} ${genNums} ${alias} ${eng} ${FUEL_NAME[fuel]} ${fuel==="d"?"diesel gazole":""}`).split(" ");
    ENTRIES.push({brand,model,gen,y1,y2,eng,fuel,conso,words,modelWords:norm(`${brand} ${model} ${alias}`).split(" ")});
  });
});
function searchCars(q){
  const toks = norm(q).split(" ").filter(Boolean);
  if(!toks.length) return [];
  let year = null;
  const terms = toks.filter(t=>{ if(/^(19|20)\d\d$/.test(t)){ year=+t; return false; } return true; })
    .map(t=>ROMAN[t]&&t.length>1?ROMAN[t]:t);
  const res = [];
  for(const e of ENTRIES){
    let score=0, modelHit=false, miss=0;
    for(const t of terms){
      const exact = e.words.includes(t);
      const pref = !exact && t.length>=2 && e.words.some(w=>w.startsWith(t));
      const inside = !exact && !pref && t.length>=3 && e.words.some(w=>w.includes(t));
      if(exact) score+=3; else if(pref) score+=2; else if(inside) score+=1; else miss++;
      if((exact||pref) && e.modelWords.some(w=>w===t||w.startsWith(t))) modelHit=true;
    }
    if(!modelHit) continue;
    score -= miss*1.5;
    if(year){ if(year>=e.y1 && year<=e.y2) score+=3; else score-=4; }
    res.push({e,score});
  }
  res.sort((a,b)=>b.score-a.score);
  return res.slice(0,5).map(r=>r.e);
}
const carLabel = e => `${e.brand} ${e.model}${e.gen?" "+e.gen:""} · ${e.eng}`;
function renderHits(){
  const list = searchCars($("carq").value);
  $("carHits").innerHTML = list.map((e,i)=>`<button type="button" data-i="${ENTRIES.indexOf(e)}">${i===0?"<b>":""}${esc(carLabel(e))}${i===0?"</b>":""} <span class="muted">(${e.y1}–${e.y2} · ${FUEL_NAME[e.fuel]} · ${e.fuel==="x"?"électrique":fmt(e.conso,1)+" L/100"})</span></button>`).join("")
    || ($("carq").value.trim().length>=2 ? `<p class="muted">Aucune voiture trouvée. Essayez avec moins de mots (ex. « clio dci »), ou saisissez la consommation à la main ci-dessous.</p>` : "");
  if(list[0]) selectCar(list[0], false);
}
function selectCar(e, closeList=true){
  car = e;
  $("carCard").style.display="block";
  if(e.fuel==="x"){
    $("carCard").innerHTML = `<div class="nm">${esc(e.brand)} ${esc(e.model)} ${esc(e.gen)} – ${esc(e.eng)}</div><div class="cs">Électrique</div><div class="muted">Pas besoin d'essence ! Choisissez une autre voiture.</div>`;
    fillFuels(Object.keys(FUELS)); $("conso").value=""; return;
  }
  $("carCard").innerHTML = `<div class="muted">Votre voiture</div><div class="nm">${esc(e.brand)} ${esc(e.model)} ${esc(e.gen)} – ${esc(e.eng)}</div>
    <div class="muted">${e.y1}–${e.y2} · ${FUEL_NAME[e.fuel]}</div><div class="cs">${fmt(e.conso,1)} L/100 km</div>
    <div class="muted">Consommation moyenne réelle en usage mixte. Corrigez-la plus bas si vous connaissez la vôtre.</div>`;
  fillFuels(FUEL_KEYS[e.fuel]);
  $("conso").value = e.conso;
  if(closeList) $("carHits").innerHTML="";
  save();
}
function fillFuels(keys, keep){
  const prev = keep || $("fuel").value;
  $("fuel").innerHTML = keys.map(k=>`<option value="${k}">${FUELS[k]}</option>`).join("");
  if(keys.includes(prev)) $("fuel").value = prev;
}
let tCar;
$("carq").addEventListener("input", ()=>{ clearTimeout(tCar); tCar=setTimeout(renderHits,150); });
$("carHits").addEventListener("click", ev=>{ const b=ev.target.closest("button"); if(b) selectCar(ENTRIES[+b.dataset.i]); });

// ---------- quantité ----------
function qmode(){ return document.querySelector('input[name=qmode]:checked').value; }
function litersToBuy(){
  if(qmode()==="litres") return +$("liters").value;
  return Math.round(+$("tank").value * (1 - +$("gauge").value));
}
function updQ(){
  const plein = qmode()==="plein";
  $("pleinBox").style.display = plein?"":"none";
  $("litresBox").style.display = plein?"none":"";
  $("pleinOut").textContent = litersToBuy()>0 ? litersToBuy()+" L" : "–";
}
document.querySelectorAll('input[name=qmode]').forEach(r=>r.addEventListener("change",()=>{updQ();save();}));
["tank","gauge","liters","fuel","conso","radius","roundtrip","notoll"].forEach(id=>$(id).addEventListener("change",()=>{updQ();save();}));

// ---------- préférences ----------
function save(){ store.set("prefs2",{car:car?ENTRIES.indexOf(car):null,carq:$("carq").value,fuel:$("fuel").value,conso:$("conso").value,
  qmode:qmode(),tank:$("tank").value,gauge:$("gauge").value,liters:$("liters").value,radius:$("radius").value,rt:$("roundtrip").checked,nt:$("notoll").checked}); }
const p = store.get("prefs2");
fillFuels(Object.keys(FUELS));
if(p){
  $("carq").value = p.carq||"";
  if(p.car!=null && ENTRIES[p.car]) selectCar(ENTRIES[p.car]);
  if(p.fuel) fillFuels([...$("fuel").options].map(o=>o.value), p.fuel);
  if(p.conso) $("conso").value=p.conso;
  if(p.qmode) document.querySelector(`input[name=qmode][value=${p.qmode}]`).checked=true;
  ["tank","gauge","liters","radius"].forEach(k=>{ if(p[k]) $(k).value=p[k]; });
  $("roundtrip").checked = p.rt!==false;
  $("notoll").checked = !!p.nt;
}
updQ();

let pTimer;
function progress(pct, txt){
  clearTimeout(pTimer);
  const busy = pct!=null && pct<100;
  $("prog").classList.toggle("on", pct!=null);
  $("go").classList.toggle("busy", busy); $("go").disabled = busy;
  $("golbl").textContent = busy ? "Recherche en cours…" : "Trouver la station la plus rentable";
  if(pct!=null){ $("pbar").style.width = pct+"%"; $("ptxt").textContent = txt||""; }
  if(pct===100) pTimer = setTimeout(()=>progress(null), 900);
}
function setStatus(msg, err){ $("status").textContent = msg; $("status").className = err?"err":""; }

// ---------- adresse ----------
let tAddr;
$("addr").addEventListener("input", ()=>{
  clearTimeout(tAddr); origin = null;
  const q = $("addr").value.trim(); if(q.length<4 || q.startsWith("📍")) return;
  tAddr = setTimeout(async()=>{
    try{
      const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`).then(r=>r.json());
      $("addrList").innerHTML = r.features.map(f=>`<option value="${esc(f.properties.label)}">`).join("");
    }catch(e){}
  },300);
});
async function geocode(q){
  const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`).then(r=>r.json());
  if(!r.features?.length) throw new Error("Adresse introuvable.");
  const [lon,lat] = r.features[0].geometry.coordinates;
  return {lat,lon,label:r.features[0].properties.label};
}
// ---------- localisation ----------
const UA = navigator.userAgent;
const IS_IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
const IS_ANDROID = /Android/.test(UA);
const IN_APP = /FBAN|FBAV|Instagram|Line\/|Snapchat|GSA\/|; wv\)|LinkedInApp|TikTok|musical_ly/.test(UA);
function geoHelp(kind){
  let h = "";
  if(kind==="insecure") h = `<b>La localisation ne marche qu'en https.</b> Ouvrez l'adresse <b>https://themikolsen-lgtm.github.io/Essence/</b>.`;
  else if(IN_APP) h = `<b>Vous êtes dans le navigateur intégré d'une application</b>, qui bloque souvent la localisation. Ouvrez la page dans ${IS_IOS?"<b>Safari</b>":"<b>Chrome</b>"} (menu ⋯ → « Ouvrir dans le navigateur »).`;
  else if(kind==="denied" && IS_IOS) h = `<b>La localisation est refusée sur cet iPhone.</b> Pour l'autoriser :<ol>
    <li>Réglages → <b>Confidentialité et sécurité</b> → <b>Service de localisation</b> : activé.</li>
    <li>Dans la même liste, <b>Sites web Safari</b> (ou Chrome) → <b>Lorsque l'app est active</b>, et activez <b>Position exacte</b>.</li>
    <li>Dans Safari, touchez <b>aA</b> (ou ⋯) à gauche de l'adresse → <b>Réglages du site web</b> → <b>Localisation : Autoriser</b>.</li>
    <li>Rechargez la page et touchez à nouveau « Ma position actuelle ».</li></ol>`;
  else if(kind==="denied" && IS_ANDROID) h = `<b>La localisation est refusée sur ce téléphone.</b> Pour l'autoriser :<ol>
    <li>Tirez le volet du haut et activez <b>Localisation</b>.</li>
    <li>Dans Chrome, touchez l'icône à gauche de l'adresse (⚙ ou cadenas) → <b>Autorisations</b> → <b>Position : Autoriser</b>.</li>
    <li>Si besoin : Paramètres → Applications → <b>Chrome</b> → Autorisations → <b>Position : Autoriser</b>.</li>
    <li>Rechargez la page et touchez à nouveau « Ma position actuelle ».</li></ol>`;
  else if(kind==="denied") h = `<b>La localisation est refusée par le navigateur.</b> Cliquez sur l'icône à gauche de l'adresse → Localisation → Autoriser, puis rechargez la page.`;
  else h = `<b>Le téléphone n'a pas réussi à trouver votre position</b> (GPS ou réseau indisponible). Vérifiez que la localisation est activée, approchez-vous d'une fenêtre, ou tapez simplement votre adresse.`;
  $("geohelp").innerHTML = h + `<div class="muted" style="margin-top:6px">En attendant, vous pouvez taper votre adresse ou votre ville juste au-dessus.</div>`;
  $("geohelp").classList.add("on");
}
const getPos = opts => new Promise((ok,ko)=>navigator.geolocation.getCurrentPosition(ok,ko,opts));
async function locate(){
  $("geohelp").classList.remove("on");
  if(!window.isSecureContext) return geoHelp("insecure");
  if(!navigator.geolocation) return geoHelp("unavailable");
  setStatus(""); progress(5,"Localisation en cours… (acceptez la demande si le téléphone la propose)");
  let pos;
  try{
    // 1) position rapide (wifi / réseau), acceptée jusqu'à 10 min d'ancienneté
    pos = await getPos({enableHighAccuracy:false, timeout:10000, maximumAge:600000});
  }catch(e){
    if(e.code===1){ progress(null); return geoHelp("denied"); }
    try{
      // 2) GPS précis, plus lent
      progress(8,"Recherche du signal GPS…");
      pos = await getPos({enableHighAccuracy:true, timeout:25000, maximumAge:0});
    }catch(e2){ progress(null); return geoHelp(e2.code===1?"denied":"unavailable"); }
  }
  origin = {lat:pos.coords.latitude, lon:pos.coords.longitude, label:"votre position"};
  try{
    const r = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${origin.lon}&lat=${origin.lat}&limit=1`).then(r=>r.json());
    const lbl = r.features?.[0]?.properties?.label;
    if(lbl){ origin.label = lbl; $("addr").value = "📍 "+lbl; }
    else $("addr").value = "📍 Ma position";
  }catch(e){ $("addr").value = "📍 Ma position"; }
  search();
}
$("geo").addEventListener("click", locate);
// si l'utilisateur modifie le champ, on oublie la position GPS
$("addr").addEventListener("focus", ()=>{ if($("addr").value.startsWith("📍")){ $("addr").value=""; origin=null; } });
$("go").addEventListener("click", search);
$("addr").addEventListener("keydown", e=>{ if(e.key==="Enter") search(); });

// ---------- données ----------
function haversine(a,b){
  const R=6371, r=x=>x*Math.PI/180, dLat=r(b.lat-a.lat), dLon=r(b.lon-a.lon);
  const h=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
async function fetchStations(o, fuel, radius){
  const zone = r => `within_distance(geom, geom'POINT(${o.lon} ${o.lat})', ${r}km)`;
  const get = async (where, extra="") => {
    let r = await fetch(`${API}?limit=100${extra}&where=${encodeURIComponent(where+` and ${fuel}_prix is not null`)}`);
    if(!r.ok) r = await fetch(`${API}?limit=100${extra}&where=${encodeURIComponent(where)}`);
    if(!r.ok) throw new Error("Le service des prix ne répond pas ("+r.status+").");
    return (await r.json()).results||[];
  };
  // 1) les 100 moins chères du rayon  2) toutes les stations proches (jusqu'à 10 km)
  const [cheap, near] = await Promise.all([
    get(zone(radius), `&order_by=${encodeURIComponent(fuel+"_prix asc")}`).catch(()=>get(zone(radius))),
    get(zone(Math.min(radius,10)))
  ]);
  const seen = new Set();
  return [...cheap,...near].filter(s=>!seen.has(s.id)&&seen.add(s.id)).map(s=>{
    const lat = s.geom?.lat ?? (+s.latitude/100000), lon = s.geom?.lon ?? (+s.longitude/100000);
    return {id:String(s.id), adresse:s.adresse, ville:s.ville, cp:s.cp, lat, lon, price:+s[fuel+"_prix"], maj:s[fuel+"_maj"]};
  }).filter(s=>s.price>0 && isFinite(s.lat));
}
// Enseignes : OpenStreetMap (le flux officiel ne donne pas le nom de la station)
const OVERPASS = ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
function cleanBrand(t){
  let n = t.brand || t.name || t.operator || "";
  n = n.replace(/^(station[- ]service|station|relais)\s+/i,"").trim();
  return n;
}
async function addBrands(o, list){
  const q = `[out:json][timeout:25];(${list.map(s=>`nwr["amenity"="fuel"](around:300,${s.lat.toFixed(5)},${s.lon.toFixed(5)});`).join("")});out center tags;`;
  for(const url of OVERPASS.slice(0,1)){
    const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 6000);
    try{
      const r = await fetch(url,{method:"POST",body:"data="+encodeURIComponent(q),signal:ctrl.signal});
      if(!r.ok) continue;
      const j = await r.json();
      const osm = (j.elements||[]).map(e=>({lat:e.lat??e.center?.lat, lon:e.lon??e.center?.lon, name:cleanBrand(e.tags||{})})).filter(e=>e.name&&e.lat);
      list.forEach(s=>{
        let best=null, bd=0.3;
        osm.forEach(m=>{ const d=haversine(s,m); if(d<bd){ bd=d; best=m; } });
        if(best) s.brand = best.name;
      });
      return;
    }catch(e){} finally{ clearTimeout(t); }
  }
}
const TOLL_EUR_KM = 0.11;
async function roadDistances(o, list, noToll){
  const coords = [o,...list].map(p=>`${p.lon.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 5000);
  try{
    const base = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance,duration`;
    let r = await fetch(base+(noToll?"&exclude=toll":""),{signal:ctrl.signal}).then(r=>r.json());
    if(r.code!=="Ok" && noToll) r = await fetch(base,{signal:ctrl.signal}).then(r=>r.json());
    if(r.code!=="Ok") return;
    list.forEach((s,i)=>{ const d=r.distances[0][i+1], du=r.durations[0][i+1]; if(d!=null){ s.km=d/1000; s.min=du/60; s.road=true; } });
  }catch(e){} finally{ clearTimeout(t); }
}

// km sur autoroute à péage, d'après l'itinéraire détaillé
async function tollKm(o, s){
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 5000);
  try{
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${o.lon.toFixed(5)},${o.lat.toFixed(5)};${s.lon.toFixed(5)},${s.lat.toFixed(5)}?overview=false&steps=true`,{signal:ctrl.signal}).then(r=>r.json());
    if(r.code!=="Ok") return null;
    let km = 0;
    r.routes[0].legs.forEach(l=>l.steps.forEach(st=>{ if((st.intersections||[]).some(i=>(i.classes||[]).includes("toll"))) km += st.distance/1000; }));
    return km;
  }catch(e){ return null; } finally{ clearTimeout(t); }
}

// ---------- calcul ----------
async function search(){
  const fuel=$("fuel").value, conso=+$("conso").value, liters=litersToBuy(), radius=+$("radius").value, rt=$("roundtrip").checked, noToll=$("notoll").checked;
  if(!(conso>0)) return setStatus("Tapez votre voiture (ou indiquez sa consommation).", true);
  if(!(liters>0)) return setStatus("Indiquez combien de litres vous voulez mettre.", true);
  save(); $("carHits").innerHTML=""; render.done=false;
  try{
    if(!origin){
      const q=$("addr").value.trim();
      if(!q) return setStatus("Tapez une adresse ou utilisez « Ma position actuelle ».", true);
      setStatus(""); progress(15,"Recherche de l'adresse…"); origin = await geocode(q);
    }
    setStatus(""); progress(35,`Prix ${FUELS[fuel]} dans un rayon de ${radius} km…`);
    let st = await fetchStations(origin, fuel, radius);
    if(!st.length){ progress(null); return setStatus(`Aucune station ne vend du ${FUELS[fuel]} dans un rayon de ${radius} km. Essayez un rayon plus grand.`, true); }
    st.forEach(s=>{ s.km = haversine(origin,s)*1.3; s.min = s.km/50*60; s.road=false; });
    const est = s => s.price*(liters + (rt?2:1)*s.km*conso/100);
    st.sort((a,b)=>est(a)-est(b)); st = st.slice(0,40);
    // enseignes : liste pré-calculée (brands.json), instantané
    const brands = await BRANDS;
    st.forEach(s=>{ if(brands[s.id]) s.brand = brands[s.id]; });
    const finish = () => {
      st.forEach(s=>{
        s.tripKm = (rt?2:1)*s.km;
        s.tripCost = s.tripKm*conso/100*s.price;
        s.tollCost = noToll ? 0 : (s.tollKm||0)*TOLL_EUR_KM*(rt?2:1);
        s.total = liters*s.price + s.tripCost + s.tollCost;
      });
      st.sort((a,b)=>a.total-b.total);
      render(st, {fuel,liters,rt,noToll});
    };
    // 1) résultat immédiat avec distances estimées
    progress(70,"Calcul du plus rentable…");
    finish();
    setStatus(`${st.length} stations comparées autour de ${origin.label}. Calcul des distances par la route…`);
    // 2) affinage : distances réelles par la route (+ enseignes manquantes), sans bloquer l'affichage
    progress(85,"Distances exactes par la route…");
    const missing = st.filter(s=>!s.brand);
    await Promise.all([roadDistances(origin, st, noToll), missing.length>3 && !Object.keys(brands).length ? addBrands(origin, missing) : null]);
    finish();
    // péages : on vérifie l'itinéraire des stations en tête, jusqu'à ce que le classement soit stable
    if(!noToll){
      progress(93,"Vérification des péages…");
      for(let round=0; round<3; round++){
        const todo = st.slice(0,6).filter(s=>s.tollKm===undefined);
        if(!todo.length) break;
        await Promise.all(todo.map(async s=>{ const k = await tollKm(origin, s); s.tollKm = k ?? 0; }));
        finish();
      }
    }
    progress(100,"Terminé ✓");
    setStatus(`${st.length} stations comparées autour de ${origin.label}.`);
  }catch(e){ progress(null); setStatus(e.message||"Une erreur est survenue.", true); }
}

const sName = s => s.brand ? "Station "+s.brand : "Station "+(s.ville||"");
function render(st, o){
  const best = st[0], nearest = st.reduce((a,b)=>a.km<b.km?a:b), worst = st[st.length-1];
  const nav = s=>`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
  $("best").style.display="block";
  $("best").innerHTML = `
    <div>Le plus rentable${car?` pour votre ${esc(car.brand)} ${esc(car.model)}`:""}</div>
    <div class="big">${esc(sName(best))}</div>
    <div>${esc(best.adresse)}, ${esc(best.cp)} ${esc(best.ville)}</div>
    <div class="big" style="margin-top:6px">${fmt(best.total)} € <span style="font-size:.5em">pour ${o.liters} L</span></div>
    <div>${FUELS[o.fuel]} à ${fmt(best.price,3)} €/L · ${fmt(best.km,1)} km${best.road?"":" (estimés)"} · ~${Math.round(best.min)} min · trajet ${o.rt?"aller-retour ":""}: ${fmt(best.tripCost)} €${best.tollCost>0?` + péage ~${fmt(best.tollCost)} €`:""}</div>
    <div style="margin:10px 0 14px">${best===nearest?"C'est aussi la station la plus proche. ":`Vous économisez <b>${fmt(nearest.total-best.total)} €</b> par rapport à la plus proche (${esc(sName(nearest))}, ${esc(nearest.ville)}, ${fmt(nearest.price,3)} €/L). `}
    Jusqu'à <b>${fmt(worst.total-best.total)} €</b> d'écart avec la pire option.</div>
    <a href="${nav(best)}" target="_blank" rel="noopener">Itinéraire  ›</a>`;
  $("resultsPanel").style.display="block";
  $("rows").innerHTML = st.map((s,i)=>`<tr class="${i?"":"top"}">
    <td data-l="Rang">${i+1}</td>
    <td data-l="Station"><a href="${nav(s)}" target="_blank" rel="noopener"><b>${esc(sName(s))}</b></a><br>${esc(s.adresse)}<br><span class="muted">${esc(s.cp)} ${esc(s.ville)}${s.maj?" · prix du "+new Date(s.maj).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</span>
      <div class="meta"><span>${fmt(s.price,3)} €/L</span><span>${fmt(s.km,1)} km${s.road?"":"*"}</span><span>trajet ${fmt(s.tripCost)} €</span>${s.tollCost>0?`<span class="toll">péage ~${fmt(s.tollCost)} €</span>`:""}</div></td>
    <td class="n" data-l="Coût total"><b>${fmt(s.total)} €</b></td>
    <td class="n" data-l="Écart">${i?"+"+fmt(s.total-best.total)+" €":"—"}</td></tr>`).join("");
  drawMap(st);
  if(!render.done){ try{ $("best").scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){} }
  render.done = true;
}
function drawMap(st){
  if(typeof L==="undefined") return;
  $("map").style.display="block";
  if(!map){ map=L.map("map"); L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map); }
  if(layer) layer.remove();
  layer = L.layerGroup().addTo(map);
  L.circleMarker([origin.lat,origin.lon],{radius:9,color:"#0a5cff",fillOpacity:1}).bindPopup("Départ").addTo(layer);
  st.forEach((s,i)=>{
    L.circleMarker([s.lat,s.lon],{radius:i?6:11,color:i?"#e6261f":"#00a05a",fillOpacity:.9})
      .bindPopup(`<b>${i+1}. ${esc(sName(s))}</b><br>${esc(s.adresse)}, ${esc(s.ville)}<br>${fmt(s.price,3)} €/L – total ${fmt(s.total)} €`).addTo(layer);
  });
  map.invalidateSize();
  map.fitBounds(L.latLngBounds([[origin.lat,origin.lon],...st.map(s=>[s.lat,s.lon])]).pad(0.1));
}
}
