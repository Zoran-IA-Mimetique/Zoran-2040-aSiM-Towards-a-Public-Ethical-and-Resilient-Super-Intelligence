# BENCHMARK_ARGUMENTATION_PROTOCOL

- Mission ID : `ZORAN_RUNTIME_RESPONSE_RANKING_AND_ARGUMENTED_SCORING_20260516`
- Date       : 2026-05-16
- Cross-refs : `ARGUMENTED_RUNTIME_RANKING_ENGINE.md`,
  `RESPONSE_GRADING_SYSTEM.md`, `RUNTIME_QUALITY_EVALUATION.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`,
  `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `WINNER_SELECTION_EXPLAINABILITY.md`, `ANTI_JARGON_PROTOCOL.md`
- Sources    : `app/src/llm.js::judgeResponses` (bloc *« JUSTIFICATION
  OBLIGATOIRE »* + lignes *« INTERDIT »* / *« OBLIGATOIRE »*),
  `app/src/superiority.js::renderComparison` (rendu `verdict_reason`,
  classe `sup-arg-weaknesses`).

## 1. Goal — sortir du verdict opaque

Avant cette mission, `judgeResponses` produisait un `verdict` nu
(label du gagnant) plus quatre scores quantitatifs. Aucune phrase
justifiait *pourquoi*. Cette spec décrit les **règles d'argumentation
imposées au juge** par le system prompt pour éviter trois pathologies :
promotion creuse, favoritisme de l'auteur (ZORAN se juge), opacité du
verdict.

## 2. Règle 1 — vocabulaire interdit (anti-promotion)

Encodée littéralement :

```
INTERDIT : "réponse très cohérente et fascinante", "intéressant", "élégant".
```

Termes étendus en pratique : *fascinant(e)*, *intéressant(e)*,
*élégant(e)*, *très cohérent(e)*, *remarquable*, *brillant*,
*impressionnant*. Ces adjectifs sont des **marqueurs de promotion
vide** : ils décorent la justification sans informer. Le prompt les
bannit pour forcer des `strengths` factuelles (*« cite Consuel »*,
*« 3 phrases denses »*, *« acteur BET nommé »*) au lieu d'éloges.

**Limite** : aucun post-filtre ne rejette une justification contenant
ces mots. Un user qui voit *« fascinant »* dans un chip doit considérer
le juge non-conforme et relire manuellement.

## 3. Règle 2 — faiblesse obligatoire (anti-favoritism)

Encodée littéralement :

```
OBLIGATOIRE : pointer une faiblesse réelle même sur le winner.
```

`scores[i].weaknesses` ne doit jamais être vide, **même pour le
candidat à `argumented_grade_20` le plus élevé**. Sans cette règle, le
juge LLM produit des cartes winner avec `weaknesses = []` — biais de
complaisance documenté chez les modèles d'instruction.

Le rendu UI matérialise la règle par la bande orange *« ✗ Faibles »*
dans chaque carte `rankingBlock`, y compris la `.winner`. Carte sans
cette bande = signal d'alerte (juge désobéi ou tronqué par
`maxTokens = 2500`).

## 4. Règle 3 — `verdict_reason` obligatoire

Le contrat JSON exige un champ `verdict_reason` au niveau racine,
distinct des `scores[i].comment`. C'est **la phrase qui justifie le #1
vs #2**. Exemple cible :

```
"verdict": "ZORAN Frugale",
"verdict_reason": "Réponse compacte et directement actionnable
                   (étude structure, BET, IPN)"
```

Rendu dans `renderComparison` en italique gris sous le bandeau
*« ★ Verdict »*. Si le juge omet le champ, la ligne n'est pas rendue —
absence silencieuse. Limite : un user pressé peut ne pas remarquer
qu'aucune justification n'a été fournie.

## 5. Honest limits

- **Enforcement prompt-only** : trois règles dépendantes du modèle.
  Aucun parseur ne vérifie l'absence des adjectifs, l'existence de
  `weaknesses[0]`, ou la présence de `verdict_reason`.
- **Profondeur dépendante du modèle** : Haiku produit des
  `verdict_reason` lapidaires inutiles ; Opus substantiels. Modèle par
  défaut `claude-sonnet-4-6` via `getModel()`.
- **Faiblesses cosmétiques** : forcer `weaknesses[0]` sur le winner
  peut produire des reproches artificiels (*« encore plus court »*).
- **Pas de double-juge** : un seul appel, pas de cross-validation.
  Garde-fou *prompt*, pas *validation empirique*.
- **Pas de log structuré des violations** : un *« fascinant »* dans
  `strengths[0]` n'est pas compté. Audit manuel mensuel à faire.
