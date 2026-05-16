# COGNITIVE_ROUTE_EVOLUTION — Spec

**Mission**: `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
**Statut**: design prospectif (non implémenté)
**Cross-refs**: `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
`MULTI_ROUTE_RUNTIME_SYSTEM.md`, `PATH_SURVIVAL_ANALYSIS.md`

## Hypothèse

Les 6 stratégies actuelles (`frugale`, `anti_hallucination`,
`propagation_forte`, `temporal_survival`, `structurelle`, `runtime_rapide`)
sont une **base de départ**, pas une taxonomie fixe.

Le constat runtime : 2 routes (`frugale`, `propagation_forte`) échouent
systématiquement l'Oracle, 4 survivent. Cela suggère que le pool de
stratégies devrait évoluer plutôt que rester figé.

## Mécanismes d'évolution envisagés

### 1. Recombinaison de survivants

Quand 2 stratégies survivent avec scores complémentaires, créer une
stratégie hybride :
```
rank_hybrid(n, q) = α · rank_temporal(n, q) + (1−α) · rank_structurelle(n, q)
```
Initial `α = 0.5`. À ajuster par grille sur les 5 démos. Exemple plausible :
hybride `temporal_survival × structurelle` (les deux survivent et leurs
ranks utilisent des dimensions différentes).

### 2. Re-pondération des stratégies perdantes

`frugale` est éliminée pour `instabilité_temporelle`. Ajouter un terme
correctif :
```
rank_frugale_v2(n, q) = rank_frugale(n, q) + β · temporal_resilience(n)
```
avec `β` croissant jusqu'à ce que `temp_stability ≥ 0.40` ou que la stratégie
perde sa spécificité (collision avec `temporal_survival`).

### 3. Spawn de stratégies nouvelles

Patterns observables qui suggèrent de nouvelles stratégies :
- `cadre_diversifie` : maximiser le nombre de `frames.local` distincts.
- `frontiere_sujet` : maximiser `topic_score` strict (pas de bonus latéral).
- `composition_dirigee` : pondérer `child_laws` × `S_global`.

### 4. Mort de stratégies

Si une stratégie est éliminée sur **N démos consécutives** (seuil à fixer,
ex. 10) par la même raison, la retirer du pool ou la fusionner avec
sa correction (cas 2).

## Méta-règles d'évolution

- Le nombre de stratégies actives reste borné (proposition : 4 ≤ N ≤ 12)
  pour garder un UI lisible (cards alignées).
- Toute nouvelle stratégie doit être **déterministe** (pas de RNG hors
  baseline-random).
- Toute évolution doit être **traçable** : chaque stratégie porte une
  version (`frugale_v2`) et un parent (`frugale_v1`).

## Statut actuel

**Aucun de ces mécanismes n'est implémenté**. Le code dans
`runtime_cognitive_path_competition_engine.py` contient un dict statique
`ROUTE_STRATEGIES` et aucune persistence de scores cross-runs. L'évolution
décrite ici est une feuille de route, pas un système actif. Pour être honnête :
sur 5 démos, on ne dispose pas encore d'assez de données pour calibrer
même une simple grille `α ∈ {0.2, 0.4, 0.6, 0.8}`.

## Garde-fou

Si le mécanisme d'évolution était implémenté, l'Oracle devrait élargir ses
critères pour éviter le **collapse vers un attracteur** : sinon toutes les
stratégies finiraient par converger vers un clone de `runtime_rapide`
(qui gagne déjà toutes les démos). Voir `AUTO_REFERENCE_PREVENTION.md`.
