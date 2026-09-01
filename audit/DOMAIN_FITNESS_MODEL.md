# DOMAIN_FITNESS_MODEL

- Mission ID : `ZORAN_RUNTIME_SPECIALIZATION_AND_RESPONSE_COMPLETION_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `ROUTE_SPECIALIZATION_ENGINE.md`,
  `COGNITIVE_SPECIALIZATION_RUNTIME.md`,
  `HYBRID_ROUTE_FUSION_ENGINE.md`,
  `COGNITIVE_SELECTION_ENGINE.md`
- Sources    : `app/src/route_specialization.js::computeDomainFitness`,
  `app/src/route_specialization.js::STRATEGY_PROFILE`,
  `app/src/route_specialization.js::rankRoutesByFitness`,
  `app/src/structural_mapping.js::STRUCTURE_PATTERNS` (clés cibles).

## 1. Why this mission exists

`shouldSkipRoute` a besoin d'un score scalaire `fitness ∈ [0, 1]` pour
décider en O(1) si une route est appelée ou skippée. Le problème est
de transformer un set de structures cognitives détectées dans la
question (ex. `['decision_action', 'risque', 'bornage']`) en une mesure
d'adéquation par route. Ce moteur définit la formule, justifie les
coefficients, et borne le score pour qu'il reste interprétable.

## 2. Formule canonique de `computeDomainFitness`

```
strong_hits = |detected ∩ profile.strong|
weak_hits   = |detected ∩ profile.weak|
total       = |detected|

fitness = 0.5 + (strong_hits / total) · 0.5 − (weak_hits / total) · 0.4
fitness = clamp(fitness, 0, 1)
```

Cas dégénérés :
- `detected` vide → retour direct `0.5` (route ni favorisée ni pénalisée).
- `STRATEGY_PROFILE[strategy]` absent → retour `0.5` (route inconnue,
  neutre par défaut).

## 3. Justification des coefficients

| Terme         | Valeur | Justification de design                                                                        |
|---------------|--------|------------------------------------------------------------------------------------------------|
| base          | `0.5`  | Point neutre. Une route sans signal ne doit ni être favorisée ni skippée par défaut.           |
| bonus strong  | `+0.5` | Match parfait (toutes structures dans `strong`) → fitness `1.0` (saturé). Encourage la spécialisation. |
| malus weak    | `−0.4` | Asymétrie volontaire : un weak hit pèse MOINS qu'un strong hit. On préfère faux-positif (route appelée à tort) au faux-négatif (route utile skippée). |
| seuil skip    | `0.30` | Une route avec ≥50% weak et 0 strong tombe à `0.5 − 0.5·0.4 = 0.30` — limite basse acceptable. |

Conséquence : avec 1 weak / 1 total, fitness = `0.5 − 0.4 = 0.10` →
skip ; avec 1 strong / 1 total, fitness = `0.5 + 0.5 = 1.0` → top.

## 4. Exemples concrets — BTP « supprimer murs porteurs »

Hypothèse : la question déclenche
`detected = ['decision_action', 'risque', 'causalite']` (action à
prendre, risque structurel, chaîne causale charges → effondrement).

**`structurelle`** (`strong = [propagation, temporalite, comparaison, contradiction, causalite]`,
`weak = [decision_action]`) :
```
strong_hits = 1  (causalite)
weak_hits   = 1  (decision_action)
fitness     = 0.5 + (1/3)·0.5 − (1/3)·0.4
            = 0.5 + 0.1667 − 0.1333
            ≈ 0.533
```
Note : si on ajoute `propagation` à `detected` (mur porteur → cascade),
fitness `structurelle` monte à ≈ `0.65` → top rang.

**`frugale`** (`strong = [decision_action, risque, bornage, compression_synthese]`,
`weak = [causalite, hypothese_cachee, comparaison]`) :
```
strong_hits = 2  (decision_action, risque)
weak_hits   = 1  (causalite)
fitness     = 0.5 + (2/3)·0.5 − (1/3)·0.4
            = 0.5 + 0.333 − 0.133
            ≈ 0.700
```
Sur la question « pure action terrain », `frugale` ≈ 0.70. Sur la
question « diagnostic systémique » (`causalite + propagation +
temporalite`), `frugale` retombe à ≈ `0.45`. Voir
`rankRoutesByFitness` pour la projection complète.

**Honest limits :**

- **Linéarité naïve** : la formule traite toutes les structures comme
  équipondérées. Une `contradiction` dominante ne pèse pas plus qu'un
  `bornage` accessoire.
- **Coefficients arbitraires** : `0.5 / +0.5 / −0.4` sont choisis pour
  rendre le scoring lisible et le seuil `0.30` actionnable, sans
  validation empirique (pas de dataset annoté de couples
  `(question → meilleure route)`).
- **Pas de pénalité pour structures hors `strong ∪ weak`** : une
  structure « neutre » pour la route n'apporte ni bonus ni malus mais
  dilue les ratios — effet de bord sous-spécifié.
- **`detected` provient de `structural_mapping.js`** : si le détecteur
  amont rate une structure dominante, tout le scoring est biaisé.
