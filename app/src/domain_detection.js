// app/src/domain_detection.js
// Mission ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516
//
// DOMAIN_NATIVE_RESPONSE_ENGINE — détecte le domaine de la question pour
// imposer au LLM de parler le LANGAGE NATIF du métier (BTP→BTP, médecine→
// clinique, juridique→opposabilité, etc.), pas le jargon ZORAN.

// Lexiques minimaux par domaine (français, étendu au besoin)
const DOMAIN_LEXICONS = {
  btp: {
    keywords: /(b[aâ]timent|construct|chantier|mur|porteur|toiture|charpente|fondat|maçonn|béton|acier|IPN|IPE|HEB|DTU|RE2020|RT2012|BET|architect|m[aî]tre d['']?(oeuvre|ouvrage)|MOE|MOA|isolation|étanchéit|ravalement|fissure|humidité|mérule|sismique|déclar[ée]e?\s+pr[ée]alabl|permis\s+de\s+construire|copropriét|PLU|ABF|garantie\s+(décennale|biennale))/i,
    label: 'BTP / construction',
    vocab_hint: 'BET, descente de charges, IPN/IPE/HEB, DTU, RE2020, bureau de contrôle, MOE/MOA, Consuel, Apave, garantie décennale, déclaration préalable, PLU, ABF, ferraillage, semelle, linteau, chevêtre, étaiement',
  },
  medicine: {
    keywords: /(patient|sympt[oô]me|diagnos|m[ée]dec|cliniq|maladie|trait|prescri|ordonn|posolog|effet\s+secondaire|tens?ion\s+art|HTA|diab[èe]t|cardiopath|ECG|IRM|scann|biolog|hb1ac|cr[ée]atinin|tropon|HAS|recommand|essai\s+clinique|p\s*=\s*0\.\d|IC\s+95|Cochrane|RCT|méta-analyse)/i,
    label: 'médecine',
    vocab_hint: 'anamnèse, drapeau rouge, diagnostic différentiel, signe clinique, biologie, imagerie, prescription, HAS, RCT, IC 95%, méta-analyse, recommandation grade A/B/C, urgence vitale',
  },
  legal: {
    keywords: /(juridiq|droit|loi|article|jurisprud|arr[êe]t|cassation|conseil\s+d['']?[éE]tat|cour\s+(d['']?appel|administr)|contrat|clause|opposab|prescription|décennale|biennale|RGPD|CNIL|civil|p[ée]nal|commercial|tribunal|notair|huissier|responsab)/i,
    label: 'juridique',
    vocab_hint: 'article, jurisprudence, arrêt, cassation, opposabilité, prescription, parties, mise en demeure, RGPD, CNIL, sanction, responsabilité civile/pénale, charge de la preuve',
  },
  physics: {
    keywords: /(physiq|quantique|relativit[ée]|m[ée]canique|champ|particule|onde|énergie|gravitation|entropie|thermodynamique|électromag|Hawking|Einstein|Bohr|Heisenberg|d[ée]coh[ée]rence|paradoxe|singularit|trou\s+noir|big\s+bang|cosmolog|standard\s+model)/i,
    label: 'physique théorique',
    vocab_hint: 'lagrangien, métrique, symétrie, invariance, Hamiltonien, états propres, observable, opérateur, intrication, décohérence, renormalisation, théorie effective, principe',
  },
  ai_robustness: {
    keywords: /(LLM|GPT|Claude|llama|transformer|attention|tokenis|embedding|fine-?tun|RLHF|RAG|hallucination|benchmark|MMLU|HellaSwag|few-?shot|zero-?shot|chain-?of-?thought|CoT|prompt|adversarial|jailbreak|alignement|robustness?|hors\s+distribution|OOD|guard|safety)/i,
    label: 'IA / robustesse',
    vocab_hint: 'benchmark MMLU, hallucination rate, OOD generalization, RLHF, RAG, prompt injection, jailbreak, attention head, latent space, distillation, fine-tuning, eval set',
  },
  epistemology: {
    keywords: /(épist[ée]m|ontolog|m[ée]taphys|Popper|Kuhn|Lakatos|Quine|paradigme|réfutab|falsif|sous-d[ée]termination|réalisme\s+structurel|axiomat|inductif|déductif|abductif|raison\s+suffisante|principe\s+de\s+raison|loi\s+empirique|régularit[ée]\s+statistique)/i,
    label: 'épistémologie / philosophie des sciences',
    vocab_hint: 'réfutabilité, sous-détermination, paradigme, programme de recherche, induction, déduction, abduction, réalisme/anti-réalisme, ontologie, conditions de possibilité',
  },
  business: {
    keywords: /(entreprise|PME|CA|chiffre\s+d['']?affaires|marge|CAC|LTV|MVP|product\s+market\s+fit|trésorerie|investis|ROI|EBITDA|cash[\s-]?flow|burn\s+rate|runway|série\s+A|valorisation|business\s+model|go-?to-?market|salesforce|pipeline|funnel|conversion)/i,
    label: 'business / stratégie',
    vocab_hint: 'CAC/LTV, MRR/ARR, churn, NPS, runway, EBITDA, marge brute, time-to-market, MVP, PMF, série A/B, scale-up, go-to-market, pricing power',
  },
  // Default : généraliste (pas de jargon spécifique)
  general: {
    keywords: /.*/,
    label: 'généraliste',
    vocab_hint: 'vocabulaire courant, exemples concrets, sources si possible',
  },
};

/**
 * Détecte le domaine principal de la question.
 * Retourne le premier match non-general, sinon general.
 */
export function detectDomain(question) {
  if (!question) return DOMAIN_LEXICONS.general;
  for (const [key, profile] of Object.entries(DOMAIN_LEXICONS)) {
    if (key === 'general') continue;
    if (profile.keywords.test(question)) {
      return { key, ...profile };
    }
  }
  return { key: 'general', ...DOMAIN_LEXICONS.general };
}

/**
 * Détecte TOUS les domaines qui matchent (priorité au premier).
 */
export function detectAllDomains(question) {
  if (!question) return [];
  const hits = [];
  for (const [key, profile] of Object.entries(DOMAIN_LEXICONS)) {
    if (key === 'general') continue;
    if (profile.keywords.test(question)) {
      hits.push({ key, ...profile });
    }
  }
  return hits;
}
