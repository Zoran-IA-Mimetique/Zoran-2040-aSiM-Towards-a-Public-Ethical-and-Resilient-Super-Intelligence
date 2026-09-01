/* ============================================================
   ZORAN Biz Mobile — moteur applicatif
   - JSON central unique pilotant tous les écrans
   - Validation (types, min/max, messages)
   - Pipeline "Python virtuel" : JSON -> Validation -> Calcul -> ROI -> Devis
   - Import multi-format (PDF / Word / email / texte / HTML / URL)
   - Export PDF / Word / Email
   - Audit complet (qui / quoi / quand / avant / après)
   ============================================================ */
'use strict';

/* ---------------------------------------------------------------
   1. CONFIGURATION MÉTIER
--------------------------------------------------------------- */
const CONFIG = {
  devise: '€',
  operateur: 'Xavier',

  // Catalogue des modules ZORAN (écran 3)
  modules: [
    { id: 'memoire',     nom: 'Mémoire',                icon: '🧠', desc: 'Mémoire longue durée et contexte client.',        cout: 1800 },
    { id: 'audit',       nom: 'Audit',                  icon: '🛡️', desc: 'Traçabilité complète des décisions.',             cout: 1500 },
    { id: 'pdf',         nom: 'PDF',                    icon: '📄', desc: 'Génération et lecture documentaire.',             cout: 900  },
    { id: 'agents',      nom: 'Agents',                 icon: '🤖', desc: 'Agents autonomes spécialisés par métier.',        cout: 3200 },
    { id: 'skills',      nom: 'Skills',                 icon: '🧩', desc: 'Compétences activables à la demande.',            cout: 2100 },
    { id: 'coherence',   nom: 'Cohérence phénoménale',  icon: '🔗', desc: 'Contrôle de cohérence transversale.',             cout: 2600 },
    { id: 'cinematique', nom: 'Cinématique',            icon: '🎬', desc: 'Restitution visuelle des scénarios.',             cout: 1700 },
    { id: 'futur',       nom: 'Futur probable',         icon: '🔮', desc: 'Projection prospective et anticipation.',         cout: 2900 }
  ],

  // Paliers de licence (écran 5) — prix par utilisateur / an
  licences: [
    { id: 'starter',    nom: 'Starter',    maxUsers: 25,     prixUserAn: 240,  desc: 'Petites équipes, déploiement rapide.' },
    { id: 'business',   nom: 'Business',   maxUsers: 150,    prixUserAn: 200,  desc: 'PME multi-services, usage quotidien.' },
    { id: 'enterprise', nom: 'Enterprise', maxUsers: 1000,   prixUserAn: 165,  desc: 'Grands comptes, intégrations avancées.' },
    { id: 'corporate',  nom: 'Corporate',  maxUsers: Infinity, prixUserAn: 130, desc: 'Déploiement groupe, SLA dédié.' }
  ],

  // Prestations de service du devis (écran 7)
  services: {
    installationBase: 3500,   // forfait
    parametrageParService: 650,
    formationParManager: 180,
    formationParExpert: 260,
    supportPctLicence: 0.18,  // % du coût licences / an
    maintenancePctLicence: 0.12
  },

  // Versions de discours (écran 8)
  versions: [
    { id: 'DG',           nom: 'DG',           icon: '👔', angle: 'vision & rentabilité' },
    { id: 'DSI',          nom: 'DSI',          icon: '🖥️', angle: 'sécurité & intégration' },
    { id: 'Technique',    nom: 'Technique',    icon: '⚙️', angle: 'architecture & API' },
    { id: 'Investisseur', nom: 'Investisseur', icon: '💹', angle: 'croissance & marché' },
    { id: 'BTP',          nom: 'BTP',          icon: '🏗️', angle: 'chantiers & devis' },
    { id: 'Industrie',    nom: 'Industrie',    icon: '🏭', angle: 'production & qualité' },
    { id: 'Sante',        nom: 'Santé',        icon: '🏥', angle: 'conformité & soin' },
    { id: 'Collectivite', nom: 'Collectivité', icon: '🏛️', angle: 'service public & RGPD' },
    { id: 'Banque',       nom: 'Banque',       icon: '🏦', angle: 'risque & réglementation' },
    { id: 'Assurance',    nom: 'Assurance',    icon: '📊', angle: 'sinistres & actuariat' }
  ]
};

/* ---------------------------------------------------------------
   2. SCHÉMA DE VALIDATION (types, min/max, messages)
--------------------------------------------------------------- */
const SCHEMA = {
  'client.entreprise':     { type: 'string', required: true, min: 2, max: 120, msg: "Renseignez le nom de l'entreprise." },
  'client.siteWeb':        { type: 'url', required: false, max: 200, msg: "URL invalide (ex. https://exemple.fr)." },
  'client.pays':           { type: 'string', required: false, max: 60 },
  'client.interlocuteur':  { type: 'string', required: true, min: 2, max: 80, msg: "Renseignez l'interlocuteur." },
  'client.fonction':       { type: 'string', required: false, max: 80 },
  'client.objectif':       { type: 'string', required: false, max: 600 },

  'dimension.employes':    { type: 'int', required: true, min: 1, max: 100000, msg: "1 à 100 000 employés." },
  'dimension.services':    { type: 'int', required: true, min: 1, max: 500, msg: "1 à 500 services." },
  'dimension.utilisateurs':{ type: 'int', required: true, min: 1, max: 50000, msg: "1 à 50 000 utilisateurs." },
  'dimension.managers':    { type: 'int', required: true, min: 0, max: 50000, msg: "0 à 50 000 managers." },
  'dimension.experts':     { type: 'int', required: true, min: 0, max: 50000, msg: "0 à 50 000 experts." },
  'dimension.documents':   { type: 'int', required: true, min: 0, max: 10000000, msg: "0 à 10 000 000 documents." },

  'roiHyp.heures':         { type: 'float', required: true, min: 0, max: 20, msg: "0 à 20 h/semaine." },
  'roiHyp.coutHoraire':    { type: 'float', required: true, min: 10, max: 500, msg: "Coût horaire entre 10 et 500." },
  'roiHyp.adoption':       { type: 'int', required: true, min: 10, max: 100, msg: "Adoption entre 10 et 100 %." },
  'roiHyp.semaines':       { type: 'int', required: true, min: 20, max: 52, msg: "20 à 52 semaines." },

  'profil.maturiteIA':     { type: 'int', required: true, min: 0, max: 6, msg: "Maturité de 0 à 6." }
};

/* ---------------------------------------------------------------
   3. ÉTAT (JSON CENTRAL UNIQUE)
--------------------------------------------------------------- */
const STORAGE_KEY = 'zoran-biz-mobile-state-v1';

/* Identifiants uniques de traçabilité.
   Préfixes : SES session · SRC entrant · EXP sortant · LOG journal · ANA analyse · CAS dossier */
function genId(prefix) {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${t}-${r}`;
}

function defaultState() {
  const modules = {};
  CONFIG.modules.forEach(m => { modules[m.id] = ['memoire', 'audit', 'pdf'].includes(m.id); });
  return {
    meta: { version: 1, updatedAt: new Date().toISOString(), sessionId: genId('SES'), dossierId: genId('CAS') },
    client: { entreprise: '', siteWeb: '', pays: 'France', interlocuteur: '', fonction: '', objectif: '' },
    sources: [],
    analyse: { resume: '', comprehension: '', enjeux: '', risques: '', opportunites: '', generatedAt: null },
    modules,
    dimension: { employes: 120, services: 6, utilisateurs: 90, managers: 12, experts: 8, documents: 5000 },
    roiHyp: { heures: 2, coutHoraire: 45, adoption: 70, semaines: 46 },
    profil: { taille: 'PME', secteur: '', maturiteIA: 2, budget: '', niveauTechnique: 'moyen', urgence: 'moyenne', objectifs: '', freins: [], objections: ['chatgpt'] },
    generation: { audience: 'DG', complexite: 'Commercial', format: '1 page', objectif: 'Convaincre', dernier: null },
    licence: { choisie: null, recommandee: null },
    version: 'DG',
    auditLog: []
  };
}

let STATE = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return defaultState();
}

function saveState() {
  STATE.meta.updatedAt = new Date().toISOString();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch (e) { /* quota */ }
}

/* Helpers chemin "a.b.c" */
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, val) {
  const keys = path.split('.');
  const last = keys.pop();
  const tgt = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
  tgt[last] = val;
}

/* ---------------------------------------------------------------
   4. VALIDATION
--------------------------------------------------------------- */
function validateField(path, rawValue) {
  const rule = SCHEMA[path];
  if (!rule) return { ok: true, value: rawValue };

  let v = rawValue;
  if (typeof v === 'string') v = v.trim();

  if (rule.required && (v === '' || v == null)) {
    return { ok: false, error: rule.msg || 'Champ obligatoire.' };
  }
  if (!rule.required && (v === '' || v == null)) {
    return { ok: true, value: rule.type === 'int' || rule.type === 'float' ? 0 : '' };
  }

  if (rule.type === 'int' || rule.type === 'float') {
    const num = rule.type === 'int' ? parseInt(v, 10) : parseFloat(v);
    if (isNaN(num)) return { ok: false, error: rule.msg || 'Valeur numérique attendue.' };
    if (rule.min != null && num < rule.min) return { ok: false, error: rule.msg || `Minimum ${rule.min}.` };
    if (rule.max != null && num > rule.max) return { ok: false, error: rule.msg || `Maximum ${rule.max}.` };
    return { ok: true, value: num };
  }

  if (rule.type === 'url') {
    if (!/^https?:\/\/.+\..+/.test(v)) return { ok: false, error: rule.msg || 'URL invalide.' };
  }
  if (rule.max != null && String(v).length > rule.max) {
    return { ok: false, error: rule.msg || `Maximum ${rule.max} caractères.` };
  }
  if (rule.min != null && String(v).length < rule.min) {
    return { ok: false, error: rule.msg || `Minimum ${rule.min} caractères.` };
  }
  return { ok: true, value: v };
}

function validateAll() {
  const errors = {};
  Object.keys(SCHEMA).forEach(path => {
    const res = validateField(path, getPath(STATE, path));
    if (!res.ok) errors[path] = res.error;
  });
  return errors;
}

/* ---------------------------------------------------------------
   5. PIPELINE DE CALCUL ("Python virtuel")
   JSON -> Validation -> Calcul -> ROI -> Devis
--------------------------------------------------------------- */
function computeAll() {
  const trace = [];
  const t0 = performance.now();

  // Étape 1 : Validation
  const errors = validateAll();
  const validOk = Object.keys(errors).length === 0;
  trace.push({ step: 'Validation', ok: validOk, detail: validOk ? 'Toutes les contraintes respectées' : `${Object.keys(errors).length} champ(s) à corriger` });

  // Étape 2 : Dimensionnement -> licence recommandée
  const d = STATE.dimension;
  const charge = d.utilisateurs * 1 + d.managers * 1.5 + d.experts * 2;
  const reco = CONFIG.licences.find(l => d.utilisateurs <= l.maxUsers) || CONFIG.licences[CONFIG.licences.length - 1];
  STATE.licence.recommandee = reco.id;
  if (!STATE.licence.choisie) STATE.licence.choisie = reco.id;
  trace.push({ step: 'Calcul dimensionnement', ok: true, detail: `Charge pondérée ${Math.round(charge)} · palier ${reco.nom}` });

  // Étape 3 : Licences
  const palier = CONFIG.licences.find(l => l.id === STATE.licence.choisie) || reco;
  const coutLicencesAn = d.utilisateurs * palier.prixUserAn;
  const modulesActifs = CONFIG.modules.filter(m => STATE.modules[m.id]);
  const coutModulesAn = modulesActifs.reduce((s, m) => s + m.cout, 0);
  const recurrentLicences = coutLicencesAn + coutModulesAn;
  trace.push({ step: 'Calcul licences', ok: true, detail: `${fmt(recurrentLicences)} /an (${modulesActifs.length} modules)` });

  // Étape 4 : ROI
  const h = STATE.roiHyp;
  const utilisateursActifs = Math.round(d.utilisateurs * (h.adoption / 100));
  const heuresAn = utilisateursActifs * h.heures * h.semaines;
  const gainBrutAn = heuresAn * h.coutHoraire;

  const svc = CONFIG.services;
  const installation = svc.installationBase;
  const parametrage = d.services * svc.parametrageParService;
  const formation = d.managers * svc.formationParManager + d.experts * svc.formationParExpert;
  const support = recurrentLicences * svc.supportPctLicence;
  const maintenance = recurrentLicences * svc.maintenancePctLicence;

  const oneTime = installation + parametrage + formation;
  const recurrentAn = recurrentLicences + support + maintenance;
  const totalAn1 = oneTime + recurrentAn;

  const gainNetAn1 = gainBrutAn - totalAn1;
  const gainNetRecurrent = gainBrutAn - recurrentAn;
  const roiPct = totalAn1 > 0 ? (gainNetAn1 / totalAn1) * 100 : 0;
  const retourMois = gainBrutAn > 0 ? (totalAn1 / (gainBrutAn / 12)) : Infinity;
  trace.push({ step: 'Calcul ROI', ok: true, detail: `Gain brut ${fmt(gainBrutAn)}/an · ROI an 1 ${Math.round(roiPct)} %` });

  // Étape 5 : Devis
  const devisLignes = [
    { label: 'Installation', montant: installation, recurrent: false },
    { label: 'Paramétrage', montant: parametrage, recurrent: false },
    { label: 'Formation', montant: formation, recurrent: false },
    { label: `Licences ${palier.nom} (${d.utilisateurs} utilisateurs)`, montant: coutLicencesAn, recurrent: true },
    { label: `Modules ZORAN (${modulesActifs.length})`, montant: coutModulesAn, recurrent: true },
    { label: 'Support', montant: support, recurrent: true },
    { label: 'Maintenance', montant: maintenance, recurrent: true }
  ];
  trace.push({ step: 'Génération devis', ok: true, detail: `Total an 1 ${fmt(totalAn1)}` });

  const ms = (performance.now() - t0).toFixed(1);
  trace.push({ step: 'Pipeline terminé', ok: true, detail: `${ms} ms` });

  return {
    errors, valid: validOk,
    charge, reco, palier,
    coutLicencesAn, coutModulesAn, modulesActifs, recurrentLicences,
    utilisateursActifs, heuresAn, gainBrutAn,
    installation, parametrage, formation, support, maintenance,
    oneTime, recurrentAn, totalAn1,
    gainNetAn1, gainNetRecurrent, roiPct, retourMois,
    devisLignes, trace
  };
}

/* ---------------------------------------------------------------
   6. FORMATAGE
--------------------------------------------------------------- */
function fmt(n) {
  if (n === Infinity || isNaN(n)) return '—';
  return Math.round(n).toLocaleString('fr-FR') + ' ' + CONFIG.devise;
}
function fmtNum(n) { return Math.round(n).toLocaleString('fr-FR'); }
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------------------------------------------------------------
   7. AUDIT
--------------------------------------------------------------- */
function logAudit(quoi, avant, apres, tags) {
  STATE.auditLog.unshift({
    id: genId('LOG'),
    session: STATE.meta.sessionId,
    dossier: STATE.meta.dossierId,
    tags: tags || [],
    ts: new Date().toISOString(),
    qui: CONFIG.operateur,
    quoi,
    avant: avant == null ? '' : String(avant),
    apres: apres == null ? '' : String(apres)
  });
  if (STATE.auditLog.length > 200) STATE.auditLog.length = 200;
}

/* ---------------------------------------------------------------
   8. IMPORT MULTI-FORMAT
--------------------------------------------------------------- */
function readFileText(file) {
  return new Promise(resolve => {
    const name = file.name.toLowerCase();
    const reader = new FileReader();
    const isBinaryDoc = /\.(pdf|docx|doc|rtf|msg)$/.test(name);

    reader.onload = () => {
      let text = '';
      try {
        if (name.endsWith('.pdf')) {
          text = extractPdfText(reader.result);
        } else if (name.endsWith('.docx')) {
          text = extractDocxText(reader.result);
        } else {
          text = String(reader.result || '');
        }
      } catch (e) { text = ''; }
      resolve(cleanText(text));
    };
    reader.onerror = () => resolve('');

    if (isBinaryDoc) reader.readAsBinaryString(file);
    else reader.readAsText(file);
  });
}

/* Extraction naïve de texte PDF (flux non compressés / parenthèses). Best effort, sans dépendance. */
function extractPdfText(raw) {
  const out = [];
  const re = /\(((?:\\.|[^()\\])*)\)\s*T[jJ]/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    out.push(m[1].replace(/\\([()\\])/g, '$1'));
  }
  if (out.length) return out.join(' ');
  // Repli : séquences lisibles
  return (raw.match(/[A-Za-zÀ-ÿ0-9 .,;:'@\/\-]{6,}/g) || []).slice(0, 400).join(' ');
}

/* Extraction texte .docx (ZIP) : récupère les <w:t> si le flux contient document.xml en clair. */
function extractDocxText(raw) {
  const xmlMatches = raw.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (xmlMatches) {
    return xmlMatches.map(t => t.replace(/<[^>]+>/g, '')).join(' ');
  }
  return (raw.match(/[A-Za-zÀ-ÿ0-9 .,;:'@\/\-]{6,}/g) || []).slice(0, 400).join(' ');
}

function cleanText(t) {
  return String(t || '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/* Heuristiques d'extraction d'informations client à partir du texte */
function extractInfoFromText(text) {
  const info = {};
  const emailM = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailM) info.email = emailM[0];

  const urlM = text.match(/https?:\/\/[^\s)"']+/);
  if (urlM) info.siteWeb = urlM[0];
  else if (emailM) info.siteWeb = 'https://' + emailM[0].split('@')[1];

  // En-têtes d'email
  const fromM = text.match(/(?:^|\n)\s*(?:From|De)\s*:\s*(.+)/i);
  if (fromM) {
    const nameM = fromM[1].match(/"?([A-Za-zÀ-ÿ' .-]{3,})"?\s*<?/);
    if (nameM) info.interlocuteur = nameM[1].trim();
  }
  const objM = text.match(/(?:^|\n)\s*(?:Subject|Objet)\s*:\s*(.+)/i);
  if (objM) info.objectif = objM[1].trim().slice(0, 300);

  // Société : ligne contenant SAS/SARL/SA/GmbH/Ltd/Inc
  const socM = text.match(/([A-ZÀ-Ÿ][\w&'’.\- ]{2,60}?\s(?:SAS|SARL|SA|GmbH|Ltd|Inc|SASU|SCOP|EURL))/);
  if (socM) info.entreprise = socM[1].trim();

  return info;
}

/* ---------------------------------------------------------------
   9. NAVIGATION
--------------------------------------------------------------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  document.querySelectorAll('.bottomnav button').forEach(b => b.classList.toggle('active', b.dataset.screen === id));
  const active = document.querySelector('.bottomnav button.active');
  if (active) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'auto' : 'auto' });
  renderScreen(id);
}

/* ---------------------------------------------------------------
   10. RENDU DES ÉCRANS
--------------------------------------------------------------- */
function renderScreen(id) {
  switch (id) {
    case 'screen-accueil': renderSources(); break;
    case 'screen-analyse': renderAnalyse(); break;
    case 'screen-moteur': renderMoteur(); break;
    case 'screen-zoran': renderModules(); break;
    case 'screen-dimension': renderDimension(); break;
    case 'screen-licences': renderLicences(); break;
    case 'screen-roi': renderRoi(); break;
    case 'screen-devis': renderDevis(); break;
    case 'screen-versions': renderVersions(); break;
    case 'screen-audit': renderAudit(); break;
  }
  document.getElementById('topbar-version').textContent = 'v' + STATE.meta.version;
  const sub = document.getElementById('topbar-sub');
  if (sub) sub.textContent = STATE.client.entreprise ? STATE.client.entreprise : 'Assistant commercial mobile';
}

/* --- Sources (Accueil) --- */
function renderSources() {
  const box = document.getElementById('sources-list');
  if (!STATE.sources.length) {
    box.innerHTML = '<p class="screen-intro" style="margin:8px 0 0">Aucune source ajoutée pour le moment.</p>';
    return;
  }
  box.innerHTML = STATE.sources.map((s, i) => `
    <div class="kv">
      <span>${iconForType(s.type)} ${escapeHtml(s.name)}
        <small style="color:var(--ink-soft)"> · ${escapeHtml(s.size)}${s.id ? ' · ' + escapeHtml(s.id) : ''}</small></span>
      <button class="btn btn-mini" data-src-del="${i}">✕</button>
    </div>`).join('');
  box.querySelectorAll('[data-src-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.srcDel;
      logAudit('Suppression source', STATE.sources[i].name, '');
      STATE.sources.splice(i, 1);
      saveState(); renderSources();
      toast('Source supprimée');
    });
  });
}
function iconForType(t) {
  if (/pdf/.test(t)) return '📄';
  if (/word|doc/.test(t)) return '📝';
  if (/email|eml|msg/.test(t)) return '✉️';
  if (/url|web/.test(t)) return '🌐';
  if (/image/.test(t)) return '🖼️';
  if (/text|note/.test(t)) return '🗒️';
  return '📎';
}

/* --- Analyse --- */
const AN_LABELS = {
  resume: 'resume', comprehension: 'comprehension', enjeux: 'enjeux',
  risques: 'risques', opportunites: 'opportunites'
};
function renderAnalyse() {
  const a = STATE.analyse;
  const meta = document.getElementById('an-meta');
  if (a.generatedAt) {
    meta.textContent = `Analyse pour ${STATE.client.entreprise || '—'} · générée le ${new Date(a.generatedAt).toLocaleString('fr-FR')}${a.id ? ' · ' + a.id : ''}`;
  } else {
    meta.textContent = "Aucune analyse générée. Lancez « Analyser » depuis l'accueil.";
  }
  Object.keys(AN_LABELS).forEach(k => {
    const el = document.querySelector(`[data-an="${k}"]`);
    if (el && !el.isContentEditable) el.textContent = a[k] || '';
  });
}

function generateAnalyse(deepen) {
  const c = STATE.client;
  const ent = c.entreprise || "l'entreprise";
  const pays = c.pays || 'son marché';
  const fct = c.fonction ? `, ${c.fonction},` : '';
  const obj = c.objectif || 'optimiser ses opérations et la circulation de la connaissance';
  const srcTxt = STATE.sources.map(s => s.excerpt).join(' ').slice(0, 1200);
  const motsCles = topKeywords(srcTxt);
  const clePhrase = motsCles.length ? ` Thèmes saillants relevés dans les sources : ${motsCles.join(', ')}.` : '';
  const plus = deepen ? ' (analyse approfondie)' : '';

  STATE.analyse = {
    resume: `${ent} évolue en ${pays} et cherche à ${obj}. L'enjeu central est de transformer la connaissance dispersée en avantage opérationnel mesurable, en s'appuyant sur ZORAN comme moteur d'intelligence augmentée.${clePhrase}${plus}`,
    comprehension: `Interlocuteur : ${c.interlocuteur || '—'}${fct} pilote la décision. ${ent} compte ${fmtNum(STATE.dimension.employes)} employés répartis sur ${STATE.dimension.services} services, avec ${fmtNum(STATE.dimension.documents)} documents à valoriser. Le périmètre utilisateur visé est de ${fmtNum(STATE.dimension.utilisateurs)} personnes.`,
    enjeux: `• Réduire le temps perdu à rechercher l'information.\n• Sécuriser et tracer les décisions.\n• Capitaliser sur l'expertise des ${fmtNum(STATE.dimension.experts)} experts et ${fmtNum(STATE.dimension.managers)} managers.\n• Aligner les ${STATE.dimension.services} services sur une base de connaissance commune.`,
    risques: `• Adoption insuffisante sans accompagnement (formation prévue au devis).\n• Données sensibles : gouvernance et traçabilité indispensables (module Audit).\n• Conduite du changement à piloter sur les premiers mois.`,
    opportunites: `• Gain de productivité estimé sur ${fmtNum(STATE.dimension.utilisateurs)} utilisateurs.\n• Différenciation par l'usage d'une IA souveraine et éthique.\n• Extension progressive (agents, skills, futur probable) après le socle initial.`,
    generatedAt: new Date().toISOString(),
    id: genId('ANA')
  };
  logAudit((deepen ? 'Analyse approfondie ' : 'Analyse générée ') + STATE.analyse.id, '', ent, ['analyse']);
  STATE.meta.version++;
  saveState();
}

function topKeywords(text) {
  if (!text) return [];
  const stop = new Set(['dans','pour','avec','vous','nous','votre','notre','cette','plus','sont','être','leurs','leur','des','les','une','aux','que','qui','par','sur','est','aux','the','and','for','with','this','that','your']);
  const freq = {};
  (text.toLowerCase().match(/[a-zà-ÿ]{4,}/g) || []).forEach(w => {
    if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
}

/* --- Modules ZORAN --- */
function renderModules() {
  const grid = document.getElementById('modules-grid');
  grid.innerHTML = CONFIG.modules.map(m => {
    const on = !!STATE.modules[m.id];
    return `
    <div class="module-card ${on ? 'on' : ''}" data-mod="${m.id}">
      <div class="module-head">
        <span class="module-icon">${m.icon}</span>
        <span class="module-state">${on ? '● Activé' : '○ Inactif'}</span>
      </div>
      <div class="module-name">${m.nom}</div>
      <div class="module-desc">${m.desc}</div>
      <div class="module-desc"><b>${fmt(m.cout)}</b>/an</div>
      <div class="module-actions">
        <button class="btn" data-mod-toggle="${m.id}">${on ? 'Désactiver' : 'Activer'}</button>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-mod-toggle]').forEach(btn => {
    btn.addEventListener('click', () => toggleModule(btn.dataset.modToggle));
  });
}
function toggleModule(id) {
  const before = STATE.modules[id];
  STATE.modules[id] = !before;
  const m = CONFIG.modules.find(x => x.id === id);
  logAudit('Module ' + m.nom, before ? 'activé' : 'inactif', STATE.modules[id] ? 'activé' : 'inactif');
  saveState(); renderModules();
  toast(`${m.nom} ${STATE.modules[id] ? 'activé' : 'désactivé'}`);
}

/* --- Dimensionnement --- */
function renderDimension() {
  const r = computeAll();
  const d = STATE.dimension;
  document.getElementById('dim-result').innerHTML = `
    <h2>Résultat du dimensionnement</h2>
    <div class="kv"><span>Charge pondérée</span><b>${fmtNum(r.charge)} pts</b></div>
    <div class="kv"><span>Utilisateurs actifs (adoption ${STATE.roiHyp.adoption} %)</span><b>${fmtNum(r.utilisateursActifs)}</b></div>
    <div class="kv"><span>Ratio documents / utilisateur</span><b>${fmtNum(d.documents / Math.max(1, d.utilisateurs))}</b></div>
    <div class="kv"><span>Palier recommandé</span><b><span class="badge">${r.reco.nom}</span></b></div>
    <div class="kv total"><span>Coût licences estimé</span><b>${fmt(r.coutLicencesAn)}/an</b></div>`;
}

/* --- Licences --- */
function renderLicences() {
  const r = computeAll();
  document.getElementById('licence-reco').innerHTML =
    `Palier recommandé pour ${fmtNum(STATE.dimension.utilisateurs)} utilisateurs : <span class="badge ok">${r.reco.nom}</span>`;
  const grid = document.getElementById('licences-grid');
  grid.innerHTML = CONFIG.licences.map(l => {
    const isReco = l.id === r.reco.id;
    const isChosen = l.id === STATE.licence.choisie;
    const coutAn = STATE.dimension.utilisateurs * l.prixUserAn;
    const maxTxt = l.maxUsers === Infinity ? 'illimité' : '≤ ' + l.maxUsers + ' utilisateurs';
    return `
    <div class="licence-card ${isChosen ? 'reco' : ''}">
      <div class="licence-head">
        <span class="licence-name">${l.nom} ${isReco ? '<span class="badge ok">conseillé</span>' : ''}</span>
        <span class="licence-price">${fmt(l.prixUserAn)}/user/an</span>
      </div>
      <div class="licence-desc">${l.desc} · ${maxTxt}</div>
      <div class="kv"><span>Coût pour votre périmètre</span><b>${fmt(coutAn)}/an</b></div>
      <button class="btn ${isChosen ? 'btn-primary' : ''} btn-block" data-lic="${l.id}" style="margin-top:8px">
        ${isChosen ? '✓ Sélectionné' : 'Choisir ' + l.nom}</button>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-lic]').forEach(btn => {
    btn.addEventListener('click', () => {
      const before = STATE.licence.choisie;
      STATE.licence.choisie = btn.dataset.lic;
      logAudit('Licence choisie', before, btn.dataset.lic);
      saveState(); renderLicences();
      toast('Licence ' + (CONFIG.licences.find(l => l.id === btn.dataset.lic).nom) + ' sélectionnée');
    });
  });
}

/* --- ROI --- */
function renderRoi() {
  const r = computeAll();
  document.getElementById('roi-result').innerHTML = `
    <h2>Résultats</h2>
    <div class="kv"><span>Heures économisées / an</span><b>${fmtNum(r.heuresAn)} h</b></div>
    <div class="kv"><span>Gain brut annuel</span><b class="pos">${fmt(r.gainBrutAn)}</b></div>
    <div class="kv"><span>Coût total année 1</span><b class="neg">${fmt(r.totalAn1)}</b></div>
    <div class="kv"><span>Coût récurrent annuel</span><b class="neg">${fmt(r.recurrentAn)}</b></div>
    <div class="kv"><span>Gain net année 1</span><b class="${r.gainNetAn1 >= 0 ? 'pos' : 'neg'}">${fmt(r.gainNetAn1)}</b></div>
    <div class="kv"><span>Gain net récurrent / an</span><b class="${r.gainNetRecurrent >= 0 ? 'pos' : 'neg'}">${fmt(r.gainNetRecurrent)}</b></div>
    <div class="kv total"><span>ROI année 1</span><b>${Math.round(r.roiPct)} %</b></div>
    <div class="kv"><span>Retour sur investissement</span><b>${r.retourMois === Infinity ? '—' : fmtNum(r.retourMois) + ' mois'}</b></div>`;
  drawRoiChart(r);
}

function drawRoiChart(r) {
  const cv = document.getElementById('roi-chart');
  if (!cv) return;
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || cv.parentElement.clientWidth - 32;
  const h = 220;
  cv.width = w * dpr; cv.height = h * dpr;
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const years = [1, 2, 3];
  const costs = years.map(y => r.totalAn1 + (y - 1) * r.recurrentAn);
  const gains = years.map(y => r.gainBrutAn * y);
  const maxV = Math.max(...costs, ...gains, 1);

  const padL = 8, padR = 8, padT = 14, padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const n = years.length;
  const groupW = plotW / n;
  const barW = groupW * 0.30;

  const css = getComputedStyle(document.documentElement);
  const costColor = (css.getPropertyValue('--danger') || '#d63649').trim();
  const gainColor = (css.getPropertyValue('--ok') || '#18a35d').trim();
  const inkSoft = (css.getPropertyValue('--ink-soft') || '#5a6782').trim();

  ctx.strokeStyle = '#e2e7f0';
  ctx.beginPath(); ctx.moveTo(padL, padT + plotH); ctx.lineTo(w - padR, padT + plotH); ctx.stroke();

  ctx.font = '11px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  years.forEach((y, i) => {
    const gx = padL + i * groupW + groupW / 2;
    const cH = (costs[i] / maxV) * plotH;
    const gH = (gains[i] / maxV) * plotH;
    ctx.fillStyle = costColor;
    ctx.fillRect(gx - barW - 3, padT + plotH - cH, barW, cH);
    ctx.fillStyle = gainColor;
    ctx.fillRect(gx + 3, padT + plotH - gH, barW, gH);
    ctx.fillStyle = inkSoft;
    ctx.fillText('Année ' + y, gx, padT + plotH + 16);
  });
}

/* --- Devis --- */
function renderDevis() {
  const r = computeAll();
  document.getElementById('devis-meta').innerHTML = STATE.client.entreprise
    ? `Devis pour <b>${escapeHtml(STATE.client.entreprise)}</b> · palier ${r.palier.nom}`
    : 'Renseignez le client sur l\'accueil pour personnaliser le devis.';
  const rows = r.devisLignes.map(l =>
    `<div class="kv"><span>${escapeHtml(l.label)}${l.recurrent ? ' <small style="color:var(--ink-soft)">/an</small>' : ''}</span><b>${fmt(l.montant)}</b></div>`
  ).join('');
  document.getElementById('devis-table').innerHTML = `
    <h2>Détail du devis</h2>
    ${rows}
    <div class="kv total"><span>Total année 1</span><b>${fmt(r.totalAn1)}</b></div>
    <div class="kv"><span>Total récurrent</span><b>${fmt(r.recurrentAn)}/an</b></div>`;
}

/* --- Versions --- */
function renderVersions() {
  const grid = document.getElementById('versions-grid');
  grid.innerHTML = CONFIG.versions.map(v => `
    <button data-ver="${v.id}" class="${STATE.version === v.id ? 'active' : ''}">
      <span class="v-ico">${v.icon}</span>${v.nom}
    </button>`).join('');
  grid.querySelectorAll('[data-ver]').forEach(btn => {
    btn.addEventListener('click', () => {
      const before = STATE.version;
      STATE.version = btn.dataset.ver;
      logAudit('Version discours', before, STATE.version);
      saveState(); renderVersions();
    });
  });
  renderVersionPitch();
}
function renderVersionPitch() {
  const v = CONFIG.versions.find(x => x.id === STATE.version) || CONFIG.versions[0];
  const r = computeAll();
  const ent = STATE.client.entreprise || 'votre organisation';
  document.getElementById('version-pitch').innerHTML = `
    <h2>${v.icon} Pitch ${v.nom} — ${v.angle}</h2>
    <p class="an-text">Pour ${escapeHtml(ent)}, l'argument ${v.nom} se concentre sur ${v.angle}.
    ZORAN apporte ici un gain net estimé de <b>${fmt(r.gainNetRecurrent)}/an</b> en régime de croisière,
    pour un investissement année 1 de <b>${fmt(r.totalAn1)}</b> et un retour en
    <b>${r.retourMois === Infinity ? '—' : fmtNum(r.retourMois) + ' mois'}</b>.</p>
    <p class="an-text">${pitchAngle(v.id, r)}</p>`;
}
function pitchAngle(id, r) {
  const map = {
    DG: "Vision : un avantage compétitif durable et un ROI mesurable dès la première année.",
    DSI: "Sécurité : traçabilité native, hébergement maîtrisé, intégration à votre SI existant.",
    Technique: "Architecture modulaire, API ouvertes, déploiement progressif sans rupture.",
    Investisseur: `Marché en croissance, modèle récurrent (${fmt(r.recurrentAn)}/an), effet d'échelle.`,
    BTP: "Devis, mémoires techniques et suivi de chantier accélérés par l'IA.",
    Industrie: "Qualité, maintenance prédictive et capitalisation du savoir-faire.",
    Sante: "Conformité, confidentialité patient et appui à la décision soignante.",
    Collectivite: "Service public augmenté, conformité RGPD et transparence.",
    Banque: "Maîtrise du risque, conformité réglementaire et productivité analyste.",
    Assurance: "Traitement des sinistres accéléré et appui actuariel."
  };
  return map[id] || '';
}

/* --- Audit --- */
function renderAudit() {
  const r = computeAll();
  document.getElementById('audit-trace').innerHTML = `
    <div class="kv"><span>Session</span><b><code>${escapeHtml(STATE.meta.sessionId || '—')}</code></b></div>
    <div class="kv"><span>Dossier</span><b><code>${escapeHtml(STATE.meta.dossierId || '—')}</code></b></div>` +
    r.trace.map(t => `
    <div class="step">
      <span class="s-ico">${t.ok ? '✅' : '⚠️'}</span>
      <span><b>${escapeHtml(t.step)}</b><br><span class="s-detail">${escapeHtml(t.detail)}</span></span>
    </div>`).join('');

  const log = document.getElementById('audit-log');
  log.innerHTML = STATE.auditLog.length
    ? STATE.auditLog.map(e => `
      <div class="log-entry">
        <div><b>${escapeHtml(e.quoi)}</b>${(e.tags || []).map(t => ` <span class="badge">${escapeHtml(t)}</span>`).join('')}</div>
        <div class="log-meta">${escapeHtml(e.qui)} · ${new Date(e.ts).toLocaleString('fr-FR')}${e.id ? ' · ' + escapeHtml(e.id) : ''}</div>
        ${(e.avant || e.apres) ? `<div>avant <code>${escapeHtml(e.avant || '∅')}</code> → après <code>${escapeHtml(e.apres || '∅')}</code></div>` : ''}
      </div>`).join('')
    : '<p class="screen-intro">Aucune modification enregistrée.</p>';

  document.getElementById('audit-json').textContent = JSON.stringify(STATE, null, 2);
}

/* ---------------------------------------------------------------
   10b. MOTEUR DE CONNAISSANCE (V3)
--------------------------------------------------------------- */
let lastDeliverable = null;
let moteurWired = false;

function renderMoteur() {
  // Options des sélecteurs (peuplées une seule fois, puis valeurs synchronisées)
  const audSel = document.getElementById('gen-audience');
  if (audSel && !audSel.options.length) {
    fillOptions(audSel, Object.keys(ENGINE.AUDIENCES));
    fillOptions(document.getElementById('gen-complexite'), ENGINE.COMPLEXITES);
    fillOptions(document.getElementById('gen-format'), Object.keys(ENGINE.FORMATS));
    fillOptions(document.getElementById('gen-objectif'), Object.keys(ENGINE.OBJECTIFS));
  }
  ['audience', 'complexite', 'format', 'objectif'].forEach(k => {
    const el = document.getElementById('gen-' + k);
    if (el) el.value = STATE.generation[k];
  });

  // Objections (chips)
  const objBox = document.getElementById('profil-objections');
  if (objBox) {
    objBox.innerHTML = ENGINE.objectionsList.map(o => {
      const on = (STATE.profil.objections || []).indexOf(o.id) >= 0;
      return `<button type="button" class="chip ${on ? 'on' : ''}" data-obj="${o.id}">${escapeHtml(o.label)}</button>`;
    }).join('');
    objBox.querySelectorAll('[data-obj]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.obj;
      const arr = STATE.profil.objections || (STATE.profil.objections = []);
      const i = arr.indexOf(id);
      if (i >= 0) arr.splice(i, 1); else arr.push(id);
      logAudit('Objection prospect', '', id, ['profil']);
      saveState(); renderMoteur();
    }));
  }

  // Recommandation automatique
  const reco = ENGINE.recommander(STATE);
  const rb = document.getElementById('reco-body');
  if (rb) rb.innerHTML = `
    <div class="kv"><span>Maturité IA détectée</span><b><span class="badge">${reco.maturite.n} · ${escapeHtml(reco.maturite.label)}</span></b></div>
    <div class="kv"><span>Meilleur angle</span><b>${escapeHtml(reco.angle)}</b></div>
    <div class="kv"><span>Argument prioritaire</span><b>${escapeHtml(reco.argument)}</b></div>
    <div class="kv"><span>Format conseillé</span><b>${escapeHtml(reco.format)}</b></div>
    <div class="kv"><span>Objectif conseillé</span><b>${escapeHtml(reco.objectif)}</b></div>
    <div class="kv"><span>POC recommandé</span><b>${escapeHtml(reco.poc)}</b></div>
    <div class="kv"><span>Stratégie d'adoption</span><b>${escapeHtml(reco.adoption)}</b></div>
    <div class="kv"><span>Objection à préparer</span><b>${escapeHtml(reco.objectionPrioritaire)}</b></div>
    <div class="kv"><span>Urgence</span><b>${escapeHtml(reco.urgenceNote)}</b></div>`;

  // Moteurs rapides
  const rapide = document.getElementById('moteur-rapide');
  if (rapide) {
    const boutons = [
      { id: 'pourquoi', label: "🚀 Pourquoi l'IA maintenant" },
      { id: 'risque', label: "⚠️ Risque de ne rien faire" },
      { id: 'poc', label: "🧪 Plan de POC" },
      { id: 'roadmap', label: "🗺️ Feuille de route" },
      { id: 'casusage', label: "🧰 Cas d'usage" },
      { id: 'faq', label: "❓ FAQ" },
      { id: 'financement', label: "💶 Dossier de financement" }
    ];
    rapide.innerHTML =
      boutons.map(b => `<button class="btn btn-mini" data-rapide="${b.id}">${b.label}</button>`).join('') +
      ENGINE.competitors.map(c => `<button class="btn btn-mini" data-vs="${escapeHtml(c)}">⚔️ vs ${escapeHtml(c)}</button>`).join('') +
      ENGINE.dureesPitch.map(d => `<button class="btn btn-mini" data-pitch="${escapeHtml(d)}">🎤 Pitch ${escapeHtml(d)}</button>`).join('') +
      ENGINE.objectionsList.map(o => `<button class="btn btn-mini" data-objrep="${o.id}">💬 ${escapeHtml(o.label)}</button>`).join('');

    rapide.querySelectorAll('[data-rapide]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.rapide;
      const map = { pourquoi: () => ENGINE.pourquoiMaintenant(STATE, STATE.generation.audience),
        risque: () => ENGINE.risqueInaction(STATE), poc: () => ENGINE.poc(STATE),
        roadmap: () => ENGINE.roadmap(STATE), casusage: () => ENGINE.casUsage(STATE),
        faq: () => ENGINE.faq(STATE), financement: () => ENGINE.financement(STATE) };
      showDeliverable(map[id](), id);
    }));
    rapide.querySelectorAll('[data-vs]').forEach(b => b.addEventListener('click', () =>
      showDeliverable(ENGINE.differenciation(STATE, b.dataset.vs), 'vs-' + b.dataset.vs)));
    rapide.querySelectorAll('[data-pitch]').forEach(b => b.addEventListener('click', () =>
      showDeliverable(ENGINE.pitch(STATE, b.dataset.pitch, STATE.generation.audience), 'pitch')));
    rapide.querySelectorAll('[data-objrep]').forEach(b => b.addEventListener('click', () =>
      showDeliverable(ENGINE.objection(STATE, b.dataset.objrep), 'objection')));
  }

  // Câblage unique des boutons fixes
  if (!moteurWired) {
    moteurWired = true;
    document.getElementById('btn-generer').addEventListener('click', () => {
      showDeliverable(ENGINE.generate(STATE), 'generate');
    });
    document.getElementById('btn-reco-apply').addEventListener('click', () => {
      const r = ENGINE.recommander(STATE);
      STATE.generation.format = r.format;
      STATE.generation.objectif = r.objectif;
      logAudit('Recommandation appliquée', '', r.format + ' / ' + r.objectif, ['moteur']);
      saveState(); renderMoteur();
      toast('Recommandation appliquée');
    });
    document.getElementById('btn-gen-edit').addEventListener('click', () => {
      const body = document.getElementById('gen-output-body');
      if (body.isContentEditable) {
        body.contentEditable = 'false'; body.classList.remove('editing');
        if (lastDeliverable) lastDeliverable.sections = [{ h: '', t: body.innerText }];
        toast('Modifications conservées pour l\'export');
      } else { body.contentEditable = 'true'; body.classList.add('editing'); body.focus(); }
    });
    document.getElementById('btn-gen-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(ENGINE.toText(lastDeliverable)); toast('Livrable copié'); }
      catch (e) { toast('Copie impossible'); }
    });
    document.getElementById('btn-gen-pdf').addEventListener('click', () => exportDeliverable('pdf'));
    document.getElementById('btn-gen-word').addEventListener('click', () => exportDeliverable('word'));
    document.getElementById('btn-gen-email').addEventListener('click', () => exportDeliverable('email'));
  }
}

function fillOptions(sel, arr) {
  if (!sel) return;
  sel.innerHTML = arr.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
}

function showDeliverable(deliv, kind) {
  lastDeliverable = deliv;
  document.getElementById('gen-output-card').style.display = 'block';
  document.getElementById('gen-output-titre').textContent = deliv.titre;
  const meta = deliv.meta || {};
  document.getElementById('gen-output-meta').innerHTML = Object.keys(meta)
    .map(k => `<span class="badge">${escapeHtml(k)}: ${escapeHtml(String(meta[k]))}</span>`).join(' ');
  const body = document.getElementById('gen-output-body');
  body.contentEditable = 'false'; body.classList.remove('editing');
  body.innerHTML = deliv.sections.map(s =>
    (s.h ? '<b>' + escapeHtml(s.h) + '</b>\n' : '') + escapeHtml(s.t)).join('\n\n').replace(/\n/g, '<br>');
  logAudit('Livrable généré [' + (kind || '') + ']', '', deliv.titre, ['sortant', 'genere']);
  saveState();
  document.getElementById('gen-output-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exportDeliverable(kind) {
  if (!lastDeliverable) { toast('Générez d\'abord un livrable'); return; }
  const expId = genId('EXP');
  const titre = lastDeliverable.titre;
  if (kind === 'pdf') {
    printDocument(ENGINE.toHtml(lastDeliverable) + traceFooter(expId));
    logAudit('Export livrable PDF ' + expId, '', titre, ['sortant', 'pdf', 'livrable']);
  } else if (kind === 'word') {
    const html = wordWrap(ENGINE.toHtml(lastDeliverable) + traceFooter(expId), titre);
    downloadBlob(html, filename('docx-as-doc'), 'application/msword');
    logAudit('Export livrable Word ' + expId, '', titre, ['sortant', 'word', 'livrable']);
  } else if (kind === 'email') {
    const corps = ENGINE.toText(lastDeliverable) + '\n\nRéférence : ' + expId + ' · Dossier : ' + STATE.meta.dossierId;
    const mailto = `mailto:?subject=${encodeURIComponent(titre)}&body=${encodeURIComponent(corps)}`;
    downloadBlob('Subject: ' + titre + '\nX-Unsent: 1\nContent-Type: text/plain; charset=utf-8\n\n' + corps, filename('eml'), 'message/rfc822');
    window.location.href = mailto;
    logAudit('Export livrable Email ' + expId, '', titre, ['sortant', 'email', 'livrable']);
  }
  saveState();
  toast('Livrable exporté (' + kind + ')');
}

function traceFooter(expId) {
  return '<div class="print-foot">Document généré par ZORAN Biz Mobile — ' + new Date().toLocaleString('fr-FR') +
    '<br>Référence : ' + escapeHtml(expId) + ' · Dossier : ' + escapeHtml(STATE.meta.dossierId) +
    ' · Session : ' + escapeHtml(STATE.meta.sessionId) + '</div>';
}
function wordWrap(inner, titre) {
  return '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' + escapeHtml(titre) + '</title>' +
    '<style>body{font-family:Calibri,Arial,sans-serif;color:#1b2434}h1{color:#1f3a5f;font-size:18pt}h2{color:#1f3a5f;font-size:12pt}.print-foot{margin-top:16pt;color:#888;font-size:8pt}</style>' +
    '</head><body>' + inner + '</body></html>';
}
function printDocument(innerHtml) {
  document.getElementById('print-area').innerHTML = innerHtml;
  setTimeout(() => window.print(), 60);
}

/* ---------------------------------------------------------------
   11. EXPORTS (PDF / Word / Email / JSON)
--------------------------------------------------------------- */
function buildDevisHtml(expId) {
  const r = computeAll();
  const c = STATE.client;
  const date = new Date().toLocaleDateString('fr-FR');
  const rows = r.devisLignes.map(l =>
    `<tr><td>${escapeHtml(l.label)}${l.recurrent ? ' (/an)' : ''}</td><td>${fmt(l.montant)}</td></tr>`
  ).join('');
  return `
    <h1>Proposition commerciale ZORAN</h1>
    <div class="print-sub">${escapeHtml(c.entreprise || '—')} · ${escapeHtml(c.pays || '')} · ${date}</div>
    <p><b>Interlocuteur :</b> ${escapeHtml(c.interlocuteur || '—')} ${c.fonction ? '(' + escapeHtml(c.fonction) + ')' : ''}<br>
       <b>Objectif :</b> ${escapeHtml(c.objectif || '—')}<br>
       <b>Palier :</b> ${escapeHtml(r.palier.nom)} · ${fmtNum(STATE.dimension.utilisateurs)} utilisateurs</p>
    <table>
      <thead><tr><th>Poste</th><th>Montant</th></tr></thead>
      <tbody>
        ${rows}
        <tr class="print-total"><td>Total année 1</td><td>${fmt(r.totalAn1)}</td></tr>
        <tr class="print-total"><td>Total récurrent / an</td><td>${fmt(r.recurrentAn)}</td></tr>
      </tbody>
    </table>
    <p><b>Synthèse ROI :</b> gain brut ${fmt(r.gainBrutAn)}/an · ROI année 1 ${Math.round(r.roiPct)} % ·
       retour en ${r.retourMois === Infinity ? '—' : fmtNum(r.retourMois) + ' mois'}.</p>
    <div class="print-foot">Document généré par ZORAN Biz Mobile — ${new Date().toLocaleString('fr-FR')}<br>
      Référence : ${escapeHtml(expId || '—')} · Dossier : ${escapeHtml(STATE.meta.dossierId)} · Session : ${escapeHtml(STATE.meta.sessionId)}</div>`;
}

function exportPDF() {
  const expId = genId('EXP');
  document.getElementById('print-area').innerHTML = buildDevisHtml(expId);
  logAudit('Export PDF ' + expId, '', STATE.client.entreprise || '', ['sortant', 'pdf']);
  saveState();
  setTimeout(() => window.print(), 60);
}

function exportWord() {
  const expId = genId('EXP');
  const inner = buildDevisHtml(expId);
  const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Devis ZORAN</title>
    <style>
      body{font-family:Calibri,Arial,sans-serif;color:#16213a}
      h1{color:#1c3f6e;font-size:20pt;margin-bottom:2pt}
      .print-sub{color:#666;font-size:10pt;margin-bottom:16pt}
      table{border-collapse:collapse;width:100%}
      th,td{border:1px solid #bbb;padding:6pt 9pt;text-align:left;font-size:10pt}
      td:last-child,th:last-child{text-align:right}
      .print-total td{font-weight:bold;background:#eef2fb}
      .print-foot{margin-top:16pt;color:#888;font-size:8pt}
    </style></head><body>${inner}</body></html>`;
  downloadBlob(html, filename('docx-as-doc'), 'application/msword');
  logAudit('Export Word ' + expId, '', STATE.client.entreprise || '', ['sortant', 'word']);
  saveState();
  toast('Document Word généré');
}

function exportEmail() {
  const expId = genId('EXP');
  const r = computeAll();
  const c = STATE.client;
  const objet = `Proposition ZORAN — ${c.entreprise || 'votre projet'} [${expId}]`;
  const corps =
`Bonjour ${c.interlocuteur || ''},

Suite à notre échange, voici la synthèse de la proposition ZORAN pour ${c.entreprise || 'votre organisation'} :

• Palier : ${r.palier.nom} (${fmtNum(STATE.dimension.utilisateurs)} utilisateurs)
• Total année 1 : ${fmt(r.totalAn1)}
• Total récurrent : ${fmt(r.recurrentAn)}/an
• Gain brut estimé : ${fmt(r.gainBrutAn)}/an
• ROI année 1 : ${Math.round(r.roiPct)} %
• Retour sur investissement : ${r.retourMois === Infinity ? '—' : fmtNum(r.retourMois) + ' mois'}

Le détail complet du devis est joint.

Bien cordialement,
${CONFIG.operateur}

Référence : ${expId} · Dossier : ${STATE.meta.dossierId} · Session : ${STATE.meta.sessionId}`;

  // Fichier .eml téléchargeable
  const to = (c.siteWeb ? '' : '');
  const eml =
`To: ${to}
Subject: ${objet}
X-Unsent: 1
Content-Type: text/plain; charset=utf-8

${corps}`;
  downloadBlob(eml, filename('eml'), 'message/rfc822');

  // Ouverture client mail
  const mailto = `mailto:?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(corps)}`;
  window.location.href = mailto;

  logAudit('Export Email ' + expId, '', c.entreprise || '', ['sortant', 'email']);
  saveState();
  toast('Email préparé (.eml téléchargé + client mail ouvert)');
}

function exportJSON() {
  const expId = genId('EXP');
  downloadBlob(JSON.stringify(STATE, null, 2), filename('json'), 'application/json');
  logAudit('Export JSON ' + expId, '', '', ['sortant', 'json']);
  saveState();
  toast('JSON exporté');
}

function filename(ext) {
  const base = (STATE.client.entreprise || 'zoran-devis').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  const realExt = ext === 'docx-as-doc' ? 'doc' : ext;
  return `${base || 'zoran'}-${stamp}.${realExt}`;
}

function downloadBlob(content, name, mime) {
  const blob = new Blob(['﻿', content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------------------------------------------------------------
   12. LIAISON DES CHAMPS (data-bind) + VALIDATION TEMPS RÉEL
--------------------------------------------------------------- */
function bindInputs() {
  document.querySelectorAll('[data-bind]').forEach(el => {
    const path = el.dataset.bind;
    const cur = getPath(STATE, path);
    if (cur != null && cur !== '') el.value = cur;

    el.addEventListener('input', () => {
      const res = validateField(path, el.value);
      const errEl = document.querySelector(`[data-err="${path}"]`);
      if (!res.ok) {
        el.classList.add('invalid');
        if (errEl) { errEl.textContent = res.error; errEl.classList.add('show'); }
      } else {
        el.classList.remove('invalid');
        if (errEl) errEl.classList.remove('show');
        const before = getPath(STATE, path);
        setPath(STATE, path, res.value);
        if (before !== res.value) {
          // pas de log à chaque frappe : on logge sur "change"
          saveState();
          refreshComputedScreens();
        }
      }
    });

    el.addEventListener('change', () => {
      const res = validateField(path, el.value);
      if (res.ok) {
        logAudit('Champ ' + path, '', String(res.value).slice(0, 60));
        saveState();
      }
    });
  });
}

/* Rafraîchit uniquement les écrans dépendant des calculs */
function refreshComputedScreens() {
  const active = document.querySelector('.screen.active');
  if (!active) return;
  if (['screen-dimension', 'screen-licences', 'screen-roi', 'screen-devis', 'screen-versions', 'screen-audit'].includes(active.id)) {
    renderScreen(active.id);
  }
  const sub = document.getElementById('topbar-sub');
  if (sub) sub.textContent = STATE.client.entreprise || 'Assistant commercial mobile';
}

/* ---------------------------------------------------------------
   13. TOAST
--------------------------------------------------------------- */
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------------------------------------------------------------
   14. ÉVÉNEMENTS
--------------------------------------------------------------- */
function wireEvents() {
  // Navigation
  document.querySelectorAll('.bottomnav button').forEach(b => {
    b.addEventListener('click', () => showScreen(b.dataset.screen));
  });

  // Accueil : Analyser
  document.getElementById('btn-analyser').addEventListener('click', () => {
    const errors = {};
    ['client.entreprise', 'client.interlocuteur'].forEach(p => {
      const res = validateField(p, getPath(STATE, p));
      const errEl = document.querySelector(`[data-err="${p}"]`);
      const input = document.querySelector(`[data-bind="${p}"]`);
      if (!res.ok) {
        errors[p] = res.error;
        if (errEl) { errEl.textContent = res.error; errEl.classList.add('show'); }
        if (input) input.classList.add('invalid');
      }
    });
    if (Object.keys(errors).length) { toast('Complétez les champs obligatoires'); return; }
    generateAnalyse(false);
    showScreen('screen-analyse');
    toast('Analyse générée');
  });

  // Sources : fichiers
  document.getElementById('in-files').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const excerpt = await readFileText(f);
      const srcId = genId('SRC');
      STATE.sources.push({
        id: srcId,
        name: f.name,
        type: f.type || guessType(f.name),
        size: humanSize(f.size),
        excerpt: excerpt.slice(0, 4000),
        addedAt: new Date().toISOString()
      });
      logAudit('Import fichier ' + srcId, '', f.name, ['entrant', 'fichier']);
    }
    saveState(); renderSources();
    toast(files.length + ' fichier(s) importé(s)');
    e.target.value = '';
  });

  // Sources : URL
  document.getElementById('btn-url-add').addEventListener('click', async () => {
    const input = document.getElementById('in-url');
    const url = input.value.trim();
    if (!/^https?:\/\/.+\..+/.test(url)) { toast('URL invalide'); return; }
    let excerpt = '';
    try {
      const resp = await fetch(url, { mode: 'cors' });
      const html = await resp.text();
      excerpt = cleanText(html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' '));
    } catch (err) {
      excerpt = '[Contenu distant non récupérable depuis le navigateur — URL tracée comme source.]';
    }
    const srcId = genId('SRC');
    STATE.sources.push({ id: srcId, name: url, type: 'url', size: '—', excerpt: excerpt.slice(0, 4000), addedAt: new Date().toISOString() });
    if (!STATE.client.siteWeb) { STATE.client.siteWeb = url; const si = document.getElementById('in-site'); if (si) si.value = url; }
    logAudit('Import URL ' + srcId, '', url, ['entrant', 'url']);
    input.value = '';
    saveState(); renderSources();
    toast('URL ajoutée comme source');
  });

  // Sources : texte collé
  document.getElementById('btn-paste-add').addEventListener('click', () => {
    const ta = document.getElementById('in-paste');
    const txt = ta.value.trim();
    if (txt.length < 3) { toast('Texte trop court'); return; }
    const srcId = genId('SRC');
    STATE.sources.push({ id: srcId, name: 'Texte collé', type: 'note', size: humanSize(txt.length), excerpt: txt.slice(0, 4000), addedAt: new Date().toISOString() });
    logAudit('Import texte collé ' + srcId, '', txt.slice(0, 40), ['entrant', 'texte']);
    ta.value = '';
    saveState(); renderSources();
    toast('Texte ajouté comme source');
  });

  // Sources : extraction & pré-remplissage
  document.getElementById('btn-extract').addEventListener('click', () => {
    if (!STATE.sources.length) { toast('Ajoutez au moins une source'); return; }
    const all = STATE.sources.map(s => s.excerpt).join('\n');
    const info = extractInfoFromText(all);
    let count = 0;
    [['entreprise', 'in-entreprise'], ['siteWeb', 'in-site'], ['interlocuteur', 'in-interlocuteur'], ['objectif', 'in-objectif']].forEach(([key, elId]) => {
      if (info[key] && !STATE.client[key]) {
        STATE.client[key] = info[key];
        const el = document.getElementById(elId);
        if (el) el.value = info[key];
        count++;
      }
    });
    logAudit('Extraction sources', '', Object.keys(info).join(', ') || '∅');
    saveState();
    toast(count ? count + ' champ(s) pré-rempli(s)' : 'Sources analysées (rien à compléter)');
  });

  // Analyse : actions
  document.getElementById('btn-an-modifier').addEventListener('click', () => {
    const editing = document.querySelector('[data-an].editing');
    const els = document.querySelectorAll('[data-an]');
    if (editing) {
      els.forEach(el => {
        el.contentEditable = 'false';
        el.classList.remove('editing');
        STATE.analyse[el.dataset.an] = el.textContent.trim();
      });
      logAudit('Analyse modifiée', '', 'édition manuelle');
      saveState();
      toast('Modifications enregistrées');
    } else {
      els.forEach(el => { el.contentEditable = 'true'; el.classList.add('editing'); });
      toast('Modifiez les textes puis « Modifier » pour valider');
    }
  });
  document.getElementById('btn-an-regenerer').addEventListener('click', () => {
    if (!STATE.client.entreprise) { toast('Renseignez le client'); return; }
    generateAnalyse(false); renderAnalyse(); toast('Analyse régénérée');
  });
  document.getElementById('btn-an-approfondir').addEventListener('click', () => {
    if (!STATE.client.entreprise) { toast('Renseignez le client'); return; }
    generateAnalyse(true); renderAnalyse(); toast('Analyse approfondie');
  });

  // Modules : tout activer / désactiver
  document.getElementById('btn-mod-all-on').addEventListener('click', () => {
    CONFIG.modules.forEach(m => STATE.modules[m.id] = true);
    logAudit('Modules', '', 'tous activés'); saveState(); renderModules(); toast('Tous les modules activés');
  });
  document.getElementById('btn-mod-all-off').addEventListener('click', () => {
    CONFIG.modules.forEach(m => STATE.modules[m.id] = false);
    logAudit('Modules', '', 'tous désactivés'); saveState(); renderModules(); toast('Tous les modules désactivés');
  });

  // Devis : exports
  document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
  document.getElementById('btn-export-word').addEventListener('click', exportWord);
  document.getElementById('btn-export-email').addEventListener('click', exportEmail);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);

  // Audit : copier JSON / reset
  document.getElementById('btn-json-copy').addEventListener('click', async () => {
    const txt = JSON.stringify(STATE, null, 2);
    try { await navigator.clipboard.writeText(txt); toast('JSON copié'); }
    catch (e) { exportJSON(); }
  });
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (!confirm('Réinitialiser tout le dossier ? Cette action efface les données locales.')) return;
    STATE = defaultState();
    localStorage.removeItem(STORAGE_KEY);
    bindInputs();
    showScreen('screen-accueil');
    toast('Dossier réinitialisé');
  });

  // Redessiner le graphique au redimensionnement
  window.addEventListener('resize', () => {
    const active = document.querySelector('.screen.active');
    if (active && active.id === 'screen-roi') renderRoi();
  });
}

function guessType(name) {
  const n = name.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.doc') || n.endsWith('.docx')) return 'application/msword';
  if (n.endsWith('.eml') || n.endsWith('.msg')) return 'message/rfc822';
  if (n.match(/\.(png|jpg|jpeg|gif|webp)$/)) return 'image/*';
  return 'text/plain';
}
function humanSize(bytes) {
  if (bytes < 1024) return bytes + ' o';
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' Ko';
  return (bytes / 1048576).toFixed(1) + ' Mo';
}

/* ---------------------------------------------------------------
   15. INITIALISATION
--------------------------------------------------------------- */
function init() {
  bindInputs();
  wireEvents();
  showScreen('screen-accueil');
}
document.addEventListener('DOMContentLoaded', init);
