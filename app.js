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
  return res.slice(0,8).map(r=>r.e);
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
["tank","gauge","liters","fuel","conso","radius","roundtrip"].forEach(id=>$(id).addEventListener("change",()=>{updQ();save();}));

// ---------- préférences ----------
function save(){ store.set("prefs2",{car:car?ENTRIES.indexOf(car):null,carq:$("carq").value,fuel:$("fuel").value,conso:$("conso").value,
  qmode:qmode(),tank:$("tank").value,gauge:$("gauge").value,liters:$("liters").value,radius:$("radius").value,rt:$("roundtrip").checked}); }
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
}
updQ();

function setStatus(msg, err){ $("status").textContent = msg; $("status").className = err?"err":""; }

// ---------- adresse ----------
let tAddr;
$("addr").addEventListener("input", ()=>{
  clearTimeout(tAddr); origin = null;
  const q = $("addr").value.trim(); if(q.length<4) return;
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
$("geo").addEventListener("click", ()=>{
  if(!navigator.geolocation) return setStatus("La géolocalisation n'est pas disponible sur cet appareil.", true);
  setStatus("Recherche de votre position…");
  navigator.geolocation.getCurrentPosition(pos=>{
    origin = {lat:pos.coords.latitude, lon:pos.coords.longitude, label:"votre position"};
    $("addr").value = ""; $("addr").placeholder = "📍 Position actuelle utilisée";
    search();
  }, err=>setStatus("Impossible d'obtenir votre position ("+err.message+"). Tapez une adresse à la place.", true), {enableHighAccuracy:true,timeout:15000});
});
$("go").addEventListener("click", search);
$("addr").addEventListener("keydown", e=>{ if(e.key==="Enter") search(); });

// ---------- données ----------
function haversine(a,b){
  const R=6371, r=x=>x*Math.PI/180, dLat=r(b.lat-a.lat), dLon=r(b.lon-a.lon);
  const h=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
async function fetchStations(o, fuel, radius){
  const base = `${API}?limit=100&where=${encodeURIComponent(`within_distance(geom, geom'POINT(${o.lon} ${o.lat})', ${radius}km)`)}`;
  let r = await fetch(base + encodeURIComponent(` and ${fuel}_prix is not null`));
  if(!r.ok) r = await fetch(base);
  if(!r.ok) throw new Error("Le service des prix ne répond pas ("+r.status+").");
  const data = await r.json();
  return (data.results||[]).map(s=>{
    const lat = s.geom?.lat ?? (+s.latitude/100000), lon = s.geom?.lon ?? (+s.longitude/100000);
    return {id:s.id, adresse:s.adresse, ville:s.ville, cp:s.cp, lat, lon, price:+s[fuel+"_prix"], maj:s[fuel+"_maj"]};
  }).filter(s=>s.price>0 && isFinite(s.lat));
}
// Enseignes : OpenStreetMap (le flux officiel ne donne pas le nom de la station)
async function addBrands(o, list, radius){
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 9000);
  try{
    const q = `[out:json][timeout:20];nwr["amenity"="fuel"](around:${Math.round(radius*1000+500)},${o.lat},${o.lon});out center tags;`;
    const r = await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:"data="+encodeURIComponent(q),signal:ctrl.signal}).then(r=>r.json());
    const osm = (r.elements||[]).map(e=>({lat:e.lat??e.center?.lat, lon:e.lon??e.center?.lon, name:e.tags?.brand||e.tags?.name||e.tags?.operator})).filter(e=>e.name&&e.lat);
    list.forEach(s=>{
      let best=null, bd=0.25;
      osm.forEach(m=>{ const d=haversine(s,m); if(d<bd){ bd=d; best=m; } });
      if(best) s.brand = best.name;
    });
  }catch(e){} finally{ clearTimeout(t); }
}
async function roadDistances(o, list){
  const coords = [o,...list].map(p=>`${p.lon.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
  const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 8000);
  try{
    const r = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&annotations=distance,duration`,{signal:ctrl.signal}).then(r=>r.json());
    if(r.code!=="Ok") return;
    list.forEach((s,i)=>{ const d=r.distances[0][i+1], du=r.durations[0][i+1]; if(d!=null){ s.km=d/1000; s.min=du/60; s.road=true; } });
  }catch(e){} finally{ clearTimeout(t); }
}

// ---------- calcul ----------
async function search(){
  const fuel=$("fuel").value, conso=+$("conso").value, liters=litersToBuy(), radius=+$("radius").value, rt=$("roundtrip").checked;
  if(!(conso>0)) return setStatus("Tapez votre voiture (ou indiquez sa consommation).", true);
  if(!(liters>0)) return setStatus("Indiquez combien de litres vous voulez mettre.", true);
  save();
  try{
    if(!origin){
      const q=$("addr").value.trim();
      if(!q) return setStatus("Tapez une adresse ou utilisez « Ma position actuelle ».", true);
      setStatus("Recherche de l'adresse…"); origin = await geocode(q);
    }
    setStatus(`Recherche des stations ${FUELS[fuel]} dans un rayon de ${radius} km…`);
    let st = await fetchStations(origin, fuel, radius);
    if(!st.length) return setStatus(`Aucune station ne vend du ${FUELS[fuel]} dans un rayon de ${radius} km. Essayez un rayon plus grand.`, true);
    st.forEach(s=>{ s.km = haversine(origin,s)*1.3; s.min = s.km/50*60; s.road=false; });
    const est = s => s.price*(liters + (rt?2:1)*s.km*conso/100);
    st.sort((a,b)=>est(a)-est(b)); st = st.slice(0,40);
    setStatus("Calcul des distances par la route et recherche des enseignes…");
    await Promise.all([roadDistances(origin, st), addBrands(origin, st, radius)]);
    st.forEach(s=>{
      s.tripKm = (rt?2:1)*s.km;
      s.tripCost = s.tripKm*conso/100*s.price;
      s.total = liters*s.price + s.tripCost;
    });
    st.sort((a,b)=>a.total-b.total);
    render(st, {fuel,liters,rt});
    setStatus(`${st.length} stations comparées autour de ${origin.label}.`);
  }catch(e){ setStatus(e.message||"Une erreur est survenue.", true); }
}

const sName = s => s.brand || "Station";
function render(st, o){
  const best = st[0], nearest = st.reduce((a,b)=>a.km<b.km?a:b), worst = st[st.length-1];
  const nav = s=>`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
  $("best").style.display="block";
  $("best").innerHTML = `
    <div>Le plus rentable${car?` pour votre ${esc(car.brand)} ${esc(car.model)}`:""} :</div>
    <div class="big">${esc(sName(best))}</div>
    <div>${esc(best.adresse)}, ${esc(best.cp)} ${esc(best.ville)}</div>
    <div class="big" style="margin-top:6px">${fmt(best.total)} € <span style="font-size:.5em">pour ${o.liters} L</span></div>
    <div>${FUELS[o.fuel]} à ${fmt(best.price,3)} €/L · ${fmt(best.km,1)} km${best.road?"":" (estimés)"} · ~${Math.round(best.min)} min · trajet ${o.rt?"aller-retour ":""}: ${fmt(best.tripCost)} €</div>
    <div style="margin-top:8px">${best===nearest?"C'est aussi la station la plus proche. ":`Vous économisez <b>${fmt(nearest.total-best.total)} €</b> par rapport à la plus proche (${esc(sName(nearest))}, ${esc(nearest.ville)}, ${fmt(nearest.price,3)} €/L). `}
    Jusqu'à <b>${fmt(worst.total-best.total)} €</b> d'écart avec la pire option.</div>
    <p style="margin:12px 0 0"><a href="${nav(best)}" target="_blank" rel="noopener">➜ Itinéraire vers cette station</a></p>`;
  $("resultsPanel").style.display="block";
  $("rows").innerHTML = st.map((s,i)=>`<tr class="${i?"":"top"}">
    <td data-l="Rang">${i+1}</td>
    <td data-l="Station"><a href="${nav(s)}" target="_blank" rel="noopener"><b>${esc(sName(s))}</b></a><br>${esc(s.adresse)}<br><span class="muted">${esc(s.cp)} ${esc(s.ville)}${s.maj?" · prix du "+new Date(s.maj).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</span></td>
    <td class="n" data-l="Prix/L">${fmt(s.price,3)} €</td>
    <td class="n" data-l="Distance">${fmt(s.km,1)} km</td>
    <td class="n" data-l="Trajet">${fmt(s.tripCost)} €</td>
    <td class="n" data-l="Coût total"><b>${fmt(s.total)} €</b></td>
    <td class="n" data-l="Écart">${i?"+"+fmt(s.total-best.total)+" €":"—"}</td></tr>`).join("");
  drawMap(st);
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
