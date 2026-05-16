# ARGUMENTED_RUNTIME_RANKING_ENGINE

- Mission ID : `ZORAN_RUNTIME_RESPONSE_RANKING_AND_ARGUMENTED_SCORING_20260516`
- Date       : 2026-05-16
- Cross-refs : `RUNTIME_SUPERIORITY_ENGINE.md`,
  `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `RESPONSE_GRADING_SYSTEM.md`, `RUNTIME_QUALITY_EVALUATION.md`,
  `PRACTICAL_RELEVANCE_SCORING.md`, `ACTIONABILITY_ANALYSIS.md`,
  `BENCHMARK_ARGUMENTATION_PROTOCOL.md`, `ANTI_JARGON_PROTOCOL.md`
- Sources    : `app/src/llm.js::judgeResponses`,
  `app/src/superiority.js::runSuperiorityComparison` (deltas enrichis),
  `app/src/superiority.js::renderComparison` (bloc `rankingBlock`,
  helper `gradeClass`).

## 1. Why this mission exists

Le verdict produit par le pipeline parent (`RUNTIME_SUPERIORITY_ENGINE`)
était une chaîne opaque : *« verdict : ZORAN Frugale »*. Aucune raison,
aucun point fort, aucun point faible, aucune note compréhensible par un
humain. Le user devait croire le juge sur parole.

Cette mission remplace cette boîte noire par un **classement argumenté
/20** où chaque candidat reçoit (a) une note explicite, (b) 1–3 points
forts concrets, (c) 1–3 points faibles concrets, (d) deux flags binaires
(bruit / risque d'hallucination) et (e) un commentaire de synthèse. Le
verdict est lui-même justifié par `verdict_reason`.

## 2. Contrat JSON renvoyé par `judgeResponses`

Forme stricte attendue (le parser tolère du markdown autour mais extrait
le premier objet JSON via `r.text.match(/\{[\s\S]*\}/)`) :

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
    "noise_detected": "",
    "hallucination_risk": "",
    "comment": "Référence solide, courte, immédiatement actionnable."
  }]
}
```

Les huit scores numériques `[0..1]` sont décrits en détail dans
`RUNTIME_QUALITY_EVALUATION.md`. La note `argumented_grade_20` est
décrite dans `RESPONSE_GRADING_SYSTEM.md`.

## 3. UI — bloc `rankingBlock` (priorité HAUTE)

Dans `renderComparison`, juste après le bandeau verdict et avant le
tableau des deltas, on injecte une `<details open>` contenant les cartes
triées par `argumented_grade_20` décroissant :

```
sortedByGrade = [...deltas].sort(
  (a, b) => (b.argumented_grade_20 ?? fallback(b))
          - (a.argumented_grade_20 ?? fallback(a))
)
```

Le fallback est `10 + runtime_superiority * 10` pour garder un ordre
stable si le juge a omis la note. Chaque carte porte :

- `#rang` + label + note `XX.X/20` colorée via `gradeClass(grade)`
- bande verte `✓ Forts :` (chips `strengths`, 1–3)
- bande orange `✗ Faibles :` (chips `weaknesses`, 1–3)
- flag jaune `▣ Bruit détecté` si `noise_detected` non vide
- flag rouge `⚠ Hallu risk` si `hallucination_risk` non vide
- ligne métriques compacte : *actionable / pratique / compression /
  jargon / concret*

La carte du #1 reçoit la classe `winner`. La baseline (Claude brut)
reçoit la classe `baseline` indépendamment de son rang.

## 4. Honest limits

- **LLM-as-judge** : le juge est Claude. Auto-préférence et biais de
  cohérence stylistique restent réels, simplement déplacés d'un verdict
  opaque vers une argumentation détaillée — qui peut elle-même être
  biaisée.
- **Grade /20 non calibré empiriquement** : le barème §2 de
  `RESPONSE_GRADING_SYSTEM.md` est imposé par prompt. Aucun étalonnage
  inter-annotateurs, aucun dataset de référence. Deux runs successifs
  sur la même question peuvent produire des notes différentes.
- **Enforcement par prompt seul** : les règles « INTERDIT fascinant /
  intéressant / élégant » et « OBLIGATOIRE pointer une faiblesse même
  sur le winner » dépendent entièrement du respect du prompt par le
  modèle. Aucun post-filtre ne rejette une justification non conforme.
- **Profondeur dépendante du modèle** : Haiku produit des
  `strengths` / `weaknesses` souvent superficiels ou redondants. Opus
  est plus discriminant. Le user doit toujours relire les
  justifications avant de leur faire confiance.
- **JSON parsing tolérant mais faillible** : si le juge renvoie un
  objet mal formé, `judge` vaut `null` et tout le bloc `rankingBlock`
  retombe sur le fallback `runtime_superiority`.
