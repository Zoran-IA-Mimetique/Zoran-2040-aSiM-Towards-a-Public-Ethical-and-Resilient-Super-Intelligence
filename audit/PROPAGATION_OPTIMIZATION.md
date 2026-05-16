# PROPAGATION_OPTIMIZATION — Spec

**Mission** : `ZORAN_COGNITIVE_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/COGNITIVE_SELECTION_ENGINE.md`
**Spec liée** : `audit/RUNTIME_BUDGET_MODEL.md`, `audit/DEPENDENCY_PROPAGATION_MODEL.md`
**Implémentation** : `tools/cognitive_selection_engine.py` → `propagation_efficiency()`

## Formule

```
propagation_efficiency(n) = clamp01(
    runtime_precision_gain(n)
  − 0.50 · runtime_cost_ratio(n)
  + 0.20
)
```

L'offset `+0.20` garantit un plancher non nul même pour les lois
légèrement déficitaires en gain net — sans cet offset, des lois
utiles mais coûteuses seraient écrasées à zéro et invisibles au
score final.

`propagation_efficiency` pèse **25 %** dans `selection_priority` :

```
selection_priority = 0.35·runtime_priority
                   + 0.25·propagation_efficiency
                   + 0.20·topic_relevance
                   + 0.20·minimum_precision_contribution
```

## Classement des lois par efficacité

| Régime                              | `precision_gain` | `cost_ratio` | `efficiency` | Sort       |
|-------------------------------------|------------------|--------------|--------------|------------|
| Haute précision, cadres légers      | 0.80             | 0.20         | 0.90         | **prioritaire** |
| Précision moyenne, cadres moyens    | 0.50             | 0.50         | 0.45         | retenue    |
| Précision basse, cadres lourds      | 0.30             | 0.80         | 0.10         | **skip**   |

Une loi à `efficiency < 0.20` est de fait écartée même si son
`topic_relevance` est élevé : le poids combiné via `runtime_priority`
(qui pénalise déjà `frame_dependency_cost` à −10 %) la repousse
sous le seuil `0.45` d'admissibilité.

## Cas observé — sujet `propagation runtime`

Top 3 retenues (rapport 2026-05-16) :

| Loi         | `selection_priority` | `marginal_gain` |
|-------------|----------------------|-----------------|
| `PAL-012`   | 0.428                | 0.449           |
| `PAL-008`   | 0.399                | 0.432           |
| `WP11-014`  | 0.397                | 0.562           |

Ces 3 lois saturent la précision cumulée à `1.00` dès le 3ᵉ ajout.
Elles partagent un profil `efficiency` élevé : précision gain ≈ 0.55
pour un coût ≈ 0.35, soit un ratio ~1.6. Les 17 suivantes restent
sous le budget mais voient leur `marginal_gain` décroître
progressivement (saturation × `1/(1+0.05·n)`).

## Lois écartées malgré la pertinence

Cas typique : une loi avec `topic_relevance = 0.6` mais
`runtime_cost_ratio = 0.85` produit
`efficiency ≈ 0.6 − 0.425 + 0.20 = 0.375` → contribution finale
au `selection_priority` ≈ `0.094`. Combiné aux autres composantes,
cela tombe généralement sous `0.45` → rejet seuil. C'est pourquoi
**140 lois sur 241 (58 %)** sont structurellement non admissibles :
leur cadre est trop lourd au regard de leur précision gain.

Cette asymétrie est volontaire — elle traduit le principe de
**frugalité cognitive** : mieux vaut une loi moyennement pertinente
mais légère qu'une loi très pertinente mais ruineuse en propagation.
