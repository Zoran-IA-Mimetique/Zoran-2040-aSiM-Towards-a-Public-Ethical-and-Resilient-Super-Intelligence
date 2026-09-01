# SYSTEMIC SELECTION V3 — Spec

**Mission** : `MISSION_CLAUDE_REZO_SYSTEMIC_SELECTION_20260517`
**Branche** : `claude/zoran-fractal-law-tree-pPfzR`
**Hypothèse centrale** :

> "La vraie performance n'est pas l'optimisation locale.
> C'est la préservation de la cohérence systémique globale."

---

## 1. Pivot V3 par rapport à V2

| | V2 (`SUPERIORITY_CONVERGENCE_V2`) | V3 (`SYSTEMIC_SELECTION`) |
|---|---|---|
| Objet du score | qualité de réponse (précision, style) | cohérence systémique (résilience, multi-échelle, anti-Goodhart) |
| Question évaluée | "qui répond le mieux ?" | "quelle réponse préserve la viabilité long terme ?" |
| Type de signal | local, immédiat | systémique, différé, hors-mesure |
| Risque détecté | hallucination, jargon | faux succès, surrogate, déplacement risque |

V3 ne remplace pas V2 — il ajoute une **dimension orthogonale** que les
métriques existantes ne capturent pas.

---

## 2. Modules livrés

### `app/src/systemic_coherence.js`
Score composite [0..1] sur 5 axes :

| Axe | Fonction | Pondération | Mesure |
|---|---|---|---|
| A. Résilience | `resilienceScore` | 0.25 | marges préservées vs détruites |
| B. Multi-échelle | `multiscaleCoherence` | 0.20 | local + global + temporel + causal |
| C. Détection faux bénéfice | `falseBenefitDetection` | 0.20 | Goodhart, proxy, coûts cachés nommés |
| D. Robustesse causale | `causalRobustness` | 0.20 | multi-causes vs mono-causalité naïve |
| E. Viabilité long terme | `longTermViability` | 0.15 | dette invisible, effets différés |

**API** :
```js
import { systemicCoherenceScore, systemicCoherenceReport } from './systemic_coherence.js';
const score = systemicCoherenceScore(text);       // [0..1]
const report = systemicCoherenceReport(text);     // { resilience, multiscale, ..., composite }
```

### `app/src/anti_goodhart.js`
4 détecteurs spécialisés Loi de Goodhart :

| Détecteur | Détecte | Fires si score >= |
|---|---|---|
| `detectFalseOptimization` | maximisation sans tradeoff nommé | 0.3 |
| `detectProxyCollapse` | KPI/score utilisé comme cible réelle | 0.3 |
| `detectMetricTunnel` | focus mono-métrique sans diversité | 0.3 |
| `detectLocalVsGlobalConflict` | gain local sans considération globale | 0.3 |

**API** :
```js
import { runAntiGoodhart } from './anti_goodhart.js';
const { checks, fired_count, goodhart_risk, systemic_health, hints } = runAntiGoodhart(text);
```

Chaque détecteur retourne :
```js
{ fires: bool, score: [0..1], evidence: [string], hint: string }
```

---

## 3. Validation empirique

Test runner : `tools/test_systemic_coherence.mjs`

5 cas canoniques (BAD pur, GOOD pur, neutre, local-global, multicausal) :

| Cas | composite | goodhart_risk | fired | Verdict |
|---|---|---|---|---|
| BAD_GOODHART_PURE | **0.26** | **0.50** | 2/4 (false_opt + proxy_collapse) | ✓ |
| GOOD_SYSTEMIC | **0.544** | **0.15** | 1/4 (false_opt résiduel) | ✓ |
| NEUTRAL | **0.35** | **0.083** | 1/4 (proxy DPE mineur) | ✓ |
| BAD_LOCAL_GLOBAL | **0.31** | **0.375** | 2/4 (false_opt + local-global) | ✓ |
| GOOD_MULTICAUSE | composite 0.43, **causal 0.9** | **0** | 0/4 | ✓ |

**Discrimination** : ratio goodhart_risk BAD/GOOD = 3.3× → les détecteurs
distinguent clairement Goodhart vs cohérence systémique sur ces 5 textes.

---

## 4. Honnêteté empirique

### Ce qui marche (vérifié)
- Détecteurs heuristiques fonctionnent sur textes canoniques (5/5 pass)
- BAD_GOODHART_PURE déclenche les 2 détecteurs attendus avec score plein
- GOOD_SYSTEMIC scores le plus haut sur composite (0.544)
- GOOD_MULTICAUSE atteint 0.9 sur axe causal pur (validation axe-spécifique)

### Ce qui n'est PAS vérifié
- **Calibration sur réponses LLM réelles** : tests sur textes français
  construits manuellement, pas sur sorties Claude/Sonnet live
- **Faux positifs** : un texte qui MENTIONNE Goodhart pour le critiquer
  pourrait être faussement étiqueté Goodhart (la heuristique compte les
  occurrences, pas la polarité)
- **Couverture lexicale** : regex FR uniquement, pas de modèles ML, pas
  de détection sémantique. Un texte qui décrit Goodhart en mots
  inhabituels passe à travers
- **Pondération composite (0.25/0.20/0.20/0.20/0.15)** non apprise,
  empirique
- **Seuils 0.3 / 0.45** non calibrés sur dataset large

### Limites structurelles
- Heuristique regex ≠ compréhension sémantique
- Une réponse "vide mais qui nomme les bons concepts" scorera haut sans
  être réellement systémique (jeu adversarial possible)
- Calibration manquante : à ce stade, le score est un **indicateur de
  vocabulaire systémique**, pas de pensée systémique réelle

---

## 5. Intégration future (non encore faite)

V3 fournit les modules. L'intégration runtime nécessitera :

1. **Wiring dans `superiority.js`** : ajouter `systemic_coherence` et
   `goodhart_risk` au résultat de chaque candidat (Claude brut / ZORAN
   Orchestré / Claude+ReZo)
2. **Pondération du juge** : la décision finale pondère désormais
   précision (V2) + cohérence systémique (V3) selon le domaine
3. **Injection ReZo** : si `goodhart_risk > 0.4` détecté sur Claude brut
   → ajouter une faiblesse "goodhart_risk" à `rezo_engine.WEAKNESS_CHECKS`
   qui force injection corrective
4. **UI** : afficher le rapport systémique dans la popup réponse
   (sous-section "Cohérence systémique")

Ces étapes nécessitent un appel API live pour valider — pas faisable
sans clé + budget.

---

## 6. Catégories d'erreurs détectées (taxonomie partielle)

Catégories que le système peut maintenant nommer :

1. **Faux succès** : KPI monte, performance réelle baisse
2. **Proxy collapse** : DPE/biomarqueur/score traité comme cible finale
3. **Metric tunnel** : focalisation mono-métrique
4. **Local-global conflict** : optimisation locale, dégradation globale
5. **Margin destruction** : suppression de redondance/marges/variance
6. **Mono-causalité naïve** : cause unique sur problème multi-factoriel
7. **Court-termisme piégé** : gain immédiat, dette long terme

Catégories à ajouter en V4 :
- Effet rebond (Jevons)
- Déplacement de risque (Perrow)
- Rigidification (Holling — perte capacité adaptative)
- Dépendance proxy (Campbell's law)
- Convergence destructrice (mode-collapse organisationnel)

---

## 7. Signature

- **mission_id** : `MISSION_CLAUDE_REZO_SYSTEMIC_SELECTION_20260517`
- **branche** : `claude/zoran-fractal-law-tree-pPfzR`
- **modules** : `systemic_coherence.js`, `anti_goodhart.js`
- **tests** : `tools/test_systemic_coherence.mjs` (5/5 pass)
- **limites** : voir section 4 "Honnêteté empirique"
- **non fait** : intégration runtime, validation live, calibration ML
