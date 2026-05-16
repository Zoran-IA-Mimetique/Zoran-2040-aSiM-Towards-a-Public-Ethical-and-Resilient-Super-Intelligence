# MULTI_CORE_PATTERN_ENGINE — Spec

**Mission** : `ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516`
**Timestamp** : `2026-05-16T01:55:00+02:00`
**Cross-refs** : `META_PATTERN_LAYERS.md`, `LAYER_MANAGER_SYSTEM.md`,
`CORE_GRAVITY_DETECTION.md`, `audit/MULTI_CORE_DETECTION_REPORT.json`,
`tools/multi_core_pattern_engine.py`

---

## 1. Objectif

Détecter automatiquement les **noyaux émergents** du graphe (centres
de gravité multiples) à partir des 241 lois canoniques. Le moteur
remplace l'hypothèse mono-attracteur par une décomposition en
3-8 noyaux indépendants, chacun structuré autour d'une famille
canonique et caractérisé par sa densité, sa stabilité, et son
runtime_relevance.

## 2. Algorithme

Pipeline en 4 phases (`detect_cores()` dans
`tools/multi_core_pattern_engine.py`) :

1. **Adjacence** : `build_adjacency(nodes, edges)` produit un graphe
   non-orienté à partir des edges (parent / iso / contradicts /
   absorbed_into / related), filtre les self-loops, déréférence les
   edges `{source, target}` sérialisés.
2. **PageRank simplifié** : 8 itérations, damping `d=0.85`, init
   uniforme `1/N`. `pr = 0.15/N + 0.85·Σ(pr_voisin / deg_voisin)`.
3. **Composite score** par nœud :
   `3·PageRank + 0.30·superior_law_candidate + 0.20·attractor_tier=fondateur
   + 0.20·S_local + 0.20·frugality_score + 0.15·velocity_score`.
4. **Clustering par famille** : seed = top-composite de chaque famille,
   cluster = membres de la famille (groupement naturel par préfixe id).

## 3. Seuils anti faux-noyaux

| paramètre        | valeur | rôle                                            |
|------------------|--------|-------------------------------------------------|
| `MIN_CORE_SIZE`  | 3      | rejet des micro-clusters bruyants               |
| `MAX_CORES`      | 8      | cap dur (anti-overload visuel)                  |
| `MIN_DENSITY`    | 0.06   | densité interne minimale (relaxée si size ≥ 15) |
| `pagerank iters` | 8      | convergence rapide sur 241 nœuds                |
| `damping`        | 0.85   | standard PageRank                               |

## 4. Output runtime (241 lois, 2026-05-16)

8 noyaux détectés, **coverage 100%** (orphan_count = 0).
`runtime_relevance ∈ [0.456, 0.482]`, densités `[0.056, 0.100]`,
stabilités `[0.825, 0.892]`.

| core_id        | size | density | stab  | relevance | centers          |
|----------------|------|---------|-------|-----------|------------------|
| CORE-02-DVE    | 26   | 0.089   | 0.874 | 0.482     | DVE-001/002/008  |
| CORE-06-WP12   | 33   | 0.066   | 0.892 | 0.479     | WP12-001/007/020 |
| CORE-05-WP11   | 37   | 0.056   | 0.880 | 0.468     | WP11-001/003/002 |
| CORE-01-ULG    | 26   | 0.080   | 0.855 | 0.467     | ULG-001/003/002  |
| CORE-04-GHUC   | 37   | 0.059   | 0.872 | 0.465     | GHUC-001/003/002 |
| CORE-07-SDE    | 28   | 0.074   | 0.852 | 0.463     | SDE-001/002/028  |
| CORE-08-PAL    | 21   | 0.100   | 0.825 | 0.463     | PAL-001/002      |
| CORE-03-UDE    | 33   | 0.061   | 0.851 | 0.456     | UDE-001/019/014  |

Écrit dans `app/data/cores.json` (consommé par `main.js
buildSidebar()`) et `audit/MULTI_CORE_DETECTION_REPORT.json`.
Chaque nœud reçoit `core_id` annoté dans `app/data/laws.json`.
