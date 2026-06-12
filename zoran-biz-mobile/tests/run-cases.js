/* Harnais de test : charge le vrai app.js (stubs navigateur), injecte 10 cas
   d'entreprises montréalaises et vérifie la cohérence des calculs/devis. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const noopEl = { addEventListener(){}, classList:{add(){},remove(){},toggle(){}}, style:{}, value:'', textContent:'', innerHTML:'' };
const ctx = {
  console,
  localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  performance: { now: () => Date.now() },
  document: { addEventListener(){}, querySelectorAll: () => [], querySelector: () => null, getElementById: () => noopEl, createElement: () => noopEl, body:{appendChild(){},removeChild(){}} },
  window: { addEventListener(){} },
  navigator: {},
  confirm: () => false,
  setTimeout, clearTimeout,
  Blob: function(){}, URL: { createObjectURL: () => '', revokeObjectURL(){} },
  fetch: () => Promise.reject(new Error('no network')),
  FileReader: function(){},
  Intl,
};
vm.createContext(ctx);
vm.runInContext(code, ctx);

const CASES = [
  { entreprise:'Pomerleau', secteur:'BTP', version:'BTP', dirigeant:'Pierre Pomerleau — Président et chef de la direction',
    interet:"Mémoires techniques, CCTP et devis de chantiers accélérés ; capitalisation du savoir-faire entre les grands projets (REM, hôpitaux).",
    dimension:{ employes:5000, services:12, utilisateurs:450, managers:60, experts:40, documents:250000 },
    roiHyp:{ heures:2.5, coutHoraire:55, adoption:70, semaines:46 }, modules:['memoire','audit','pdf','agents'] , attendu:'enterprise' },
  { entreprise:'AtkinsRéalis', secteur:'Ingénierie', version:'Technique', dirigeant:'Ian Edwards — Président et chef de la direction',
    interet:"Réutilisation des livrables d'ingénierie multi-projets (nucléaire, transport) ; cohérence documentaire et traçabilité réglementaire.",
    dimension:{ employes:8000, services:15, utilisateurs:950, managers:120, experts:90, documents:800000 },
    roiHyp:{ heures:2, coutHoraire:65, adoption:65, semaines:46 }, modules:['memoire','audit','pdf','coherence'], attendu:'enterprise' },
  { entreprise:'CAE', secteur:'Industrie aéronautique', version:'Industrie', dirigeant:'Matthew Bromberg — Président et chef de la direction',
    interet:"Documentation de simulation/formation, qualité et certification ; transfert de connaissance entre programmes civils et défense.",
    dimension:{ employes:13000, services:10, utilisateurs:600, managers:80, experts:70, documents:400000 },
    roiHyp:{ heures:2, coutHoraire:60, adoption:70, semaines:46 }, modules:['memoire','audit','pdf','skills'], attendu:'enterprise' },
  { entreprise:'Bombardier', secteur:'Industrie aéronautique', version:'Industrie', dirigeant:'Éric Martel — Président et chef de la direction',
    interet:"Capitalisation de l'expertise d'ingénierie des jets d'affaires ; réduction du temps de recherche documentaire en production et SAV.",
    dimension:{ employes:18000, services:14, utilisateurs:1200, managers:150, experts:110, documents:900000 },
    roiHyp:{ heures:1.8, coutHoraire:62, adoption:65, semaines:46 }, modules:['memoire','audit','pdf','agents','coherence'], attendu:'corporate' },
  { entreprise:'Banque Nationale du Canada', secteur:'Banque', version:'Banque', dirigeant:'Laurent Ferreira — Président et chef de la direction',
    interet:"Conformité réglementaire, traçabilité des décisions de crédit, productivité des analystes ; IA souveraine alignée avec les exigences OSFI/AMF.",
    dimension:{ employes:30000, services:20, utilisateurs:2500, managers:300, experts:180, documents:2000000 },
    roiHyp:{ heures:1.5, coutHoraire:70, adoption:60, semaines:46 }, modules:['memoire','audit','pdf','coherence','futur'], attendu:'corporate' },
  { entreprise:'BFL Canada', secteur:'Assurance (courtage)', version:'Assurance', dirigeant:'Barry F. Lorenzetti — Président fondateur et chef de la direction',
    interet:"Traitement des dossiers sinistres et placements accéléré ; mémoire client unifiée entre les bureaux canadiens.",
    dimension:{ employes:1400, services:8, utilisateurs:95, managers:14, experts:10, documents:60000 },
    roiHyp:{ heures:3, coutHoraire:50, adoption:75, semaines:46 }, modules:['memoire','audit','pdf'], attendu:'business' },
  { entreprise:'Société de transport de Montréal (STM)', secteur:'Collectivité / transport public', version:'Collectivite', dirigeant:'Marie-Claude Léonard — Directrice générale',
    interet:"Service public augmenté : maintenance métro/bus, procédures internes, conformité et transparence des décisions (Loi 25).",
    dimension:{ employes:11000, services:16, utilisateurs:800, managers:100, experts:60, documents:500000 },
    roiHyp:{ heures:1.5, coutHoraire:48, adoption:60, semaines:46 }, modules:['memoire','audit','pdf','cinematique'], attendu:'enterprise' },
  { entreprise:'Dialogue Technologies de la Santé', secteur:'Santé numérique', version:'Sante', dirigeant:'Cherif Habib — Cofondateur et chef de la direction',
    interet:"Pilote direction médicale : confidentialité patient, protocoles de soins virtuels et appui à la décision clinique, auditables de bout en bout.",
    dimension:{ employes:1000, services:5, utilisateurs:22, managers:5, experts:6, documents:15000 },
    roiHyp:{ heures:3, coutHoraire:75, adoption:85, semaines:46 }, modules:['memoire','audit','pdf'], attendu:'starter' },
  { entreprise:'CGI', secteur:'Services-conseils TI', version:'DSI', dirigeant:'Tim Hurlebaus — Président et chef de la direction (depuis mai 2026)',
    interet:"Industrialisation des propositions commerciales et réutilisation des livrables de mission ; vitrine IA face à la pression du marché sur le conseil TI.",
    dimension:{ employes:40000, services:18, utilisateurs:3000, managers:350, experts:250, documents:1500000 },
    roiHyp:{ heures:2, coutHoraire:68, adoption:65, semaines:46 }, modules:['memoire','audit','pdf','agents','skills'], attendu:'corporate' },
  { entreprise:'Metro Inc.', secteur:'Distribution alimentaire', version:'DG', dirigeant:'Eric La Flèche — Président et chef de la direction',
    interet:"Sièges sociaux et logistique : procédures, négociations fournisseurs et conformité alimentaire centralisées et interrogeables.",
    dimension:{ employes:9000, services:9, utilisateurs:140, managers:20, experts:12, documents:120000 },
    roiHyp:{ heures:2, coutHoraire:52, adoption:70, semaines:46 }, modules:['memoire','audit','pdf','futur'], attendu:'business' },
];

const close = (a, b) => Math.abs(a - b) < 0.01;
let failures = 0;
const results = [];

// CONFIG est une déclaration lexicale du script app.js : on la lit via le contexte
const APP_CONFIG = vm.runInContext('CONFIG', ctx);
const baseState = vm.runInContext('defaultState()', ctx);

for (const c of CASES) {
  // Injection du cas dans l'état réel de l'application (STATE est un `let` du script)
  const state = JSON.parse(JSON.stringify(baseState));
  state.client = { entreprise: c.entreprise, siteWeb: 'https://exemple.ca', pays: 'Canada',
    interlocuteur: c.dirigeant.split('—')[0].trim(), fonction: c.dirigeant.split('—')[1].trim(), objectif: c.interet };
  state.dimension = c.dimension;
  state.roiHyp = c.roiHyp;
  state.version = c.version;
  state.licence.choisie = null; // laisse le moteur recommander
  Object.keys(state.modules).forEach(k => state.modules[k] = c.modules.includes(k));

  const r = vm.runInContext(`STATE = ${JSON.stringify(state)}; computeAll()`, ctx);
  const errs = [];

  if (!r.valid) errs.push('validation: ' + JSON.stringify(r.errors));
  if (r.reco.id !== c.attendu) errs.push(`palier recommandé ${r.reco.id} ≠ attendu ${c.attendu}`);

  const sumLignes = r.devisLignes.reduce((s, l) => s + l.montant, 0);
  if (!close(sumLignes, r.totalAn1)) errs.push(`somme lignes devis ${sumLignes} ≠ total an 1 ${r.totalAn1}`);
  const sumRec = r.devisLignes.filter(l => l.recurrent).reduce((s, l) => s + l.montant, 0);
  if (!close(sumRec, r.recurrentAn)) errs.push(`somme récurrent ${sumRec} ≠ ${r.recurrentAn}`);
  if (!close(r.totalAn1, r.oneTime + r.recurrentAn)) errs.push('totalAn1 ≠ oneTime + récurrent');
  if (!close(r.gainNetAn1, r.gainBrutAn - r.totalAn1)) errs.push('gain net an 1 incohérent');
  if (!close(r.roiPct, (r.gainNetAn1 / r.totalAn1) * 100)) errs.push('ROI % incohérent');
  if (!close(r.retourMois, r.totalAn1 / (r.gainBrutAn / 12))) errs.push('payback incohérent');
  if (!close(r.coutLicencesAn, c.dimension.utilisateurs * r.palier.prixUserAn)) errs.push('coût licences incohérent');
  const modCost = c.modules.reduce((s, id) => s + APP_CONFIG.modules.find(m => m.id === id).cout, 0);
  if (!close(r.coutModulesAn, modCost)) errs.push('coût modules incohérent');
  if (r.gainNetAn1 <= 0) errs.push(`ROI an 1 négatif (${Math.round(r.roiPct)} %) — dossier non vendable en l'état`);
  if (r.retourMois > 12) errs.push(`payback ${r.retourMois.toFixed(1)} mois > 12`);

  if (errs.length) { failures++; console.error(`✗ ${c.entreprise}\n   - ` + errs.join('\n   - ')); }
  else console.log(`✓ ${c.entreprise} [${r.palier.nom}] total an 1 ${Math.round(r.totalAn1).toLocaleString('fr-FR')} € · récurrent ${Math.round(r.recurrentAn).toLocaleString('fr-FR')} €/an · ROI ${Math.round(r.roiPct)} % · payback ${r.retourMois.toFixed(1)} mois`);

  results.push({ cas: c, calc: {
    palier: r.palier.nom, installation: r.installation, parametrage: r.parametrage, formation: r.formation,
    licences: r.coutLicencesAn, modules: r.coutModulesAn, support: Math.round(r.support), maintenance: Math.round(r.maintenance),
    totalAn1: Math.round(r.totalAn1), recurrentAn: Math.round(r.recurrentAn),
    gainBrutAn: Math.round(r.gainBrutAn), gainNetAn1: Math.round(r.gainNetAn1),
    roiPct: Math.round(r.roiPct), retourMois: +r.retourMois.toFixed(1), trace: r.trace.map(t => t.step + ': ' + t.detail)
  }});
}

fs.writeFileSync(path.join(__dirname, 'resultats-montreal.json'), JSON.stringify(results, null, 2));
console.log(`\n${CASES.length - failures}/${CASES.length} cas valides — résultats écrits dans tests/resultats-montreal.json`);
process.exit(failures ? 1 : 0);
