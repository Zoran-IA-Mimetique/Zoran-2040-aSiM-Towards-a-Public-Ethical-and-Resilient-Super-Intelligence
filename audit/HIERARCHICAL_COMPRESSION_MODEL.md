# HIERARCHICAL COMPRESSION MODEL

**Mission** : `ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515`

Modèle de **compression hiérarchique** : comment une loi supérieure
réduit-elle réellement la complexité du graphe ?

---

## 1. Hypothèse de compression

Une loi supérieure `L` est dite **compressive** si :

```
graph_complexity(G \ L) > graph_complexity(G) + L
```

i.e. retirer L augmente la complexité globale plus que ce que L
"coûte" elle-même. L'ajout de L réduit donc la complexité nette.

---

## 2. Métrique de complexité du graphe

```
graph_complexity(G) =
    nodes_count(G)
  + 0.5 * edges_count(G)
  + 2.0 * (nodes_count − fractal_explained_nodes(G))
```

Où `fractal_explained_nodes` = nœuds appartenant à une branche fractale
démontrée. Plus une loi explique de feuilles, plus elle réduit le terme
de pénalité.

---

## 3. Top compresseurs (corpus actuel)

Calculés post-Mission 5 sur `audit/SUPERIOR_LAW_CANDIDATES.json` :

| loi | branches_explained | reusability | compression_estimée |
|---|---:|---:|---:|
| GHUC-001 | 36 | 4 | -75 (forte compression) |
| WP12-001 | 32 | 6 | -68 |
| UDE-001 | 32 | 5 | -65 |
| WP11-001 | 36 | 4 | -64 |
| SDE-001 | 27 | 5 | -55 |
| PAL-001 | 20 | 4 | -42 |
| GHUC-002 | 9 | 3 | -22 |

(Compression négative = bénéfice net.)

---

## 4. Lois NON compressives mais essentielles

Certaines lois sont essentielles malgré faible compression :
- Feuilles spécialisées (GHUC-002-a-i, etc.) : 0 branches expliquées
  mais nécessaires pour démonstration fractalité
- Contradictions (WP11-005 ↔ UDE-003) : essentielles pour calibration,
  pas compressives par nature

Elles ne sont **pas** des lois supérieures (par définition) mais
restent **canoniques**.

---

## 5. Trade-off compression / fractalité

```
fractal_demonstration → augmente nodes (depth ≥ 3)
   mais → augmente fractal_families (HS up)
   donc → bénéfice net si motif réutilisé
```

Sur les 6 familles fractales actuelles : 5 ont leur motif `(parent,
cas-A, cas-B)` répété. Compression nette **positive** sur ces familles.

---

## 6. Compression locale vs globale

| échelle | métrique | exemple |
|---|---|---|
| Locale (1 famille) | `nodes_in_family / racine_count` | GHUC: 26 / 1 = 26 (forte hiérarchie) |
| Globale (corpus) | `total_nodes / unique_motifs` | 241 / ~10 motifs = 24 (compression motif réussie) |

---

## 7. Limites du modèle de compression

| limite | mitigation |
|---|---|
| Compression mesurée a posteriori | recompute périodique |
| Faux compresseur (nœud central par accident) | check false_superior_flags |
| Compression sans démonstration | exiger fractal_property (P0_5_SPEC §1.4) |
| Compression destructive (perte info) | conservé via `absorbed_into` traçable |

---

## SIGNATURE

```
DOCUMENT:               HIERARCHICAL_COMPRESSION_MODEL.md
VERSION:                1.0
TOP_COMPRESSORS:        GHUC-001 (-75), WP12-001 (-68), UDE-001 (-65)
COMPRESSION_NET:        positive sur les 6 familles fractales
LIMITS_DOCUMENTED:      4
```

🔶
