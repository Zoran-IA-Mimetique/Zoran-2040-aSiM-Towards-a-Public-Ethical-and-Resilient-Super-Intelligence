# SUPERIOR LAW ENGINE SPEC

**Mission** : `ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515`
**Timestamp** : `2026-05-15T20:49:00+02:00`

Spécification du **moteur de découverte de lois supérieures** —
détection objective et déterministe des lois structurellement
dominantes du graphe.

---

## 1. Définition opérationnelle

Une **loi supérieure** est une loi `L` qui satisfait :

```
superior(L) ⟺
    L compose avec ≥ 7 lois distinctes (composition_score)
  ∧ L explique ≥ 5 branches descendantes (branches_explained)
  ∧ L a ≥ 2 niveaux d'invariance (multi_scale_score)
  ∧ runtime_stability(L) ≥ 0.60
  ∧ cross_domain_score(L) ≥ 5
  ∧ contradictions_count(L) ≤ 3
  ∧ NO false_superior_flags
```

Une loi supérieure n'est **JAMAIS** :
- déclarée par l'auteur
- promue par popularité
- attribuée par prestige lexical
- inférée d'intuition subjective

Elle est **toujours** :
- calculée par `tools/superior_law_engine.py`
- déterministe (reproductible)
- auditable (chaque score décomposable)

---

## 2. Pipeline

```
Law L
  → CompositionAnalysis(L) → composition_score
  → InvariantAnalysis(L)   → multi_scale_score, invariant_score
  → MultiScaleValidation(L) → branches_explained, cross_domain_score
  → OracleValidation(L)    → false_superior_flags
  → if probability ≥ 0.50 ∧ no flags → SuperiorLawCandidate
```

Pas de promotion automatique vers tier μ — proposition seulement.
L'auteur (humain ou Oracle Adaptive) décide d'amorcer la promotion qui
passera elle-même par le pipeline tier-up.

---

## 3. Variables calculées par loi

```jsonc
{
  "id": "GHUC-001",
  "superior_law_probability": 0.86,    // [0, 1] composé
  "composition_score": 1.00,           // min(1, comps/15)
  "invariant_score": 0.75,             // multi_scale / 4
  "multi_scale_score": 3,              // niveaux distincts dans frames.intermediate
  "runtime_stability": 0.92,           // S_global - |S_local-S_global|
  "cross_domain_score": 8,             // domaines distincts via voisinage
  "branches_explained": 36,            // sous-arbre BFS
  "reusability_score": 6,              // refs entrantes (iso/contradicts/related)
  "topological_weight": 1.000,         // déjà calculé
  "contradictions_count": 0,           // count contradicts touchant L
  "hierarchical_rank": 152.5,          // déjà calculé
  "false_superior_flags": []           // R-CORE-12, R-ATR-1, etc.
}
```

---

## 4. Formule du score composé

```
superior_law_probability(L) =
    0.20 * min(1.0, comps / 15)
  + 0.20 * min(1.0, branches / 20)
  + 0.15 * (multi_scale / 4)
  + 0.15 * runtime_stability
  + 0.10 * min(1.0, cross_domain / 15)
  + 0.10 * min(1.0, reusability / 8)
  + 0.10 * topological_weight
  - 0.05 * min(1.0, contradictions / 5)
```

Plage : `[0, 1]`. Seuil candidate : `≥ 0.50`. Seuil très haute confiance :
`≥ 0.80`.

---

## 5. Détection de faux superior (R-CORE-12)

Flags automatiques :

| flag | détecté si |
|---|---|
| pseudo-universal language | `desc` contient "universel/absolu/omniprésent/tout cadre" |
| pseudo-universal frame | frames.global contient mêmes mots vagues |
| limits absent/vague | limits empty ou tous < 20 chars |
| μ-tier insuffisant | μ0 + comps<7 OU μ1 + comps<5 |
| weight inflé | weight ≥ 0.95 ∧ enfants < 2 |

Une loi avec **flag actif** ne peut pas être superior_candidate, même
si sa probabilité dépasse 0.50.

---

## 6. Output

### `audit/SUPERIOR_LAW_CANDIDATES.json`

```jsonc
{
  "mission_id": "ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515",
  "total_laws_analyzed": 241,
  "candidates_count": 25,
  "false_candidates_count": 4,
  "top_superior_candidates": [
    { "id": "GHUC-001", "superior_law_probability": 0.860, ... },
    ...
  ]
}
```

### `audit/FALSE_SUPERIOR_LAWS.json`

Liste des lois avec flags faux superior, pour audit/correction.

---

## 7. Garanties Oracle

- **Pas d'invention** : le moteur ne crée pas de superior laws, il les
  détecte
- **Pas de promotion automatique** : c'est un signal, pas une action
- **Réversible** : recalcul reproductible sur état du graphe
- **Conservateur** : les 4 faux candidats détectés (ULG-001, ULG-002, etc.)
  sont des FAUX POSITIFS — flags conservateurs car descriptions de
  racines fondatrices contiennent légitimement "universel"
- **Audit récurrent** : à exécuter avant chaque promotion μ-tier

---

## 8. Anti-règles

Le moteur **ne doit JAMAIS** :
- ❌ Modifier l'attractor_tier d'une loi
- ❌ Promouvoir directement à canonical
- ❌ Suggérer fusion sans validation Oracle
- ❌ Surcoter une loi par favoritisme
- ❌ S'auto-promouvoir au statut "loi supérieure"

---

## SIGNATURE

```
DOCUMENT:               SUPERIOR_LAW_ENGINE_SPEC.md
VERSION:                1.0
DETERMINISM:            full
SUPERIOR_THRESHOLD:     probability ≥ 0.50 ∧ no false flags
HIGH_CONFIDENCE:        ≥ 0.80
PROMOTION_AUTOMATIC:    interdite (signal seulement)
```

🔶
