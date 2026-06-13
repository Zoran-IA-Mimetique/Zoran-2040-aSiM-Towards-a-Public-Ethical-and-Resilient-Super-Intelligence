/* ============================================================
   ZORAN Knowledge & Sales Engine V3
   Moteur de composition déterministe (sans backend, sans clé API).
   À partir d'UN dossier client unique, produit des livrables réels,
   adaptés à l'audience / la complexité / le format / l'objectif.
   Fonctions pures (testables hors navigateur). Exposé en global : ENGINE.
   ============================================================ */
var ENGINE = (function () {
  'use strict';

  /* ---------- Référentiels ---------- */
  const MATURITE = [
    { n: 0, label: 'Aucune IA', desc: "aucun usage d'IA, tout est manuel" },
    { n: 1, label: 'Découverte', desc: "curiosité, premières lectures, pas d'outil" },
    { n: 2, label: 'Expérimentation', desc: "tests informels (ChatGPT grand public)" },
    { n: 3, label: 'Premiers usages', desc: "quelques usages individuels non cadrés" },
    { n: 4, label: 'Déploiement partiel', desc: "outils déployés sur un périmètre" },
    { n: 5, label: 'Déploiement généralisé', desc: "IA intégrée aux processus" },
    { n: 6, label: 'IA avancée', desc: "agents, automatisation, gouvernance mature" }
  ];

  const AUDIENCES = {
    'Artisan':                { angle: "gagner du temps sur les devis, mémoires et la paperasse", kpi: "heures administratives par semaine", vocab: 0 },
    'TPE':                    { angle: "faire plus sans embaucher, ne rien perdre quand quelqu'un part", kpi: "temps perdu à chercher l'information", vocab: 0 },
    'PME':                    { angle: "structurer la connaissance et accélérer les équipes", kpi: "productivité et délais", vocab: 1 },
    'ETI':                    { angle: "harmoniser les pratiques entre sites et capitaliser l'expertise", kpi: "coût de la non-qualité documentaire", vocab: 2 },
    'Grand groupe':           { angle: "gouvernance du savoir à l'échelle, conformité et souveraineté", kpi: "risque, conformité et productivité globale", vocab: 3 },
    'DG':                     { angle: "avantage compétitif durable et ROI mesurable", kpi: "ROI, time-to-market, rétention du savoir", vocab: 2 },
    'DAF':                    { angle: "coûts maîtrisés, ROI prouvé, dépense récurrente prévisible", kpi: "ROI, TCO, payback", vocab: 2 },
    'DSI':                    { angle: "sécurité, souveraineté des données et intégration au SI", kpi: "sécurité, conformité, intégration", vocab: 4 },
    'Responsable métier':     { angle: "résoudre un irritant quotidien concret", kpi: "temps gagné sur le terrain", vocab: 1 },
    'Responsable qualité':    { angle: "traçabilité, conformité documentaire et auditabilité", kpi: "non-conformités, traçabilité", vocab: 3 },
    'Responsable innovation': { angle: "différenciation et nouveaux usages", kpi: "vitesse d'innovation", vocab: 3 },
    'Expert':                 { angle: "décharger les sollicitations répétitives et transmettre le savoir", kpi: "temps d'expert préservé", vocab: 4 },
    'Technique':              { angle: "architecture, API, déploiement et sécurité", kpi: "intégration, latence, contrôle", vocab: 5 },
    'Investisseur':           { angle: "marché, modèle récurrent, effet d'échelle et défendabilité", kpi: "ARR, marge, TAM, moat", vocab: 3 },
    'Financeur':              { angle: "impact, éligibilité aux dispositifs et solidité du projet", kpi: "impact mesurable, cofinancement", vocab: 2 },
    'Administration':         { angle: "service public augmenté, conformité RGPD et transparence", kpi: "qualité de service, conformité", vocab: 2 },
    'Collectivité':           { angle: "service aux usagers, souveraineté et transparence", kpi: "service rendu, conformité Loi 25/RGPD", vocab: 2 }
  };

  const COMPLEXITES = ['Ultra simple', 'Simple', 'Commercial', 'Manager', 'Expert', 'Technique', 'Investisseur', 'Scientifique'];

  const FORMATS = {
    '10 lignes':        { props: 1, style: 'prose',  sections: ['accroche', 'valeur', 'cta'] },
    '20 lignes':        { props: 2, style: 'prose',  sections: ['accroche', 'contexte', 'valeur', 'cta'] },
    '50 lignes':        { props: 3, style: 'prose',  sections: ['accroche', 'contexte', 'valeur', 'roi', 'cta'] },
    '1 page':           { props: 3, style: 'prose',  sections: ['accroche', 'contexte', 'valeur', 'preuve', 'roi', 'cta'] },
    '2 pages':          { props: 4, style: 'prose',  sections: ['accroche', 'contexte', 'valeur', 'preuve', 'differenciateur', 'objection', 'roi', 'cta'] },
    '5 pages':          { props: 6, style: 'prose',  sections: ['accroche', 'contexte', 'valeur', 'preuve', 'differenciateur', 'objection', 'casusage', 'roi', 'roadmap', 'cta'] },
    '10 pages':         { props: 7, style: 'prose',  sections: ['accroche', 'contexte', 'valeur', 'preuve', 'differenciateur', 'objection', 'casusage', 'poc', 'roi', 'risque', 'roadmap', 'cta'] },
    'FAQ':              { props: 4, style: 'faq',    sections: ['faq'] },
    'Présentation':     { props: 5, style: 'slides', sections: ['accroche', 'contexte', 'valeur', 'differenciateur', 'roi', 'roadmap', 'cta'] },
    'PowerPoint':       { props: 5, style: 'slides', sections: ['accroche', 'contexte', 'valeur', 'differenciateur', 'roi', 'roadmap', 'cta'] },
    'Fiche synthèse':   { props: 3, style: 'bullets', sections: ['accroche', 'valeur', 'roi', 'cta'] },
    'Compte rendu':     { props: 3, style: 'prose',  sections: ['contexte', 'valeur', 'roi', 'cta'] },
    'Livre blanc':      { props: 7, style: 'prose',  sections: ['accroche', 'contexte', 'valeur', 'preuve', 'differenciateur', 'casusage', 'risque', 'roadmap', 'cta'] },
    'Argumentaire oral':{ props: 3, style: 'oral',   sections: ['accroche', 'valeur', 'preuve', 'cta'] }
  };

  const OBJECTIFS = {
    'Comprendre':                 { cta: "Souhaitez-vous que nous prenions 20 minutes pour explorer votre cas précis ?" },
    'Découvrir':                  { cta: "Je vous propose une courte démonstration sur vos propres documents." },
    'Sensibiliser':               { cta: "Le bon point de départ est un diagnostic gratuit de votre patrimoine documentaire." },
    'Convaincre':                 { cta: "Validons ensemble un POC chiffré sur un périmètre maîtrisé." },
    'Obtenir un rendez-vous':     { cta: "Quand seriez-vous disponible 30 minutes la semaine prochaine ?" },
    'Obtenir un POC':             { cta: "Lançons un POC de 6 semaines avec des indicateurs de succès clairs." },
    'Obtenir un budget':          { cta: "Voici le chiffrage et le ROI à présenter en comité d'investissement." },
    'Déployer':                   { cta: "Passons du POC au déploiement selon la feuille de route ci-dessous." },
    'Former':                     { cta: "Un plan de formation par rôle accompagne l'adoption." },
    'Financer':                   { cta: "Le projet est éligible à plusieurs dispositifs de financement de l'innovation." },
    "Répondre à un appel d'offres": { cta: "Cette note alimente directement votre mémoire technique." },
    'Répondre à une objection':   { cta: "Reprenons point par point pour lever le doute." },
    'Préparer un comité de direction': { cta: "Voici la synthèse décisionnelle pour votre CODIR." },
    'Préparer un investisseur':   { cta: "Voici les éléments de marché et de modèle pour votre due diligence." }
  };

  /* ---------- Base de connaissance ZORAN ---------- */
  const KB = {
    valueProps: [
      { id: 'memoire',  titre: "Une mémoire d'entreprise vivante",
        court: "ZORAN transforme vos documents et l'expertise dispersée en une mémoire interrogeable en langage naturel.",
        detail: "Plutôt que de chercher dans des dossiers, vos équipes posent une question et obtiennent une réponse synthétique, construite sur VOS contenus. La connaissance cesse de dormir dans des fichiers : elle devient utilisable instantanément.",
        preuve: "Le temps moyen passé à rechercher une information (souvent 1 à 2 h par jour et par cadre) est largement récupéré." },
      { id: 'source',   titre: "Des réponses sourcées et auditables",
        court: "Chaque réponse cite ses sources et reste traçable de bout en bout.",
        detail: "Contrairement à un assistant grand public, ZORAN indique d'où vient l'information et conserve la trace de qui a demandé quoi, quand. C'est la condition d'un usage professionnel sérieux : on peut vérifier, justifier et auditer.",
        preuve: "Traçabilité complète (qui / quoi / quand / source) intégrée nativement." },
      { id: 'souverain',titre: "Souveraineté et conformité",
        court: "Vos données restent maîtrisées, dans un cadre conforme RGPD / Loi 25.",
        detail: "ZORAN s'inscrit dans une logique d'IA souveraine et éthique : hébergement maîtrisé, gouvernance des données, respect des obligations réglementaires. Vos informations sensibles ne nourrissent pas un modèle public.",
        preuve: "Conformité RGPD / Loi 25 et hébergement maîtrisé." },
      { id: 'expertise',titre: "Capitalisation de l'expertise",
        court: "Le savoir de vos experts est préservé et partagé, même en cas de départ.",
        detail: "La dépendance à quelques personnes-clés est un risque majeur. ZORAN capture le savoir-faire et le rend accessible à tous, réduisant le point de rupture quand un expert s'absente ou quitte l'entreprise.",
        preuve: "Réduction de la dépendance aux experts et du risque de perte de savoir." },
      { id: 'temps',    titre: "Du temps opérationnel gagné",
        court: "Moins de recherche, moins de ressaisie, plus de production à valeur.",
        detail: "Les tâches répétitives (retrouver, résumer, reformuler, comparer) sont accélérées. Vos équipes se concentrent sur ce qui compte vraiment.",
        preuve: "Gains de productivité mesurables dès les premières semaines." },
      { id: 'ethique',  titre: "Une IA mimétique et éthique",
        court: "Une approche pensée pour la fiabilité et l'alignement, pas pour l'effet de mode.",
        detail: "ZORAN privilégie la pertinence sur votre contexte, la transparence des sources et un comportement maîtrisé, plutôt qu'une réponse impressionnante mais invérifiable.",
        preuve: "Conception orientée fiabilité, transparence et contrôle." },
      { id: 'modulaire',titre: "Un déploiement progressif et modulaire",
        court: "On commence petit, on étend au rythme de l'adoption.",
        detail: "Mémoire, audit, agents, skills : les capacités s'activent par étapes. Pas de big-bang : un socle qui prouve sa valeur, puis une extension maîtrisée.",
        preuve: "Mise en route rapide sur un périmètre, puis montée en charge." }
    ],

    differentiateurs: {
      'ChatGPT': {
        nom: 'ChatGPT', pointsCommuns: "Tous deux comprennent le langage naturel et rédigent.",
        differences: "ChatGPT est généraliste et ne connaît pas votre entreprise ; ZORAN raisonne sur VOTRE corpus, avec mémoire persistante et sources.",
        avantages: "Réponses ancrées dans vos documents, traçabilité, souveraineté des données.",
        limites: "ChatGPT reste excellent pour des tâches génériques et publiques.",
        casUsage: "Là où vos données sont sensibles et où la justification compte, ZORAN s'impose." },
      'Claude': {
        nom: 'Claude', pointsCommuns: "Excellente compréhension et rédaction, attention à la sûreté.",
        differences: "Claude est un modèle généraliste ; ZORAN est une solution d'entreprise qui ajoute mémoire propriétaire, traçabilité et gouvernance autour du raisonnement.",
        avantages: "Mémoire d'entreprise, audit natif, intégration métier et souveraineté.",
        limites: "Pour du raisonnement généraliste pur, un grand modèle seul suffit.",
        casUsage: "ZORAN apporte la couche entreprise (corpus, sources, conformité) absente d'un assistant seul." },
      'Copilot': {
        nom: 'Microsoft Copilot', pointsCommuns: "Assistance à la productivité au quotidien.",
        differences: "Copilot est lié à l'écosystème Microsoft 365 ; ZORAN est agnostique et centré sur la souveraineté et la mémoire métier.",
        avantages: "Indépendance vis-à-vis d'un éditeur, contrôle des données, traçabilité.",
        limites: "Dans un environnement 100 % Microsoft, Copilot est très intégré.",
        casUsage: "ZORAN convient quand on refuse l'enfermement éditeur ou qu'on exige la souveraineté." },
      'Gemini': {
        nom: 'Google Gemini', pointsCommuns: "Modèle puissant, multimodal.",
        differences: "Gemini est un service cloud généraliste ; ZORAN est une mémoire d'entreprise souveraine et auditable.",
        avantages: "Données maîtrisées, sources, conformité, ancrage sur votre savoir.",
        limites: "Pour des usages grand public, Gemini est très accessible.",
        casUsage: "ZORAN cible l'usage professionnel sensible et traçable." },
      'GED classique': {
        nom: 'GED classique', pointsCommuns: "Tous deux gèrent des documents d'entreprise.",
        differences: "Une GED stocke et classe ; ZORAN comprend, synthétise et répond à partir du contenu.",
        avantages: "On passe du « retrouver un fichier » au « obtenir une réponse ».",
        limites: "La GED reste utile pour l'archivage réglementaire structuré.",
        casUsage: "ZORAN se pose au-dessus de la GED pour la rendre intelligente." },
      'Moteur documentaire': {
        nom: 'Moteur documentaire', pointsCommuns: "Recherche dans un corpus.",
        differences: "Un moteur renvoie des documents ; ZORAN renvoie une réponse synthétique sourcée.",
        avantages: "Moins de lecture, plus de décision : la synthèse est faite pour vous.",
        limites: "La recherche par mots-clés garde un intérêt pour le repérage brut.",
        casUsage: "ZORAN remplace 'chercher puis lire' par 'demander et décider'." }
    },

    objections: {
      'chatgpt':   { label: "« Nous avons déjà ChatGPT »",
        court: "ChatGPT ne connaît pas vos documents et ne trace pas ses sources ; ZORAN raisonne sur votre savoir, de façon auditable et souveraine.",
        DG: "ChatGPT est un couteau suisse public. ZORAN est votre mémoire d'entreprise : sourcée, traçable, et qui ne fuit pas vos données.",
        DSI: "La différence est la gouvernance : avec ZORAN, les données restent maîtrisées, les réponses sont sourcées et tout est auditable.",
        Investisseur: "Le différenciateur défendable est la mémoire propriétaire et la conformité, pas le modèle sous-jacent." },
      'copilot':   { label: "« Nous avons déjà Copilot »",
        court: "Copilot vous lie à Microsoft ; ZORAN reste agnostique, souverain et centré sur votre mémoire métier.",
        DG: "Copilot dépend de votre licence Microsoft. ZORAN évite l'enfermement et garantit la souveraineté.",
        DSI: "ZORAN s'intègre sans imposer un écosystème unique et garde le contrôle des données.",
        Investisseur: "L'indépendance éditeur est un atout de négociation et de pérennité." },
      'sharepoint':{ label: "« Nous avons SharePoint »",
        court: "SharePoint stocke ; ZORAN comprend et répond à partir de ce qui y est stocké.",
        DG: "Vos équipes ne cherchent plus un fichier : elles obtiennent une réponse.",
        DSI: "ZORAN se branche au-dessus de l'existant, sans tout refondre.",
        Investisseur: "ZORAN valorise un actif documentaire déjà payé." },
      'ged':       { label: "« Nous avons une GED »",
        court: "La GED classe, ZORAN raisonne : c'est complémentaire, pas redondant.",
        DG: "La GED a rangé vos documents ; ZORAN les rend enfin utiles au quotidien.",
        DSI: "ZORAN s'appuie sur la GED comme source, sans la remplacer.",
        Investisseur: "Couche d'intelligence à forte valeur ajoutée sur un socle existant." },
      'budget':    { label: "« Nous n'avons pas de budget »",
        court: "Le coût de l'inaction (temps perdu, dépendance experts) dépasse souvent l'investissement ; commençons par un POC à périmètre réduit.",
        DG: "Le vrai coût, c'est le temps perdu chaque jour. Le POC le prouve chiffres en main.",
        DSI: "On démarre petit, sur un budget maîtrisé, avec un ROI mesuré avant d'étendre.",
        Investisseur: "Modèle progressif : faible mise initiale, extension financée par les gains." },
      'resistance':{ label: "« Nos équipes résisteront »",
        court: "L'adoption se pilote : périmètre pilote, formation par rôle, gains rapides visibles.",
        DG: "On choisit un cas qui soulage immédiatement les équipes : l'adhésion suit.",
        DSI: "Accompagnement, formation et indicateurs d'usage cadrent le changement.",
        Investisseur: "La conduite du changement est intégrée à la feuille de route." },
      'temps':     { label: "« Nous n'avons pas le temps »",
        court: "Justement : ZORAN fait gagner du temps, et le POC demande peu d'implication de vos équipes.",
        DG: "Ne rien faire coûte du temps chaque jour ; le POC en demande très peu.",
        DSI: "Mise en route légère, sur un périmètre restreint.",
        Investisseur: "Time-to-value court, charge interne minimale." },
      'donnees':   { label: "« Nos données sont sensibles »",
        court: "C'est exactement la raison d'être de ZORAN : souveraineté, hébergement maîtrisé, conformité RGPD / Loi 25.",
        DG: "Vos données ne nourrissent aucun modèle public : elles restent chez vous.",
        DSI: "Gouvernance, traçabilité et hébergement maîtrisé répondent à vos exigences.",
        Investisseur: "La conformité est un argument commercial, pas un frein." }
    },

    casUsage: {
      1: { titre: "Gains rapides", ex: ["Retrouver instantanément une procédure ou une clause", "Résumer un dossier volumineux", "Répondre vite à une question récurrente"] },
      2: { titre: "Optimisation", ex: ["Standardiser les réponses et les livrables", "Réduire les ressaisies entre services", "Accélérer la rédaction de devis et mémoires"] },
      3: { titre: "Transformation", ex: ["Unifier la connaissance entre sites", "Sécuriser le savoir des experts", "Industrialiser les propositions commerciales"] },
      4: { titre: "Innovation", ex: ["Agents métier autonomes", "Aide à la décision sur le corpus", "Nouveaux services data pour vos clients"] }
    },

    pitchPhrases: {
      hook: "Vos équipes passent des heures à chercher, reformuler et retrouver l'information ; ce savoir dort dans vos documents.",
      what: "ZORAN transforme tout ce patrimoine en une mémoire d'entreprise interrogeable, souveraine et auditable.",
      proof: "Chaque réponse est sourcée et traçable, vos données restent maîtrisées.",
      diff: "Là où un assistant grand public ignore votre contexte, ZORAN raisonne sur VOTRE savoir.",
      ask: "Le plus simple est un POC court sur vos propres documents pour mesurer le gain."
    }
  };

  /* ---------- Utilitaires ---------- */
  function fmtEur(n) { return Math.round(n).toLocaleString('fr-FR') + ' €'; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function metrics(state) {
    const d = state.dimension || {};
    const h = state.roiHyp || {};
    const utilisateursActifs = Math.round((d.utilisateurs || 0) * ((h.adoption || 70) / 100));
    const heuresAn = utilisateursActifs * (h.heures || 2) * (h.semaines || 46);
    const gainBrutAn = heuresAn * (h.coutHoraire || 45);
    return { utilisateursActifs, heuresAn, gainBrutAn };
  }

  function maturiteObj(state) {
    const n = clamp(parseInt((state.profil && state.profil.maturiteIA) != null ? state.profil.maturiteIA : 2, 10), 0, 6);
    return MATURITE[n];
  }

  /* Adapte une phrase de valeur au niveau de maturité IA */
  function valeurSelonMaturite(prop, mat) {
    if (mat.n <= 1) return prop.court + " C'est un premier pas simple et concret.";
    if (mat.n <= 3) return prop.court + " " + prop.detail;
    return prop.detail + " À votre niveau de maturité, l'enjeu est l'industrialisation et la gouvernance.";
  }

  function introComplexite(complexite, audienceKey, ent) {
    const a = AUDIENCES[audienceKey] || AUDIENCES['DG'];
    switch (complexite) {
      case 'Ultra simple': return "En une phrase : ZORAN aide " + ent + " à retrouver et utiliser tout son savoir, sans perdre de temps.";
      case 'Simple':       return "Pour " + ent + ", l'idée est simple : arrêter de chercher l'information et l'obtenir directement.";
      case 'Scientifique': return "Approche : ancrage des réponses sur un corpus propriétaire (RAG souverain), traçabilité des sources et gouvernance des données, au service de " + a.angle + ".";
      case 'Technique':    return "Sur le plan technique, ZORAN indexe votre corpus, ancre les réponses sur vos sources et expose des contrôles d'audit, en visant " + a.angle + ".";
      case 'Investisseur': return "Thèse : une mémoire d'entreprise souveraine crée un actif défendable et récurrent, au service de " + a.angle + ".";
      default:             return "Pour " + ent + ", l'enjeu prioritaire est de " + a.angle + ".";
    }
  }

  /* ---------- Sections réutilisables ---------- */
  function buildSection(key, ctx) {
    const { state, audienceKey, complexite, format, objectif, mat, ent, m, props } = ctx;
    const a = AUDIENCES[audienceKey] || AUDIENCES['DG'];
    switch (key) {
      case 'accroche':
        return { h: "L'essentiel", t: introComplexite(complexite, audienceKey, ent) + " " + KB.pitchPhrases.hook };
      case 'contexte': {
        const d = state.dimension || {};
        return { h: "Votre contexte", t: ent + (state.client && state.client.secteur ? " (" + state.client.secteur + ")" : "") +
          " : " + (d.utilisateurs || '?') + " utilisateurs potentiels, " + (d.services || '?') + " services, " +
          (d.documents ? Number(d.documents).toLocaleString('fr-FR') + " documents à valoriser. " : "") +
          "Objectif déclaré : " + ((state.client && state.client.objectif) || a.angle) + "." };
      }
      case 'valeur':
        return { h: "Ce que ZORAN apporte",
          t: props.map(p => "• " + valeurSelonMaturite(p, mat)).join('\n') };
      case 'preuve':
        return { h: "Preuves", t: props.map(p => "• " + p.preuve).join('\n') };
      case 'differenciateur': {
        const comp = (state.profil && state.profil.objections && state.profil.objections.indexOf('copilot') >= 0) ? 'Copilot' : 'ChatGPT';
        const dd = KB.differentiateurs[comp];
        return { h: "ZORAN vs " + dd.nom, t: "Différence clé : " + dd.differences + "\nAvantage : " + dd.avantages };
      }
      case 'objection': {
        const objId = (state.profil && state.profil.objections && state.profil.objections[0]) || 'chatgpt';
        const o = KB.objections[objId] || KB.objections['chatgpt'];
        return { h: "Objection anticipée — " + o.label, t: o.court };
      }
      case 'casusage': {
        const niv = clamp(mat.n <= 2 ? 1 : mat.n <= 4 ? 2 : mat.n <= 5 ? 3 : 4, 1, 4);
        const cu = KB.casUsage[niv];
        return { h: "Cas d'usage prioritaires — " + cu.titre, t: cu.ex.map(e => "• " + e).join('\n') };
      }
      case 'roi':
        return { h: "Retour sur investissement",
          t: "Gain brut estimé : " + fmtEur(m.gainBrutAn) + "/an (" + Math.round(m.heuresAn).toLocaleString('fr-FR') +
             " h économisées sur " + m.utilisateursActifs + " utilisateurs actifs). Hypothèses ajustables en direct." };
      case 'risque': {
        const r = risqueInaction(state);
        return { h: "Risque de ne rien faire", t: r.sections.map(s => s.t).join('\n') };
      }
      case 'poc': {
        const p = poc(state);
        return { h: "Proposition de POC", t: p.sections.map(s => s.h + " : " + s.t).join('\n') };
      }
      case 'roadmap': {
        const rd = roadmap(state);
        return { h: "Feuille de route", t: rd.sections.map(s => s.h + " — " + s.t).join('\n') };
      }
      case 'cta':
        return { h: "Prochaine étape", t: (OBJECTIFS[objectif] || OBJECTIFS['Convaincre']).cta };
      default:
        return null;
    }
  }

  /* ---------- Générateur principal adaptatif ---------- */
  function generate(state, opts) {
    opts = opts || {};
    const g = state.generation || {};
    const audienceKey = opts.audience || g.audience || 'DG';
    const complexite  = opts.complexite || g.complexite || 'Commercial';
    const format      = opts.format || g.format || '1 page';
    const objectif    = opts.objectif || g.objectif || 'Convaincre';

    const fmt = FORMATS[format] || FORMATS['1 page'];
    const mat = maturiteObj(state);
    const ent = (state.client && state.client.entreprise) || 'votre organisation';
    const m = metrics(state);

    // Sélection des value props prioritaires pour l'audience
    const a = AUDIENCES[audienceKey] || AUDIENCES['DG'];
    let propsOrder = KB.valueProps.slice();
    if (audienceKey === 'DSI' || audienceKey === 'Technique') propsOrder = reorder(propsOrder, ['souverain', 'source', 'memoire']);
    else if (audienceKey === 'DAF' || audienceKey === 'Investisseur' || audienceKey === 'Financeur') propsOrder = reorder(propsOrder, ['temps', 'expertise', 'memoire']);
    else if (audienceKey === 'Responsable qualité' || audienceKey === 'Administration' || audienceKey === 'Collectivité') propsOrder = reorder(propsOrder, ['source', 'souverain', 'memoire']);
    else propsOrder = reorder(propsOrder, ['memoire', 'temps', 'expertise']);
    const props = propsOrder.slice(0, clamp(fmt.props, 1, KB.valueProps.length));

    const ctx = { state, audienceKey, complexite, format, objectif, mat, ent, m, props };

    if (fmt.style === 'faq') return faq(state, ctx);

    const sections = fmt.sections.map(k => buildSection(k, ctx)).filter(Boolean);

    let titre = "ZORAN pour " + ent + " — " + audienceKey + " / " + objectif;
    if (fmt.style === 'slides') titre = "Présentation ZORAN — " + ent + " (" + audienceKey + ")";

    return {
      titre,
      meta: { audience: audienceKey, complexite, format, objectif, maturite: mat.label, style: fmt.style },
      sections
    };
  }

  function reorder(arr, ids) {
    const map = {}; arr.forEach(p => map[p.id] = p);
    const head = ids.map(id => map[id]).filter(Boolean);
    const rest = arr.filter(p => ids.indexOf(p.id) < 0);
    return head.concat(rest);
  }

  /* ---------- Moteurs spécialisés ---------- */
  function differenciation(state, competitorKey) {
    const d = KB.differentiateurs[competitorKey] || KB.differentiateurs['ChatGPT'];
    return {
      titre: "Comparatif ZORAN vs " + d.nom,
      meta: { type: 'differenciation' },
      sections: [
        { h: "Points communs", t: d.pointsCommuns },
        { h: "Différences", t: d.differences },
        { h: "Avantages de ZORAN", t: d.avantages },
        { h: "Limites / honnêteté", t: d.limites },
        { h: "Quand choisir ZORAN", t: d.casUsage }
      ]
    };
  }

  function pourquoiMaintenant(state, audienceKey) {
    const ent = (state.client && state.client.entreprise) || 'votre organisation';
    const m = metrics(state);
    const variantes = {
      'PME': "Pour une PME comme " + ent + ", chaque heure compte. L'IA bien cadrée fait gagner du temps sans surcoût humain.",
      'DG': "L'écart se creuse entre les organisations qui capitalisent leur savoir et les autres. Attendre, c'est laisser filer un avantage.",
      'DSI': "Mieux vaut cadrer l'usage de l'IA maintenant, de façon souveraine et gouvernée, que de subir des usages sauvages non maîtrisés.",
      'Investisseur': "Le marché bascule vers des mémoires d'entreprise souveraines : se positionner tôt crée un actif défendable."
    };
    return {
      titre: "Pourquoi l'IA, et pourquoi maintenant — " + ent,
      meta: { type: 'pourquoi' },
      sections: [
        { h: "Pourquoi s'intéresser à l'IA ?", t: "Parce que votre savoir est un actif sous-exploité. " + KB.pitchPhrases.what },
        { h: "Pourquoi maintenant ?", t: variantes[audienceKey] || variantes['DG'] },
        { h: "Pourquoi attendre est risqué ?", t: "Chaque mois sans agir, c'est du temps perdu (estimé " + fmtEur(m.gainBrutAn / 12) + "/mois) et du savoir qui s'érode au gré des départs." },
        { h: "Gains rapides", t: KB.casUsage[1].ex.map(e => "• " + e).join('\n') },
        { h: "Gains long terme", t: KB.casUsage[3].ex.map(e => "• " + e).join('\n') }
      ]
    };
  }

  function poc(state) {
    const ent = (state.client && state.client.entreprise) || 'votre organisation';
    const d = state.dimension || {};
    const users = clamp(Math.round((d.utilisateurs || 20) * 0.1), 5, 30);
    const m = metrics(state);
    const budget = clamp(Math.round(m.gainBrutAn * 0.05), 8000, 45000);
    return {
      titre: "Plan de POC ZORAN — " + ent,
      meta: { type: 'poc' },
      sections: [
        { h: "Objectif", t: "Prouver, chiffres à l'appui, le gain de temps et la fiabilité sur un périmètre réel." },
        { h: "Périmètre", t: "1 service pilote, " + users + " utilisateurs, un corpus documentaire ciblé." },
        { h: "Durée", t: "6 semaines (2 de cadrage/ingestion, 4 d'usage)." },
        { h: "Équipe", t: "1 sponsor, 1 référent métier, 1 référent données côté client ; accompagnement ZORAN." },
        { h: "Indicateurs", t: "Temps moyen de recherche, taux de réponses jugées utiles, nombre d'usages/semaine." },
        { h: "Critères de succès", t: "≥ 30 % de temps gagné sur les tâches ciblées et adoption ≥ 60 % des pilotes." },
        { h: "Critères d'échec", t: "Adoption < 30 % ou aucune amélioration mesurable du temps de recherche." },
        { h: "Budget indicatif", t: fmtEur(budget) + " pour le POC (déductible d'un déploiement ultérieur)." },
        { h: "Planning", t: "S1-S2 ingestion & cadrage · S3-S6 usage & mesure · restitution en fin de S6." }
      ]
    };
  }

  function objection(state, objId) {
    const o = KB.objections[objId] || KB.objections['chatgpt'];
    return {
      titre: "Réponse à l'objection : " + o.label,
      meta: { type: 'objection' },
      sections: [
        { h: "Réponse courte", t: o.court },
        { h: "Réponse pour un DG", t: o.DG },
        { h: "Réponse pour un DSI", t: o.DSI },
        { h: "Réponse pour un investisseur", t: o.Investisseur }
      ]
    };
  }

  function risqueInaction(state) {
    const m = metrics(state);
    const d = state.dimension || {};
    const perteAn = m.gainBrutAn; // temps récupérable non récupéré
    const detteDocAn = (Number(d.documents) || 0) * 0.15; // coût caché de dette documentaire (indicatif)
    const baseAn = perteAn + detteDocAn;
    const proj = mois => {
      const ans = mois / 12;
      // érosion du savoir : facteur croissant léger
      const facteur = 1 + 0.05 * (ans - 1);
      return baseAn * ans * facteur;
    };
    return {
      titre: "Coût de l'inaction — " + ((state.client && state.client.entreprise) || 'votre organisation'),
      meta: { type: 'risque' },
      sections: [
        { h: "Postes de coût", t: "• Temps perdu en recherche : " + fmtEur(perteAn) + "/an\n• Dépendance aux experts (risque de rupture)\n• Dette documentaire estimée : " + fmtEur(detteDocAn) + "/an\n• Perte d'opportunités et de réactivité" },
        { h: "Projection 12 mois", t: fmtEur(proj(12)) },
        { h: "Projection 24 mois", t: fmtEur(proj(24)) },
        { h: "Projection 36 mois", t: fmtEur(proj(36)) },
        { h: "Projection 60 mois", t: fmtEur(proj(60)) }
      ]
    };
  }

  function roadmap(state) {
    return {
      titre: "Feuille de route d'adoption — " + ((state.client && state.client.entreprise) || 'votre organisation'),
      meta: { type: 'roadmap' },
      sections: [
        { h: "30 jours", t: "Cadrage, sélection du périmètre pilote, ingestion du premier corpus." },
        { h: "90 jours", t: "POC mené et mesuré, premiers usages, décision Go/No-Go documentée." },
        { h: "6 mois", t: "Extension à 2-3 services, formation par rôle, mise en place de la gouvernance." },
        { h: "12 mois", t: "Déploiement généralisé sur les usages prioritaires, suivi des indicateurs." },
        { h: "24 mois", t: "Agents et skills métier, automatisations, intégrations au SI." },
        { h: "36 mois", t: "IA avancée : aide à la décision sur le corpus, nouveaux services data." }
      ]
    };
  }

  function casUsage(state) {
    const sections = [1, 2, 3, 4].map(n => ({ h: "Niveau " + n + " — " + KB.casUsage[n].titre, t: KB.casUsage[n].ex.map(e => "• " + e).join('\n') }));
    return { titre: "Cas d'usage ZORAN par niveau de maturité", meta: { type: 'casusage' }, sections };
  }

  function pitch(state, dureeKey, audienceKey) {
    const ent = (state.client && state.client.entreprise) || 'votre organisation';
    const m = metrics(state);
    const p = KB.pitchPhrases;
    const roi = "Gain estimé : " + fmtEur(m.gainBrutAn) + "/an.";
    const scripts = {
      '15 secondes': [p.what],
      '30 secondes': [p.hook, p.what, p.ask],
      '1 minute':    [p.hook, p.what, p.proof, p.ask],
      '2 minutes':   [p.hook, p.what, p.proof, p.diff, roi, p.ask],
      '5 minutes':   [p.hook, p.what, p.proof, p.diff, roi, "Concrètement chez " + ent + " : " + KB.casUsage[1].ex.join(', ') + ".", p.ask],
      '15 minutes':  [p.hook, p.what, p.proof, p.diff, roi,
                      "Cas d'usage : " + KB.casUsage[2].ex.join(', ') + ".",
                      "Déploiement progressif en 30/90 jours puis montée en charge.",
                      "Souveraineté et conformité (RGPD/Loi 25) garanties.", p.ask],
      '30 minutes':  [p.hook, p.what, p.proof, p.diff, roi,
                      "Cas d'usage par niveau : " + KB.casUsage[1].titre + ", " + KB.casUsage[2].titre + ", " + KB.casUsage[3].titre + ".",
                      "POC de 6 semaines avec indicateurs de succès.",
                      "Feuille de route 30j → 36 mois.",
                      "Comparaison avec les assistants grand public : mémoire, sources, souveraineté.", p.ask]
    };
    const lignes = scripts[dureeKey] || scripts['30 secondes'];
    return {
      titre: "Pitch ZORAN " + dureeKey + (audienceKey ? " — " + audienceKey : "") + " (" + ent + ")",
      meta: { type: 'pitch', duree: dureeKey },
      sections: [{ h: "Script", t: lignes.join('\n\n') }]
    };
  }

  function faq(state, ctx) {
    const ent = (state.client && state.client.entreprise) || 'votre organisation';
    const m = metrics(state);
    const qa = [
      ["Qu'est-ce que ZORAN, en une phrase ?", "Une mémoire d'entreprise qui transforme vos documents et l'expertise interne en réponses sourcées et souveraines."],
      ["En quoi est-ce différent de ChatGPT ?", KB.differentiateurs['ChatGPT'].differences],
      ["Nos données sont-elles en sécurité ?", "Oui : hébergement maîtrisé, gouvernance des données et conformité RGPD / Loi 25. Vos données ne nourrissent pas un modèle public."],
      ["Combien de temps pour démarrer ?", "Un POC de 6 semaines sur un périmètre réduit suffit à mesurer la valeur."],
      ["Quel retour sur investissement ?", "Pour " + ent + ", gain brut estimé à " + fmtEur(m.gainBrutAn) + "/an, ajustable selon vos hypothèses."],
      ["Faut-il remplacer notre GED / SharePoint ?", "Non : ZORAN s'appuie dessus comme source et ajoute la couche d'intelligence."],
      ["Comment gère-t-on l'adoption ?", "Périmètre pilote, formation par rôle et indicateurs d'usage pour piloter le changement."]
    ];
    return {
      titre: "FAQ ZORAN — " + ent,
      meta: { type: 'faq' },
      sections: qa.map(([q, a]) => ({ h: q, t: a }))
    };
  }

  function financement(state) {
    const ent = (state.client && state.client.entreprise) || 'votre organisation';
    const m = metrics(state);
    return {
      titre: "Dossier de financement — " + ent,
      meta: { type: 'financement' },
      sections: [
        { h: "Projet", t: "Déploiement d'une mémoire d'entreprise souveraine (ZORAN) pour valoriser le savoir et améliorer la productivité." },
        { h: "Impact attendu", t: "Gain de productivité estimé à " + fmtEur(m.gainBrutAn) + "/an, réduction du risque de perte de savoir, conformité renforcée." },
        { h: "Dimension innovation", t: "IA souveraine, traçable et éthique : sujet éligible à plusieurs dispositifs de soutien à l'innovation et à la transition numérique." },
        { h: "Plan d'investissement", t: "POC puis déploiement progressif (voir feuille de route 30j → 36 mois)." },
        { h: "Indicateurs de suivi", t: "Temps gagné, taux d'adoption, nombre d'usages, réduction des non-conformités." },
        { h: "Pistes de financement", t: "Dispositifs d'aide à l'innovation, crédits transition numérique, cofinancements régionaux (à confirmer selon territoire et statut)." }
      ]
    };
  }

  /* ---------- Moteur de recommandation automatique ---------- */
  function recommander(state) {
    const p = state.profil || {};
    const mat = maturiteObj(state);
    const urgence = p.urgence || 'moyenne';
    const budget = p.budget || '';

    // Angle conseillé selon maturité
    let angle, argument, format, objectif, pocReco, adoption;
    if (mat.n <= 1) {
      angle = "Sensibilisation : montrer la valeur avant de parler technique.";
      argument = "Gain de temps immédiat et fin de la perte de savoir.";
      format = "Fiche synthèse"; objectif = "Sensibiliser";
      pocReco = "Démonstration sur leurs propres documents."; adoption = "Commencer par un cas qui soulage visiblement les équipes.";
    } else if (mat.n <= 3) {
      angle = "Cadrage : transformer des essais épars en usage maîtrisé.";
      argument = "Souveraineté et traçabilité vs outils grand public.";
      format = "1 page"; objectif = "Obtenir un POC";
      pocReco = "POC 6 semaines sur un service pilote."; adoption = "Formation par rôle + indicateurs d'usage.";
    } else {
      angle = "Industrialisation : gouvernance, échelle et nouveaux usages.";
      argument = "Mémoire propriétaire défendable et conformité à l'échelle.";
      format = "5 pages"; objectif = "Déployer";
      pocReco = "Extension multi-services et agents métier."; adoption = "Gouvernance dédiée + centre d'excellence interne.";
    }

    // Meilleur format ajusté à l'audience principale et au budget
    const aud = (state.generation && state.generation.audience) || 'DG';
    if (aud === 'Investisseur' || aud === 'Financeur') { format = 'Livre blanc'; objectif = budget ? 'Obtenir un budget' : 'Préparer un investisseur'; }
    if (aud === 'DSI' || aud === 'Technique') argument = "Souveraineté, intégration au SI et auditabilité.";

    const objs = (p.objections && p.objections.length) ? p.objections : ['chatgpt'];
    const objectionPrioritaire = KB.objections[objs[0]] ? KB.objections[objs[0]].label : "« Nous avons déjà ChatGPT »";

    return {
      maturite: mat,
      angle, argument, format, objectif,
      poc: pocReco, adoption,
      objectionPrioritaire,
      urgenceNote: urgence === 'forte' ? "Urgence forte : viser un POC immédiat." :
                   urgence === 'faible' ? "Urgence faible : nourrir avec de la sensibilisation." :
                   "Urgence moyenne : POC à court terme."
    };
  }

  /* ---------- Rendu texte / HTML ---------- */
  function toText(deliv) {
    if (!deliv) return '';
    let out = deliv.titre + "\n" + "=".repeat(Math.min(deliv.titre.length, 60)) + "\n\n";
    out += deliv.sections.map(s => (s.h ? s.h.toUpperCase() + "\n" : "") + s.t).join("\n\n");
    return out;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toHtml(deliv) {
    if (!deliv) return '';
    return '<h1>' + escapeHtml(deliv.titre) + '</h1>' +
      deliv.sections.map(s =>
        (s.h ? '<h2>' + escapeHtml(s.h) + '</h2>' : '') +
        '<p>' + escapeHtml(s.t).replace(/\n/g, '<br>') + '</p>'
      ).join('');
  }

  return {
    MATURITE, AUDIENCES, COMPLEXITES, FORMATS, OBJECTIFS, KB,
    metrics, maturiteObj,
    generate, differenciation, pourquoiMaintenant, poc, objection,
    risqueInaction, roadmap, casUsage, pitch, faq, financement, recommander,
    toText, toHtml,
    competitors: Object.keys(KB.differentiateurs),
    objectionsList: Object.keys(KB.objections).map(id => ({ id, label: KB.objections[id].label })),
    dureesPitch: ['15 secondes', '30 secondes', '1 minute', '2 minutes', '5 minutes', '15 minutes', '30 minutes']
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
