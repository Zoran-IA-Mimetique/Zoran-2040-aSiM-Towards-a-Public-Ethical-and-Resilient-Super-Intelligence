# CTA_PRIORITY_ENGINE — Spec du moteur de priorisation

mission : ZORAN_CTA_CLICKABLE_RUNTIME_V13_20260517
fichier : `app/src/cta_priority_engine.js`

## Contrainte SDE-029

> **Maximum** : 1 CTA principal + 1 CTA secondaire + 1 CTA falsification.

Au-delà, dégradation attentionnelle observée empiriquement. Le moteur
applique ce cap **dur** sur la sortie LLM, indépendamment du nombre de
markers émis. Les CTAs hors quota sont démotés en texte simple (label seul).

## Scoring

```
score = SCORE_BY_CRIT[crit] × SCORE_BY_TYPE[type] + richness × 0.1
```

| Composante | Valeurs |
|---|---|
| `SCORE_BY_CRIT.high` | 3 |
| `SCORE_BY_CRIT.medium` | 2 |
| `SCORE_BY_CRIT.low` | 1 |
| `SCORE_BY_TYPE.falsif` | 1.8 |
| `SCORE_BY_TYPE.risque` | 1.5 |
| `SCORE_BY_TYPE.juridique` | 1.5 |
| `SCORE_BY_TYPE.terrain` | 1.2 |
| `SCORE_BY_TYPE.monitor` | 1.0 |
| `SCORE_BY_TYPE.action` | 0.8 |
| `richness` | nombre de champs cout/delai/preuve/risque/detail remplis |

Falsif > risque > juridique > terrain > monitor > action.
Le bonus richness évite que deux CTAs de même type/crit aient un score
identique : celui qui a le plus de champs gagne.

## Algorithme de sélection

```
1. Slot FALSIFICATION : top-score parmi tous les CTAs type='falsif'
2. Slot PRINCIPAL : top-score parmi non-falsif restants
3. Slot SECONDAIRE : top-score parmi non-falsif restants,
   préférence pour un TYPE DIFFÉRENT du principal
```

Diversification de type au slot secondaire : évite "2 terrain" ; force
une couverture multi-facette (terrain + juridique, terrain + monitor, etc.).

## Sortie

```js
{
  keep: [cta1, cta2, cta3],   // ≤ 3, dans l'ordre d'apparition originale
  drop: [...]                  // démotés en texte simple
}
```

Chaque `keep[i]` reçoit `cta._slot ∈ {principal, secondaire, falsification}`.
Le slot est exposé en classe CSS (`cta-slot-principal`) sur le bouton et en
badge dans le popup ("Principal", "Secondaire", "Falsification").

## Test runtime

Entrée : 5 CTAs (terrain×2, falsif, juridique, monitor) avec criticités mixtes.

Sortie observée (cta_v13_runtime_check test 1) :

| Label | Type | Crit | Slot | Décision |
|---|---|---|---|---|
| Étude G2 PRO | terrain | high | secondaire | keep |
| Jauges Saugnac | monitor | medium | — | **drop** (texte) |
| Déclaration assurance | juridique | high | principal | keep |
| Hypothèse fuite réseau | falsif | medium | falsification | keep |
| Option décorative | action | low | — | **drop** (texte) |

Vérifie : diversification (terrain + juridique + falsif, 3 types distincts),
respect du cap (3 buttons / 5 markers), démotion silencieuse (texte préservé).

## Démotion vs suppression

Choix : **démotion en texte simple** plutôt que suppression. Justification :
- Suppression = perte d'information potentiellement utile.
- Démotion = info préservée mais affordance dégradée → l'utilisateur lit
  toujours "Jauges Saugnac" en texte, juste pas cliquable.
- Antifragile : si le LLM produit accidentellement 4 CTAs, l'expérience
  utilisateur reste cohérente.

## Gaps

- Le scoring n'utilise pas la pertinence sémantique (un CTA hors-sujet
  avec crit=high gagne sur un CTA pertinent crit=medium). Acceptable car le
  LLM est censé filtrer en amont.
- Pas de mémorisation cross-réponses (un même type de CTA peut dominer
  toutes les réponses consécutives). À surveiller via métriques.
