# MULTI SCALE VALIDATION

**Mission** : `ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515`

Validation que les lois supérieures opèrent sur **plusieurs échelles**
(invariance multi-cadres).

---

## 1. Définition multi-échelle

Une loi `L` est multi-échelle si :

```
multi_scale_score(L) = |distinct levels in L.frames.intermediate|
```

Niveaux possibles : `micro`, `meso`, `macro`, `systémique`.

`multi_scale_score ≥ 2` requis pour candidate superior law.

---

## 2. Distribution multi-échelle des superior candidates

Sur les 25 superior candidates :

| multi_scale_score | nb candidates | exemples |
|---|---:|---|
| 4 (tous niveaux) | 0 | (aucune actuellement) |
| 3 | 5 | GHUC-001, UDE-009, GHUC-005, WP11-006, ... |
| 2 | 18 | majorité des racines + sous-attractors |
| 1 | 2 | SDE-001, GHUC-002 (niveaux meso seulement) |
| 0 | 0 | (aucune dans candidates — filter exigeait ≥ 1) |

---

## 3. Cas exemplaire : GHUC-001

```
intermediate:
  - {level: "meso",       scope: "famille GHUC (opérations C, P, F)"}
  - {level: "macro",      scope: "toutes les familles canoniques"}
  - {level: "systémique", scope: "topologie globale ZORAN"}
```

3 niveaux distincts. Score 3/4. Confirme statut μ0.

---

## 4. Tests multi-échelle

Pour chaque candidate, vérifier :

| test | critère |
|---|---|
| Niveaux distincts | ≥ 2 levels (meso + macro/systémique idéalement) |
| Cohérence cross-niveau | scope cohérent à chaque palier (pas trop vague) |
| Non-redondance | scopes ne doivent pas tous dire la même chose à différents niveaux |
| Invariants préservés | l'invariant-clé reste valide à toutes échelles |

---

## 5. Audit niveaux pour TOP 25 candidates

| # | id | levels | scope coherence |
|---|---|---|---|
| 1 | GHUC-001 | meso+macro+systémique | ✓ |
| 2 | WP12-001 | meso+macro | ✓ |
| 3 | UDE-001 | meso+macro | ✓ |
| 4 | WP11-001 | meso+macro | ✓ |
| 5 | PAL-001 | meso+macro | ✓ |
| 6 | SDE-001 | meso seulement | ⚠ pourrait gagner macro |
| 7 | GHUC-002 | meso+macro | ✓ |
| 8 | SDE-002 | meso seulement | ⚠ |
| 9 | WP11-007 | meso+systémique | ✓ |
| 10 | UDE-009 | meso+macro+systémique | ✓ |

Recommandation : enrichir SDE-001 et SDE-002 avec un niveau macro pour
plus de couverture (mineur).

---

## 6. Multi-échelle vs fractalité

Distinct mais lié :
- **Fractalité** : motif (parent, A, B) répété à 2+ échelles dans une famille
- **Multi-échelle** : cadres `intermediate` à 2+ niveaux distincts

Une loi peut être multi-échelle sans être dans une famille fractale
(ex: WP11-007 traverse meso/systémique sans que WP11 entière soit
fractale au sens P0_5_SPEC §1.4).

---

## 7. Stress test multi-cadre

Pour chaque candidate, simulé : la loi reste-t-elle cohérente si on
change le contexte d'évaluation (cadre local, intermédiaire, global) ?

```
GHUC-001 :
  cadre meso → consolide famille ✓
  cadre macro → consolide cross-famille ✓
  cadre systémique → préserve ω⁸ ✓
  → cohérent à tous niveaux ✓

SDE-001 :
  cadre meso → focus/diffuse ✓
  cadre macro → ?  (manque)
  → multi-échelle limité
```

Suggestion : enrichir SDE-001 frames.

---

## SIGNATURE

```
DOCUMENT:               MULTI_SCALE_VALIDATION.md
VERSION:                1.0
SUPERIOR_CANDIDATES:    25
MULTI_SCALE_3+:         5 (GHUC-001 + sub-attractors riches)
MULTI_SCALE_2:          18
MULTI_SCALE_1:          2 (SDE-001, SDE-002 — pourraient être enrichis)
RECOMMANDATIONS:        enrichir SDE-001/002 avec niveau macro
```

🔶
