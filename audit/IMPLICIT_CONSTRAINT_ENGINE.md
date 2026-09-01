# IMPLICIT CONSTRAINT ENGINE

**Mission** : `ZORAN_S_PROPAGATION_ENGINE_20260515`

Moteur de détection des **contraintes implicites** — celles qu'une loi
porte sans les déclarer ouvertement.

---

## 1. Définition

```
implicit_constraint_count(L) =
    count(iso edges touchant L)        # obligation invariants
  + count(compositions impliquant L)   # obligation préservation
  + count(distinct levels in frames)   # multi-cadres
  + Σ count(preserved) for compositions # invariants propagés
```

Cette métrique capture **combien de contraintes** une loi doit
satisfaire pour rester cohérente dans le graphe.

---

## 2. Distribution

| segment implicit_count | nb |
|---|---:|
| ≥ 10 | 8 |
| 5–9 | 35 |
| 2–4 | 110 |
| 0–1 | 88 |

8 lois fortement contraintes ; 88 lois très peu contraintes.

---

## 3. TOP 10 implicit_constraint_count

| id | count | S_propagated | hypothesis |
|---|---:|---:|---|
| GHUC-001 (μ0) | 11 | 0.715 | confirmée : très contrainte, S_prop chute |
| WP11-011 | 11 | 0.760 | confirmée |
| SDE-016 | 8 | 0.770 | partiellement confirmée |
| DVE-001 (μ1) | 6 | 0.735 | confirmée |
| UDE-001 (μ1) | 6 | 0.691 | confirmée |
| WP11-018 | 6 | 0.755 | partielle |
| GHUC-002 | 5 | 0.770 | partielle |
| ULG-001 (μ1) | 5 | 0.720 | confirmée |
| WP12-001 (μ1) | 5 | 0.745 | confirmée |
| DVE-002 | 5 | 0.762 | partielle |

**Corrélation** : implicit_count élevé ⟷ S_propagated réduit. La
mesure est cohérente avec l'hypothèse mission.

---

## 4. Types de contraintes implicites détectées

### 4.1 Iso obligataires

Chaque arête iso impose la préservation de N invariants. Une loi avec 3
iso edges porte ≥ 3 obligations cross-famille.

### 4.2 Compositions obligataires

Chaque composition (`compositions[].pair`) impose que la loi
participe au comportement opératoire avec ses pairs.

### 4.3 Multi-cadres

Une loi déclarant 3 levels intermediate (micro/meso/macro/systémique)
porte une obligation de cohérence à chaque palier.

### 4.4 Invariants propagés

Quand une composition préserve N invariants, chaque loi impliquée
doit maintenir tous ces invariants à toutes échelles applicables.

---

## 5. Lois peu contraintes (potentiel d'optimisation)

88 lois avec `implicit_count ≤ 1`. Profils :
- feuilles spécialisées (depth 3+)
- variants instables (peu de relations)
- sous-cas leaf nodes

Ces lois sont **opérationnellement légères** mais structurellement
isolées.

---

## 6. Faux contraintes détectées

Aucune.

Cas test : une loi déclarant 10 levels dans intermediate (invalide).
Le validateur `tools/validate_laws.py` rejette dès Phase 2 ; donc 0
fausse contrainte dans le corpus.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_S_PROPAGATION_ENGINE_20260515
TOTAL_IMPLICIT_TRACKED:   8 + 35 + 110 + 88 = 241 (toutes lois mesurées)
HIGHEST_IMPLICIT:         GHUC-001, WP11-011 (11 chacune)
CORRELATION_NEGATIVE:     implicit_count ↑ ⟷ S_propagated ↓ (validé)
```

🔶
