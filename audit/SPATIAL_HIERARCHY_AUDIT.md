# SPATIAL HIERARCHY AUDIT

**Mission** : `ZORAN_HIERARCHICAL_SPATIAL_TOPOLOGY_V3_20260515`
**Timestamp** : `2026-05-15T20:39:00+02:00`

Audit hiérarchique post-implémentation : la verticalité est-elle
honnête, lisible, sans biais ?

Document à régénérer après chaque calcul `compute_topology_weights.py`.

---

## 1. Risques structurels surveillés

| risque | mesure | seuil alerte |
|---|---|---|
| **Fausse centralité** | une loi non-attractor occupant Y_max | si `not μ0/μ1 ∧ Y > +150` |
| **Inflation taille** | sphère trop grande sans justification | si `topo_w > 0.85 ∧ canonical = false` |
| **Hiérarchie arbitraire** | rank manuellement modifié | hash de toutes les lois ≠ hash recalculé |
| **Attractor artificiel** | tier déclaré sans 2+ citations canoniques | check `R-ATR-1` |
| **Domination visuelle abusive** | une famille occupe > 40% de la canopée | check distribution famille en haut |

---

## 2. Audit programmatique

`tools/audit_hierarchy.py` (à créer) calcule :

```python
def audit_hierarchy(graph):
    return {
        "verticality_coefficient": ...,
        "false_centrality_count": ...,
        "inflation_count": ...,
        "hierarchical_drift_count": ...,
        "artificial_attractors": ...,
        "abusive_dominance": ...,
        "rank_distribution": ...,
        "Y_amplitude": ...,
        "Y_levels_population": [...],
    }
```

Sortie : `audit/HIERARCHY_AUDIT_REPORT.json`.

---

## 3. Métriques attendues post-V3 implémentation

(Estimations sur le corpus actuel 174 nœuds.)

| métrique | valeur attendue | tolérance |
|---|---|---|
| `verticality_coefficient` | ~0.85 | ≥ 0.60 obligatoire |
| `Y_amplitude` | ~400 unités | [300, 500] |
| `mu0_count_in_canopy` | 1 | doit être ≥ 1 |
| `mu1_count_in_stratum_supérieur` | ~7 | doit être ≥ 5 |
| `false_centrality_count` | 0 | doit être 0 |
| `inflation_count` | 0 | doit être 0 |
| `dominant_family_in_canopy` | aucune (singleton GHUC) | aucune > 40% |

---

## 4. Verdicts d'audit

Chaque audit produit un verdict :

| verdict | condition | action |
|---|---|---|
| `green` | toutes métriques OK | continuer |
| `yellow` | 1 alerte modérée | analyser, ajuster coefficients |
| `red` | 2+ alertes ou 1 critique | rollback ou recalibration urgente |

---

## 5. Cohabitation hiérarchie / honnêteté lexicale

L'audit hiérarchique doit aussi vérifier :
- Aucune loi en canopée sans `attractor_tier` déclaré (R-CORE-12)
- Aucune loi avec `topological_weight > 0.7` sans `compositions_count ≥ 5`
- Aucune loi en stratum supérieur si `runtime_admissible = false`

---

## 6. Cas limites

### 6.1 Ex-aequo de rank

Si N lois ont le même rank (cas typique : feuilles de profondeur 3 dans
une famille fractale), elles sont distribuées en **anneau horizontal** à
la même hauteur Y, avec un léger jitter (±15 unités) pour éviter le
strict alignement.

### 6.2 Y trop bas

Si une loi a `structural_rank < 0` (cas : absorbée + profondeur 4),
elle est clamped à `Y = -250` (plancher visuel).

### 6.3 Saturation canopée

Si plus de 5 lois ont `structural_rank ≥ 100`, alerte : trop de μ0
candidats. Vérifier que tous sont **réellement** des attracteurs méta
(citations cross-canoniques ≥ 2).

---

## 7. Procédure de rollback hiérarchie

Si l'audit hiérarchie produit `red` :

```
1. Snapshot du laws.json courant
2. Identifier la cause via INTEGRATION_LOG (dernier batch)
3. Ré-exécuter compute_topology_weights.py
4. Si toujours red : rollback du dernier batch
5. Si rouge récurrent : ajuster coefficients dans
   audit/oracle_rules.json (sous validation Core)
```

---

## SIGNATURE

```
DOCUMENT:             SPATIAL_HIERARCHY_AUDIT.md
VERSION:              1.0
RISKS_MONITORED:      5 (fausse centralité, inflation, drift, attractor artif, dominance)
VERDICT_LEVELS:       green / yellow / red
ROLLBACK_PROCEDURE:   documentée
NEXT_ACTIONS:         (a) tools/audit_hierarchy.py
                      (b) HIERARCHY_AUDIT_REPORT.json
                      (c) intégrer dans Oracle continu
```

🔶
