# MULTI_ROUTE_RUNTIME_SYSTEM — Spec

**Mission**: `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
**Implémentation**: `tools/runtime_cognitive_path_competition_engine.py`,
`app/src/chat.js`
**Cross-refs**: `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
`PATH_SELECTION_AND_ELIMINATION.md`, `COGNITIVE_SELECTION_ENGINE.md`

## Architecture

6 stratégies tournent **simultanément** sur le même graphe de lois pour la
même question. Aucune communication entre elles — chaque stratégie est une
fonction pure de la forme :

```
strategy: (nodes, q_tokens) → list[Law]   # tri descendant + slice [:K]
```

C'est une **compétition close** : pas d'apprentissage, pas de coopération,
pas de variance entre runs (déterministe sauf pour `BASELINE-random`).

```
                                  ┌─ ROUTE-frugale            ──┐
                                  ├─ ROUTE-anti_hallucination ──┤
       Question (chat bar) ─────►─┼─ ROUTE-propagation_forte  ──┼─►─ Oracle ─► Winner
                                  ├─ ROUTE-temporal_survival  ──┤
                                  ├─ ROUTE-structurelle       ──┤
                                  └─ ROUTE-runtime_rapide     ──┘
                                  + BASELINE-naive · BASELINE-random
```

## Paramètres globaux

| Paramètre | Valeur | Source |
|-----------|--------|--------|
| `K_LAWS_PER_ROUTE` | 10 | `runtime_cognitive_path_competition_engine.py:35` |
| Stratégies actives | 6 | `ROUTE_STRATEGIES` dict |
| Baselines | 2 | `baseline_naive`, `baseline_random` |
| Pool de lois | 241 | `app/data/laws.json` |

## Ranking — clés utilisées par loi

Chaque rank function lit des champs déjà calculés par les engines
précédents (`cognitive_selection_engine.py`,
`temporal_resilience_engine.py`, `frugality_engine.py`, etc.) :

- `frugality_score`, `propagation_cost`, `anti_hallucination_score`
- `drift_risk`, `dependency_load`, `temporal_resilience_score`
- `collapse_probability`, `child_laws`, `parent_laws`, `S_local`
- `velocity_score`

Le `topic_score(node, q_tokens)` est calculé à la volée :
intersection lexicale entre tokens(Q) et bag(title + description + tags + domains).

## UI — chat bar + panneau résultats

Voir `app/src/chat.js` + intégration dans `index.html`/`panel.js` :

- **Chat bar bottom-centered** : `#chat-bar` ancré bas de viewport, contient
  `#chat-input` (textarea), bouton mic (Web Speech API `fr-FR`),
  bouton upload fichier (≤ 2 Mo, 600 chars utilisés comme contexte),
  bouton envoyer (`Enter` également).
- **Panneau résultats** : `#chat-results` overlay rétractable, contenant
  jusqu'à 6 cartes route + bloc baselines.
- Chaque carte route affiche : label, status (★ WINNER / ✓ survit / ✗ éliminée
  + raisons), `sel`, et barres mini pour prec / hallu / bruit / coût / temp / rwa / survie.
- Les `laws_used` sont rendues cliquables : `data-pick="<id>"` déclenche
  `onPickLaw(id)` pour focaliser la loi dans le graphe principal.

## Limites architecturales

- Toutes les routes lisent le MÊME pool de lois → aucune diversité de sources.
- `K=10` est figé : pas d'allocation budget adaptative par stratégie.
- Pas de propagation runtime réelle entre routes — chaque score est
  une moyenne agrégée, pas un vrai parcours de graphe.
- Le résultat est entièrement déterminé par les scores pré-calculés sur les
  lois ; le moteur ne « raisonne » pas sur Q au-delà du `topic_score` lexical.
