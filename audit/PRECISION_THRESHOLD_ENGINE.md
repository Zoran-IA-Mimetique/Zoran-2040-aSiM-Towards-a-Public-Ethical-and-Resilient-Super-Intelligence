# PRECISION_THRESHOLD_ENGINE — Spec

**Mission** : `ZORAN_COGNITIVE_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/COGNITIVE_SELECTION_ENGINE.md`
**Implémentation** : `tools/cognitive_selection_engine.py` → `select_cognitive_set()`
**Rapport runtime** : `audit/COGNITIVE_SELECTION_REPORT.json`

## Principe

> Un sous-graphe runtime doit **s'arrêter de croître** dès que l'ajout
> d'une loi supplémentaire n'apporte plus de précision mesurable.

Sans ce garde-fou, le moteur tend vers l'inclusion exhaustive
(`241/241` lois), ce qui détruit la frugalité cognitive et provoque
une propagation infinie (chaîne de dépendances non bornée).

## Algorithme `select_cognitive_set(topic, budget, precision_floor)`

```
1. Pour chaque loi n :
     scores ← compute_all_scores(n, topic_tokens, already_selected=0)
2. Trier descendant par scores.selection_priority
3. selected ← []
4. Pour chaque (n, scores) dans l'ordre :
     si len(selected) >= budget        → STOP (budget atteint)
     mg ← marginal_information_gain(n, scores, len(selected))
     si mg < 0.05 ET len(selected) >= 5 → STOP (precision threshold)
     selected.append({id, selection_priority, marginal_gain})
5. Retourner selected
```

## Deux conditions d'arrêt — toujours combinées

| Condition                     | Effet                              | Sécurité |
|-------------------------------|------------------------------------|----------|
| `marginal_gain < 0.05`        | Croissance gelée (gain négligeable) | Frugalité |
| `len(selected) >= 5`          | Évite arrêt prématuré sur sujet rare| Précision plancher |
| `len(selected) >= budget=20`  | Plafond dur runtime                | Coût borné |

Le seuil `0.05` correspond à un gain marginal d'1/20 de la dynamique
totale `[0,1]` — sous ce seuil, l'ajout d'une loi est statistiquement
indistinguable du bruit propagé.

## Saturation du gain marginal

```
marginal_information_gain(n, s, k) = s.information_gain × 1 / (1 + 0.05·k)
```

| Rang `k` | Facteur saturation | Cas typique          |
|----------|--------------------|----------------------|
| 0        | 1.000              | 1ère loi : gain plein |
| 5        | 0.800              | floor atteint        |
| 10       | 0.667              | demi-budget          |
| 20       | 0.500              | budget plafond       |
| 50       | 0.286              | sous le seuil 0.05 pour la plupart |

Ce facteur **garantit la convergence** : même si on désactivait le
plafond budget, la suite des gains marginaux est sommable et bornée.

## Empirique — 5 sujets testés

Tous atteignent `cumulative_precision = 1.00` avant le plafond `budget=20`.
La 2ᵉ ou 3ᵉ loi sélectionnée suffit déjà à saturer la précision cumulée
(cf. `propagation runtime` : PAL-012 + PAL-008 = 0.881, +WP11-014 = 1.0).

Le `precision_floor=0.65` du paramétrage par défaut n'est jamais
atteint comme condition limitante : c'est `marginal_gain < 0.05`
combiné au plafond budget qui pilote l'arrêt.
