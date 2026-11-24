// Cahier de suivi de consommation : pleins enregistrés sur l'appareil (localStorage)
{
const $ = id => document.getElementById(id);
const KEY = "essence_carnet";
const fmt = (n,d=2) => (+n).toLocaleString("fr-FR",{minimumFractionDigits:d,maximumFractionDigits:d});
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const load = () => { try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ return []; } };
const store = list => { try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch(e){ toast("Impossible d'enregistrer sur cet appareil."); } };
const DELKEY = "essence_carnet_deleted";
const markDeleted = (id, on) => { try{ const d = new Set(JSON.parse(localStorage.getItem(DELKEY)||"[]")); on ? d.add(id) : d.delete(id); localStorage.setItem(DELKEY, JSON.stringify([...d])); }catch(e){} };
const today = () => new Date().toISOString().slice(0,10);
const MOIS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
let all = load(), entries = [], editing = null, undo = null;
const vid = () => window.ESSENCE_VEHICLE?.() || null;
function refilter(){
  const id = vid(), first = window.ESSENCE_FIRST_VEHICLE?.() || null;
  entries = id ? all.filter(e => (e.v || first) === id) : all.slice();
}
refilter();

// ---------- onglets ----------
function showTab(log){
  $("tabFind").hidden = log; $("tabLog").hidden = !log;
  $("tabBtnFind").setAttribute("aria-selected", !log); $("tabBtnLog").setAttribute("aria-selected", log);
  try{ history.replaceState(null, "", log ? "#carnet" : location.pathname); }catch(e){}
  if(log) render();
  window.ESSENCE_HEADER?.();
  window.scrollTo(0,0);
}
$("tabBtnFind").onclick = () => showTab(false);
$("tabBtnLog").onclick = () => showTab(true);

// ---------- calculs ----------
const ym = d => d.slice(0,7);
const monthName = m => new Date(m+"-15").toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
function stats(){
  const byKm = entries.filter(e=>e.km>0).sort((a,b)=>a.km-b.km || a.date.localeCompare(b.date));
  // consommation réelle : entre deux pleins complets, litres remis / km parcourus
  const cons = {}, series = [];
  let lastFull = null, liters = 0;
  for(const e of byKm){
    if(lastFull) liters += e.l;
    if(e.full){
      if(lastFull && e.km > lastFull.km){
        const v = liters / (e.km - lastFull.km) * 100;
        if(v > 1 && v < 40){ cons[e.id] = v; series.push({date:e.date, v, km:e.km-lastFull.km}); }
      }
      lastFull = e; liters = 0;
    }
  }
  const fulls = byKm.filter(e=>e.full);
  let avg = null;
  if(fulls.length >= 2){
    const first = fulls[0], last = fulls[fulls.length-1];
    const l = byKm.filter(e=>e.km>first.km && e.km<=last.km).reduce((s,e)=>s+e.l,0);
    if(last.km > first.km) avg = l/(last.km-first.km)*100;
  }
  if(avg==null && series.length) avg = series.reduce((a,b)=>a+b.v,0)/series.length;
  const total = entries.reduce((s,e)=>s+e.t,0), litres = entries.reduce((s,e)=>s+e.l,0);
  const kmSpan = byKm.length>=2 ? byKm[byKm.length-1].km - byKm[0].km : 0;
  const spentInSpan = byKm.length>=2 ? byKm.slice(1).reduce((s,e)=>s+e.t,0) : 0;
  const now = new Date(), cur = today().slice(0,7);
  const prevM = new Date(now.getFullYear(), now.getMonth()-1, 15).toISOString().slice(0,7);
  const sumM = m => entries.filter(e=>ym(e.date)===m).reduce((s,e)=>s+e.t,0);
  // période suivie (jours) pour les moyennes mensuelles
  const dates = entries.map(e=>e.date).sort();
  const days = dates.length>=2 ? Math.max(1,(new Date(dates[dates.length-1])-new Date(dates[0]))/864e5) : 0;
  const daysKm = byKm.length>=2 ? Math.max(1,(new Date(byKm[byKm.length-1].date)-new Date(byKm[0].date))/864e5) : 0;
  const perKm = kmSpan>0 ? spentInSpan/kmSpan : null;
  const kmMonth = daysKm>=20 ? kmSpan/daysKm*30.4 : null;
  const spendBase = entries.length>=2 && days>=20 ? (total - entries.find(e=>e.date===dates[0]).t)/days*365 : null;
  return {cons, series, avg, total, litres, pAvg: litres ? total/litres : null, perKm, kmSpan, kmMonth,
          month: sumM(cur), prevMonth: sumM(prevM), year: spendBase};
}

// ---------- affichage ----------
const svgEmpty = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M8.5 7.5h7M8.5 11h5"/></svg>`;
let formOpen = false;
function setForm(open){
  formOpen = open;
  $("logFormCard").hidden = !open;
  $("addFill").hidden = open;
  if(open) setTimeout(()=>{ $("logFormCard").scrollIntoView({behavior:"smooth",block:"start"}); }, 30);
}
function renderVehicles(){
  // seuls les véhicules favoris (et celui en cours) apparaissent dans le carnet
  const list = (window.ESSENCE_GARAGE?.() || []).filter(v=>v.fav || v.active);
  const box = $("logVeh");
  box.hidden = list.length < 2;
  box.innerHTML = list.map(v=>`<button type="button" data-veh="${v.id}" aria-pressed="${v.active}">${v.fav?`<span class="star" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2.8l2.75 5.6 6.17.9-4.46 4.35 1.05 6.14L12 16.9l-5.51 2.89 1.05-6.14L3.08 9.3l6.17-.9z"/></svg></span>`:""}${esc(v.label)}</button>`).join("");
}
$("logVeh").addEventListener("click", ev=>{ const b = ev.target.closest("button[data-veh]"); if(b && b.getAttribute("aria-pressed")!=="true") window.ESSENCE_SWITCH?.(b.dataset.veh); });
function render(){
  renderVehicles();
  const s = stats();
  const carInfo = window.ESSENCE_CAR?.();
  // --- bloc principal ---
  if(!entries.length){
    $("cHero").innerHTML = `<div class="empty">${svgEmpty}<h2>Votre carnet de consommation</h2>
      <p>Notez vos pleins : l'app calcule votre consommation réelle, vos dépenses et votre coût au kilomètre.</p></div>`;
  } else {
    const last = s.series[s.series.length-1], prev = s.series[s.series.length-2];
    const badges = [];
    if(s.avg!=null && carInfo && carInfo.conso>0){
      const d = (s.avg/carInfo.conso-1)*100;
      badges.push(Math.abs(d)<3 ? `<span class="badge good">= conforme à la ${esc(carInfo.name)} (${fmt(carInfo.conso,1)})</span>`
        : `<span class="badge ${d>0?"bad":"good"}">${d>0?"+":"−"}${fmt(Math.abs(d),0)} % vs ${fmt(carInfo.conso,1)} annoncés</span>`);
    }
    if(last && prev){
      const d = last.v-prev.v;
      badges.push(`<span class="badge ${d>0.05?"bad":d<-0.05?"good":""}">${d>0.05?"↗":d<-0.05?"↘":"→"} dernier plein : ${fmt(last.v,1)} L</span>`);
    }
    $("cHero").innerHTML = s.avg!=null
      ? `<div class="ht">Consommation réelle</div><div class="hv"><b>${fmt(s.avg,1)}</b><span>L / 100 km</span></div>
         <div class="badges">${badges.join("")}</div>
         <p class="muted" style="margin:8px 2px 0">${entries.length} plein${entries.length>1?"s":""} · ${fmt(s.litres,0)} L · ${fmt(s.total)} €${s.kmSpan?` · ${s.kmSpan.toLocaleString("fr-FR")} km suivis`:""}</p>
         <button type="button" class="ghost" id="useReal">Utiliser ${fmt(s.avg,1)} L/100 km pour trouver la station</button>`
      : `<div class="ht">Consommation réelle</div><div class="hv"><b>–</b><span>L / 100 km</span></div>
         <p class="muted" style="margin:8px 2px 0">Elle s'affiche après <b>deux pleins complets</b> avec le compteur kilométrique.</p>`;
    const ub = $("useReal");
    if(ub) ub.onclick = () => { window.ESSENCE_SET_CONSO?.(Math.round(s.avg*10)/10); toast("Consommation réelle utilisée pour trouver la station."); };
  }
  // --- indicateurs ---
  $("kpiCard").hidden = !entries.length;
  const kpi = (v,label,extra="") => `<div class="kpi"><b>${v}</b><span>${label}</span>${extra}</div>`;
  const dm = s.prevMonth>0 ? (s.month/s.prevMonth-1)*100 : null;
  $("kpis").innerHTML =
    kpi(fmt(s.month,0)+" €", "dépensés ce mois-ci", dm!=null && s.month>0 ? `<small class="${dm>0?"up":"down"}">${dm>0?"+":"−"}${fmt(Math.abs(dm),0)} % vs mois dernier</small>` : "") +
    kpi(s.pAvg!=null ? fmt(s.pAvg,3)+" €" : "–", "prix moyen du litre") +
    kpi(s.perKm!=null ? fmt(s.perKm*100,2)+" €" : "–", "carburant / 100 km") +
    kpi(s.kmMonth!=null ? Math.round(s.kmMonth).toLocaleString("fr-FR")+" km" : "–", "parcourus / mois") +
    (s.year!=null ? kpi("≈ "+Math.round(s.year).toLocaleString("fr-FR")+" €", "par an à ce rythme") : "") +
    kpi(fmt(s.total,0)+" €", "dépensés au total");
  // --- graphique ---
  $("chartCard").hidden = entries.length < 2;
  drawChart(s);
  // --- historique groupé par mois ---
  $("histCard").hidden = !entries.length;
  const list = [...entries].sort((a,b)=>b.date.localeCompare(a.date) || (b.km||0)-(a.km||0));
  let html = "", curM = "";
  for(const e of list){
    const m = ym(e.date);
    if(m!==curM){ curM = m; const tot = entries.filter(x=>ym(x.date)===m).reduce((a,x)=>a+x.t,0);
      html += `<div class="mhead">${monthName(m)}<span>${fmt(tot)} €</span></div>`; }
    const c = s.cons[e.id];
    html += `<div class="entry">
      <div><b>${new Date(e.date+"T12:00").toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})}</b>
        <div class="m">${fmt(e.l,2)} L × ${fmt(e.p,3)} €${e.st?` · ${esc(e.st)}`:""}</div></div>
      <div class="r">${fmt(e.t)} €</div>
      <div class="m2">${e.km?`<span>${(+e.km).toLocaleString("fr-FR")} km</span>`:""}${c!=null?`<span class="c">${fmt(c,1)} L/100</span><span>${fmt(c*e.p,2)} €/100 km</span>`:""}${e.full?"":"<span>plein partiel</span>"}</div>
      <div class="acts"><button type="button" data-edit="${e.id}">Modifier</button><button type="button" data-del="${e.id}">Supprimer</button></div>
    </div>`;
  }
  $("hist").innerHTML = html;
  if(!formOpen) setForm(!entries.length);
  else $("addFill").hidden = true;
}

// graphique : consommation (points + moyenne), prix du litre, ou dépenses par mois (barres)
function drawChart(s){
  const svg = $("cSvg"); if(!svg || $("chartCard").hidden) return;
  const W = svg.clientWidth || 340, H = svg.clientHeight || 210, m = {l:34,r:10,t:14,b:22};
  const metric = $("cMetric").value;
  let pts = [], bars = null, unit = "", avgLine = null, ref = null, dec = 1;
  if(metric==="cons"){ pts = s.series.map(x=>({d:x.date, v:x.v})); unit = "L/100"; avgLine = s.avg; ref = window.ESSENCE_CAR?.()?.conso || null; }
  else if(metric==="price"){ pts = [...entries].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>({d:e.date, v:e.p})); unit = "€/L"; dec = 3; avgLine = s.pAvg; }
  else {
    const now = new Date(); bars = [];
    for(let i=11;i>=0;i--){ const d = new Date(now.getFullYear(), now.getMonth()-i, 15); const k = d.toISOString().slice(0,7);
      bars.push({k, lab:MOIS[d.getMonth()].replace(".",""), v: entries.filter(e=>ym(e.date)===k).reduce((a,e)=>a+e.t,0)}); }
    unit = "€"; dec = 0;
  }
  const vals = bars ? bars.map(b=>b.v) : pts.map(p=>p.v).concat(avgLine??[], ref??[]);
  if(!vals.length || (!bars && !pts.length)){
    svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle">${metric==="cons"?"Il faut au moins deux pleins complets avec le compteur.":"Pas encore assez de données."}</text>`;
    $("cLegend").textContent = ""; return;
  }
  let lo = bars ? 0 : Math.min(...vals), hi = Math.max(...vals);
  if(hi===lo){ hi += metric==="price"?0.05:1; lo = bars?0:lo-(metric==="price"?0.05:1); }
  const pad = (hi-lo)*0.15; if(!bars){ lo -= pad; } hi += pad;
  const X0 = m.l, X1 = W-m.r, Y0 = H-m.b, Y1 = m.t;
  const y = v => Y0 - (v-lo)/(hi-lo)*(Y0-Y1);
  let g = "";
  for(let i=0;i<=3;i++){ const v = lo+(hi-lo)*i/3, yy = y(v);
    g += `<line x1="${X0}" x2="${X1}" y1="${yy}" y2="${yy}" stroke="var(--field)" stroke-width="1"/><text x="${X0-6}" y="${yy+4}" text-anchor="end">${fmt(v, metric==="price"?2:(bars?0:1))}</text>`; }
  if(bars){
    const bw = (X1-X0)/bars.length;
    bars.forEach((b,i)=>{ const x = X0+i*bw+bw*0.18, w = bw*0.64, yy = y(b.v);
      g += `<rect x="${x}" y="${yy}" width="${w}" height="${Math.max(0,Y0-yy)}" rx="${Math.min(6,w/2)}" fill="var(--accent)" opacity="${b.k===today().slice(0,7)?1:.75}"/>`;
      if(W>=360 || i%2===0) g += `<text x="${x+w/2}" y="${H-6}" text-anchor="middle">${b.lab}</text>`;
      if(b.v>0 && W>=360) g += `<text class="val" x="${x+w/2}" y="${yy-4}" text-anchor="middle">${fmt(b.v,0)}</text>`; });
    const tot = bars.reduce((a,b)=>a+b.v,0);
    $("cLegend").textContent = `12 derniers mois : ${fmt(tot,0)} € · moyenne ${fmt(tot/12,0)} € / mois`;
  } else {
    const n = pts.length, x = i => n===1 ? (X0+X1)/2 : X0 + i/(n-1)*(X1-X0);
    if(ref) g += `<line x1="${X0}" x2="${X1}" y1="${y(ref)}" y2="${y(ref)}" stroke="var(--muted)" stroke-dasharray="2 4" stroke-width="1.5"/><text x="${X1}" y="${y(ref)-5}" text-anchor="end">annoncé ${fmt(ref,1)}</text>`;
    if(avgLine!=null) g += `<line x1="${X0}" x2="${X1}" y1="${y(avgLine)}" y2="${y(avgLine)}" stroke="var(--ink)" stroke-dasharray="6 5" stroke-width="2" opacity=".55"/>`;
    g += `<path d="${pts.map((p,i)=>(i?"L":"M")+x(i).toFixed(1)+","+y(p.v).toFixed(1)).join("")}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    pts.forEach((p,i)=>{ g += `<circle cx="${x(i)}" cy="${y(p.v)}" r="4.5" fill="var(--bg)" stroke="var(--accent)" stroke-width="2.5"/>`; });
    const step = Math.max(1, Math.ceil(n/(W<360?4:6)));
    pts.forEach((p,i)=>{ if(i%step===0 || i===n-1) g += `<text x="${x(i)}" y="${H-6}" text-anchor="${n===1?"middle":i===0?"start":i===n-1?"end":"middle"}">${new Date(p.d+"T12:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"}).replace(".","")}</text>`; });
    const lastP = pts[n-1];
    g += `<text class="val" x="${Math.min(x(n-1),X1)}" y="${y(lastP.v)-10}" text-anchor="${n===1?"middle":"end"}">${fmt(lastP.v,dec)}</text>`;
    $("cLegend").textContent = metric==="cons"
      ? `Courbe : chaque plein complet · tirets : votre moyenne (${fmt(avgLine,1)} L/100)${ref?" · points gris : consommation annoncée":""}`
      : `Prix payé à chaque plein · tirets : prix moyen (${fmt(avgLine,3)} €/L)`;
  }
  svg.innerHTML = g;
}
$("cMetric").addEventListener("change", ()=>drawChart(stats()));
new ResizeObserver(()=>{ if(!$("tabLog").hidden) drawChart(stats()); }).observe($("cFig"));
$("addFill").onclick = () => { resetForm(); setForm(true); try{ $("lKm").focus({preventScroll:true}); }catch(e){} };
$("closeForm").onclick = () => { resetForm(); setForm(false); };

// ---------- modifier / supprimer un plein ----------
$("hist").addEventListener("click", ev=>{
  const b = ev.target.closest("button"); if(!b) return;
  if(b.dataset.del){
    const i = all.findIndex(e=>e.id===b.dataset.del); if(i<0) return;
    undo = {e:all[i], i}; markDeleted(undo.e.id, true); all.splice(i,1); store(all); refilter(); render();
    toast("Plein supprimé.", "Annuler", ()=>{ markDeleted(undo.e.id, false); all.splice(undo.i,0,undo.e); store(all); refilter(); render(); });
  }
  if(b.dataset.edit){
    const e = all.find(x=>x.id===b.dataset.edit); if(!e) return;
    editing = e.id;
    $("lDate").value=e.date; $("lKm").value=e.km||""; $("lL").value=e.l; $("lP").value=e.p; $("lT").value=e.t; $("lSt").value=e.st||""; $("lFull").checked=!!e.full;
    $("logFormTitle").textContent="Modifier le plein"; $("lSave").textContent="Enregistrer les modifications"; $("lCancel").hidden=false;
    setForm(true);
  }
});

// ---------- formulaire ----------
const num = id => { const v = parseFloat(String($(id).value).replace(",",".")); return isFinite(v) ? v : null; };
let lastTyped = "lP";
$("lP").addEventListener("input", ()=>{ lastTyped="lP"; const l=num("lL"), p=num("lP"); if(l&&p) $("lT").value=(l*p).toFixed(2); });
$("lT").addEventListener("input", ()=>{ lastTyped="lT"; const l=num("lL"), t=num("lT"); if(l&&t) $("lP").value=(t/l).toFixed(3); });
$("lL").addEventListener("input", ()=>{ const l=num("lL"), p=num("lP"), t=num("lT");
  if(l && lastTyped==="lP" && p) $("lT").value=(l*p).toFixed(2); else if(l && t) $("lP").value=(t/l).toFixed(3); });
function resetForm(){
  editing=null; $("logForm").reset(); $("lDate").value=today(); $("lFull").checked=true;
  $("logFormTitle").textContent="Ajouter un plein"; $("lSave").textContent="Enregistrer le plein"; $("lCancel").hidden=true;
}
$("lCancel").onclick = () => { resetForm(); setForm(!entries.length); };
$("logForm").addEventListener("submit", ev=>{
  ev.preventDefault();
  const l=num("lL"); let p=num("lP"), t=num("lT");
  if(!(l>0)) return toast("Indiquez le nombre de litres.");
  if(!(p>0) && t>0) p = t/l;
  if(!(t>0) && p>0) t = l*p;
  if(!(p>0)) return toast("Indiquez le prix au litre ou le total payé.");
  const km = num("lKm");
  const e = {id: editing || Date.now().toString(36)+Math.random().toString(36).slice(2,6), date:$("lDate").value||today(),
             km: km>0 ? Math.round(km) : null, l:Math.round(l*100)/100, p:Math.round(p*1000)/1000, t:Math.round(t*100)/100,
             full:$("lFull").checked, st:$("lSt").value.trim(), u:Date.now()};
  // compteur incohérent : avertissement, sans bloquer
  const prev = entries.filter(x=>x.km && x.id!==e.id && x.date<=e.date).sort((a,b)=>b.km-a.km)[0];
  if(e.km && prev && e.km < prev.km) toast("Attention : compteur plus petit qu'au plein précédent.");
  else toast(editing ? "Plein modifié ✓" : "Plein enregistré ✓");
  e.v = vid();
  if(editing){ const i=all.findIndex(x=>x.id===editing); if(i>=0) all[i]={...all[i],...e}; } else all.push(e);
  store(all); refilter(); resetForm(); setForm(false); render();
});

// ---------- barre de recherche de station : proches d'abord, filtre par texte ----------
const nrm = t => String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
let near = null, nearErr = "", fuelName = "", remote = [], remoteQ = "", tFind = null, picks = [], hl = -1;
const box = $("stPick"), inp = $("lSt");
function openPick(open){ box.hidden = !open; inp.setAttribute("aria-expanded", open?"true":"false"); }
function mark(txt, q){
  const t = esc(txt); if(!q) return t;
  const words = q.split(" ").filter(w=>w.length>1); if(!words.length) return t;
  const plain = nrm(txt); let out = t;
  // surligner seulement si le texte affiché ne contient pas d'accent (sinon on garde le texte tel quel)
  if(plain === String(txt).toLowerCase().replace(/[^a-z0-9]+/g," ").trim())
    words.forEach(w=>{ out = out.replace(new RegExp("("+w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),"<mark>$1</mark>"); });
  return out;
}
function drawPick(){
  const q = nrm(inp.value);
  let html = "", list = [];
  if(near === null && !nearErr){ box.innerHTML = `<p class="muted">Recherche des stations proches…</p>`; return; }
  const words = q.split(" ").filter(Boolean);
  const match = x => { const h = nrm(`${x.name} ${x.brand} ${x.ville} ${x.adresse} ${x.cp}`); return words.every(w=>h.includes(w)); };
  const local = (near||[]).filter(x=>!q || match(x)).slice(0, q?20:12);
  const seen = new Set(local.map(x=>x.id));
  const far = q ? remote.filter(x=>!seen.has(x.id) && match(x)).slice(0,15) : [];
  if(local.length){ html += `<p class="sec">${q?"Près de vous":"Les plus proches"} · ${esc(fuelName)}</p>`; list = list.concat(local); }
  html += local.map((x,i)=>item(x,i,q)).join("");
  if(far.length){ html += `<p class="sec">Autres résultats</p>` + far.map((x,i)=>item(x,local.length+i,q)).join(""); list = list.concat(far); }
  if(!list.length){
    html = nearErr && !q ? `<p class="muted">${esc(nearErr)}</p>`
      : q.length>=3 && remoteQ!==q ? `<p class="muted">Recherche de « ${esc(inp.value.trim())} »…</p>`
      : `<p class="muted">Aucune station trouvée${q?` pour « ${esc(inp.value.trim())} »`:""}.</p>`;
  }
  picks = list; hl = -1;
  box.innerHTML = html;
}
function item(x,i,q){
  return `<button type="button" role="option" data-i="${i}"><span>${mark(x.name,q)}</span><b>${fmt(x.price,3)} €</b>
    <small>${mark(x.ville,q)}${x.adresse?` · ${mark(x.adresse,q)}`:""}${x.km!=null?` · ${fmt(x.km,1)} km`:""}</small></button>`;
}
async function loadNear(){
  if(near !== null || nearErr) return;
  try{ const r = await window.ESSENCE_NEARBY(); near = r.list; fuelName = r.fuel; }
  catch(e){ near = []; nearErr = e.message || "Impossible de charger les stations."; }
  if(!box.hidden) drawPick();
}
function choose(x){
  inp.value = `${x.name}${x.ville?", "+x.ville:""}`;
  $("lP").value = x.price; lastTyped = "lP";
  const l = num("lL"); if(l) $("lT").value = (l*x.price).toFixed(2);
  openPick(false);
  toast(`Prix rempli : ${fmt(x.price,3)} €/L`);
  if(!l) try{ $("lL").focus(); }catch(e){}
}
inp.addEventListener("focus", ()=>{ openPick(true); drawPick(); loadNear(); });
inp.addEventListener("input", ()=>{
  openPick(true); drawPick();
  const q = nrm(inp.value); clearTimeout(tFind);
  if(q.length>=3) tFind = setTimeout(async ()=>{
    try{ const r = await window.ESSENCE_FIND(inp.value); if(nrm(inp.value)===q){ remote = r; remoteQ = q; drawPick(); } }
    catch(e){ remoteQ = q; drawPick(); }
  }, 350);
});
inp.addEventListener("keydown", ev=>{
  if(box.hidden) return;
  const btns = [...box.querySelectorAll("button[data-i]")];
  if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){ ev.preventDefault(); hl = Math.max(0, Math.min(btns.length-1, hl+(ev.key==="ArrowDown"?1:-1))); btns.forEach((b,i)=>b.classList.toggle("on", i===hl)); btns[hl]?.scrollIntoView({block:"nearest"}); }
  else if(ev.key==="Enter" && picks.length){ ev.preventDefault(); choose(picks[Math.max(0,hl)]); }
  else if(ev.key==="Escape"){ openPick(false); }
});
// pointerdown : choisir avant que le champ perde le focus
box.addEventListener("pointerdown", ev=>{ const b = ev.target.closest("button[data-i]"); if(b){ ev.preventDefault(); choose(picks[+b.dataset.i]); } });
box.addEventListener("click", ev=>{ const b = ev.target.closest("button[data-i]"); if(b && !box.hidden) choose(picks[+b.dataset.i]); });
inp.addEventListener("blur", ()=>setTimeout(()=>openPick(false), 150));
// changement de carburant / véhicule : recharger les stations proches
window.addEventListener("essence-vehicle", ()=>{ near = null; nearErr = ""; remote = []; remoteQ = ""; });

// ---------- depuis l'onglet « Trouver » ----------
window.CARNET = {
  prefill(x){
    showTab(true); resetForm(); setForm(true);
    if(x){ if(x.liters) $("lL").value=x.liters; if(x.price){ $("lP").value=x.price; lastTyped="lP"; if(x.liters) $("lT").value=(x.liters*x.price).toFixed(2); } if(x.station) $("lSt").value=x.station; }
    const lastKm = Math.max(0,...entries.map(e=>e.km||0));
    $("lKm").placeholder = lastKm ? `dernier : ${lastKm.toLocaleString("fr-FR")}` : "ex. 84 250";
    setTimeout(()=>{ $("logFormCard").scrollIntoView({behavior:"smooth",block:"start"}); try{ $("lKm").focus(); }catch(e){} }, 50);
    toast("Vérifiez les litres et le prix, ajoutez le compteur, puis enregistrez.");
  }
};

// ---------- export / import (sauvegarde) ----------
$("lExport").onclick = () => {
  const rows = [["date","compteur_km","litres","prix_litre","total_eur","plein_complet","station"],
    ...[...entries].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.km??"",e.l,e.p,e.t,e.full?"oui":"non",(e.st||"").replace(/[";\n]/g," ")])];
  const csv = "﻿"+rows.map(r=>r.join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download = `carnet-essence-${today()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
};
$("lImport").onchange = async ev => {
  const f = ev.target.files[0]; if(!f) return;
  const txt = (await f.text()).replace(/^﻿/,"");
  const lines = txt.split(/\r?\n/).filter(Boolean); const sep = lines[0].includes(";") ? ";" : ",";
  let added = 0;
  for(const line of lines.slice(1)){
    const [date,km,l,p,t,full,st] = line.split(sep);
    const L=parseFloat(String(l).replace(",",".")), P=parseFloat(String(p).replace(",",".")), T=parseFloat(String(t).replace(",","."));
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(L>0)) continue;
    if(entries.some(e=>e.date===date && Math.abs(e.l-L)<0.01)) continue; // déjà présent
    all.push({v:vid(), u:Date.now(), id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), date, km: parseInt(km)||null, l:L,
                  p: P>0?P:(T>0?T/L:0), t: T>0?T:(P>0?P*L:0), full: !/^non/i.test(full||""), st:(st||"").trim()});
    added++;
  }
  store(all); refilter(); render(); ev.target.value="";
  toast(added ? `${added} plein${added>1?"s":""} importé${added>1?"s":""} ✓` : "Aucun nouveau plein dans ce fichier.");
};

// ---------- petit message ----------
let tTimer;
function toast(msg, action, fn){
  const t = $("toast"); clearTimeout(tTimer);
  t.innerHTML = `<span>${esc(msg)}</span>${action?`<button type="button">${esc(action)}</button>`:""}`;
  t.hidden = false;
  if(action) t.querySelector("button").onclick = () => { fn(); t.hidden = true; };
  tTimer = setTimeout(()=>t.hidden=true, action?6000:3500);
}

window.addEventListener("essence-synced", ()=>{ all = load(); refilter(); render(); });
window.addEventListener("essence-vehicle", ()=>{ refilter(); resetForm(); formOpen=false; render(); });
resetForm();
render();
if(location.hash === "#carnet") showTab(true);
}
