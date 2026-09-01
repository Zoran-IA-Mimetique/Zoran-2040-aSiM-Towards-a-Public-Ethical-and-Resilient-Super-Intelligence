# SUPERIOR LAW CANDIDATES

**Mission** : `ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515`

Liste détaillée des **25 lois supérieures candidates** détectées par
`tools/superior_law_engine.py` sur le CanonicalGraph (241 lois).

Source raw : `audit/SUPERIOR_LAW_CANDIDATES.json`.

---

## 1. TOP 10 par superior_law_probability

| rang | id | famille | tier | comp | branches | multi-scale | probability |
|---:|---|---|---|---:|---:|---:|---:|
| 1 | **GHUC-001** | GHUC | μ0 | 1.00 | 36 | 3 | **0.860** |
| 2 | **WP12-001** | WP12 | μ1 | 1.00 | 32 | 2 | **0.822** |
| 3 | **UDE-001** | UDE | μ1 | 1.00 | 32 | 2 | **0.797** |
| 4 | **WP11-001** | WP11 | μ1 | 0.87 | 36 | 2 | **0.792** |
| 5 | **PAL-001** | PAL | μ1 | 0.67 | 20 | 2 | **0.732** |
| 6 | **SDE-001** | SDE | μ1 | 0.67 | 27 | 1 | **0.696** |
| 7 | **GHUC-002** | GHUC | — | 1.00 | 9 | 2 | **0.691** |
| 8 | **SDE-002** | SDE | — | 1.00 | 12 | 1 | **0.634** |
| 9 | **WP11-007** | WP11 | — | 1.00 | 8 | 2 | **0.614** |
| 10 | **UDE-009** | UDE | — | 1.00 | 4 | 3 | **0.604** |

---

## 2. Lois 11-25 (probability ∈ [0.50, 0.60])

| rang | id | famille | rôle structurel |
|---|---|---|---|
| 11 | UDE-014 | UDE | Mémoire épisodique (composition forte) |
| 12 | WP12-009 | WP12 | Critère anti-hallucination (compose anti-hallu chain) |
| 13 | DVE-001 | DVE | μ1 racine famille DVE (false flag conservateur) |
| 14 | ULG-001 | ULG | μ1 racine famille ULG (false flag conservateur) |
| 15 | DVE-018 | DVE | Refus génératif (composition pipeline anti-hallu) |
| 16 | GHUC-005 | GHUC | Audit pré-consolidation |
| 17 | WP11-018 | WP11 | Validation Oracle multi-couche |
| 18 | UDE-022 | UDE | Validation source-doc |
| 19 | DVE-002 | DVE | Loi des dérivations contrôlées |
| 20 | UDE-002 | UDE | Cartographie attracteurs |
| 21 | WP12-007 | WP12 | Critère d'auditabilité |
| 22 | WP11-006 | WP11 | Calibration coefficients S_global |
| 23 | UDE-036 | UDE | RAG (Retrieval-Augmented Generation) |
| 24 | SDE-013 | SDE | Self-observation contrôlée |
| 25 | WP11-011 | WP11 | Audit hallucination par composition |

---

## 3. Patterns observés

### 3.1 Familles dominantes en top

| famille | candidates top 10 |
|---|---:|
| WP-12 | 1 (admissibilité) |
| WP-11 | 2 (cohérence + audit) |
| GHUC | 2 (consolidation racine + opérateur) |
| UDE | 2 (découverte + retrieval) |
| SDE | 2 (Skopein racine + dualité) |
| PAL | 1 (palier racine) |

WP-11/WP-12 (cohérence/admissibilité) et GHUC (consolidation) dominent — c'est
**conforme à l'attente** : ces familles sont les "meta-familles" du système.

### 3.2 Composition score saturé

11/25 candidates ont `composition_score = 1.00` (saturé à 15+
compositions). C'est principalement les racines et sous-attractors
denses.

### 3.3 Multi-scale concentré

Le multi-échelle 3+ est rare (seulement 5 lois). Cela suggère que :
- la majorité des lois opèrent à 1-2 niveaux
- les vraies lois "transverses" sont rares (et précieuses)

---

## 4. Recommandations Oracle

### 4.1 Pas de promotion automatique

Aucune action automatique sur les 25 candidates. Le moteur **détecte**,
l'humain (ou Oracle Adaptive) **décide**.

### 4.2 Promotions plausibles à considérer (futur)

| candidat | promotion plausible | justification |
|---|---|---|
| GHUC-002 | μ2 | sous-attractor structurel (9 branches) |
| WP11-002 | μ2 | sous-attractor (S_local hub) |
| WP12-009 | μ2 | sub-attractor anti-hallu |
| DVE-018 | μ2 | sub-attractor refus génératif |

À évaluer avec recompute HS post-promotion (Core dryrun obligatoire).

### 4.3 Aucune nouvelle famille à créer

Toutes les 25 candidates appartiennent aux 8 familles canoniques.
**R-CORE-11 préservé**.

---

## 5. Faux superior detected (4)

Voir `audit/FALSE_SUPERIOR_LAWS.md` pour détails complets. Les 4
détections sont des **faux positifs** du filtre conservateur :

- ULG-001 : "Universelle" dans le nom famille (légitime)
- ULG-002, DVE-001, WP11-003 : descriptions de racines fondatrices
  contenant naturellement "tout cadre", "graphe complet", etc.

Aucune action corrective requise.

---

## SIGNATURE

```
DOCUMENT:               SUPERIOR_LAW_CANDIDATES.md
VERSION:                1.0
TOTAL_LAWS_ANALYZED:    241
SUPERIOR_CANDIDATES:    25 (probability ≥ 0.50, no false flags)
HIGHEST_PROBABILITY:    GHUC-001 (0.860)
NO_NEW_FAMILY_REQUIRED: ✓
PROMOTION_AUTOMATIC:    AUCUNE (signal seulement)
```

🔶
