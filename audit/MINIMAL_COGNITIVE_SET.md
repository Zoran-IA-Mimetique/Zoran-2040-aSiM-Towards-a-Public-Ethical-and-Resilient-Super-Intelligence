# MINIMAL_COGNITIVE_SET — Spec

**Mission** : `ZORAN_COGNITIVE_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/COGNITIVE_SELECTION_ENGINE.md`
**Spec liées** : `audit/PRECISION_THRESHOLD_ENGINE.md`, `audit/RUNTIME_BUDGET_MODEL.md`
**Rapport runtime** : `audit/COGNITIVE_SELECTION_REPORT.json`

## Définition

Le **sous-graphe minimal suffisant** pour un sujet `T` est le plus
petit ensemble de lois `S ⊆ Laws` tel que :

```
1. |S| ≤ budget
2. cumulative_precision(S, T) ≥ precision_floor (≈ 1.00 atteint en pratique)
3. ∀ loi L ∈ S : threshold_admissibility(L) avec priorité au rang
4. ∄ L' ∈ S : marginal_information_gain(L', S \ {L'}) < 0.05 sauf si |S| < 5
```

Ce n'est pas une couverture sémantique exhaustive — c'est le **plus
petit noyau cohérent** capable de soutenir la précision plancher
sans surcharge runtime.

## Réduction observée : 241 → 20

Sur le corpus complet (`app/data/laws.json` = 241 lois), chaque
requête utilisateur n'a besoin que de **20 lois actives**, soit
une réduction de **91.7 %** du graphe runtime.

| Total lois | Retenues (typique) | Réduction |
|------------|--------------------|-----------|
| 241        | 20                 | **91.7 %** |

Cette réduction n'est **pas** un compromis : la précision cumulée
atteint `1.00` dans les 5 cas testés (cf. tableau ci-dessous). Les
221 lois écartées sont soit non pertinentes au sujet (`topic_relevance`
faible), soit inadmissibles sous le seuil `selection_priority ≥ 0.45`.

## Résultats — 5 requêtes test

| Sujet                                | Sélectionnées | Précision cumulée | Top loi    |
|--------------------------------------|---------------|-------------------|------------|
| `propagation runtime`                | 20 / 241      | 1.000             | PAL-012    |
| `boundary subject contextualisation` | 20 / 241      | 1.000             | WP11-028   |
| `frugalité cognitive runtime`        | 20 / 241      | 1.000             | PAL-012    |
| `cohérence temporelle`               | 20 / 241      | 1.000             | WP11-001   |
| `loi supérieure attracteur`          | 20 / 241      | 1.000             | WP11-002-a-i |

Le **noyau commun** aux 5 sous-graphes (lois apparaissant dans tous)
inclut notamment `WP11-028`, `WP12-036`, `WP11-012`, `UDE-028`,
`WP12-040`, `WP11-019`, `UDE-032`, `WP11-002-a-i`, `WP11-002-a-ii`,
`WP12-032`, `SDE-015`, `GHUC-018`. Ces ~12 lois forment l'**ossature
canonique** réutilisée quel que soit le sujet ; les 8 restantes
varient selon la pertinence lexicale.

## Sweet-spot atteint dès la 3ᵉ–4ᵉ loi

Détail `propagation runtime` :

| Rang | Loi        | `marginal_gain` | `cumulative_precision` |
|------|------------|-----------------|------------------------|
| 1    | PAL-012    | 0.449           | 0.449                  |
| 2    | PAL-008    | 0.432           | 0.881                  |
| 3    | WP11-014   | 0.562           | **1.000**              |
| 4–20 | …          | décroissant     | 1.000 (plateau)        |

La précision plancher est atteinte dès le rang 3. Les rangs 4–20
servent à renforcer la **diversité familiale** (WP12, ULG, UDE, PAL,
SDE, GHUC) pour permettre à l'oracle de valider la cohérence inter-
familles. Le budget = 20 reste donc justifié comme **marge de
validation**, non comme nécessité de précision.
