{
// ---------- sélections en pilules ----------
function pillify(sel){
  const box = document.createElement("div"); box.className="pills"; box.setAttribute("role","group");
  if(sel.getAttribute("aria-label")) box.setAttribute("aria-label", sel.getAttribute("aria-label"));
  sel.after(box); sel.tabIndex = -1;
  const draw = () => {
    box.innerHTML = [...sel.options].map(o=>`<button type="button" data-v="${o.value}" aria-pressed="${o.value===sel.value}">${o.textContent}</button>`).join("");
    const on = box.querySelector("[aria-pressed=true]");
    if(on && box.scrollWidth>box.clientWidth) on.scrollIntoView({block:"nearest",inline:"center"});
  };
  box.addEventListener("click", e=>{
    const b = e.target.closest("button"); if(!b || b.dataset.v===sel.value) return;
    sel.value = b.dataset.v; sel.dispatchEvent(new Event("change",{bubbles:true})); sel.dispatchEvent(new Event("input",{bubbles:true}));
  });
  // garder les pilules à jour quand le script change la valeur ou les options
  const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value");
  Object.defineProperty(sel,"value",{get(){return d.get.call(this)}, set(v){d.set.call(this,v); draw();}});
  new MutationObserver(draw).observe(sel,{childList:true,subtree:true});
  sel.addEventListener("change", draw);
  draw();
}
document.querySelectorAll("select[data-pills]").forEach(pillify);

const ICON = {pump:`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 22V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17"/><path d="M2 22h13"/><path d="M6.5 8h5"/><path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3"/></svg>`,bolt:`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>`,car:`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17H4a1 1 0 0 1-1-1v-3.5l2.2-5.3A2 2 0 0 1 7 6h10a2 2 0 0 1 1.8 1.2L21 12.5V16a1 1 0 0 1-1 1h-1"/><path d="M3.5 12.5h17"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5"/></svg>`,pin:`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>`,nav:`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 21 3l-8 18-2-8z"/></svg>`,plus:`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,coffee:`<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2.5v2.5M12 2.5v2.5"/></svg>`};
// pastille d'enseigne : couleur de la marque (approchée) + initiales
const BRAND_COL = [[/total/i,"#e2231a"],[/leclerc/i,"#0062ae"],[/intermarch/i,"#e30613"],[/carrefour/i,"#1e4b9b"],[/auchan/i,"#d6001c"],
  [/(syst[eè]me|super|hyper) u\b|^u\b|u express/i,"#e3000f"],[/esso/i,"#c8102e"],[/\bbp\b/i,"#009a3d"],[/shell/i,"#e5b300"],[/avia/i,"#d71920"],
  [/agip|eni/i,"#f2b600"],[/casino/i,"#00843d"],[/netto/i,"#e3a300"],[/dyneff/i,"#f37021"],[/elf/i,"#0055a4"],[/lidl/i,"#0050aa"],
  [/ionity/i,"#1a1a1a"],[/tesla/i,"#cc0000"],[/izivia/i,"#00a3e0"],[/fastned/i,"#f0c400"],[/electra/i,"#1c1c4c"]];
function avatar(name){
  const n = String(name||"").replace(/^station\s+/i,"").trim() || "?";
  const hit = BRAND_COL.find(([re])=>re.test(n));
  let col = hit ? hit[1] : `hsl(${[...n].reduce((h,c)=>h*31+c.charCodeAt(0)>>>0,7)%360} 55% 42%)`;
  const words = n.replace(/[^\p{L}\p{N} ]/gu," ").split(/\s+/).filter(Boolean);
  const ini = (words.length>1 ? words[0][0]+words[1][0] : n.slice(0,2)).toUpperCase();
  return `<span class="av" style="background:${col}">${esc(ini)}</span>`;
}
const FUELS = {gazole:"Gazole",e10:"SP95-E10",sp95:"SP95",sp98:"SP98",e85:"E85 (bioéthanol)",gplc:"GPL",elec:"Électrique"};
const FUEL_NAME = {e:"Essence",d:"Diesel",h:"Hybride essence",g:"GPL / essence",x:"Électrique"};
const FUEL_KEYS = {e:["e10","sp95","sp98","e85"],h:["e10","sp95","sp98"],d:["gazole"],g:["gplc","e10","sp95","sp98"],x:["elec"]};
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
  engines.forEach(([eng,fuel,conso,bat,ac,dc])=>{
    const words = norm(`${brand} ${model} ${gen} ${genNums} ${alias} ${eng} ${FUEL_NAME[fuel]} ${fuel==="d"?"diesel gazole":""}`).split(" ");
    ENTRIES.push({brand,model,gen,y1,y2,eng,fuel,conso,bat,ac,dc,words,modelWords:norm(`${brand} ${model} ${alias}`).split(" ")});
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
  $("carHits").innerHTML = list.map((e,i)=>`<button type="button" data-i="${ENTRIES.indexOf(e)}">${i===0?"<b>":""}${esc(carLabel(e))}${i===0?"</b>":""} <span class="muted">(${e.y1}–${e.y2} · ${FUEL_NAME[e.fuel]} · ${e.fuel==="x"?fmt(e.conso,1)+" kWh/100":fmt(e.conso,1)+" L/100"})</span></button>`).join("")
    || ($("carq").value.trim().length>=2 ? `<p class="muted">Aucune voiture trouvée. Essayez avec moins de mots (ex. « clio dci »), ou saisissez la consommation à la main ci-dessous.</p>` : "");
  if(list[0]) selectCar(list[0], false);
}
function selectCar(e, closeList=true){
  car = e;
  $("carCard").style.display="block";
  if(e.fuel==="x"){ $("bat").value=e.bat||50; $("acmax").value=e.ac||11; $("dcmax").value=e.dc||0; }
  $("carCard").innerHTML = `<div class="muted">Votre voiture</div><div class="nm">${esc(e.brand)} ${esc(e.model)} ${esc(e.gen)} – ${esc(e.eng)}</div>
    <div class="muted">${e.y1}–${e.y2} · ${FUEL_NAME[e.fuel]}</div><div class="cs">${fmt(e.conso,1)} L/100 km</div>
    <div class="muted">Consommation moyenne réelle en usage mixte. Corrigez-la plus bas si vous connaissez la vôtre.</div>`;
  fillFuels(FUEL_KEYS[e.fuel]);
  $("conso").value = e.conso;
  updSummary();
  if(closeList){ $("carHits").innerHTML=""; setCarOpen(false); setStatus(""); }
  save();
}
const isEV = () => $("fuel").value==="elec";
// stations proches avec leur prix du jour, pour le carnet
window.ESSENCE_NEARBY = async () => {
  if(isEV()) throw new Error("Le carnet suit les pleins de carburant : choisissez un carburant dans votre voiture.");
  if(!origin){
    const q = $("addr").value.trim();
    if(q && !q.startsWith("📍")) origin = await geocode(q);
    else {
      try{ const pos = await getPos({enableHighAccuracy:false, timeout:10000, maximumAge:600000});
           origin = {lat:pos.coords.latitude, lon:pos.coords.longitude, label:"votre position"}; }
      catch(e){ throw new Error("Position inconnue : indiquez une adresse dans l'onglet « Trouver » (bouton Détails)."); }
    }
  }
  const fuel = $("fuel").value;
  let st = await fetchStations(origin, fuel, Math.max(10, +$("radius").value||10));
  const brands = await BRANDS;
  st.forEach(s=>{ if(brands[s.id]) s.brand = brands[s.id]; s.km = haversine(origin,s); });
  st.sort((a,b)=>a.km-b.km);
  return {fuel:FUELS[fuel], list: st.slice(0,15).map(s=>({name:sName(s), ville:s.ville||"", adresse:s.adresse||"", price:s.price, km:s.km, maj:s.maj}))};
};
window.ESSENCE_CAR = () => car ? {name:`${car.brand} ${car.model}`, conso:car.conso, fuel:car.fuel} : null;
window.ESSENCE_SET_CONSO = v => { $("conso").value = v; updSummary(); save(); };
const AVG = {gazole:5.5,e10:6.5,sp95:6.5,sp98:6.8,e85:8.0,gplc:8.0,elec:17};
function noCarDefaults(){
  if(car) return;
  $("conso").value = AVG[$("fuel").value] || 6.5;
  if(isEV()){ $("bat").value=50; $("dcmax").value=100; $("acmax").value=11; }
}
$("noCar").addEventListener("click", ()=>{
  car = null; $("carq").value = ""; $("carHits").innerHTML = "";
  fillFuels(Object.keys(FUELS)); noCarDefaults(); updSummary(); save();
  setStatus("Choisissez votre carburant ci-dessous, puis « Valider ».");
});
$("fuel").addEventListener("change", ()=>{ if(!car){ noCarDefaults(); updSummary(); save(); } });
const goLabel = () => isEV() ? "Trouver une borne" : "Trouver la station";
// bandeau voiture : replié une fois la voiture choisie
function updSummary(){
  $("sumName").textContent = car ? `${car.brand} ${car.model}${car.gen?" "+car.gen:""} · ${car.eng}` : `${FUELS[$("fuel").value]||"Carburant"} (sans voiture précise)`;
  const c = +$("conso").value;
  if(isEV()){
    $("sumInfo").textContent = `Électrique${c>0?" · "+fmt(c,1)+" kWh/100":""} · ${$("socNow").value} → ${$("socTarget").value} %`;
  } else {
    const l = litersToBuy();
    $("sumInfo").textContent = `${FUELS[$("fuel").value]||""}${c>0?" · "+fmt(c,1)+" L/100":""}${l>0?" · plein "+l+" L":""}`;
  }
  // l'interface s'adapte : carburant ou électrique
  const ev = isEV();
  $("thermBox").style.display = ev?"none":"";
  $("evBox").style.display = ev?"":"none";
  $("consoLbl").textContent = ev ? "Conso (kWh/100)" : "Conso (L/100)";
  $("conso").max = ev ? 40 : 30;
  if(!$("go").classList.contains("busy")) $("golbl").textContent = goLabel();
  document.querySelector("header h1").textContent = ev ? "Où recharger ?" : "Où faire le plein ?";
  document.querySelector("header .logo").innerHTML = ev ? ICON.bolt : ICON.pump;
  document.querySelector("#carBox .sum .ic").innerHTML = car ? ICON.car : (ev ? ICON.bolt : ICON.pump);
  document.querySelector("header p").textContent = ev ? "Charge rapide et pas chère, et quoi faire à côté" : "Le moins cher, trajet compris";
}
function setCarOpen(open){
  if(!open && !(+$("conso").value>0)) open = true;
  $("carBox").classList.toggle("closed", !open);
  if(open) setTimeout(()=>{ try{ $("carq").focus(); }catch(e){} }, 50);
}
$("carEditBtn").addEventListener("click", ()=>setCarOpen(true));
$("carOk").addEventListener("click", ()=>{
  if(!(+$("conso").value>0)) return setStatus("Tapez votre voiture ou indiquez sa consommation.", true);
  setStatus(""); updSummary(); $("carHits").innerHTML=""; setCarOpen(false); save();
});
$("carq").addEventListener("keydown", ev=>{
  if(ev.key!=="Enter") return;
  ev.preventDefault();
  const first = searchCars($("carq").value)[0];
  if(first) selectCar(first);
});
// curseurs de batterie : valeur affichée + jauge (rouge = batterie actuelle, vert = ce qui sera rechargé)
function updSoc(){
  let now = +$("socNow").value, tgt = +$("socTarget").value;
  if(tgt <= now){ tgt = Math.min(100, Math.ceil((now+5)/5)*5); $("socTarget").value = tgt; }
  $("socNowV").textContent = now+" %"; $("socTargetV").textContent = tgt+" %";
  $("socNowBar").style.width = now+"%";
  $("socTgtBar").style.left = now+"%"; $("socTgtBar").style.width = (tgt-now)+"%";
}
["socNow","socTarget"].forEach(id=>$(id).addEventListener("input", updSoc));
["fuel","conso","socNow","socTarget","bat","dcmax","acmax"].forEach(id=>{ $(id).addEventListener("input", updSummary); $(id).addEventListener("change", ()=>{ updSummary(); save(); }); });
function fillFuels(keys, keep){
  const prev = keep || $("fuel").value;
  $("fuel").innerHTML = keys.map(k=>`<option value="${k}">${FUELS[k]}</option>`).join("");
  if(keys.includes(prev)) $("fuel").value = prev;
}
let tCar;
$("carq").addEventListener("input", ()=>{ clearTimeout(tCar); tCar=setTimeout(renderHits,150);
  if(!$("carq").value.trim() && car){ car=null; $("carHits").innerHTML=""; fillFuels(Object.keys(FUELS)); noCarDefaults(); updSummary(); } });
$("carHits").addEventListener("click", ev=>{ const b=ev.target.closest("button"); if(b) selectCar(ENTRIES[+b.dataset.i]); });

// ---------- quantité ----------
const RESERVE_L = 4;
function litersToBuy(){
  const q = $("qty").value, tank = +$("tank").value;
  if(q==="L") return +$("liters").value;
  if(q==="R") return Math.max(0, Math.round(tank - RESERVE_L));
  return Math.round(tank * (1 - +q));
}
function updQ(){
  const q = $("qty").value, lit = q==="L";
  $("tankBox").style.display = lit?"none":"";
  $("litresBox").style.display = lit?"":"none";
  $("qhint").style.display = q==="R"?"":"none";
  $("pleinOut").textContent = litersToBuy()>0 ? litersToBuy()+" L" : "–";
  if(typeof updSummary==="function") updSummary();
}
["qty","tank","liters","fuel","conso","radius","roundtrip","notoll"].forEach(id=>{ $(id).addEventListener("change",()=>{updQ();save();}); $(id).addEventListener("input",updQ); });

// ---------- préférences ----------
const carKey = e => e ? [e.brand,e.model,e.gen,e.eng].join("|") : null;
let RESTORING = true;
function save(){ if(!RESTORING){ try{ localStorage.setItem("essence_prefs_at", String(Date.now())); }catch(e){} }
  store.set("prefs2",{v:2,carKey:carKey(car),addr:$("addr").value.startsWith("📍")?"":$("addr").value.trim(),carq:$("carq").value,fuel:$("fuel").value,conso:$("conso").value,
  qty:$("qty").value,tank:$("tank").value,soc:$("socNow").value,tgt:$("socTarget").value,bat:$("bat").value,dc:$("dcmax").value,ac:$("acmax").value,liters:$("liters").value,radius:$("radius").value,rt:$("roundtrip").checked,nt:$("notoll").checked}); }
const p = store.get("prefs2");
const FIRST_VISIT = !p;
fillFuels(Object.keys(FUELS));
if(p){
  $("carq").value = p.carq||"";
  // voiture retrouvée par son nom (stable même si la liste de modèles évolue)
  const saved = p.carKey ? ENTRIES.find(e=>carKey(e)===p.carKey)
              : (p.carq ? searchCars(p.carq)[0] : null) || (p.car!=null ? ENTRIES[p.car] : null);
  if(saved) selectCar(saved);
  if(p.addr) $("addr").value = p.addr;
  if(p.fuel) fillFuels([...$("fuel").options].map(o=>o.value), p.fuel);
  if(p.conso) $("conso").value=p.conso;
  [["soc","socNow"],["tgt","socTarget"],["bat","bat"],["dc","dcmax"],["ac","acmax"]].forEach(([k,id])=>{ if(p[k]!=null&&p[k]!=="") $(id).value=p[k]; });
  ["qty","tank","liters","radius"].forEach(k=>{ if(p[k]) $(k).value=p[k]; });
  $("roundtrip").checked = p.rt!==false;
  $("notoll").checked = !!p.nt;
}
if(![...$("qty").options].some(o=>o.value===$("qty").value)) $("qty").value="R";
// demander au navigateur de ne pas effacer ces données
try{ navigator.storage?.persist?.(); }catch(e){}
$("forget").addEventListener("click", ()=>{
  try{ localStorage.removeItem("essence_prefs2"); }catch(e){}
  location.reload();
});
if(!car && !(+$("conso").value>0)){ if(!p) $("fuel").value="e10"; noCarDefaults(); }
updQ(); updSoc(); updSummary();
$("carBox").classList.toggle("closed", !!p && +$("conso").value>0);
RESTORING = false;

let pTimer;
function progress(pct, txt){
  clearTimeout(pTimer);
  const busy = pct!=null && pct<100;
  $("prog").classList.toggle("on", pct!=null);
  $("go").classList.toggle("busy", busy); $("go").disabled = busy;
  $("golbl").textContent = busy ? "Recherche en cours…" : goLabel();
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
// localisation impossible : on met en avant le champ adresse
function setDetails(open){
  $("addrCard").hidden = !open;
  $("more").setAttribute("aria-expanded", open?"true":"false");
}
$("more").addEventListener("click", ()=>setDetails($("addrCard").hidden));
$("where").addEventListener("click", ()=>setDetails(true));
function showWhere(){ $("where").innerHTML = origin ? ICON.pin+`<span>${esc(origin.label)}</span>` : ""; }
function askAddress(kind){
  setDetails(true);
  setStatus("");
  $("addrCard").classList.add("need");
  $("addr").placeholder = "Tapez votre adresse";
  $("addrNote").textContent = kind==="denied"
    ? "📍 Localisation bloquée sur ce téléphone. Tapez votre adresse ou une ville ci-dessus, puis « Trouver »."
    : "📍 Position introuvable. Tapez votre adresse ou une ville ci-dessus, puis « Trouver ».";
  try{ $("addrCard").scrollIntoView({behavior:"smooth",block:"center"}); }catch(e){}
}
function clearAsk(){ $("addrCard").classList.remove("need"); $("addrNote").textContent=""; $("addr").placeholder="Adresse ou ville"; }
$("addr").addEventListener("input", clearAsk);
$("addr").addEventListener("change", save);
async function locate(auto){
  $("geohelp").classList.remove("on");
  // en automatique : pas de gros message d'aide, juste une indication
  const fail = kind => { progress(null); askAddress(kind); if(!auto) geoHelp(kind); };
  if(!window.isSecureContext) return auto ? askAddress("unavailable") : geoHelp("insecure");
  if(!navigator.geolocation) return fail("unavailable");
  if(auto && navigator.permissions?.query){
    try{ const st = await navigator.permissions.query({name:"geolocation"}); if(st.state==="denied") return fail("denied"); }catch(e){}
  }
  setStatus(""); progress(5,"Localisation automatique… (acceptez la demande si le téléphone la propose)");
  let pos;
  try{
    // 1) position rapide (wifi / réseau), acceptée jusqu'à 10 min d'ancienneté
    pos = await getPos({enableHighAccuracy:false, timeout:auto?10000:12000, maximumAge:600000});
  }catch(e){
    if(e.code===1) return fail("denied");
    try{
      // 2) GPS précis, plus lent
      progress(8,"Recherche du signal GPS…");
      pos = await getPos({enableHighAccuracy:true, timeout:auto?8000:20000, maximumAge:0});
    }catch(e2){ return fail(e2.code===1?"denied":"unavailable"); }
  }
  clearAsk();
  origin = {lat:pos.coords.latitude, lon:pos.coords.longitude, label:"votre position"};
  try{
    const r = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${origin.lon}&lat=${origin.lat}&limit=1`).then(r=>r.json());
    const lbl = r.features?.[0]?.properties?.label;
    if(lbl){ origin.label = lbl; $("addr").value = "📍 "+lbl; }
    else $("addr").value = "📍 Ma position";
  }catch(e){ $("addr").value = "📍 Ma position"; }
  showWhere();
  if(auto && (FIRST_VISIT || !(+$("conso").value>0))){ progress(null); setStatus("Position trouvée. Choisissez votre voiture ou votre carburant, puis « Trouver »."); return; }
  search();
}
$("geo").addEventListener("click", ()=>locate(false));
// localisation automatique à l'ouverture
if(!$("addr").value.trim()) locate(true); else $("where").innerHTML = ICON.pin+`<span>${esc($("addr").value)}</span>`;
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
  if(!(liters>0) && !isEV()) return setStatus("Indiquez combien de litres vous voulez mettre.", true);
  save(); $("carHits").innerHTML=""; render.done=false; $("carBox").classList.add("closed"); updSummary();
  try{
    if(!origin){
      const q=$("addr").value.trim();
      if(!q) return locate(false);   // rien de rempli : on prend la position actuelle
      setStatus(""); progress(15,"Recherche de l'adresse…"); origin = await geocode(q); showWhere();
    }
    if(isEV()) return await searchEV();
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
  const saving = nearest.total-best.total;
  $("best").innerHTML = `
    <div class="kicker">Le plus rentable${car?` pour votre ${esc(car.brand)} ${esc(car.model)}`:""}</div>
    <div class="who">${avatar(best.brand||sName(best))}<div><div class="big">${esc(sName(best))}</div><div class="addr">${esc(best.adresse)}, ${esc(best.cp)} ${esc(best.ville)}</div></div></div>
    <div class="price">${fmt(best.total)} € <small>pour ${o.liters} L, trajet compris</small></div>
    <div class="stats">
      <div class="stat"><b>${fmt(best.price,3)} €</b><span>${esc(FUELS[o.fuel])} / L</span></div>
      <div class="stat"><b>${fmt(best.km,1)} km</b><span>~${Math.round(best.min)} min${best.road?"":" (estimé)"}</span></div>
      <div class="stat"><b>${fmt(best.tripCost+best.tollCost)} €</b><span>trajet${o.rt?" A/R":""}${best.tollCost>0?" + péage":""}</span></div>
    </div>
    ${best===nearest ? `<div class="save">✓ C'est aussi la plus proche</div>` : `<div class="save">− ${fmt(saving)} € vs la plus proche</div>`}
    <p class="note">${best===nearest?"":`La plus proche : ${esc(sName(nearest))}, ${esc(nearest.ville)} à ${fmt(nearest.price,3)} €/L. `}Jusqu'à ${fmt(worst.total-best.total)} € d'écart avec la pire option.</p>
    <div class="bestbtns"><a href="${nav(best)}" target="_blank" rel="noopener">${ICON.nav}Itinéraire</a><button type="button" class="logit" id="logBest">${ICON.plus}Noter ce plein</button></div>`;
  window.ESSENCE_LAST = {station:`${sName(best)}, ${best.ville||""}`, price:best.price, liters:o.liters, fuel:FUELS[o.fuel]};
  $("logBest").onclick = () => window.CARNET?.prefill(window.ESSENCE_LAST);
  $("resultsPanel").style.display="block";
  $("resTitle").textContent = "Toutes les stations";
  $("evSort").nextElementSibling.style.display = "none";
  $("resNote").textContent = "Coût total = litres × prix + carburant brûlé pour le trajet + péage éventuel (≈ 0,11 €/km). Prix officiels prix-carburants.gouv.fr · enseignes OpenStreetMap · distances par la route (OSRM).";
  $("rows").onclick = null;
  $("rows").innerHTML = st.map((s,i)=>`<tr class="${i?"":"top"}" style="animation-delay:${Math.min(i,10)*30}ms">
    <td data-l="Rang">${avatar(s.brand||sName(s))}<span class="rk">${i+1}</span></td>
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
      .bindPopup(s.popup || `<b>${i+1}. ${esc(sName(s))}</b><br>${esc(s.adresse)}, ${esc(s.ville)}<br>${fmt(s.price,3)} €/L – total ${fmt(s.total)} €`).addTo(layer);
  });
  map.invalidateSize();
  map.fitBounds(L.latLngBounds([[origin.lat,origin.lon],...st.map(s=>[s.lat,s.lon])]).pad(0.1));
}

// =====================================================================
// ---------- Voiture électrique : bornes de recharge ----------
// =====================================================================
let IRVE_INDEX = null;
const tileCache = {};
async function loadIrve(o, radius){
  if(!IRVE_INDEX){
    const r = await fetch("irve/index.json?d="+new Date().toISOString().slice(0,10));
    if(!r.ok) throw new Error("Les données des bornes ne sont pas encore prêtes. Réessayez dans quelques minutes.");
    IRVE_INDEX = new Set(await r.json());
  }
  const dLat = radius/111, dLon = radius/(111*Math.cos(o.lat*Math.PI/180));
  const keys = [];
  for(let a=Math.floor((o.lat-dLat)*2); a<=Math.floor((o.lat+dLat)*2); a++)
    for(let b=Math.floor((o.lon-dLon)*2); b<=Math.floor((o.lon+dLon)*2); b++)
      if(IRVE_INDEX.has(`${a}_${b}`)) keys.push(`${a}_${b}`);
  const lists = await Promise.all(keys.map(k => tileCache[k] || (tileCache[k] = fetch(`irve/${k}.json`).then(r=>r.ok?r.json():[]).catch(()=>[]))));
  return lists.flat();
}
const PLUGS = {"2":"Type 2","C":"Combo CCS","D":"CHAdeMO","E":"Prise domestique"};
function priceKwh(t){
  if(!t) return null;
  const m = String(t).replace(/\s/g," ").match(/(\d+[.,]\d{1,3})\s*(?:€|eur|euros?)?\s*(?:ttc\s*)?(?:\/|par|le)\s*kwh/i);
  if(m){ const v = parseFloat(m[1].replace(",",".")); if(v>0 && v<2) return v; }
  return null;
}
function fmtMin(m){ m=Math.round(m); return m<60 ? `${m} min` : `${Math.floor(m/60)} h ${String(m%60).padStart(2,"0")}`; }
// temps de charge, avec ralentissement au-delà de 80 % en charge rapide
function chargeMinutes(s, ctx){
  const {bat, now, tgt, dc, ac, driveKwh} = ctx;
  const dcOk = dc>0 && s.k.includes("C") && s.p>=20;
  const power = dcOk ? Math.min(s.p, dc) : Math.min(s.p||7, ac, s.k.includes("2")||s.k.includes("E") ? 43 : 0);
  if(!(power>0)) return null;
  // énergie consommée pour aller à la borne : à recharger aussi
  const startPct = Math.max(1, now - driveKwh/bat*100);
  const e1 = bat*Math.max(0, Math.min(tgt,80)-startPct)/100;
  const e2 = bat*Math.max(0, tgt-Math.max(80,startPct))/100;
  let min;
  if(dcOk) min = e1/(power*0.8)*60 + e2/(power*0.35)*60;
  else     min = (e1+e2)/(power*0.92)*60;
  return {min, kwh:e1+e2, power, fast:dcOk};
}
async function searchEV(){
  const radius=+$("radius").value, rt=$("roundtrip").checked, noToll=$("notoll").checked;
  const ctx = {bat:+$("bat").value||50, now:+$("socNow").value, tgt:+$("socTarget").value, dc:+$("dcmax").value||0, ac:+$("acmax").value||7, cons:+$("conso").value||17};
  setStatus(""); progress(35,`Bornes de recharge dans un rayon de ${radius} km…`);
  let st = (await loadIrve(origin, radius)).map(s=>({...s, lat:s.la, lon:s.lo}));
  st = st.filter(s=>haversine(origin,s)<=radius);
  // compatibles avec la voiture
  st = st.filter(s => (ctx.dc>0 && s.k.includes("C")) || s.k.includes("2") || (!s.k && s.p<=22));
  if(!st.length){ progress(null); return setStatus(`Aucune borne compatible dans un rayon de ${radius} km. Essayez un rayon plus grand.`, true); }
  const sortBy = () => $("evSort").value;
  const compute = () => {
    st.forEach(s=>{
      ctx.driveKwh = s.km*ctx.cons/100;
      const c = chargeMinutes(s, ctx);
      s.ch = c;
      s.driveMin = s.min*(rt?2:1);
      s.totalMin = c ? c.min + s.driveMin : Infinity;
      const pk = s.g ? 0 : priceKwh(s.t);
      s.pk = pk;
      s.cost = c && pk!=null ? pk*c.kwh : null;
      s.tollCost = noToll ? 0 : (s.tollKm||0)*TOLL_EUR_KM*(rt?2:1);
    });
    st = st.filter(s=>s.ch);
    // rapport durée / prix : chaque critère ramené à la médiane (prix inconnu = un peu pénalisé)
    const med = arr => { const v = arr.filter(x=>x!=null && isFinite(x)).sort((a,b)=>a-b); return v.length ? v[Math.floor(v.length/2)] : 1; };
    const mCost = Math.max(1, med(st.map(s=>s.cost))), mTime = Math.max(1, med(st.map(s=>s.totalMin)));
    st.forEach(s=>{ const c = (s.cost ?? mCost*1.25) + s.tollCost; s.score = c/mCost + s.totalMin/mTime; });
    const mode = sortBy();
    st.sort(mode==="cost" ? (a,b)=>((a.cost??99)+a.tollCost)-((b.cost??99)+b.tollCost) || a.totalMin-b.totalMin
          : mode==="best" ? (a,b)=>a.score-b.score
          : (a,b)=>a.totalMin-b.totalMin);
    renderEV(st, ctx, rt);
  };
  st.forEach(s=>{ s.km = haversine(origin,s)*1.3; s.min = s.km/50*60; s.road=false; });
  ctx.driveKwh = 0;
  st.forEach(s=>{ const c=chargeMinutes(s,{...ctx,driveKwh:s.km*ctx.cons/100}); s._est = c ? c.min + s.min*(rt?2:1) : Infinity; });
  st.sort((a,b)=>a._est-b._est); st = st.slice(0,40);
  progress(70,"Calcul du temps de charge…");
  compute();
  $("evSort").onchange = compute;
  progress(85,"Distances exactes par la route…");
  await roadDistances(origin, st, noToll);
  compute();
  if(!noToll){
    progress(93,"Vérification des péages…");
    const todo = st.slice(0,5).filter(s=>s.tollKm===undefined);
    await Promise.all(todo.map(async s=>{ s.tollKm = (await tollKm(origin,s)) ?? 0; }));
    compute();
  }
  progress(100,"Terminé ✓");
  setStatus(`${st.length} bornes comparées autour de ${origin.label}.`);
  loadNearby(st[0], $("bestNear"));
}
const cleanTxt = t => String(t||"").replace(/_/g," ").replace(/\s+/g," ").trim();
const niceName = t => { t = cleanTxt(t); return t && t===t.toUpperCase() && t.length>4 ? t.charAt(0)+t.slice(1).toLowerCase() : t; };
const isCode = t => !t || /\/\d|^\w*\d{4,}|^FR[A-Z0-9*]{3,}/i.test(t);
function evName(s){ return niceName(s.o) || niceName(s.n) || "Borne de recharge"; }
function evPlace(s){ const n = niceName(s.n); return n && !isCode(n) && n!==evName(s) ? n+" – " : ""; }
function renderEV(st, ctx, rt){
  if(!st.length) return;
  const best = st[0];
  const nav = s=>`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
  const plugs = s => s.k.split("").map(k=>PLUGS[k]).filter(Boolean).join(" · ");
  const costTxt = s => s.g ? "Gratuit" : s.cost!=null ? `≈ ${fmt(s.cost)} € (${fmt(s.pk,2)} €/kWh)` : "Prix non communiqué";
  $("best").style.display="block";
  $("best").innerHTML = `
    <div class="kicker">${{cost:"La moins chère",best:"Le meilleur rapport durée / prix",time:"La plus rapide"}[$("evSort").value]}${car?` pour votre ${esc(car.brand)} ${esc(car.model)}`:""}</div>
    <div class="who">${avatar(evName(best))}<div><div class="big">${esc(evName(best))}</div><div class="addr">${esc(evPlace(best))}${esc(best.a)}</div></div></div>
    <div class="big" style="margin-top:6px">${fmtMin(best.ch.min)} <span style="font-size:.5em">de charge (${ctx.now} → ${ctx.tgt} %)</span></div>
    <div>${fmt(best.ch.power,0)} kW ${best.ch.fast?"charge rapide":"prise normale"} · ${fmt(best.km,1)} km · ~${Math.round(best.min)} min de route${best.tollCost>0?` · péage ~${fmt(best.tollCost)} €`:""}</div>
    <div>${costTxt(best)}${best.h?` · ${esc(best.h)}`:""}</div>
    <div style="margin:10px 0 6px"><b>☕ Pendant la charge, à côté :</b></div>
    <div class="near" id="bestNear"><span class="muted" style="color:inherit;opacity:.85">Recherche…</span></div>
    <div class="bestbtns" style="margin-top:12px"><a href="${nav(best)}" target="_blank" rel="noopener">${ICON.nav}Itinéraire</a></div>`;
  $("resultsPanel").style.display="block";
  $("resTitle").textContent = "Toutes les bornes";
  $("evSort").nextElementSibling.style.display = "";
  $("resNote").textContent = "Temps de charge estimé selon la puissance de la borne et de votre voiture (ralentissement au-delà de 80 %), en comptant l'énergie dépensée pour y aller. Prix : tel que déclaré par l'opérateur, quand il est lisible. Bornes : base nationale IRVE (data.gouv.fr) · à côté : OpenStreetMap.";
  $("rows").innerHTML = st.map((s,i)=>`<tr class="${i?"":"top"}">
    <td data-l="Rang">${avatar(evName(s))}<span class="rk">${i+1}</span></td>
    <td data-l="Station"><a href="${nav(s)}" target="_blank" rel="noopener"><b>${esc(evName(s))}</b></a><br>${esc(evPlace(s))}${esc(s.a)}
      <div class="meta"><span>${fmt(s.p,0)} kW</span><span>${esc(plugs(s))}</span><span>${fmt(s.km,1)} km</span><span>${s.q} point${s.q>1?"s":""} de charge</span>${s.tollCost>0?`<span class="toll">péage ~${fmt(s.tollCost)} €</span>`:""}<span>${esc(costTxt(s))}</span></div>
      <button type="button" class="nearbtn" data-i="${i}">☕ Que faire à côté ?</button><div class="near"></div></td>
    <td class="n" data-l="Coût total"><b>${fmtMin(s.ch.min)}</b></td>
    <td class="n" data-l="Écart">${s.cost!=null?fmt(s.cost,0)+" €":(s.g?"0 €":"? €")}</td></tr>`).join("");
  $("rows").onclick = ev => { const b=ev.target.closest(".nearbtn"); if(!b) return; b.disabled=true; loadNearby(st[+b.dataset.i], b.nextElementSibling).then(()=>b.remove()); };
  st.forEach((s,i)=>{ s.popup = `<b>${i+1}. ${esc(evName(s))}</b><br>${esc(s.a)}<br>${fmt(s.p,0)} kW – charge ${fmtMin(s.ch.min)}`; });
  drawMap(st);
  if(!render.done){ try{ $("best").scrollIntoView({behavior:"smooth",block:"start"}); }catch(e){} }
  render.done = true;
}
// ---------- que faire à côté pendant la charge ----------
const NEAR_CATS = [
  [t=>t.amenity==="cafe","☕","Café"],[t=>t.shop==="bakery","🥖","Boulangerie"],
  [t=>t.amenity==="restaurant","🍽️","Restaurant"],[t=>t.amenity==="fast_food","🍔","Restauration rapide"],
  [t=>t.amenity==="bar"||t.amenity==="pub","🍺","Bar"],
  [t=>["supermarket","convenience"].includes(t.shop),"🛒","Supermarché"],[t=>t.shop==="mall"||t.shop==="department_store","🛍️","Centre commercial"],
  [t=>t.shop && t.shop!=="vacant","🛍️","Magasin"],
  [t=>t.leisure==="park"||t.leisure==="garden","🌳","Parc"],[t=>t.tourism==="museum","🏛️","Musée"],
  [t=>t.tourism==="attraction"||t.tourism==="viewpoint","📸","À voir"],[t=>t.amenity==="cinema","🎬","Cinéma"],
  [t=>t.amenity==="library","📚","Bibliothèque"],[t=>t.amenity==="toilets","🚻","Toilettes"]
];
const nearCache = {};
async function loadNearby(s, box){
  if(!s || !box) return;
  const key = s.lat.toFixed(4)+","+s.lon.toFixed(4);
  try{
    if(!nearCache[key]){
      const q = `[out:json][timeout:15];(nwr["amenity"~"^(cafe|restaurant|fast_food|bar|pub|cinema|library|toilets)$"](around:500,${s.lat},${s.lon});nwr["shop"](around:500,${s.lat},${s.lon});nwr["leisure"~"^(park|garden)$"](around:500,${s.lat},${s.lon});nwr["tourism"~"^(museum|attraction|viewpoint)$"](around:500,${s.lat},${s.lon}););out center tags 80;`;
      let data = null;
      for(const url of OVERPASS){
        const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(), 8000);
        try{ const r = await fetch(url,{method:"POST",body:"data="+encodeURIComponent(q),signal:ctrl.signal}); if(r.ok){ data = await r.json(); break; } }catch(e){} finally{ clearTimeout(t); }
      }
      if(!data) throw new Error();
      const items = [];
      (data.elements||[]).forEach(e=>{
        const t = e.tags||{}, lat = e.lat??e.center?.lat, lon = e.lon??e.center?.lon;
        const cat = NEAR_CATS.find(c=>c[0](t)); if(!cat || lat==null) return;
        const name = t.name || t.brand || "";
        if(!name && !["🚻","🌳"].includes(cat[1])) return;
        items.push({ic:cat[1], kind:cat[2], name, d:haversine(s,{lat,lon})*1000});
      });
      items.sort((a,b)=>a.d-b.d);
      // variété : au plus 2 par catégorie
      const per = {}, out = [];
      for(const it of items){ per[it.kind]=(per[it.kind]||0)+1; if(per[it.kind]<=2) out.push(it); if(out.length>=8) break; }
      nearCache[key] = out;
    }
    const list = nearCache[key];
    box.innerHTML = list.length
      ? `<ul>${list.map(it=>`<li><span>${it.ic} ${esc(it.name||it.kind)}${it.name?` <span class="muted" style="color:inherit;opacity:.7">· ${it.kind}</span>`:""}</span><span>${Math.round(it.d)} m · ${Math.max(1,Math.round(it.d/80))} min à pied</span></li>`).join("")}</ul>`
      : `<span class="muted" style="color:inherit;opacity:.85">Rien de répertorié à moins de 500 m.</span>`;
  }catch(e){ box.innerHTML = `<span class="muted" style="color:inherit;opacity:.85">Impossible de charger les lieux à proximité.</span>`; }
}
}
