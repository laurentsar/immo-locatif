/*
 * Immo Locatif — app.js
 * Score d'opportunité par quartier (rendement + payback + tendance + risque),
 * simulateur, actus marché (Google News RSS + sentiment), DVF réel Toulouse.
 * Données de référence éditables (localStorage). Rien = conseil en investissement.
 */
'use strict';

const D = window.IMMO_DATA;
const OVR_KEY = 'immoOverrides:v1';   // { "<marcheId>|<quartier>": {prix,loyer,trend} }
let overrides = load(OVR_KEY, {});
let curMarket = D.marches[0].id;
let curNews = D.marches[0].id;
let editing = null;

// ---------- utils ----------
function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function el(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function num(v) { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; }
function fmt(n) { return (Math.round(n)).toLocaleString('fr-FR'); }
function marche(id) { return D.marches.find(m => m.id === id); }

// Applique les valeurs éditées à un quartier.
function q(mId, quartier) {
  const o = overrides[mId + '|' + quartier.nom] || {};
  return {
    nom: quartier.nom,
    prix: o.prix != null ? o.prix : quartier.prix,
    loyer: o.loyer != null ? o.loyer : quartier.loyer,
    trend: o.trend != null ? o.trend : quartier.trend,
    risk: quartier.risk,
  };
}
// Rendement brut %, payback (années), score /10, reco.
function metrics(x) {
  const loyerAn = x.loyer * 12;                 // €/m²/an
  const rendement = x.prix > 0 ? (loyerAn / x.prix) * 100 : 0;
  const payback = loyerAn > 0 ? x.prix / loyerAn : 999;
  let score = rendement + x.trend * 0.5 - (x.risk - 1) * 1.2;
  score = Math.max(0, Math.min(10, score));
  const reco = score >= 6.5 ? 'buy' : score >= 4.5 ? 'watch' : 'avoid';
  return { rendement, payback, score, reco, loyerAn };
}

// ---------- HTTP (natif = CapacitorHttp pour contourner le CORS ; sinon proxy) ----------
const PROXY = 'https://api.allorigins.win/raw?url=';
async function httpText(url) {
  const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
  if (H) {
    const r = await H.get({ url, responseType: 'text', connectTimeout: 12000, readTimeout: 30000 });
    if (r.status && r.status >= 400) throw new Error('HTTP ' + r.status);
    return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
  }
  try {
    const r = await fetch(url);
    if (r.ok) return await r.text();
    throw new Error('http ' + r.status);
  } catch (e) {
    const r = await fetch(PROXY + encodeURIComponent(url));
    if (!r.ok) throw new Error('proxy ' + r.status);
    return await r.text();
  }
}

// ======================================================================
// MARCHÉS
// ======================================================================
function renderMarketTabs() {
  el('marketTabs').innerHTML = D.marches.map(m =>
    `<button class="market-tab${m.id === curMarket ? ' active' : ''}" data-m="${m.id}">${m.drapeau} ${esc(m.nom)}</button>`
  ).join('');
  el('marketTabs').querySelectorAll('.market-tab').forEach(b =>
    b.onclick = () => { curMarket = b.dataset.m; renderMarket(); });
}
function metricClass(v, good, mid, invert) {
  // invert=true : plus petit = mieux (payback)
  if (invert) return v <= good ? 'good' : v <= mid ? 'mid' : 'bad';
  return v >= good ? 'good' : v >= mid ? 'mid' : 'bad';
}
function renderMarket() {
  renderMarketTabs();
  const m = marche(curMarket);
  el('marketNote').textContent = 'ℹ️ ' + m.note;
  el('dvfBtn').hidden = !D.dvf[curMarket];

  const sort = el('sortQ').value;
  const rows = m.quartiers.map(qq => { const x = q(m.id, qq); return { x, k: metrics(x) }; });
  rows.sort((a, b) => {
    if (sort === 'rendement') return b.k.rendement - a.k.rendement;
    if (sort === 'prix') return a.x.prix - b.x.prix;
    return b.k.score - a.k.score;
  });

  el('quartierList').innerHTML = rows.map(({ x, k }) => {
    const recoTxt = { buy: 'ACHETER', watch: 'SURVEILLER', avoid: 'ÉVITER' }[k.reco];
    const scoreCol = k.reco === 'buy' ? 'var(--accent)' : k.reco === 'watch' ? 'var(--gold)' : 'var(--danger)';
    const tr = x.trend > 0 ? 'up' : x.trend < 0 ? 'down' : '';
    return `<div class="card">
      <div class="q-top">
        <p class="q-name">${esc(x.nom)}</p>
        <span class="q-reco reco-${k.reco}">${recoTxt}</span>
      </div>
      <div class="metrics">
        <div class="metric"><div class="v">${fmt(x.prix)}</div><div class="l">€/m² achat</div></div>
        <div class="metric"><div class="v">${x.loyer.toFixed(1)}</div><div class="l">€/m² loyer/mois</div></div>
        <div class="metric"><div class="v ${metricClass(k.rendement, 6, 4)}">${k.rendement.toFixed(1)}%</div><div class="l">rentabilité brute</div></div>
        <div class="metric"><div class="v ${metricClass(k.payback, 18, 25, true)}">${k.payback.toFixed(0)} ans</div><div class="l">pour rentabiliser</div></div>
      </div>
      <div class="q-foot">
        <div class="q-score">
          <span>Note ${k.score.toFixed(1)}/10</span>
          <span class="score-bar"><span class="score-fill" style="width:${k.score * 10}%;background:${scoreCol}"></span></span>
          <span class="trend ${tr}">${x.trend > 0 ? '▲' : x.trend < 0 ? '▼' : ''} ${x.trend > 0 ? '+' : ''}${x.trend}%/an</span>
        </div>
        <button class="q-edit" data-edit="${esc(x.nom)}">✏️</button>
      </div>
      <div class="q-actions">
        ${curMarket === 'espagne' ? `<button class="btn-idea" data-idea="${esc(x.nom)}">🏘️ Annonces Idealista</button>` : ''}
        <a class="btn-listings" href="${esc(D.listings[curMarket](x.nom))}" target="_blank" rel="noopener">🔎 Voir les biens disponibles</a>
      </div>
    </div>`;
  }).join('');
  el('quartierList').querySelectorAll('[data-edit]').forEach(b =>
    b.onclick = () => openEdit(b.dataset.edit));
  el('quartierList').querySelectorAll('[data-idea]').forEach(b =>
    b.onclick = () => openIdealista(b.dataset.idea));
}

// ---------- édition d'un quartier ----------
function openEdit(nom) {
  const m = marche(curMarket);
  const base = m.quartiers.find(qq => qq.nom === nom); if (!base) return;
  const x = q(m.id, base);
  editing = { mId: m.id, nom };
  el('qmTitle').textContent = '✏️ ' + nom;
  el('qmPrix').value = x.prix; el('qmLoyer').value = x.loyer; el('qmTrend').value = x.trend;
  el('qModal').hidden = false;
}
function saveEdit() {
  if (editing) {
    overrides[editing.mId + '|' + editing.nom] = {
      prix: num(el('qmPrix').value), loyer: num(el('qmLoyer').value), trend: num(el('qmTrend').value),
    };
    save(OVR_KEY, overrides);
    renderMarket();
  }
  el('qModal').hidden = true; editing = null;
}

// ======================================================================
// SIMULATEUR
// ======================================================================
function fillSimFisc() {
  el('simFisc').innerHTML = Object.entries(D.fisc).map(([k, f]) =>
    `<option value="${k}">${esc(f.label)}</option>`).join('');
}
function mensualite(capital, tauxAn, dureeAns) {
  const t = tauxAn / 100 / 12, n = dureeAns * 12;
  if (t === 0) return n ? capital / n : 0;
  return capital * t / (1 - Math.pow(1 + t, -n));
}
function runSim() {
  const prix = num(el('simPrix').value), surf = num(el('simSurf').value);
  const loyer = num(el('simLoyer').value), fraisPct = num(el('simFrais').value);
  const travaux = num(el('simTravaux').value), apport = num(el('simApport').value);
  const taux = num(el('simTaux').value), duree = num(el('simDuree').value);
  const chargesPct = num(el('simCharges').value);
  const fisc = D.fisc[el('simFisc').value] || D.fisc.fr;

  const invest = prix * (1 + fraisPct / 100) + travaux;
  const emprunt = Math.max(0, invest - apport);
  const mens = mensualite(emprunt, taux, duree);
  const loyerAn = loyer * 12;
  const rendBrut = invest > 0 ? loyerAn / invest * 100 : 0;
  const charges = loyerAn * chargesPct / 100;
  const taxe = loyer * fisc.taxeMois;
  const revenuNetAvImp = loyerAn - charges - taxe;
  const impot = Math.max(0, revenuNetAvImp) * fisc.imp / 100;
  const netApresImp = revenuNetAvImp - impot;
  const rendNet = invest > 0 ? netApresImp / invest * 100 : 0;
  const cashflow = (netApresImp - mens * 12) / 12;      // €/mois après crédit
  const payback = loyerAn > 0 ? invest / loyerAn : 0;

  const cf = cashflow >= 0 ? 'pos' : 'neg';
  el('simOut').className = 'sim-out show';
  el('simOut').innerHTML = `
    <div class="sim-grid">
      <div class="sim-kpi"><div class="v">${rendBrut.toFixed(2)}%</div><div class="l">Rentabilité brute</div></div>
      <div class="sim-kpi"><div class="v">${rendNet.toFixed(2)}%</div><div class="l">Rentabilité nette (après impôts)</div></div>
      <div class="sim-kpi"><div class="v ${cf}">${cashflow >= 0 ? '+' : ''}${fmt(cashflow)} €</div><div class="l">Cashflow /mois (après crédit)</div></div>
      <div class="sim-kpi"><div class="v">${payback.toFixed(1)} ans</div><div class="l">Retour sur invest. (brut)</div></div>
      <div class="sim-kpi"><div class="v">${fmt(mens)} €</div><div class="l">Mensualité crédit</div></div>
      <div class="sim-kpi"><div class="v">${fmt(invest)} €</div><div class="l">Investissement total</div></div>
    </div>
    <p class="sim-note">Prix/m² : <b>${fmt(surf ? prix / surf : 0)} €</b> · Loyer/m² : <b>${(surf ? loyer / surf : 0).toFixed(1)} €</b> · Emprunt : ${fmt(emprunt)} €.<br>
    Fiscalité : ${esc(fisc.note)} Chiffres indicatifs, hors frais de notaire exacts et cas particuliers.</p>`;
}

// ======================================================================
// ACTUS (Google News RSS + sentiment)
// ======================================================================
const BULL = /hausse|rebond|record|forte demande|augment|croissance|dynami|attractif|boom|sube|alza|repunte|creciente|en plein essor/i;
const BEAR = /baisse|chute|recul|crise|correction|effondr|ralenti|caída|bajada|desplome|risque|surchauffe/i;
function renderNewsTabs() {
  el('newsTabs').innerHTML = D.marches.map(m =>
    `<button class="market-tab${m.id === curNews ? ' active' : ''}" data-n="${m.id}">${m.drapeau} ${esc(m.nom)}</button>`
  ).join('');
  el('newsTabs').querySelectorAll('.market-tab').forEach(b =>
    b.onclick = () => { curNews = b.dataset.n; loadNews(); });
}
async function loadNews() {
  renderNewsTabs();
  el('sentiment').textContent = '';
  el('newsStatus').innerHTML = '<span class="spin">⏳</span> Chargement des actus…';
  el('newsList').innerHTML = '';
  try {
    const xml = await httpText(D.news[curNews]);
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = [...doc.querySelectorAll('item')].slice(0, 25);
    if (!items.length) { el('newsStatus').textContent = 'Aucune actu.'; return; }
    let bull = 0, bear = 0;
    el('newsList').innerHTML = items.map(it => {
      const title = (it.querySelector('title') || {}).textContent || '';
      const link = (it.querySelector('link') || {}).textContent || '#';
      const date = (it.querySelector('pubDate') || {}).textContent || '';
      if (BULL.test(title)) bull++; if (BEAR.test(title)) bear++;
      return `<a class="news-item" href="${esc(link)}" target="_blank" rel="noopener">
        <div class="t">${esc(title)}</div><div class="m">${esc(date.slice(0, 16))}</div></a>`;
    }).join('');
    const net = bull - bear;
    const label = net >= 2 ? '📈 Sentiment marché : haussier' : net <= -2 ? '📉 Sentiment marché : baissier' : '➖ Sentiment marché : neutre';
    const col = net >= 2 ? '#8ef0b0' : net <= -2 ? '#ff9b9b' : '#93a1bf';
    el('sentiment').innerHTML = `<span style="color:${col}">${label}</span> <span class="muted">(${bull} haussiers / ${bear} baissiers sur ${items.length} titres)</span>`;
    el('newsStatus').textContent = '';
  } catch (e) {
    el('newsStatus').textContent = '⚠️ Impossible de charger les actus (' + (e.message || e) + ').';
  }
}

// ======================================================================
// DVF réel (Toulouse)
// ======================================================================
function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
async function loadDvf() {
  const cfg = D.dvf[curMarket]; if (!cfg) return;
  el('dvfSub').innerHTML = '<span class="spin">⏳</span> Récupération des ventes officielles (' + cfg.annee + ')…';
  el('dvfList').innerHTML = '';
  el('dvfModal').hidden = false;
  try {
    const csv = await httpText(cfg.url(cfg.annee));
    const lines = csv.split('\n');
    const head = lines[0].split(',');
    const iType = head.indexOf('type_local'), iVal = head.indexOf('valeur_fonciere');
    const iSurf = head.indexOf('surface_reelle_bati'), iCp = head.indexOf('code_postal');
    const byCp = {};
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split(',');
      if (c.length < head.length) continue;
      if (c[iType] !== 'Appartement') continue;
      const val = parseFloat(c[iVal]), surf = parseFloat(c[iSurf]), cp = c[iCp];
      if (!(val > 0) || !(surf > 9) || !cp) continue;
      const pm2 = val / surf;
      if (pm2 < 500 || pm2 > 20000) continue;   // écarte les aberrations/lots
      (byCp[cp] = byCp[cp] || []).push(pm2);
    }
    const rows = Object.entries(byCp).map(([cp, arr]) => ({ cp, med: median(arr), n: arr.length }))
      .filter(r => r.n >= 5).sort((a, b) => a.cp.localeCompare(b.cp));
    if (!rows.length) { el('dvfList').innerHTML = '<p class="cp-note">Aucune donnée exploitable.</p>'; el('dvfSub').textContent = ''; return; }
    el('dvfSub').textContent = 'Ventes d\'appartements ' + cfg.annee + ' · prix/m² médian par code postal (source DVF officielle).';
    el('dvfList').innerHTML = rows.map(r =>
      `<div class="cp-row"><span class="k">${esc(r.cp)} <span class="muted">(${r.n} ventes)</span></span>
        <span class="v">${fmt(r.med)} €/m²</span></div>`).join('');
  } catch (e) {
    el('dvfSub').textContent = '';
    el('dvfList').innerHTML = '<p class="cp-note">⚠️ Échec (' + esc(e.message || String(e)) + '). Le fichier DVF est volumineux ; réessaie en Wi-Fi (fonctionne mieux dans l\'APK).</p>';
  }
}

// ======================================================================
// IDEALISTA (Espagne) — liste d'annonces in-app (clé API gratuite requise)
// ======================================================================
function ideaKey() { try { return (localStorage.getItem('ideaKey') || '').trim(); } catch (e) { return ''; } }
function ideaSecret() { try { return (localStorage.getItem('ideaSecret') || '').trim(); } catch (e) { return ''; } }
// POST form-urlencoded via CapacitorHttp (natif, contourne CORS) sinon fetch.
async function httpPostForm(url, headers, params) {
  const hdr = Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, headers);
  const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
  if (H) {
    const r = await H.post({ url, headers: hdr, data: params, connectTimeout: 12000, readTimeout: 20000 });
    if (r.status && r.status >= 400) throw new Error('HTTP ' + r.status);
    return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  }
  const body = Object.entries(params).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  const r = await fetch(url, { method: 'POST', headers: hdr, body });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.json();
}
async function ideaToken() {
  if (!ideaKey() || !ideaSecret()) throw new Error('no-key');
  const basic = btoa(ideaKey() + ':' + ideaSecret());
  const j = await httpPostForm(D.idealista.token, { Authorization: 'Basic ' + basic },
    { grant_type: 'client_credentials', scope: 'read' });
  if (!j.access_token) throw new Error('token refusé');
  return j.access_token;
}
async function ideaSearch(lat, lon) {
  const tok = await ideaToken();
  const j = await httpPostForm(D.idealista.search, { Authorization: 'Bearer ' + tok }, {
    operation: 'sale', propertyType: 'homes', center: lat + ',' + lon,
    distance: D.idealista.distance, maxItems: D.idealista.maxItems, numPage: 1,
    order: 'price', sort: 'asc', locale: 'es',
  });
  return j.elementList || [];
}
async function openIdealista(nom) {
  const m = marche('espagne');
  const base = m.quartiers.find(qq => qq.nom === nom);
  if (!base || base.lat == null) return;
  if (!ideaKey() || !ideaSecret()) { alert('Ajoute ta clé Idealista (apikey + secret) dans ℹ️ Infos.'); return; }
  el('ideaTitle').textContent = '🏘️ ' + nom;
  el('ideaList').innerHTML = '<p class="cp-note"><span class="spin">⏳</span> Recherche des annonces Idealista…</p>';
  el('ideaModal').hidden = false;
  try {
    const list = await ideaSearch(base.lat, base.lon);
    if (!list.length) { el('ideaList').innerHTML = '<p class="cp-note">Aucune annonce trouvée dans ce secteur.</p>'; return; }
    el('ideaList').innerHTML = list.map(p => {
      const pm2 = p.priceByArea ? Math.round(p.priceByArea) : (p.size ? Math.round(p.price / p.size) : 0);
      const addr = p.address || [p.district, p.municipality].filter(Boolean).join(', ') || 'Bien';
      return `<a class="idea-item" href="${esc(p.url || '#')}" target="_blank" rel="noopener">
        <div class="idea-l">
          <div class="idea-price">${fmt(p.price)} €</div>
          <div class="idea-sub">${esc(addr)}</div>
          <div class="idea-meta">${p.size ? Math.round(p.size) + ' m²' : ''}${p.rooms ? ' · ' + p.rooms + ' pce' + (p.rooms > 1 ? 's' : '') : ''}${pm2 ? ' · ' + fmt(pm2) + ' €/m²' : ''}</div>
        </div><span class="idea-go">→</span></a>`;
    }).join('');
  } catch (e) {
    const msg = (e && e.message) || String(e);
    el('ideaList').innerHTML = '<p class="cp-note">⚠️ ' +
      (msg === 'no-key' ? 'Clé manquante (ℹ️ Infos).' :
        'Échec (' + esc(msg) + '). Vérifie ta clé/secret. En navigateur le CORS bloque — ça marche dans l\'APK. Quota ~100 req/mois.') + '</p>';
  }
}

// ======================================================================
// MAJ in-app (plugin natif) + version
// ======================================================================
function cmpVer(a, b) {
  const x = String(a).replace(/^v/, '').split('.'), y = String(b).replace(/^v/, '').split('.');
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (parseInt(x[i], 10) || 0) - (parseInt(y[i], 10) || 0); if (d) return d; }
  return 0;
}
async function installApkUpdate(url, statusEl, onEnd) {
  const UP = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UpdatePlugin;
  if (UP && url) {
    if (statusEl) statusEl.textContent = '⏳ Téléchargement…';
    try { await UP.downloadAndInstall({ url }); }
    catch (e) {
      const m = (e && e.message) || String(e);
      alert(/permission/i.test(m) ? "Autorise « Installer des applis inconnues » pour Immo Locatif." : 'Échec MAJ : ' + m);
      if (onEnd) onEnd();
    }
    return;
  }
  window.open(url, '_blank'); if (onEnd) onEnd();
}
window.installApkUpdate = installApkUpdate;
async function checkUpdate() {
  const st = el('updState'); st.textContent = ' · vérification…';
  try {
    const r = await fetch('https://api.github.com/repos/' + window.UPDATE_REPO + '/releases/latest?_=' + Date.now(), { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rel = await r.json();
    const latest = String(rel.tag_name || '').replace(/^v/, '');
    if (cmpVer(latest, window.APP_VERSION) > 0) {
      st.innerHTML = ' · <b style="color:#22c55e">v' + esc(latest) + ' disponible !</b>';
      const apk = (rel.assets || []).find(a => /\.apk$/i.test(a.name));
      installApkUpdate(apk ? apk.browser_download_url : rel.html_url, st);
    } else st.innerHTML = ' · <span style="color:#22c55e">à jour ✅</span>';
  } catch (e) { st.textContent = ' · échec de la vérification.'; }
}

// ======================================================================
// TABS + INIT
// ======================================================================
function initTabs() {
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    el('tab-' + t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'news' && !el('newsList').children.length) loadNews();
  });
}
function init() {
  initTabs();
  renderMarket();
  fillSimFisc();
  el('sortQ').onchange = renderMarket;
  el('dvfBtn').onclick = loadDvf;
  el('simRun').onclick = runSim;
  el('qmCancel').onclick = () => { el('qModal').hidden = true; editing = null; };
  el('qmSave').onclick = saveEdit;
  el('qModal').addEventListener('click', e => { if (e.target === el('qModal')) el('qModal').hidden = true; });
  el('dvfClose').onclick = () => { el('dvfModal').hidden = true; };
  el('dvfModal').addEventListener('click', e => { if (e.target === el('dvfModal')) el('dvfModal').hidden = true; });
  el('ideaClose').onclick = () => { el('ideaModal').hidden = true; };
  el('ideaModal').addEventListener('click', e => { if (e.target === el('ideaModal')) el('ideaModal').hidden = true; });
  el('ideaKeyInput').value = ideaKey();
  el('ideaSecretInput').value = ideaSecret();
  el('ideaSaveBtn').onclick = () => {
    try {
      localStorage.setItem('ideaKey', el('ideaKeyInput').value.trim());
      localStorage.setItem('ideaSecret', el('ideaSecretInput').value.trim());
    } catch (e) {}
    el('ideaSaveState').textContent = ' ✅ enregistré';
  };
  el('appVersion').textContent = 'v' + (window.APP_VERSION || '?');
  el('verChip').textContent = 'v' + (window.APP_VERSION || '?');
  el('checkUpdBtn').onclick = checkUpdate;
  el('resetData').onclick = () => { overrides = {}; save(OVR_KEY, {}); renderMarket(); };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.addEventListener('DOMContentLoaded', init);
