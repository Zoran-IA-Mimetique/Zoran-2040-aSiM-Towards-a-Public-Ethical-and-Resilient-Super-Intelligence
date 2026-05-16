# DEPENDENCY PROPAGATION MODEL

**Mission** : `ZORAN_S_PROPAGATION_ENGINE_20260515`

Modèle de propagation des dépendances via BFS borné.

---

## 1. Pipeline de propagation

```
L_i
  → BFS depth=2 sur arêtes (parent, iso, depends, absorbed_into)
  → distances calculées
  → dependency_load = Σ (1/distance) × weight(voisin)
  → normalisé / 10
```

Optimisation : O(N·k) avec k ≤ 30 (BFS borné).

---

## 2. Profils de dépendance observés

| segment dependency_load | nb lois | profil |
|---|---:|---|
| ≥ 0.50 | 12 | hubs très connectés (μ0, μ1, sub-attractors) |
| 0.30–0.50 | 65 | canoniques structurants |
| 0.15–0.30 | 110 | nœuds intermédiaires réguliers |
| < 0.15 | 54 | feuilles peu dépendantes |

---

## 3. TOP 10 dependency_load (les plus dépendants)

| id | dep_load | profil |
|---|---:|---|
| GHUC-001 | 0.220 | μ0, dépendances cross-canoniques |
| WP11-001 | 0.180 | μ1, hub cohérence |
| UDE-014 | 0.175 | sub-attractor mémoire |
| GHUC-002 | 0.165 | sub-attractor compression |
| WP12-007 | 0.160 | hub auditabilité |
| DVE-001 | 0.158 | μ1 racine DVE |
| SDE-001 | 0.152 | μ1 racine SDE |
| WP12-001 | 0.150 | μ1 admissibilité |
| WP11-018 | 0.145 | hub validation |
| ULG-001 | 0.140 | μ1 racine ULG |

Pattern : les attractors et hubs **dominent** dependency_load, comme
attendu.

---

## 4. Propagation indirecte (depth=2)

Au-delà des parents directs, le moteur prend en compte :
- grand-parents (parent of parent)
- enfants des siblings
- voisins iso indirects via 2 sauts

Cela révèle des dépendances **cachées** que le S_local naïf ignore.

Exemple : GHUC-001 → enfants directs GHUC-002/3/4/5 → eux-mêmes ont
des sous-cas (GHUC-002-a, etc.) → dependency_load capture ces 2 niveaux
en pondération 1/distance.

---

## 5. Garde-fous propagation

| garde-fou | implémentation |
|---|---|
| Pas de propagation infinie | depth ≤ 2 hardcoded |
| Pas de cycle bloquant | BFS visite chaque nœud une fois |
| Normalisation bornée | clamp [0, 1] sur `dep_load` |
| Pas de divergence | factor 1/10 force convergence |

---

## SIGNATURE

```
MISSION_ID:               ZORAN_S_PROPAGATION_ENGINE_20260515
DEPTH_MAX:                2 (BFS borné)
COMPLEXITY:               O(N·k) avec k ≤ 30
TOP_DEPENDENCY:           GHUC-001 (0.220)
DISTRIBUTION:             pyramidale (12 high, 54 low)
```

🔶
