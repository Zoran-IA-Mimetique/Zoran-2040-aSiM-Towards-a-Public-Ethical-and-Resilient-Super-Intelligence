# FRUGALITY_SELECTION_SYSTEM — Spec

**Mission**: `ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516`
**Implémentation**: `tools/noise_minimization_engine.py` — fonction `frugality_ratio()`
**Specs liées**: `audit/NOISE_MINIMIZATION_ENGINE.md`, `audit/PROPAGATION_COST_FILTER.md`

## Formule

```
frugality_ratio = max(0, runtime_gain) / (propagation_cost + noise_contribution) + 0.10
clamp [0.0, 1.0]
prop_cost et noise sont chacun plancher-clampés à 0.05 pour éviter la division
```

Lecture : combien de gain runtime une loi délivre **par unité de coût total**
(propagation + bruit injecté). Plus le ratio est haut, plus la loi est frugale.

## Seuil de décision

```
frugality_ratio ≥ 0.30  →  porte ouverte (sous-critère de keep_runtime)
frugality_ratio < 0.30  →  reject automatique (peu importe S/N et rg)
```

Le seuil 0.30 a été calibré pour que les lois fondatrices à propagation extrême
(GHUC-001, DVE-001, ULG-001 — toutes à `frugality_ratio = 0.10`, plancher absolu)
soient systématiquement écartées du runtime par défaut.

## Top lois frugales (extrait runtime)

Toutes les lois du top 10 S/N atteignent `frugality_ratio = 1.000` (plafond) :

| ID              | runtime_gain | noise | frugality |
|-----------------|--------------|-------|-----------|
| UDE-030         | +0.628       | 0.113 | 1.000     |
| SDE-028         | +0.618       | 0.112 | 1.000     |
| SDE-002-b-i     | +0.615       | 0.113 | 1.000     |
| UDE-028         | +0.632       | 0.126 | 1.000     |
| WP11-002-b-i    | +0.613       | 0.131 | 1.000     |
| WP11-002-a-i    | +0.615       | 0.133 | 1.000     |

Profil commun : faible propagation, gain runtime > 0.60, bruit < 0.15.
Ce sont les lois **idéalement chargeables** sans aucun coût marginal perceptible.

## Top lois NON-frugales (sample rejected)

| ID       | runtime_gain | noise | frugality | verdict             |
|----------|--------------|-------|-----------|---------------------|
| GHUC-001 | −0.105       | 0.665 | 0.100     | floor (plancher)    |
| DVE-001  | −0.065       | 0.614 | 0.100     | floor (plancher)    |
| ULG-001  | −0.026       | 0.561 | 0.100     | floor (plancher)    |
| WP11-001 | +0.081       | 0.533 | 0.178     | sous seuil 0.30     |
| UDE-001  | +0.038       | 0.552 | 0.133     | sous seuil 0.30     |

Le plancher `0.10` est l'offset additif de la formule : une loi à gain nul ou
négatif obtient mécaniquement le minimum, sans jamais descendre plus bas.

## Pourquoi la frugalité est le critère le plus prédictif

Avg `frugality_ratio` sur le graphe entier = **0.724** — distribution très
bimodale :

- Pic haut (~1.0) : lois feuilles SDE/UDE, ~60 % du graphe
- Pic bas (~0.10–0.20) : lois fondatrices propagantes, ~30 % du graphe
- Zone intermédiaire (0.30–0.70) : ~10 % du graphe

La frugalité **collapse** runtime_gain et noise_contribution en une seule
métrique économique : c'est le ratio que le moteur utilise pour trancher quand
S/N et rg sont ambigus. Sur les 94 lois rejetées, **93 échouent sur frugality**
(et 1 uniquement sur runtime_gain négatif sans échec frugality — cas marginal).
La frugalité est donc en pratique **le critère bloquant principal**.

## Lien avec runtime budget

La frugalité est l'inverse implicite du coût marginal d'ajout : ajouter une loi
à `frugality_ratio = 1.0` au runtime coûte ≈ 0 ; ajouter une loi à `0.10` coûte
≈ 10× son gain. Le moteur peut donc être lu comme un **optimiseur budgétaire** :
maximise la somme des gains sous contrainte que chaque terme ait un ratio
gain/coût ≥ seuil.
