// Comptes (Firebase) : connexion e-mail / Google et synchronisation des réglages + carnet entre appareils.
// S'active uniquement si window.FIREBASE_CONFIG est renseigné (voir firebase-config.js).
const cfg = window.FIREBASE_CONFIG;
const $ = id => document.getElementById(id);
const K = {prefs:"essence_prefs2", prefsAt:"essence_prefs_at", carnet:"essence_carnet", del:"essence_carnet_deleted", garage:"essence_garage"};
const SDK = "https://www.gstatic.com/firebasejs/13.4.0";

if (cfg && cfg.apiKey) start().catch(e => console.error("Compte :", e));

async function start(){
  const [{initializeApp}, A, F] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`)]);
  const app = initializeApp(cfg);
  const auth = A.getAuth(app);
  auth.languageCode = "fr";
  const db = F.getFirestore(app);
  let user = null, applying = false, pushTimer = null;

  // ---------- lecture d'un ticket de caisse par Gemini (Firebase AI Logic) ----------
  const MODELS = ["gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-2.5-flash"];
  let aiMod = null;
  window.ESSENCE_SCAN = async (b64, mime) => {
    if(!user) throw new Error("Connectez-vous à votre compte (bouton en haut à droite) pour scanner un ticket.");
    aiMod = aiMod || await import(`${SDK}/firebase-ai.js`);
    const AI = aiMod, ai = AI.getAI(app, {backend: new AI.GoogleAIBackend()});
    const schema = AI.Schema.object({properties:{
      date: AI.Schema.string({description:"date du ticket au format AAAA-MM-JJ, vide si absente"}),
      litres: AI.Schema.number({description:"volume de carburant en litres, 0 si absent"}),
      prix_litre: AI.Schema.number({description:"prix au litre en euros, 0 si absent"}),
      total: AI.Schema.number({description:"montant payé pour le carburant en euros, 0 si absent"}),
      station: AI.Schema.string({description:"enseigne et ville de la station, vide si absente"}),
      carburant: AI.Schema.string({description:"type de carburant (Gazole, SP95, SP95-E10, SP98, E85, GPL), vide si absent"})
    }});
    const prompt = "Voici la photo d'un ticket de caisse de station-service en France. Lis uniquement la ligne de carburant : date, litres (ou « Qté »/« Volume »), prix unitaire au litre, montant total TTC du carburant, enseigne + ville de la station et type de carburant. Les virgules sont des séparateurs décimaux. N'invente rien : mets 0 ou une chaîne vide si une information n'est pas lisible.";
    let lastErr = null;
    for(const m of MODELS){
      try{
        const model = AI.getGenerativeModel(ai, {model:m, generationConfig:{responseMimeType:"application/json", responseSchema:schema, temperature:0}});
        const r = await model.generateContent([prompt, {inlineData:{data:b64, mimeType:mime}}]);
        return JSON.parse(r.response.text());
      }catch(e){
        lastErr = e; const t = String(e?.message||e);
        if(/not found|404|is not supported|unsupported model/i.test(t)) continue;   // modèle indisponible : essayer le suivant
        break;
      }
    }
    const t = String(lastErr?.message||lastErr);
    if(/API has not been used|not been enabled|SERVICE_DISABLED|PERMISSION_DENIED|api-not-enabled|firebasevertexai|generativelanguage/i.test(t))
      throw new Error("Gemini n'est pas encore activé : console Firebase → AI Logic → Commencer → Gemini Developer API.");
    if(/quota|RESOURCE_EXHAUSTED|429/i.test(t)) throw new Error("Quota gratuit de Gemini atteint pour aujourd'hui. Réessayez plus tard ou saisissez à la main.");
    throw new Error("Lecture du ticket impossible : " + t.slice(0,140));
  };

  // ---------- interface ----------
  const btn = $("acctBtn"), dlg = $("acct");
  btn.hidden = false;
  btn.onclick = () => { $("acctErr").textContent = ""; dlg.showModal ? dlg.showModal() : dlg.setAttribute("open",""); };
  const err = e => { $("acctErr").textContent = message(e); };
  const busy = (on) => dlg.querySelectorAll("button").forEach(b => b.disabled = on);
  function showState(){
    $("acctOut").hidden = !!user; $("acctIn").hidden = !user;
    btn.classList.toggle("on", !!user);
    btn.setAttribute("aria-label", user ? "Mon compte (connecté)" : "Se connecter");
    if(user) $("acctMail").textContent = user.email || user.displayName || "compte Google";
  }
  const state = t => { const el = $("syncState"); if(el) el.textContent = t; };

  $("gBtn").onclick = async () => {
    $("acctErr").textContent = ""; busy(true);
    const prov = new A.GoogleAuthProvider();
    try {
      // en mode « app sur l'écran d'accueil », la fenêtre surgissante n'est pas fiable : redirection
      if (navigator.standalone || matchMedia("(display-mode: standalone)").matches) await A.signInWithRedirect(auth, prov);
      else await A.signInWithPopup(auth, prov);
    } catch(e) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
        try { await A.signInWithRedirect(auth, prov); } catch(e2) { err(e2); }
      } else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") err(e);
    } finally { busy(false); }
  };
  A.getRedirectResult(auth).catch(err);
  $("mailForm").onsubmit = async ev => {
    ev.preventDefault(); $("acctErr").textContent = ""; busy(true);
    try { await A.signInWithEmailAndPassword(auth, $("aMail").value.trim(), $("aPass").value); }
    catch(e){ err(e); } finally { busy(false); }
  };
  $("aSignup").onclick = async () => {
    $("acctErr").textContent = "";
    if(!$("mailForm").reportValidity()) return;
    busy(true);
    try { await A.createUserWithEmailAndPassword(auth, $("aMail").value.trim(), $("aPass").value); }
    catch(e){ err(e); } finally { busy(false); }
  };
  $("aReset").onclick = async () => {
    const m = $("aMail").value.trim();
    if(!m) return $("acctErr").textContent = "Tapez d'abord votre e-mail.";
    try { await A.sendPasswordResetEmail(auth, m); $("acctErr").textContent = "E-mail de réinitialisation envoyé ✓"; }
    catch(e){ err(e); }
  };
  $("aOut").onclick = async () => { await A.signOut(auth); state(""); };
  $("aSync").onclick = () => sync(true);

  // ---------- données locales ----------
  const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e) { return d; } };
  const local = () => ({ prefs: localStorage.getItem(K.prefs) || "", prefsAt: +localStorage.getItem(K.prefsAt) || 0,
                         carnet: readJSON(K.carnet, []), deleted: readJSON(K.del, []), garage: readJSON(K.garage, null) });

  // toute modification locale est envoyée au compte (avec un petit délai)
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v){
    setItem.call(this, k, v);
    if (this === localStorage && !applying && user && Object.values(K).includes(k)) {
      clearTimeout(pushTimer); pushTimer = setTimeout(() => push(), 1500);
    }
  };

  const ref = () => F.doc(db, "users", user.uid);
  async function push(){
    if(!user) return;
    const l = local();
    try {
      await F.setDoc(ref(), { prefs:l.prefs, prefsAt:l.prefsAt, carnet:l.carnet, deleted:l.deleted.slice(-500), garage:l.garage||null, updatedAt:F.serverTimestamp() });
      state(`Synchronisé à ${new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} ✓`);
    } catch(e) { state("Synchronisation impossible : " + message(e)); }
  }

  // fusion : pleins réunis (sans doublons, suppressions respectées), réglages les plus récents
  async function sync(manual){
    if(!user) return;
    state("Synchronisation…");
    let r = {};
    try { const snap = await F.getDoc(ref()); r = snap.exists() ? snap.data() : {}; }
    catch(e) { state("Synchronisation impossible : " + message(e)); return; }
    const l = local();
    const deleted = new Set([...(r.deleted||[]), ...l.deleted]);
    const byId = new Map();
    for (const e of [...(r.carnet||[]), ...l.carnet]) {
      if (!e || !e.id || deleted.has(e.id)) continue;
      const prev = byId.get(e.id);
      if (!prev || (e.u||0) > (prev.u||0)) byId.set(e.id, e);
    }
    const carnet = [...byId.values()].sort((a,b)=>a.date.localeCompare(b.date));
    const useRemotePrefs = r.prefs && (r.prefsAt||0) > l.prefsAt;
    const prefs = useRemotePrefs ? r.prefs : l.prefs;
    const prefsAt = Math.max(r.prefsAt||0, l.prefsAt);

    // véhicules : réunis par identifiant (le plus récent gagne), suppressions respectées
    const lg = l.garage || {list:[],del:[]}, rg = r.garage || {list:[],del:[]};
    const gdel = new Set([...(rg.del||[]), ...(lg.del||[])]);
    const gmap = new Map();
    // un véhicule vide créé automatiquement sur un nouvel appareil est ignoré si le compte en a déjà
    const lList = (rg.list||[]).length ? (lg.list||[]).filter(v=>!v.blank) : (lg.list||[]);
    for (const v of [...(rg.list||[]), ...lList]) { if(!v || gdel.has(v.id)) continue; const pv = gmap.get(v.id); if(!pv || (v.u||0) > (pv.u||0)) gmap.set(v.id, v); }
    const garage = gmap.size ? {list:[...gmap.values()], del:[...gdel], active: (useRemotePrefs || !gmap.has(lg.active) ? rg.active : lg.active) || [...gmap.keys()][0]} : (l.garage || r.garage || null);
    if (garage && !garage.list.some(v=>v.id===garage.active)) garage.active = garage.list[0]?.id;
    const garageChanged = JSON.stringify(garage) !== JSON.stringify(l.garage);
    const carnetChanged = JSON.stringify(carnet) !== JSON.stringify([...l.carnet].sort((a,b)=>a.date.localeCompare(b.date)));
    applying = true;
    try {
      setItem.call(localStorage, K.carnet, JSON.stringify(carnet));
      setItem.call(localStorage, K.del, JSON.stringify([...deleted]));
      if (useRemotePrefs) { setItem.call(localStorage, K.prefs, prefs); setItem.call(localStorage, K.prefsAt, String(prefsAt)); }
      if (garage) setItem.call(localStorage, K.garage, JSON.stringify(garage));
    } finally { applying = false; }
    await push();

    if ((useRemotePrefs && prefs !== l.prefs) || garageChanged) {
      // nouveaux réglages venus d'un autre appareil : on recharge une fois pour les appliquer
      if (!sessionStorage.getItem("essence_synced_reload")) { sessionStorage.setItem("essence_synced_reload","1"); location.reload(); return; }
    }
    if (carnetChanged) window.dispatchEvent(new Event("essence-synced"));
    if (manual) state(`Synchronisé à ${new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} ✓`);
  }

  A.onAuthStateChanged(auth, async u => {
    user = u; showState();
    if (u) { if (dlg.open) dlg.close(); await sync(false); setTimeout(()=>sessionStorage.removeItem("essence_synced_reload"), 3000); }
  });
  // retour sur l'application : on récupère ce qui a changé ailleurs
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && user) sync(false); });
}

function message(e){
  const c = (e && e.code) || "";
  const M = {
    "auth/invalid-credential":"E-mail ou mot de passe incorrect.", "auth/wrong-password":"Mot de passe incorrect.",
    "auth/user-not-found":"Aucun compte avec cet e-mail. Touchez « Créer un compte ».",
    "auth/email-already-in-use":"Un compte existe déjà avec cet e-mail : touchez « Se connecter ».",
    "auth/weak-password":"Mot de passe trop court (6 caractères minimum).", "auth/invalid-email":"Adresse e-mail invalide.",
    "auth/too-many-requests":"Trop d'essais. Réessayez dans quelques minutes.",
    "auth/network-request-failed":"Pas de connexion internet.",
    "auth/unauthorized-domain":"Ce site n'est pas autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés).",
    "auth/operation-not-allowed":"Ce mode de connexion n'est pas activé dans Firebase (Authentication → Méthodes de connexion).",
    "auth/popup-blocked":"La fenêtre de connexion a été bloquée. Réessayez.",
    "permission-denied":"Accès refusé par la base de données (vérifiez les règles Firestore).",
    "unavailable":"Service momentanément indisponible. Réessayez."
  };
  return M[c] || (e && e.message ? e.message.replace(/^Firebase:\s*/,"") : "Erreur inconnue.");
}
