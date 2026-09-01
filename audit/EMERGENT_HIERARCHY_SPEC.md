# EMERGENT HIERARCHY SPEC

**Mission** : `ZORAN_DISTRIBUTED_LAW_VALIDATION_ENGINE_20260515`

Spécification de la **hiérarchie émergente** : aucun rang n'est attribué
manuellement, tout émerge du calcul distribué et temporel.

---

## 1. Principe central

> Le rang d'une loi est une **conséquence computationnelle**, jamais
> une décision éditoriale.

Sources de rang :
- `structural_rank` (calculé statiquement)
- `superior_law_probability` (calculé selon compositions)
- `hierarchical_confidence` (distributed validation)
- `dynamic_selection_rank` (temporal coherence)

Aucune intervention manuelle ne peut figer un rang.

---

## 2. Composition du rang émergent global

Pour chaque loi, l'**état hiérarchique émergent** combine 4 sources :

| source | poids logique |
|---|---|
| structural_rank (statique) | base hiérarchique (Y axis) |
| superior_law_probability | détection compositionnelle |
| hierarchical_confidence | validation distribuée |
| dynamic_selection_rank | sélection temporelle |

Ces 4 visions peuvent **diverger** — c'est volontaire. La divergence est
elle-même une information.

---

## 3. Cas observés de divergence

| loi | structural_rank | super_prob | hier_conf | dynamic_rank | divergence |
|---|---:|---:|---:|---:|---|
| GHUC-001 | 152 (μ0) | 0.86 | 0.86 | élevé | cohérent (haut partout) |
| WP11-008 | bas (sandbox-promu) | 0.30 | 0.40 | **#1** | **divergence forte** : temporel haut, structurel bas |
| ULG-001 | 137 (μ1) | 0.55 (faux flag) | 0.60 | rang moyen | divergence partielle |

Les **divergences révèlent des dimensions cachées** :
- WP11-008 n'est pas star structurellement mais "le réel" la sélectionne
  via son coût bas + persistence
- ULG-001 a un drapeau faux superior (langage "universel") mais reste
  centrale structurellement

---

## 4. Anti-fossilisation

Aucun rang n'est figé. Re-calculé à chaque exécution de :
- `tools/compute_topology_weights.py`
- `tools/superior_law_engine.py`
- `tools/distributed_validation_engine.py`
- `tools/temporal_coherence_engine.py`

Recalcul recommandé : à chaque batch d'ajouts + 1×/semaine.

---

## 5. Convergence éventuelle vers consensus

Quand les 4 sources convergent sur une loi (ex. GHUC-001), c'est un
**signal fort** que la loi est structurellement, compositionnellement,
distributivement ET temporellement importante.

Convergence parfaite (top 10 dans les 4 dimensions) actuellement :
- **GHUC-001** seule

Convergence forte (top 30 dans les 4) :
- ~5-8 lois (à recompute)

---

## 6. Visualisation émergente

Dans l'UI :
- Axe Y = structural_rank
- ★ badge = superior_law_candidate (probability)
- Section "Validation distribuée" = scores distributed
- Section "Sélection temporelle" + sidebar dédiée = dynamic_selection_rank

L'utilisateur peut **comparer les 4 vues** sans qu'aucune ne domine.

---

## 7. Anti-règles émergence

| anti-règle | exemple |
|---|---|
| ❌ Modifier `structural_rank` manuellement | rejet validateur |
| ❌ Forcer `superior_law_candidate = true` | écrasé au prochain run engine |
| ❌ Hardcoder `dynamic_selection_rank` | écrasé au prochain run engine |
| ❌ Imposer une convergence artificielle | divergences sont **informatives** |
| ❌ Inférer rang à partir de prestige | aucun chemin lexical n'influence le calcul |

---

## SIGNATURE

```
MISSION_ID:               ZORAN_DISTRIBUTED_LAW_VALIDATION_ENGINE_20260515
HIERARCHY_SOURCES:        4 (structural, superior, distributed, temporal)
DIVERGENCES_PRESERVED:    ✓ (signal informatif, pas bug)
CONVERGENCE_PERFECT:      GHUC-001 seule
RECALCUL_RECOMMENDED:     hebdomadaire ou post-batch
NO_MANUAL_OVERRIDE:       ✓
```

🔶
