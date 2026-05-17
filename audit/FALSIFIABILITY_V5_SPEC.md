# FALSIFIABILITY V5 — Spec

**Mission** : `MISSION_FALSIFIABILITY_OOD_V5_20260517`
**Branche** : `claude/zoran-fractal-law-tree-pPfzR`

> Pivot principal :
> *"Le but n'est pas de valider les métriques, c'est de les casser."*
> *"Un rapport sans failure mode est suspect."*

V5 répond directement au warning utilisateur :
**éviter la "religion ZORAN"** — ne pas croire les métriques parce qu'elles existent.

---

## 1. Pivot V5 par rapport à V4

| | V1-V4 | V5 |
|---|---|---|
| Objectif | construire métriques discriminantes | **casser les métriques** |
| Type de test | corpus archétypique cohérent | corpus adversarial conçu pour tromper |
| Verdict de succès | métrique sépare archétypes | **failure modes documentés** |
| Documentation | spec architecturale | **META_AUDIT_V5_FAILURE_MODES.md** |
| Principe | validation | **falsifiability** |

---

## 2. Modules livrés

### `app/src/seductive_complexity.js`
Détecte les réponses qui paraissent intelligentes par densité technique
artificielle (mots ≥ 12 lettres, fillers intellectuels, phrases longues)
SANS structure utile.

Pondération :
- Mots pédants (≥12 lettres) × 1
- Fillers intellectuels (épistémique, holistique, etc.) × 2
- Phrases > 35 mots : +0.20
- Discount selon utilité concrète (actions, chiffres)

### `app/src/mutation_stability.js`
Compare deux réponses (à Q et Q' mutée légèrement) sur 4 dimensions :
- Action preservation (Jaccard sur verbes d'action)
- Number preservation (Jaccard sur chiffres avec unités)
- Structure preservation (Jaccard sur marqueurs hiérarchiques)
- Length ratio

Composite stability_score :
`0.35 × actions + 0.30 × numbers + 0.20 × structure + 0.15 × length`

Verdict : STABLE (≥ 0.70), MODERATE (≥ 0.45), UNSTABLE (< 0.45).

### `tools/adversarial_ood_suite.mjs`
Suite de **8 cas adversarials** + **3 paires mutation** conçus pour CASSER
le système :

| Type adversarial | Pattern |
|---|---|
| CONTRADICTION_INTERNE | A et ¬A dans même texte |
| FAUX_CONSENSUS | "tous les experts" sans source |
| NOISE_INJECTION | nonsense entre vrais signaux |
| SEDUCTIVE_PEDANT | vocabulaire savant + zéro action |
| SCALE_CHANGE | micro mélangé avec macro |
| TEMPORAL_INVERSION | cause/effet inversés |
| HYBRID_GOOD_BAD | Goodhart + cohérence dans même texte |
| FAKE_HEDGE | hedges décoratifs sans substance |

Chaque cas a une `expectation` claire et un `failure_if` qui définit
exactement quand le système se trompe.

---

## 3. Résultat empirique : 5 failure modes documentés

| FM | Type | Métrique fautive | Sévérité |
|---|---|---|---|
| FM-01 | CONTRADICTION_INTERNE | practical_usefulness 0.988 | MOY |
| FM-02 | FAUX_CONSENSUS | seductive_but_fragile 0 (manqué) | MOY |
| FM-03 | NOISE_INJECTION | practical_usefulness 0.955 | MOY |
| FM-04 | TEMPORAL_INVERSION | aucune métrique ne détecte | ÉLEVÉE |
| FM-05 | FAKE_HEDGE | robustness_OOD 0.9 (faux positif) | ÉLEVÉE |

**3/8 adversarials passent sans failure** = système n'est pas trompé.
**5/8 cassent au moins une métrique** = honnêtement documenté.

Détails dans `audit/META_AUDIT_V5_FAILURE_MODES.md`.

---

## 4. Mutation stability validée

3/3 paires test pass :
- `stable_pair_BTP` : 0.809 STABLE ✓
- `unstable_pair_inversion` : 0.348 UNSTABLE ✓
- `paraphrase_only` : 0.794 STABLE ✓

Le module discrimine paraphrases (stable) vs inversions (unstable).

---

## 5. Intégration runtime

### `superiority.js`
- Import `seductiveComplexity`
- Calcul + propagation dans deltas

### `rezo_engine.js`
Nouveau `WEAKNESS_CHECKS` :

| Check | Test | Injection |
|---|---|---|
| `seductive_complexity` | score ≥ 0.50 | frugale (simplifier vocabulaire) |

Total `WEAKNESS_CHECKS` maintenant : 11 (jargon, missing_terrain, missing_hierarchy, missing_audit, hallucination_risk, goodhart_risk, weak_systemic_coherence, seductive_but_fragile, future_hidden_cost, monocause_early_lock, domain_leak, seductive_complexity).

---

## 6. Principe anti-religion ZORAN

V5 impose :
- **Tout nouveau détecteur doit avoir des cas adversarials** dans
  `adversarial_ood_suite.mjs` qui tentent de le tromper
- **Tout failure mode trouvé doit être documenté** dans
  `META_AUDIT_V5_FAILURE_MODES.md`, pas caché
- **Le rapport n'a pas vocation à passer** — il a vocation à exposer
- **Si toutes les métriques passent, le test est suspect** (signe que
  les cas adversarials ne sont pas assez vicieux)

---

## 7. Roadmap V6 (fix des failure modes)

| Fix | Priorité | Approche |
|---|---|---|
| FM-05 FAKE_HEDGE | HAUTE | pondérer hedges par densité d'actions |
| FM-02 unsourced_consensus | HAUTE | détecteur `tous les experts` + check source |
| FM-03 topic_coherence | MOYENNE | TF-IDF inter-phrase ou cosine vocab |
| FM-01 contradiction | MOYENNE | extracteur A/¬A binaires |
| FM-04 temporal_inversion | BASSE | parser causal+temporel (LLM nécessaire) |

---

## 8. Signature

- **mission_id** : `MISSION_FALSIFIABILITY_OOD_V5_20260517`
- **modules** : `seductive_complexity.js`, `mutation_stability.js`
- **tools** : `adversarial_ood_suite.mjs`
- **failure modes documentés** : 5 / 8 (62.5%)
- **mutation tests** : 3/3 pass
- **cache-bust** : `?v=20260517-falsifiability-v14`
- **principe** : falsifiability > validation
