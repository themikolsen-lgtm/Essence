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
let entries = load(), editing = null, undo = null;

// ---------- onglets ----------
function showTab(log){
  $("tabFind").hidden = log; $("tabLog").hidden = !log;
  $("tabBtnFind").setAttribute("aria-selected", !log); $("tabBtnLog").setAttribute("aria-selected", log);
  try{ history.replaceState(null, "", log ? "#carnet" : location.pathname); }catch(e){}
  if(log) render();
  window.scrollTo(0,0);
}
$("tabBtnFind").onclick = () => showTab(false);
$("tabBtnLog").onclick = () => showTab(true);
if(location.hash === "#carnet") showTab(true);

// ---------- calculs ----------
function stats(){
  const byKm = entries.filter(e=>e.km>0).sort((a,b)=>a.km-b.km || a.date.localeCompare(b.date));
  // consommation réelle : entre deux pleins complets, litres remis / km parcourus
  const cons = {};
  let lastFull = null, liters = 0;
  for(const e of byKm){
    if(lastFull){ liters += e.l; }
    if(e.full){
      if(lastFull && e.km > lastFull.km){
        const v = liters / (e.km - lastFull.km) * 100;
        if(v > 1 && v < 40) cons[e.id] = v;
      }
      lastFull = e; liters = 0;
    }
  }
  const vals = Object.values(cons);
  // moyenne pondérée sur toute la période couverte par des pleins complets
  const fulls = byKm.filter(e=>e.full);
  let avg = null;
  if(fulls.length >= 2){
    const first = fulls[0], last = fulls[fulls.length-1];
    const l = byKm.filter(e=>e.km>first.km && e.km<=last.km).reduce((s,e)=>s+e.l,0);
    if(last.km > first.km) avg = l/(last.km-first.km)*100;
  }
  const total = entries.reduce((s,e)=>s+e.t,0), litres = entries.reduce((s,e)=>s+e.l,0);
  const kmSpan = byKm.length>=2 ? byKm[byKm.length-1].km - byKm[0].km : 0;
  const spentInSpan = byKm.length>=2 ? byKm.slice(1).reduce((s,e)=>s+e.t,0) : 0;
  const ym = today().slice(0,7);
  const month = entries.filter(e=>e.date.startsWith(ym)).reduce((s,e)=>s+e.t,0);
  return {cons, avg: avg ?? (vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null), total, litres,
          pAvg: litres ? total/litres : null, perKm: kmSpan>0 ? spentInSpan/kmSpan : null, kmSpan, month};
}

// ---------- affichage ----------
function render(){
  const s = stats();
  const kpi = (v,label,main) => `<div class="kpi${main?" main":""}"><b>${v}</b><span>${label}</span></div>`;
  $("kpis").innerHTML =
    kpi(s.avg!=null ? fmt(s.avg,1)+" L" : "–", "consommation réelle / 100 km", true) +
    kpi(fmt(s.month)+" €", "dépensé ce mois-ci") +
    kpi(s.pAvg!=null ? fmt(s.pAvg,3)+" €" : "–", "prix moyen du litre") +
    kpi(s.perKm!=null ? fmt(s.perKm*100,2)+" €" : "–", "carburant pour 100 km");
  $("kpiNote").textContent = !entries.length ? "Ajoutez votre premier plein ci-dessous."
    : s.avg==null ? "La consommation réelle s'affiche après deux pleins complets avec le compteur kilométrique."
    : `${entries.length} plein${entries.length>1?"s":""} · ${fmt(s.litres,1)} L · ${fmt(s.total)} € au total${s.kmSpan?` · ${s.kmSpan.toLocaleString("fr-FR")} km suivis`:""}`;
  const ub = $("useReal");
  if(s.avg!=null){ ub.style.display=""; ub.textContent = `Utiliser ${fmt(s.avg,1)} L/100 km dans les calculs`; ub.onclick = () => { window.ESSENCE_SET_CONSO?.(Math.round(s.avg*10)/10); toast("Consommation réelle utilisée pour trouver la station."); }; }
  else ub.style.display="none";

  // dépenses des 6 derniers mois
  const months = [];
  const d = new Date(); d.setDate(1);
  for(let i=5;i>=0;i--){ const x = new Date(d.getFullYear(), d.getMonth()-i, 1); months.push(`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`); }
  const sums = months.map(m=>entries.filter(e=>e.date.startsWith(m)).reduce((a,e)=>a+e.t,0));
  const mx = Math.max(...sums, 1);
  $("monthsCard").hidden = !entries.length;
  $("months").innerHTML = months.map((m,i)=>`<div class="bar"><span>${MOIS[+m.slice(5)-1]} ${m.slice(2,4)}</span><i style="width:${sums[i]/mx*100}%"></i><span>${fmt(sums[i],0)} €</span></div>`).join("");

  // historique
  $("histCard").hidden = !entries.length;
  const list = [...entries].sort((a,b)=>b.date.localeCompare(a.date) || (b.km||0)-(a.km||0));
  $("hist").innerHTML = list.map(e=>`<div class="entry">
      <div><b>${new Date(e.date+"T12:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}</b>${s.cons[e.id]!=null?`<span class="cons">${fmt(s.cons[e.id],1)} L/100</span>`:""}
        <div class="m">${fmt(e.l,2)} L × ${fmt(e.p,3)} €${e.km?` · ${(+e.km).toLocaleString("fr-FR")} km`:""}${e.full?"":" · plein partiel"}${e.st?` · ${esc(e.st)}`:""}</div></div>
      <div class="r">${fmt(e.t)} €</div>
      <div class="acts"><button type="button" data-edit="${e.id}">Modifier</button><button type="button" data-del="${e.id}">Supprimer</button></div>
    </div>`).join("");
}
$("hist").addEventListener("click", ev=>{
  const b = ev.target.closest("button"); if(!b) return;
  if(b.dataset.del){
    const i = entries.findIndex(e=>e.id===b.dataset.del); if(i<0) return;
    undo = {e:entries[i], i}; markDeleted(undo.e.id, true); entries.splice(i,1); store(entries); render();
    toast("Plein supprimé.", "Annuler", ()=>{ markDeleted(undo.e.id, false); entries.splice(undo.i,0,undo.e); store(entries); render(); });
  }
  if(b.dataset.edit){
    const e = entries.find(x=>x.id===b.dataset.edit); if(!e) return;
    editing = e.id;
    $("lDate").value=e.date; $("lKm").value=e.km||""; $("lL").value=e.l; $("lP").value=e.p; $("lT").value=e.t; $("lSt").value=e.st||""; $("lFull").checked=!!e.full;
    $("logFormTitle").textContent="Modifier le plein"; $("lSave").textContent="Enregistrer les modifications"; $("lCancel").hidden=false;
    $("logFormCard").scrollIntoView({behavior:"smooth",block:"start"});
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
$("lCancel").onclick = resetForm;
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
  if(editing){ const i=entries.findIndex(x=>x.id===editing); entries[i]=e; } else entries.push(e);
  store(entries); resetForm(); render();
});

// ---------- choisir une station proche : nom + prix du jour ----------
$("stPickBtn").onclick = async () => {
  const box = $("stPick");
  if(!box.hidden){ box.hidden = true; return; }
  box.hidden = false; box.innerHTML = `<p class="muted">Recherche des stations proches…</p>`;
  try{
    const r = await window.ESSENCE_NEARBY();
    if(!r.list.length){ box.innerHTML = `<p class="muted">Aucune station trouvée à proximité pour le ${esc(r.fuel)}.</p>`; return; }
    box.innerHTML = `<p class="muted">Prix du ${esc(r.fuel)} aujourd'hui :</p>` + r.list.map((x,i)=>`<button type="button" data-i="${i}">
        <span>${esc(x.name)}</span><b>${fmt(x.price,3)} €</b><small>${esc(x.ville)} · ${fmt(x.km,1)} km</small></button>`).join("");
    box.onclick = ev => {
      const b = ev.target.closest("button[data-i]"); if(!b) return;
      const x = r.list[+b.dataset.i];
      $("lSt").value = `${x.name}${x.ville?", "+x.ville:""}`;
      $("lP").value = x.price; lastTyped = "lP";
      const l = num("lL"); if(l) $("lT").value = (l*x.price).toFixed(2);
      box.hidden = true;
      toast(`Prix rempli : ${fmt(x.price,3)} €/L`);
      if(!l) try{ $("lL").focus(); }catch(e){}
    };
  }catch(e){ box.innerHTML = `<p class="muted">${esc(e.message||"Impossible de charger les stations.")}</p>`; }
};

// ---------- depuis l'onglet « Trouver » ----------
window.CARNET = {
  prefill(x){
    showTab(true); resetForm();
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
    entries.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6), date, km: parseInt(km)||null, l:L,
                  p: P>0?P:(T>0?T/L:0), t: T>0?T:(P>0?P*L:0), full: !/^non/i.test(full||""), st:(st||"").trim()});
    added++;
  }
  store(entries); render(); ev.target.value="";
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

window.addEventListener("essence-synced", ()=>{ entries = load(); render(); });
resetForm();
render();
}
