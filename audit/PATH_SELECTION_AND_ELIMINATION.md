# PATH_SELECTION_AND_ELIMINATION — Spec

**Mission**: `ZORAN_RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE_20260516`
**Implémentation**: `tools/runtime_cognitive_path_competition_engine.py`
(fonction `oracle_eliminate`), `app/src/chat.js` (fonction `oracleEliminate`)
**Rapport runtime**: `audit/PATH_COMPETITION_REPORT.json`
**Cross-refs**: `RUNTIME_COGNITIVE_PATH_COMPETITION_ENGINE.md`,
`PATH_SURVIVAL_ANALYSIS.md`

## Oracle — critères d'élimination

Une route est éliminée si **au moins un** des 5 seuils est franchi :

| Critère | Seuil | Tag |
|---------|-------|-----|
| `hallucination_risk` > 0.55 | dépassement haut | `hallucination_excessive` |
| `noise_generated` > 0.55 | dépassement haut | `bruit_excessif` |
| `runtime_cost` > 0.80 | dépassement haut | `coût_runtime_excessif` |
| `runtime_path_efficiency` < 0.20 | dépassement bas | `gain_runtime_insuffisant` |
| `temporal_stability` < 0.40 | dépassement bas | `instabilité_temporelle` |

Une route éliminée reste affichée (carte grisée + raisons) mais ne peut PAS
gagner. Les raisons sont cumulatives — une route peut être éliminée pour
plusieurs raisons simultanément (cas non observé dans les 5 démos).

## Promotion

```
survivors = [r for r in routes if not r.eliminated]
survivors.sort(key=-selection_score)
winner = survivors[0] if survivors else None
```

Aucun seuil de promotion absolu : le winner est le **survivant le mieux
classé sur `selection_score`**. Si toutes les routes sont éliminées
(non observé), `winner = null` et l'UI affiche « aucun ».

## Taux d'élimination — runtime réel

5 questions démo × 6 routes = **30 routes générées**.

| Stratégie | Éliminée sur N démos | Raison constante |
|-----------|----------------------|------------------|
| `frugale` | 5/5 | `instabilité_temporelle` (temp ≈ 0.395 < 0.40) |
| `anti_hallucination` | 0/5 | — |
| `propagation_forte` | 5/5 | `bruit_excessif` (noise ≈ 0.558 > 0.55) |
| `temporal_survival` | 0/5 | — |
| `structurelle` | 0/5 | — |
| `runtime_rapide` | 0/5 | — |

**Total éliminé : 10 / 30 = 33 %**.

## Lecture des éliminations

- **`frugale`** maximise `frugality` ce qui sélectionne des micro-lois
  (GHUC-002-a-i etc.) avec très peu de résilience temporelle. C'est une
  vraie pathologie de l'optimisation mono-objectif.
- **`propagation_forte`** maximise `dependency_load + propag_cost`
  ce qui élit naturellement des lois bruyantes (noise ≈ 0.558).
  Là aussi pathologie d'objectif unique.
- **`runtime_rapide`** survit malgré `temp = 0.420` (juste au-dessus du
  seuil 0.40) parce que son ranking inclut `−propag_cost` qui exclut
  les pires lois bruyantes.

## Honnêteté

Les seuils Oracle (0.55, 0.80, 0.20, 0.40) sont **fixés à la main**, pas
appris ni dérivés. Ils sont choisis pour qu'au moins une route soit éliminée
sur le pool actuel — sinon le mécanisme « Oracle » serait théâtre. Le 33 %
d'élimination est donc un **résultat partiellement construit par les
seuils**, pas une découverte empirique. Si les seuils étaient `hallu > 0.70`
et `noise > 0.70`, le taux tomberait à ~0 %.
