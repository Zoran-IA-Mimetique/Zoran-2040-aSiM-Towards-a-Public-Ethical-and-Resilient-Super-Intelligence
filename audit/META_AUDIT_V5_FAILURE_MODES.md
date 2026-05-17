# META AUDIT V5 — Failure Modes (anti-religion)

**Mission** : `ADVERSARIAL_OOD_V5_20260517`
**Branche** : `claude/zoran-fractal-law-tree-pPfzR`

> **Principe directeur** :
> *"Un rapport sans failure mode est suspect."*
> Ce document liste les cas où le système ZORAN se TROMPE.
> Le but n'est pas de valider les métriques, c'est de les casser.

---

## 1. Méthode

8 cas adversarials construits pour tromper les métriques V1+V2+V3+V4 :

| Type | Pattern adversarial |
|---|---|
| CONTRADICTION_INTERNE | texte contient A et ¬A |
| FAUX_CONSENSUS | "tous les experts" sans source |
| NOISE_INJECTION | phrases nonsense entre vrais signaux |
| SEDUCTIVE_PEDANT | vocabulaire savant + zéro action |
| SCALE_CHANGE | micro mélangé avec macro |
| TEMPORAL_INVERSION | cause/effet inversés |
| HYBRID_GOOD_BAD | Goodhart ET cohérence dans même texte |
| FAKE_HEDGE | hedges décoratifs sans substance |

---

## 2. Résultat empirique honnête

**3/8 adversarials passent sans failure** — donc **5/8 trompent au moins une métrique**.

C'est exactement le point. Si toutes les métriques avaient passé, la suite serait suspecte.

---

## 3. Failure modes documentés

### FM-01 — CONTRADICTION_INTERNE
**Problème** : `practical_usefulness = 0.988` sur un texte contenant `A et ¬A`.

**Cause** : la métrique compte verbes d'action et structure → un texte qui dit "toujours X" + "jamais X" satisfait les deux compteurs. Aucune détection de contradiction sémantique.

**Gap** : pas de checker de cohérence interne (paires A/¬A).
**Sévérité** : MOYENNE. Risque que Claude+ReZo passe une contradiction sans alerter.
**Fix possible (V6)** : extracteur d'affirmations binaires + checker de contradiction.

---

### FM-02 — FAUX_CONSENSUS
**Problème** : `seductive_but_fragile = 0` sur un texte qui dit "tous les experts s'accordent" sans citer une source.

**Cause** : le détecteur `seductive_but_fragile` cherche affirmations péremptoires individuelles (`toujours`, `jamais`, `garantit`). Le pattern "consensus universel" passe sous le radar parce qu'il utilise des constructions différentes ("universellement reconnu", "indiscutable").

**Gap** : pas de détecteur de revendication d'autorité sans source.
**Sévérité** : MOYENNE. Pattern récurrent dans réponses LLM mauvaises.
**Fix possible (V6)** : nouveau détecteur `unsourced_consensus_claim`.

---

### FM-03 — NOISE_INJECTION
**Problème** : `practical_usefulness = 0.955` sur un texte qui mélange instructions concrètes BTP + nonsense ("saxophone bleu danse au crépuscule").

**Cause** : `practical_usefulness` compte actions/chiffres/structure mais ne pénalise pas la présence de nonsense.

**Gap** : pas de détecteur de bruit thématique (phrases hors-domaine).
**Sévérité** : MOYENNE. Un attaquant pourrait injecter des phrases nonsense pour distraire.
**Fix possible (V6)** : `topic_coherence_check` (TF-IDF inter-phrase ou cosine vocab).

---

### FM-04 — TEMPORAL_INVERSION
**Problème** : **aucune métrique ne détecte** "le bâtiment s'effondrera demain à cause du séisme survenu hier" (causalité inversée).

**Cause** : `causal_robustness` cherche mono-causalité naïve, pas l'inversion temporelle. Aucun module ne fait du parsing temporel.

**Gap** : DOCUMENTÉ. Pas de fix prévu V5.
**Sévérité** : ÉLEVÉE dans des domaines comme médecine (cause/effet inversés), sécurité industrielle (séquencement).
**Fix possible (V6+)** : parser causal+temporel — non-trivial sans LLM.

---

### FM-05 — FAKE_HEDGE
**Problème** : `robustness_OOD = 0.9` sur un texte qui empile "probable", "peut-être", "selon le contexte" sans contenu.

**Cause** : `robustnessOOD` récompense les hedges. Plus il y a de hedges, plus le score monte. Aucune pondération par utilité.

**Gap** : pas de check "hedge ratio vs substance ratio".
**Sévérité** : ÉLEVÉE. Un LLM qui veut gonfler robustness_OOD peut juste empiler des hedges décoratifs.
**Fix possible (V6)** : pondérer hedges par densité d'actions/chiffres (hedge utile = à vérifier + action ; hedge décoratif = seul).

---

## 4. Cas qui ont passé (3/8)

- `SEDUCTIVE_PEDANT_01` : `seductive_complexity = 1.0` détecte bien le vocabulaire savant vide
- `SCALE_CHANGE_01` : `sys_multiscale = 0.25` n'est pas faussement positif
- `HYBRID_GOOD_BAD_01` : `goodhart_risk = 0.333` reste dans la zone ambivalente (ni < 0.20 ni > 0.80)

---

## 5. Mutation stability (3/3 pass)

| Cas | stability_score | Verdict | Attendu | OK |
|---|---|---|---|---|
| stable_pair_BTP | 0.809 | STABLE | stable | ✓ |
| unstable_pair_inversion | 0.348 | UNSTABLE | unstable | ✓ |
| paraphrase_only | 0.794 | STABLE | stable | ✓ |

Le module `mutation_stability.js` fonctionne sur 3 paires test. Validation
plus large nécessite corpus de paires Q/Q' réelles.

---

## 6. Conclusions opérationnelles

**Ce que ce rapport prouve** :
- Le système n'est PAS infaillible
- 5 failure modes concrets, reproductibles, documentés
- Chaque failure mode a un fix possible en V6

**Ce que ce rapport ne prouve PAS** :
- Que les métriques V1-V4 sont fiables sur réponses LLM réelles
- Qu'aucun autre failure mode n'existe (8 cas testés, pas exhaustif)
- Que les corrections V6 marcheront

**Principe anti-religion respecté** :
- Pas de scoring auto-validant
- Failure modes explicités, pas cachés
- Liste des fixes V6 transparente

---

## 7. Prochaines étapes V6 (priorité)

| Fix | Priorité | Effort |
|---|---|---|
| FM-05 — FAKE_HEDGE pondération | HAUTE | 30 min |
| FM-02 — unsourced_consensus | HAUTE | 1 h |
| FM-03 — topic_coherence noise | MOYENNE | 1-2 h |
| FM-01 — contradiction interne | MOYENNE | 2 h |
| FM-04 — temporal inversion | BASSE (gap doc) | 4 h+ (LLM nécessaire) |

---

## 8. Signature

- **mission_id** : `ADVERSARIAL_OOD_V5_20260517`
- **adversarial_cases** : 8 (5 failure modes documentés)
- **mutation_pairs** : 3/3 pass
- **résultats JSON** : `audit/ADVERSARIAL_OOD_V5_RESULTS.json`
- **principe** : falsifiability > validation
- **fix prévus** : V6 (5 failure modes adressables)
