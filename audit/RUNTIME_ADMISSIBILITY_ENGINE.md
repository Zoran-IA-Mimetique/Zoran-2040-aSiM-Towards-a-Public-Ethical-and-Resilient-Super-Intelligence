# RUNTIME ADMISSIBILITY ENGINE

**Mission** : `ZORAN_S_PROPAGATION_ENGINE_20260515`

ZenRuntime ne doit charger **que** les sous-graphes propagationnellement
admissibles.

---

## 1. Critère d'admissibilité runtime

Une loi `L` est runtime-admissible **pour une requête** si :

```
admissible(L, query) ⟺
    L.runtime_admissible == true
  ∧ L.S_propagated ≥ θ_min          (cohérence soutenable)
  ∧ L.dependency_load ≤ θ_max       (ne tire pas trop d'autres lois)
  ∧ L.cross_graph_pressure ≤ θ_pres (pas trop exposée)
  ∧ relevant(L, query)              (cf. CLE)
```

Seuils par défaut :
- `θ_min` = 0.65
- `θ_max` = 0.50
- `θ_pres` = 0.40

---

## 2. Distribution actuelle

Sur les 241 lois canoniques :

| critère | passe | échoue |
|---|---:|---:|
| `runtime_admissible == true` | 241 | 0 |
| `S_propagated ≥ 0.65` | 230 | 11 (lois fragiles) |
| `dependency_load ≤ 0.50` | 235 | 6 (hubs hauts) |
| `cross_graph_pressure ≤ 0.40` | 236 | 5 (très exposées) |
| **Tous critères** | **~220** | ~21 |

→ ~91% des lois canoniques restent admissibles runtime sous critères
stricts.

---

## 3. Lois non-admissibles runtime (à investiguer)

Lois canoniques qui échouent à ≥ 1 critère :

| id | S_propagated | dep_load | cgp | raison principale |
|---|---:|---:|---:|---|
| GHUC-001 (μ0) | 0.715 | 0.220 | 0.520 | cgp > 0.40 (très exposée) |
| WP11-005 | 0.700 | 0.180 | 0.440 | cgp > 0.40 |
| feuilles depth 3+ rares | 0.620 | 0.080 | 0.030 | S_propagated < 0.65 |

**Note** : GHUC-001 n'est pas non-admissible globalement — elle peut
toujours être chargée si **directement pertinente** à la requête (cf.
CLE règles).

---

## 4. Implication pour CLE (Contextual Loading Engine)

La sélection CLE doit pondérer :

```
score(L | query) = relevance(L, query) × admissibility(L)

avec admissibility(L) =
    sigmoid(S_propagated - 0.65) × sigmoid(0.50 - dep_load) × sigmoid(0.40 - cgp)
```

Cela favorise naturellement les lois soutenables sans bloquer les
exceptions justifiées.

---

## 5. Détection lois "toxiques runtime"

Une loi est **toxique runtime** si elle dégrade systématiquement
les sessions où elle est chargée. Indicateurs :

| indicateur | seuil |
|---|---|
| `S_propagated < 0.50` | dégradation cohérence locale |
| `dependency_load > 0.70` | pull massif d'autres lois |
| `cross_graph_pressure > 0.60` | propagation tensions |

Actuellement : **0 loi détectée toxique runtime** sur le corpus 241.

---

## 6. Auto-régulation

Si une loi devient toxique runtime (mesure sur N audits) :
1. Adaptive propose démotion vers sandbox
2. Core dryrun
3. Démotion exécutée si HS reste OK

Pipeline déjà spécifié dans `audit/DISCOVERY_SANDBOX_SPEC.md`.

---

## 7. Cible numérique mission

| cible | valeur | atteint ? |
|---|---|---|
| 0 faux S élevés | 0 | ✓ |
| propagation collapse ≤ 0.02 | 0.00 | ✓ |
| overload runtime 0 | 0 | ✓ |
| rollback success 100% | 100% | ✓ |
| HS ≥ 0.93 | 1.000 | ✓ |
| S_global_proxy ≥ 0.94 | proxy:0.90 | ⚠ formule HS plafonne |

**Note honnête** : la cible `S_global ≥ 0.94` n'est pas
atteignable avec la formule actuelle (max théorique 0.896). Pour
l'atteindre, il faudrait recalibrer `S_global = α·C_struct + β·C_comp
+ γ·C_iso − δ·contradictions_density` (cf. `audit/S_GLOBAL_RULES.md`
R-S1 et la calibration `WP11-006`).

Le S_propagated **introduit une mesure complémentaire** qui pourrait
servir de base pour un `S_global_v2` futur.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_S_PROPAGATION_ENGINE_20260515
LAWS_RUNTIME_ADMISSIBLE:  ~220/241 sous critères stricts
LAWS_TOXIC_DETECTED:      0
HS:                       1.000 (cible ≥ 0.93 ✓)
S_GLOBAL_PROXY:           0.90 (cible 0.94 nécessite recalibrage formule)
```

🔶
