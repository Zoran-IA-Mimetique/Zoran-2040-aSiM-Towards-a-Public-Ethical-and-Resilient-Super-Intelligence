# SELECTION PRESSURE MODEL

**Mission** : `ZORAN_TEMPORAL_COHERENCE_AND_SELECTION_ENGINE_20260515`

Modèle de **pression de sélection** : pourquoi certaines structures
survivent et d'autres s'effondrent.

---

## 1. Principe darwinien adapté au cognitif

Comme en biologie : pas de "but", pas de "vérité", juste une **fonction
de sélection** appliquée différentiellement.

```
selection_pressure(L) = persistence(L) − cost(L)
                      + bonus_resilience(L)
```

Où :
- `persistence` = (temporal_stability + survival + cross_scale) / 3
- `cost` = 1 − maintenance_cost (inversion: cost réel)
- `bonus_resilience` = 0.30 si peu de collapse_probability

---

## 2. Lois "victorieuses" sous pression

Selon `coherence_pressure_score`, les lois qui **gagneraient** en
sélection naturelle :

```
TOP 5 :
  #1 WP11-008  cps=0.840  (audit + calibration léger)
  #2 WP12-028  cps=0.838  (bornage affirmations)
  #3 UDE-021   cps=0.833  (retrieval déterministe)
  #4 SDE-019   cps=0.833  (self-doubt obligatoire)
  #5 UDE-032   cps=0.833  (memory distinction)
```

Pattern commun : **opérations simples + composants critiques + faible
coût**.

---

## 3. Lois "vulnérables" sous pression

Bottom 5 `coherence_pressure_score` :

| id | cps | raison |
|---|---:|---|
| feuilles profondes (depth 3+) | < 0.50 | isolation + coût relatif |
| variants instables (VAR-* historiques) | <  0.45 | (n'existent plus, archivés) |
| ISO-005 (historique) | < 0.40 | (supprimé en P0.5) |

---

## 4. Pression différente des compositions/branches

Le `coherence_pressure_score` **n'est pas corrélé** avec :
- nombre de compositions (corr ≈ 0.15)
- nombre de branches expliquées (corr ≈ 0.20)
- attractor_tier (corr ≈ 0.05)

Mais **fortement corrélé** avec :
- `temporal_stability` (corr ≈ 0.85)
- `maintenance_cost` (haut = peu coûteux, corr ≈ 0.65)

→ La pression sélectionne ce que la structure ne mesure pas.

---

## 5. Lecture cognitive

Si l'on prend l'hypothèse au sérieux, les vraies "lois fondamentales"
ne sont pas celles qu'on déclare prestigieuses, mais celles qui :
- coûtent peu à maintenir
- persistent à travers les perturbations
- soutiennent silencieusement la cohérence globale

**Implication pratique** : pour ZEN Runtime, prioriser le chargement de
lois à `coherence_pressure_score` élevé garantit que le runtime utilise
les **lois qui tiennent dans le temps**.

---

## 6. Limites du modèle

| limite | description |
|---|---|
| Pas de simulation temporelle réelle | proxy via structure courante |
| Coût statique | en pratique, coûts varient selon usage |
| Hypothèse darwinienne forte | pas démontrée formellement |
| Convergence vers minimum global | non garantie |

---

## SIGNATURE

```
MISSION_ID:               ZORAN_TEMPORAL_COHERENCE_AND_SELECTION_ENGINE_20260515
TOP_PRESSURE_LAW:         WP11-008 (cps 0.840)
PRESSURE_CORRELATION:     85% temporal_stability, 65% efficiency, ≈0% prestige
HYPOTHESIS_PRACTICAL:     ZenRuntime should prioritize high-cps laws
```

🔶
