# RESPONSE_GRADING_SYSTEM

- Mission ID : `ZORAN_RUNTIME_RESPONSE_RANKING_AND_ARGUMENTED_SCORING_20260516`
- Date       : 2026-05-16
- Cross-refs : `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `RUNTIME_QUALITY_EVALUATION.md`, `BENCHMARK_ARGUMENTATION_PROTOCOL.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`
- Sources    : `app/src/llm.js::judgeResponses` (bloc
  *« NOTE /20 ARGUMENTÉE — argumented_grade_20 »*),
  `app/src/superiority.js::renderComparison` (helper `gradeClass`,
  classe CSS `.sup-ranking-grade`).

## 1. Why a /20 scale and not [0..1]

Les huit scores juge de `RUNTIME_QUALITY_EVALUATION.md` sont des nombres
flottants `[0..1]` — utiles pour l'agrégation, illisibles pour un
humain. Le user français lit naturellement *« 17.5/20 »* et le compare à
sa propre intuition scolaire en une fraction de seconde. La note
`argumented_grade_20` est donc une **interface humaine**, pas un
sur-score statistique : elle est imposée au juge dans le prompt, pas
calculée à partir des huit axes.

C'est volontaire — le juge peut, et doit, pondérer différemment selon
le domaine (pour une question médicale, hallucination compte plus que
compression ; pour une question express opérationnelle, l'actionability
prime).

## 2. Barème imposé par prompt (`judgeResponses` system)

```
18-20  excellent et actionnable
15-17  bon
12-14  moyen
 8-11  faible (jargon excessif, trop abstrait, peu actionnable)
≤ 7    inutile
```

Règles explicites du prompt :

- *« Pas arbitraire. Doit correspondre à l'aide concrète apportée au
  user. »*
- *« Une réponse très cohérente et fascinante sans utilité concrète
  PERD. »*
- *« Justification obligatoire »* — toute note doit s'appuyer sur les
  `strengths` / `weaknesses` que le juge a lui-même produites.

## 3. Color coding UI — `gradeClass(g)`

Helper pur dans `renderComparison` :

```js
gradeClass = g => {
  if (g == null) return '';
  if (g >= 18) return 'grade-excellent';   // vert
  if (g >= 15) return 'grade-good';        // bleu
  if (g >= 12) return 'grade-mid';         // jaune
  if (g >= 8)  return 'grade-low';         // orange
  return 'grade-bad';                      // rouge
};
```

Les classes sont appliquées sur `<span class="sup-ranking-grade">`
de chaque carte du `rankingBlock`. Une note nulle ou non parsée
produit une chaîne vide (rendu neutre, pas une couleur trompeuse).

## 4. Anti-arbitrary rules

Le prompt empile trois protections contre une note tirée du chapeau :

1. **Vocabulaire interdit** dans les justifications : `fascinant`,
   `intéressant`, `élégant`, `très cohérent`. Voir
   `BENCHMARK_ARGUMENTATION_PROTOCOL.md` §2.
2. **Faiblesse obligatoire même sur le winner** : pas de carte sans
   au moins un `weaknesses[0]`. Garde-fou anti-favoritism.
3. **`verdict_reason` obligatoire** : une phrase argumentant *pourquoi*
   ce candidat gagne ; affiché en italique sous le bandeau verdict.

## 5. Honest limits

- **Barème prompt-only** : aucun étalonnage psychométrique, pas de
  dataset annoté humain, pas de cohérence inter-runs garantie.
- **Note non reproductible** : la même question rejouée peut produire
  16.5 puis 17.5 selon la température et l'ordre des candidats.
- **Échelle française biaisée vers le centre** : Claude tend à donner
  13-17, rarement 19 ou 5. Tri utile mais écart absolu à lire avec
  prudence.
- **Color coding subjectif** : seuils 18 / 15 / 12 / 8 alignés sur la
  grille scolaire française, sans validation empirique.
- **Pas de comparabilité inter-questions** : un 16/20 BTP ≠ un 16/20
  médical. Tri valide seulement à l'intérieur d'une même comparaison.
