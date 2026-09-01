# EXPERIMENTAL_CORE_ENGINE — Spec

**Mission**: `ZORAN_EXPERIMENTAL_CORE_CONTINUATION_20260516`
**Implémentation**: `tools/experimental_core_engine.py`
**Rapport runtime**: `audit/EXPERIMENTAL_CORE_REPORT.json`

## Principe

Une loi peut être *cohérente* (S_local OK) sans être *soutenable*
(coût propagé > utilité retournée). L'Experimental Core mesure la
**soutenabilité runtime** sur 5 dimensions et classe chaque loi dans
une des 5 classes d'usage.

## Scores injectés (5 par nœud)

| Score                     | Définition |
|---------------------------|------------|
| `runtime_sustainability`  | Capacité à supporter une charge runtime continue sans dégradation |
| `long_term_stability`     | Résistance à la dérive sur fenêtre temporelle étendue |
| `frugality_score`         | Ratio utilité / coût agrégé (utilisé aussi par velocity_score) |
| `collapse_sensitivity`    | Probabilité d'effondrement sous charge concurrente |
| `propagated_cost_curve`   | Forme de la courbe coût(profondeur) — linéaire / exponentielle |

## Classes (1 parmi 5)

| Classe                       | Profil                                       |
|------------------------------|----------------------------------------------|
| `fondatrice`                 | Frugale + stable + faible coût propagé       |
| `survivante`                 | Stable mais coûteuse                         |
| `frugale`                    | Frugale mais drift modéré                    |
| `runtime_critique`           | Lourde mais indispensable                    |
| `toxique_propagationnelle`   | Coût exponentiel sur la profondeur            |

## Affichage UI

Panneau `panel.js#experimentalBlock` : badge classe + 5 scores en grille
compacte (label / value / unité).

## Vérification empirique

Smoke test : `Sustainability sect. : présente | Frugality score : présente |
Classes badges : présente`.
