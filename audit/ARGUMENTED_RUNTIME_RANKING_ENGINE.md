# ARGUMENTED_RUNTIME_RANKING_ENGINE

- Mission ID : `ZORAN_RUNTIME_RESPONSE_RANKING_AND_ARGUMENTED_SCORING_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `RESPONSE_GRADING_SYSTEM.md`, `RUNTIME_QUALITY_EVALUATION.md`,
  `PRACTICAL_RELEVANCE_SCORING.md`, `ACTIONABILITY_ANALYSIS.md`,
  `BENCHMARK_ARGUMENTATION_PROTOCOL.md`, `ANTI_JARGON_PROTOCOL.md`
- Sources    : `app/src/llm.js::judgeResponses`,
  `app/src/superiority.js::runSuperiorityComparison`,
  `app/src/superiority.js::renderComparison` (bloc `rankingBlock`,
  helper `gradeClass`).

## 1. Why this mission exists

Le verdict produit par `RUNTIME_SUPERIORITY_ENGINE` était une chaîne
opaque : *« verdict : ZORAN Frugale »*. Aucune raison, aucun point
fort, aucun point faible, aucune note compréhensible par un humain. Le
user devait croire le juge sur parole. Cette mission remplace cette
boîte noire par un **classement argumenté /20** où chaque candidat
reçoit une note explicite, 1–3 forts concrets, 1–3 faibles concrets,
deux flags binaires (bruit / hallu) et un commentaire de synthèse.

## 2. Contrat JSON renvoyé par `judgeResponses`

Forme stricte (parser tolérant via `r.text.match(/\{[\s\S]*\}/)`) :

```json
{
  "verdict": "ZORAN Frugale",
  "verdict_reason": "Réponse compacte et directement actionnable (étude structure, BET, IPN)",
  "reformulation_divergence": 0.45,
  "response_divergence": 0.62,
  "scores": [{
    "label": "ZORAN Frugale",
    "precision": 0.85, "hallucination": 0.10, "noise": 0.15, "coherence": 0.80,
    "actionability_score": 0.95, "practical_relevance": 0.90,
    "compression_quality": 0.95, "semantic_delta": 0.30,
    "argumented_grade_20": 17.5,
    "strengths": ["compact", "actionnable", "vocabulaire BTP correct"],
    "weaknesses": ["pas de mention de Consuel"],
    "noise_detected": "", "hallucination_risk": "",
    "comment": "Référence solide, courte, immédiatement actionnable."
  }]
}
```

Les huit scores `[0..1]` sont détaillés dans
`RUNTIME_QUALITY_EVALUATION.md`. La note `argumented_grade_20` est
décrite dans `RESPONSE_GRADING_SYSTEM.md`.

## 3. UI — bloc `rankingBlock` (priorité HAUTE)

`renderComparison` injecte une `<details open>` juste après le bandeau
verdict, contenant les cartes triées par `argumented_grade_20` desc :

```
sortedByGrade = [...deltas].sort(
  (a, b) => (b.argumented_grade_20 ?? 10 + b.runtime_superiority*10)
          - (a.argumented_grade_20 ?? 10 + a.runtime_superiority*10))
```

Chaque carte porte : `#rang` + label + note `XX.X/20` colorée via
`gradeClass(grade)` ; bande verte `✓ Forts` (chips, 1–3) ; bande orange
`✗ Faibles` (chips, 1–3) ; flag jaune `▣ Bruit détecté` si non vide ;
flag rouge `⚠ Hallu risk` si non vide ; ligne métriques compacte
*actionable / pratique / compression / jargon / concret*. Le #1 reçoit
la classe `winner`, la baseline la classe `baseline` quel que soit son
rang.

## 4. Honest limits

- **LLM-as-judge** : le juge est Claude — auto-préférence et biais
  stylistique restent réels, déplacés d'un verdict opaque vers une
  argumentation détaillée qui peut elle-même être biaisée.
- **Grade /20 non calibré** : barème §2 de `RESPONSE_GRADING_SYSTEM`
  imposé par prompt, sans étalonnage inter-annotateurs ni dataset.
- **Enforcement par prompt seul** : règles « INTERDIT fascinant » et
  « OBLIGATOIRE pointer une faiblesse même sur le winner » dépendent
  du respect du prompt. Aucun post-filtre.
- **Profondeur dépendante du modèle** : Haiku produit des chips
  superficiels, Opus plus discriminant. Relecture user obligatoire.
- **JSON parsing faillible** : objet mal formé → `judge = null` et
  `rankingBlock` retombe sur le fallback `runtime_superiority`.
