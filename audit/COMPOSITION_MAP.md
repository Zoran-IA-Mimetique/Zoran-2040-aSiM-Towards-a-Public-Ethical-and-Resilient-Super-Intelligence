# COMPOSITION MAP — P1

**Mission** : `ZORAN_P1_DEMONSTRATED_EXPANSION_50_LAWS_20260515`
**Timestamp** : `2026-05-15T19:53:00+02:00`

Carte des compositions opératoires démontrées entre lois. Chaque
composition cite : la paire, l'opérateur, les invariants préservés, un
test d'entrée/sortie, le ΔS_global et le statut d'admissibilité.

Données source : `app/data/laws.json` champ `compositions[]`.

---

## 1. Compositions héritées de P0.5 (3)

| paire | opérateur | invariants préservés | ΔS_global | statut |
|---|---|---|---:|---|
| GHUC-001 ∘ DVE-001 | GHUC ∘ DVE | traçabilité, I_struct | 0.00 | admissible |
| GHUC-001 ∘ UDE-001 | GHUC ∘ UDE | gain−cost, I_struct | +0.01 | admissible |
| WP11-001 ∘ WP12-001 | WP11 ∘ WP12 | S_local⊥S_global, NC∧Min∧Fert | 0.00 | admissible |

---

## 2. Compositions ajoutées P1 (15)

### 2.1 Dualités fractales (5)

Une par famille ayant reçu une expansion en profondeur :

| paire | opérateur | invariant clé | ΔS_global |
|---|---|---|---:|
| ULG-002-a ⊕ ULG-002-b | dualité sous-cadre / contraction | convergence par les 2 régimes | 0.00 |
| WP11-002-a ⊕ WP11-002-b | dualité fort / faible | S_local saturé | +0.01 |
| DVE-002-a ⊕ DVE-002-b | dualité continu / discret | traçabilité WP12-002 | 0.00 |
| SDE-002-a ⊕ SDE-002-b | dualité directe / réflexive | invariant Skopein | 0.00 |
| PAL-002-a ⊕ PAL-002-b | dualité continu / discret palieronique | invariance inter-palier | −0.01 |

Toutes admissibles. Ces dualités sont la **manifestation explicite** du
motif fractal `(parent, A, B)` à l'échelle des sous-cas.

### 2.2 Opérateurs duels (2)

| paire | opérateur | invariant clé | ΔS_global |
|---|---|---|---:|
| GHUC-003-a ⊕ GHUC-003-b | pruning intra ∪ inter | couverture exhaustive | +0.01 |
| GHUC-004-a ⊕ GHUC-004-b | fusion intra ∪ inter | absorption traçable | 0.00 |

### 2.3 Audit + calibration (1)

| paire | opérateur | invariant clé | ΔS_global |
|---|---|---|---:|
| GHUC-005 ∘ WP11-006 | audit pré-op + calibration α,β,γ,δ | HS maintenu | +0.02 |

### 2.4 Tension documentée (1)

| paire | opérateur | invariant clé | ΔS_global | statut |
|---|---|---|---:|---|
| WP12-006 ⊥ WP12-007 | tension réversibilité ↔ auditabilité | contradiction documentée | 0.00 | admissible_with_tension |

C'est la première composition explicitement marquée comme **admissible
sous tension** (statut hybride). La contradiction est intégrée comme
information structurelle, pas comme blocage.

### 2.5 Cross-famille (5)

| paire | opérateur | invariant clé | ΔS_global | statut |
|---|---|---|---:|---|
| ULG-006 ∘ ULG-003 | champ d'invariance opératoire | invariance morphologique ULG | +0.01 | admissible |
| UDE-006 ⊕ UDE-007 | découverte par homologie + perturbation | robustesse | +0.02 | admissible |
| GHUC-001 ∘ WP12-007 | consolidation auditée + traçabilité | ⊘ rejet | 0.00 | **blocked_by_admissibility** |
| DVE-006 ∘ WP12-002 | bifurcation par contradiction + non-contradiction | branches NC | 0.00 | admissible |
| SDE-006 ∘ ULG-006 | composition Skopein + invariance opératoire | préservation conjointe | −0.005 | **warn_marginal** |

### 2.6 Détection conjointe (1)

| paire | opérateur | invariant clé | ΔS_global |
|---|---|---|---:|
| PAL-006 ∘ WP11-005 | métastabilité ↔ détection fausse cohérence | alerte conjointe | +0.01 |

---

## 3. Statistiques globales

| métrique | P0.5 | P1 final |
|---|---:|---:|
| compositions totales         | 3 | 18 |
| admissibles                  | 3 | 16 |
| admissibles sous tension     | 0 | 1 (WP12-006 ⊥ WP12-007) |
| warning marginal             | 0 | 1 (SDE-006 ∘ ULG-006) |
| blocked par admissibilité    | 0 | 1 (GHUC-001 ∘ WP12-007 — démontre que le pipeline bloque réellement) |
| ΔS_global moyen              | +0.003 | +0.005 |
| ΔS_global maximal            | +0.01 | +0.02 |
| ΔS_global minimal            | 0.00 | −0.01 |

Aucune composition ne dégrade significativement `S_global`. La plus mauvaise
(−0.01 sur PAL-002-a ⊕ PAL-002-b) reste dans la zone admissible (cf. R-S4 :
|ΔS_global| ≤ 0.05).

---

## 4. Graphe des compositions

```
                    ┌──── GHUC-001 ──┐
                    │       ∘        │
                    │     UDE-001    │
                    │       │        │
                    │       ∘        │
                    │     DVE-001 ──┐│
                    │       │       │
   WP11-006 ─∘─ GHUC-005    │       │
        │             │     ∘       │
        │             │   WP12-007 ─┘
    WP11-001 ─────∘── WP12-001
        │              │
    WP11-005 ─∘── PAL-006
        │
    WP11-002 ─── (a ⊕ b) ─── instances
        │
    SDE-002 ─── (a ⊕ b) ─── instances
        │
    ULG-006 ─∘─ SDE-006
        │
    ULG-003
```

(Diagramme informel — voir laws.json pour la liste complète.)

---

## 5. Compositions par attracteur μ0

Le seul `μ0` actuel est `GHUC-001`. Compositions le citant :

| paire | statut |
|---|---|
| GHUC-001 ∘ DVE-001 | admissible (P0.5) |
| GHUC-001 ∘ UDE-001 | admissible (P0.5) |
| GHUC-001 ∘ WP12-007 | blocked_by_admissibility (P1) |
| GHUC-005 ∘ WP11-006 | admissible (P1, GHUC-005 est descendant de GHUC-001) |

3 compositions admissibles + 1 blocked + nombreuses indirectes (via les
sous-opérateurs GHUC-002 → 002-a/b → instances).

**Gate R-S2** : `C_composition >= 3 / max(1, N_mu0)` = `18 >= 3 / 1 = 3` —
le seuil est **techniquement franchi** (compositions ≥ 3). Le tag
`proxy` reste maintenu par prudence systémique tant que la décomposition
opérationnelle de R-S1 n'est pas auditée en production.

---

## 6. Compositions à venir (post-P1, non implémentées)

Pour atteindre une couverture `C_composition` saturée à 1.0 sur les
attracteurs μ1 (8 attracteurs μ1 → 28 paires à 2 → seuil ≥ 14 pour
saturer), il faudrait documenter ~10 compositions supplémentaires entre
racines canoniques. Cible P0.6.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_P1_DEMONSTRATED_EXPANSION_50_LAWS_20260515
TIMESTAMP:            2026-05-15T19:53:00+02:00
COMPOSITIONS_TOTAL:   18 (3 héritées + 15 nouvelles)
ADMISSIBLE:           16
ADMISSIBLE_TENSION:   1 (WP12-006 ⊥ WP12-007)
WARN_MARGINAL:        1 (SDE-006 ∘ ULG-006)
BLOCKED:              1 (GHUC-001 ∘ WP12-007 — preuve que le pipeline bloque)
DELTA_S_GLOBAL_MAX:   +0.02 (admissible)
DELTA_S_GLOBAL_MIN:   −0.01 (admissible — sous seuil R-S4)
NEXT_ACTIONS:         documenter ~10 compositions μ1-μ1 en P0.6
```

🔶
