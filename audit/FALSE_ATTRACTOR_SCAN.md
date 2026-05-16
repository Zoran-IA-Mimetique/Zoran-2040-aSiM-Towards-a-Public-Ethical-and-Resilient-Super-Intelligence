# FALSE ATTRACTOR SCAN

**Mission** : `ZORAN_HIERARCHICAL_TREE_VALIDATION_20260515`

Scan systématique pour détecter les faux attracteurs (lois revendiquant
centralité sans la mériter).

---

## 1. Critères de détection

Un nœud est suspect si :

| critère | seuil |
|---|---|
| Centralité visuelle excessive (radius > 12) **sans** tier déclaré | violation |
| Bonus rank fractal (+10) **sans** famille fractale | violation |
| Citation excessive cross-canoniques (`related` ≥ 5 racines) | suspect |
| Dominance famille canopée (> 40% des Y > +150) | suspect |
| Promotion μ-tier non motivée par compositions | violation |
| `weight = 1.0` mais `compositions_count < 5` | suspect |

---

## 2. Scan canonical (241 nodes)

| catégorie | nb détecté |
|---|---:|
| Centralité visuelle suspecte | **0** |
| Bonus fractal injustifié | 0 |
| Citation cross-canoniques excessive | 0 (ISO-005 supprimé en P0.5) |
| Dominance famille canopée | 0 |
| μ-tier non motivé | 0 |
| Weight 1.0 sous-composé | **0** |

**Aucun faux attracteur détecté.** ✓

---

## 3. Vérification des attractors déclarés

### GHUC-001 (μ0, weight 1.0)

| critère | valeur | pass |
|---|---|:---:|
| canonical | true | ✓ |
| family racine (parents=[]) | true | ✓ |
| compositions ≥ 7 | 9 | ✓ |
| children direct ≥ 3 | 4 (GHUC-002,003,004,005) | ✓ |
| family fractale | true (GHUC) | ✓ |
| invariant déclaré | "préservation I_struct" | ✓ |

**Verdict : attractor μ0 légitime.**

### Les 7 μ1 racines canoniques

Pour ULG-001, DVE-001, UDE-001, WP11-001, WP12-001, SDE-001, PAL-001 :

| critère | tous valides ? |
|---|:---:|
| canonical + parents=[] | ✓ |
| compositions ≥ 5 | ✓ |
| children ≥ 3 | ✓ |
| invariant famille déclaré | ✓ |

**7/7 μ1 légitimes.** ✓

---

## 4. Scan historique : ISO-005 (référence)

`ISO-005` (en P0) avait été identifié comme **gravitational fake
attractor** :
- weight 0.99 sans démonstration
- 7 related cross-canoniques
- 0 invariants déclarés

**Action P0.5** : suppression complète de ISO-005 du graphe (rétrogradé).
**État actuel** : ISO-005 absent. ✓

C'est l'**exemple historique** que le scan détecte correctement.

---

## 5. Scan préventif sur sandbox

Sandbox actuelle (70 lois) :
- Tous `attractor_tier = null` (aucune promotion μ-tier en sandbox)
- Tous `canonical = false`
- Tous `weight ≤ 0.55` (modeste)

**0 faux attracteur potentiel** dans sandbox.

---

## 6. Mécanismes anti-faux-attracteur permanents

| mécanisme | source |
|---|---|
| R-CORE-12 : aucun label sans preuve | `ORACLE_CORE_SPEC.md` |
| R-ATR-1 : attractor sans tier déclaré → warn | `oracle_rules.json` |
| R-ISO-1 : nœud avec ≥5 related canoniques → warn (gravitational) | `oracle_rules.json` |
| `attractor_tier` field obligatoire pour tier | schema |
| Promotion μ-tier via Core dryrun | `ORACLE_ADAPTIVE_SPEC.md` |

---

## 7. Audit récurrent recommandé

```bash
# Hebdomadaire :
python3 tools/compute_topology_weights.py
cat audit/HIERARCHY_AUDIT_REPORT.json | jq '.verdict'
# Si != green : investigation immédiate
```

---

## SIGNATURE

```
MISSION_ID:               ZORAN_HIERARCHICAL_TREE_VALIDATION_20260515
TIMESTAMP:                2026-05-15T20:44:00+02:00
FALSE_ATTRACTORS:         0
LEGITIMATE_ATTRACTORS:    1 μ0 (GHUC-001) + 7 μ1 (racines familles)
HISTORICAL_REFERENCE:     ISO-005 (supprimé P0.5)
VERDICT:                  green ✓
```

🔶
