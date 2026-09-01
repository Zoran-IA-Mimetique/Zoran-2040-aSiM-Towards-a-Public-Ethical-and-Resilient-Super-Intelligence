# SYSTEMIC SELECTION V4 — Fragilité structurelle + Domain Leak

**Mission** : `MISSION_FRAGILITY_DOMAIN_LEAK_V4_20260517`
**Branche** : `claude/zoran-fractal-law-tree-pPfzR`

> Insight directeur :
> *"Une réponse localement excellente peut être globalement destructrice."*
> *"Les réponses qui sonnent juste sont les plus dangereuses parce qu'elles inspirent confiance."*

---

## 1. Pivot V4 par rapport à V3

V3 (`SYSTEMIC_SELECTION`) détectait les patterns Goodhart (optimisation
destructive, proxy collapse, conflit local-global). V4 ajoute une couche
**comportementale** : la réponse elle-même est-elle structurellement
fragile, indépendamment de son contenu Goodhart-positif ?

| | V3 | V4 |
|---|---|---|
| Mesure | structure cognitive du texte | fragilité comportementale du texte |
| Cible | "le texte nomme-t-il Goodhart ?" | "le texte est-il structurellement piégeux ?" |
| Risque détecté | optimisation locale | confiance excessive sans humilité |
| Pattern | proxy / KPI / tunnel | "il faut absolument" sans hedge |
| Nouveau | domain_leak destructeur d'immersion | (n/a en V3) |

---

## 2. Modules livrés

### `app/src/fragility_detector.js`
4 détecteurs orthogonaux :

| Détecteur | Détecte | Score haut = |
|---|---|---|
| `detectSeductiveButFragile` | confiance excessive + zéro hedge/plan B | dangereux |
| `futureHiddenCost` | gain immédiat sans mention coût futur | dangereux |
| `perturbationRobustness` | nomme conditions/hypothèses/variabilité | robuste |
| `antiMonocauseEarlyLock` | explore alternatives causales | robuste |

**Composite** : `fragility_risk = 0.30×séduisant + 0.30×coût_futur + 0.20×(1-perturbation) + 0.20×(1-anti_mono)`

### `app/src/domain_leak.js`
Détecte les patterns de refus de domaine destructeurs d'immersion :

| Pattern | Détecte | Pondération |
|---|---|---|
| `DOMAIN_REFUSAL_RX` | "désolé, ce n'est pas mon domaine" | 0.20 par occurrence |
| `SELF_DEFLECTION_RX` | "consultez un expert" | 0.10 par occurrence |
| `META_APOLOGY_RX` | "désolé, mes excuses" (méta-couches) | 0.05 par occurrence |
| `REFUSAL_INTRO_RX` | refus dans les 150 premiers caractères | **0.50** (très grave) |

`leak_detected = score >= 0.30`.

---

## 3. Validation empirique

### Tests canoniques (8/8 pass)

| Cas | Verdict |
|---|---|
| SEDUCTIVE_FRAGILE pur | séduis 0.889, fragility 0.637 ✓ |
| HUMBLE_ROBUST | séduis 0, fragility 0.11 ✓ |
| HIDDEN_COST | future_cost 1.0 ✓ |
| LONG_TERM_AWARE | future_cost 0 ✓ |
| EARLY_LOCK | anti_mono 0.3 ✓ |
| ALTERNATIVE_EXPLORATION | anti_mono 0.9 ✓ |
| DOMAIN_LEAK_BRUTAL | leak 0.9 detected ✓ |
| DOMAIN_LEAK_NONE | leak 0 ✓ |

### Massive eval V4 (140 textes × 7 archétypes × 32 métriques)

**Résultat global : 16 STRONG / 12 MODERATE / 3 WEAK / 1 NO_SIGNAL**

| Métrique V4 | Discrim ratio | Verdict | High arch | Low arch |
|---|---|---|---|---|
| `domain_leak_score` | 4.54 | STRONG | DOMAIN_LEAK 0.84 | SEDUCTIVE 0 |
| `fragility_risk` | 2.59 | STRONG | SEDUCTIVE 0.60 | SYSTEMIC 0.19 |
| `structural_strength` | 2.59 | STRONG | SYSTEMIC 0.81 | SEDUCTIVE 0.40 |
| `fragility_seductive` | 2.33 | STRONG | SEDUCTIVE 0.83 | DOMAIN_LEAK 0 |
| `fragility_future_cost` | 1.08 | MODERATE | SEDUCTIVE 0.5 | DOMAIN_LEAK 0 |
| `fragility_anti_monocause` | 0.74 | WEAK | SYSTEMIC 0.55 | DOMAIN_LEAK 0.5 |
| `fragility_perturbation_rob` | 0 | NO_SIGNAL | — | — |

**Note** : `fragility_perturbation_rob` n'a pas de signal sur corpus
synthétique parce que les seeds ne contiennent pas de marqueurs
conditionnels (`si X change`, `à condition de`). Le détecteur fonctionne
sur tests canoniques (HUMBLE_ROBUST 0.80) — limitation du corpus, pas
du détecteur.

---

## 4. Intégration runtime

### `superiority.js`
- Import `runFragilityDetector` + `detectDomainLeak`
- Pour chaque réponse : calcul des 4+1 scores V4
- Propagation dans `deltas` (`fragility`, `domain_leak`)
- Nouveau bloc UI "Fragilité structurelle + domain leak" avec :
  - Table des 4 sous-scores par candidat
  - Composite `fragility_risk` (rouge si ≥ 0.4)
  - Badge `domain_leak ⚠` si détecté
  - Alertes hints détaillées par candidat fired

### `rezo_engine.js`
4 nouveaux `WEAKNESS_CHECKS` qui déclenchent injection ReZo :

| Check | Test | Injection |
|---|---|---|
| `seductive_but_fragile` | score ≥ 0.50 | anti_hallucination (ajouter hedges) |
| `future_hidden_cost` | score ≥ 0.50 | structurelle (nommer dette long terme) |
| `monocause_early_lock` | score < 0.35 | structurelle (lister alternatives) |
| `domain_leak` | `leak_detected` | orchestrated (répondre au fond, pas refuser) |

---

## 5. Honnêteté empirique

### Ce qui marche (vérifié)
- 8/8 tests canoniques passent
- Discrimination ARCH_SEDUCTIVE_FRAGILE vs ARCH_SYSTEMIC_RICHE : ratio 2.59
- Domain leak score 0.84 sur DOMAIN_LEAK_BRUTAL vs 0 partout ailleurs
- Composite `fragility_risk` corrélé inversement avec `structural_strength` (cohérence interne)

### Limites
- `fragility_perturbation_rob` 0 signal sur corpus synthétique (seeds
  manquent conditionnels) — détecteur OK sur tests canoniques
- Heuristique regex FR, pas de modèle ML
- Calibration manquante sur réponses LLM réelles
- Un texte qui MENTIONNE Goodhart pour le critiquer pourrait être faussement
  étiqueté Goodhart (pas de polarité dans la détection)
- Seuils `0.30, 0.40, 0.50` calibrés sur intuitions, pas appris

### Non fait
- Validation live (clé API + budget Sonnet/Haiku)
- Wiring dans le composite `runtime_superiority` (score winner reste basé
  sur V1+V2 métriques, V3+V4 sont en lecture seule pour UI/diagnostic)
- Pondération adaptative par domaine (V4 plus pertinent en médecine,
  juridique, IA — moins en BTP terrain pur)

---

## 6. Signature

- **mission_id** : `MISSION_FRAGILITY_DOMAIN_LEAK_V4_20260517`
- **modules** : `fragility_detector.js`, `domain_leak.js`
- **tests** : `tools/test_v4_detectors.mjs` (8/8 pass)
- **massive eval** : 140 textes × 32 métriques en 36 ms
- **integration** : `superiority.js`, `rezo_engine.js`, UI runtime
- **cache-bust** : `?v=20260517-fragility-v13`
- **limites** : voir section 5
