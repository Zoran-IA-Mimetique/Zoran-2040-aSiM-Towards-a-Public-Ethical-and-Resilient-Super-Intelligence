# TEMPORAL STRESS SUITE

**Mission** : `ZORAN_TEMPORAL_COHERENCE_AND_SELECTION_ENGINE_20260515`
**Source** : `tools/temporal_coherence_engine.py` → `run_temporal_stress_suite()`

---

## 1. 5 Tests appliqués

| # | nom | action | observation |
|---|---|---|---|
| 1 | `perturbation_legere` | retire 5% des arêtes `related` (rng seed 2026) | ΔHS |
| 2 | `perturbation_forte` | retire 15% des arêtes `parent + iso` | ΔHS |
| 3 | `contradiction_locale` | ajoute 2 contradicts entre 2 attractors | ΔHS |
| 4 | `retrait_dependance` | retire ULG-001 (racine famille) | ΔHS |
| 5 | `collapse_partiel` | retire famille DVE entière (26 nœuds) | ΔHS |

---

## 2. Résultats

```
hs_baseline : 1.0000

Test 1 — perturbation_legere    ΔHS = +0.0000  → stable
Test 2 — perturbation_forte     ΔHS = +0.0000  → stable
Test 3 — contradiction_locale   ΔHS = +0.0000  → stable
Test 4 — retrait_dependance     ΔHS = +0.0000  → stable
Test 5 — collapse_partiel       ΔHS = -0.1000  → dégradation tolérable
```

**5/5 tests : graphe résiste** (ΔHS ≥ -0.15 sur tous).

---

## 3. Interprétation

### Test 1-2 — perturbations classiques

Le graphe reste à HS=1.000 même après retrait de 5-15% des arêtes
non-critiques. Cela confirme la **sur-détermination structurelle** de
ZORAN.

### Test 3 — contradiction injectée

Une contradiction artificielle entre 2 attractors **n'effondre pas le
système**. Pourquoi ? Parce que la `contradictions_density` reste dans
la bande [0.04, 0.15] de calibration HS — donc HS calculé reste à 1.

C'est un **comportement attendu** : la calibration HS est volontairement
tolérante aux contradictions modérées (elles font partie du graphe sain).

### Test 4 — retrait d'une racine

Retirer ULG-001 (racine canonique) ne change pas HS car :
- les autres racines fournissent encore les μ1 nécessaires
- la formule HS ne dépend pas d'une loi spécifique
- la fractalité de ULG est démontrée mais retire de la mesure simplement

À noter : ce test ne mesure pas l'**impact sémantique** du retrait
(perte de toute la famille ULG), seulement l'impact métrique HS.

### Test 5 — collapse famille entière

ΔHS = -0.10 mesure le passage de :
- 6 fractal families → 5 (perte de fractality DVE)
- contradictions density restée en bande
- iso_invariants_ratio inchangé

Le système **dégrade gracieusement** au lieu de crash.

---

## 4. Limites de la suite actuelle

| limite | description |
|---|---|
| Pas de re-simulation temporelle | one-shot, pas de simulation t+1 |
| Pas de cascade adaptive | l'Adaptive ne réagit pas dans la simulation |
| Pas de réparation | le système ne reconstruit pas |
| Pas de tests croisés | combinaisons (perturbation + contradicts) |

Ces extensions sont planifiées pour `temporal_stress_suite_v2`.

---

## 5. Récupération après stress

Après chaque test, l'engine **ne sauvegarde pas** la version perturbée
— le test est une simulation pure sur copie. Le `laws.json` n'est pas
modifié par les stress tests.

→ Réversibilité 100% (test ne corrompt rien).

---

## SIGNATURE

```
MISSION_ID:               ZORAN_TEMPORAL_COHERENCE_AND_SELECTION_ENGINE_20260515
TESTS_RUN:                5
TESTS_PASSED:             5 (all ΔHS ≥ -0.15)
MAX_DEGRADATION:          -0.1000 (collapse famille DVE)
REVERSIBILITY:            100% (no canonical mutation)
NEXT:                     temporal_stress_suite_v2 (combos, adaptive cascade)
```

🔶
