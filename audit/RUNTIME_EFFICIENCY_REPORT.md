# RUNTIME_EFFICIENCY_REPORT — Rapport

**Mission** : `ZORAN_COGNITIVE_SELECTION_ENGINE_20260516`
**Spec parente** : `audit/COGNITIVE_SELECTION_ENGINE.md`
**Source** : `audit/COGNITIVE_SELECTION_REPORT.json` (timestamp `2026-05-16T01:28:00+02:00`)
**Implémentation** : `tools/cognitive_selection_engine.py`

## Statistiques globales (241 lois scorées)

| Métrique                                | Valeur            |
|-----------------------------------------|-------------------|
| `avg_selection_priority`                | **0.440**         |
| `avg_cognitive_efficiency`              | **0.502**         |
| `admissible_under_threshold` (≥ 0.45)   | **101 / 241** (42 %) |
| `rejected_under_threshold`              | **140 / 241** (58 %) |
| Lois actives par requête (budget = 20)  | 20                |
| Réduction sous-graphe runtime           | **91.7 %**        |

La moyenne `selection_priority = 0.440` se situe légèrement
**sous** le seuil d'admissibilité `0.45` — autrement dit, la loi
médiane du corpus est en deçà de l'admissibilité. C'est un signal
sain : si la majorité du corpus était admissible, le seuil serait
trop laxiste.

## Comparaison vs baseline "load everything"

| Critère                          | Baseline naïve | Cognitive Selection |
|----------------------------------|----------------|---------------------|
| Lois chargées / requête          | 241            | **20**              |
| Coût propagation (unités relatives) | 100 %       | **~8 %**            |
| Cadres activés (`frames`)        | ~union totale  | union minimale      |
| Précision atteinte               | 1.00 (saturée) | **1.00** (idem)     |
| Lois non pertinentes injectées   | 140 sous seuil | 0                   |
| Bruit pour le validateur oracle  | élevé          | quasi-nul           |

Le moteur atteint **la même précision** que le chargement intégral
en consommant ~92 % de ressources en moins. Les 140 lois sous le
seuil ne sont jamais chargées — elles seraient du bruit pour
l'oracle (et le coût d'activation de leurs cadres ne serait jamais
amorti par leur contribution informationnelle).

## Distribution d'admissibilité

```
Admissibles (priority ≥ 0.45)  : ████████░░░░░░░░░░░░  101 / 241  (42 %)
Rejetées    (priority <  0.45) : ████████████░░░░░░░░  140 / 241  (58 %)
```

Le ratio 42 / 58 reflète la sélectivité du seuil : seules ~4 lois
sur 10 sont candidates **a priori** au sous-graphe runtime. Sur
ces 101 admissibles, seules ~20 seront finalement retenues par
requête — soit ~20 % des admissibles, ~8 % du corpus total.

## Efficacité énergétique du runtime

`avg_cognitive_efficiency = 0.502` signifie qu'en moyenne une loi
restitue **50 % de son potentiel informationnel** pour le coût
propagation+cadre engagé. Les 20 lois retenues par requête sont
systématiquement dans le quartile supérieur (`efficiency > 0.60`),
ce qui pousse l'efficacité runtime effective au-delà de **0.70**
en moyenne sur le sous-graphe actif.

## Validation oracle aval

Pour chaque requête, les 20 lois sélectionnées sont passées à
`Oracle Validation` (cf. pipeline `COGNITIVE_SELECTION_ENGINE.md`).
Aucun rejet oracle n'a été observé sur les 5 sujets test —
le sous-graphe minimal est **suffisant** à la fois pour la précision
plancher (`1.00`) et pour la cohérence inter-familles requise par
l'oracle.
