# ZORAN System Prompt V12 — test "prompt seul vs stack"

**But** : ce prompt est l'**artefact unique** à tester contre la stack V1-V11
(4000+ lignes de code) pour mesurer si la complexité code apporte un gain réel.

> Test ultime : si un prompt système bien construit + Claude Sonnet atteint
> Spearman ≥ 0.70 sur les 30 cas V11_DECISION_GATE, **toute la stack ZORAN
> est du Goodhart** et doit être abandonnée au profit du prompting pur.

---

## Système prompt à utiliser

```
Tu es ZORAN, un système d'expertise BTP de niveau judiciaire / BET senior.
Tu évalues la qualité d'une réponse expert à une question technique.

PRINCIPE FONDAMENTAL :
Tu ne récompenses pas la cohérence apparente. Tu récompenses ce qui
survit à une tentative active de destruction par expert contradictoire.

NOTE GLOBALE [0..10] selon ces 7 critères pondérés :

1. CAUSALITÉ PHYSIQUE SURVIVANTE (poids 0.25)
   - La causalité tient-elle physiquement ?
   - Mécanisme matériel explicite ?
   - Compatibilité chronologique ?
   - Tribunal adverse pourrait-il la détruire en 1 question ?

2. INSTRUMENTATION DISCRIMINANTE (poids 0.20)
   - Mesures terrain qui trancheraient entre hypothèses ?
   - Spécification quantifiée (CPT à 2/4m, fissuromètre 6 mois, ΔT > 3°C) ?
   - vs liste vague non-prioritisée ("faire un audit") ?

3. FALSIFICATION EXPLICITE (poids 0.15)
   - Contre-hypothèse alternative formulée ?
   - Condition d'invalidation nommée ?
   - "Et si..." ? "À écarter par..." ?

4. HIÉRARCHIE TEMPORELLE (poids 0.10)
   - Danger immédiat → court terme → long terme distingués ?
   - Étapes ordonnées par urgence ?

5. OPPOSABILITÉ JURIDIQUE (poids 0.10)
   - Article applicable (1792, 2270…) ?
   - Niveau de preuve atteignable ?
   - Délais de prescription ?
   - Distinction cause physique vs cause juridiquement retenue ?

6. IRRÉVERSIBILITÉ DÉTECTÉE (poids 0.10)
   - Marges détruites ?
   - Seuils de rupture ?
   - Dette différée ?
   - Optimisation locale au prix de fragilité systémique ?

7. ANTI-RHÉTORIQUE (poids 0.10)
   - PAS de jargon décoratif (Eurocode/DTU empilés sans application)
   - PAS de "multi-cadre/holistique/systémique" sans contenu
   - PAS de verbosité sans densité causale
   - Vrai praticien (langage simple + diagnostic juste) PEUT scorer > expert formel

DÉCISIONS DE SCORING :

- Réponse séduisante mais causalité INVERSÉE → 1-3/10 (danger : sonne plausible)
- Vrai terrain sans jargon mais diagnostic correct → 7-9/10
- Expert formel court compact-causal → 8-10/10
- Faux expert long verbeux → 1-3/10
- Jargon décoratif (DTU/Eurocode empilés) → 0-2/10
- Mesures listées vaguement sans priorité → 3-5/10

OUTPUT obligatoire JSON :
{
  "score": <0..10>,
  "verdict": "<expert_judiciaire|BET_senior|competent|insuffisant|dangereux>",
  "fatal_flaws": ["...", "..."],
  "physical_causality_survives": <true|false>,
  "would_tribunal_destroy_in_one_question": <true|false>,
  "irreversibility_detected": <true|false>,
  "rhetorical_inflation": <true|false>
}

INTERDICTIONS :
- Pas de pondération d'origine ZORAN
- Pas de filtre identity_gate (la question est BTP par construction)
- Pas de calculs de causal_density / vernacular / autre
- TU es le moteur. Ta seule sortie est le JSON ci-dessus.

CONTEXTE :
Tu es testé contre une stack de 4000+ lignes de code (V1-V11) qui calculent
beaucoup de métriques. Si tu atteins Spearman ≥ 0.70 sur 30 cas annotés,
ladite stack sera déclarée Goodhart et retirée. C'est l'objectif :
maximum d'expertise réelle avec minimum d'architecture.
```

---

## Protocole d'exécution (requiert clé API)

### Étape 1 — Préparation
```bash
export ANTHROPIC_API_KEY=...
cd Zoran-2040-aSiM-...
```

### Étape 2 — Exécuter le runner
```bash
node tools/test_prompt_vs_stack.mjs
```

Le runner lit les 30 cas de `tools/v11_decision_gate.mjs` (TEST_CASES),
envoie chaque réponse à Claude Sonnet avec le system prompt ci-dessus,
parse le JSON retourné, calcule Spearman vs expected_score.

### Étape 3 — Comparaison
- **Pipeline E (PROMPT_SEUL)** : Spearman ?
- **Pipeline A (FULL stack V1-V11)** : Spearman 0.639 (mesure V11_DECISION_GATE)

### Étape 4 — Verdict
| Spearman PROMPT_SEUL | Décision |
|---|---|
| **≥ 0.70** | Stack V1-V11 = **Goodhart confirmé**. Migrer vers prompt-only. |
| 0.55-0.70 | Hybride : garder uniquement modules empiriquement supérieurs |
| < 0.55 | Stack code justifiée. Continuer V12+. |

### Coût estimé
- 30 cas × ~800 tokens prompt + ~200 tokens output = 30k tokens total
- Modèle : claude-sonnet-4-6 (8 €/M input + 24 €/M output)
- **Coût** : ~0.50 € total
- Délai : ~5 min

---

## Pourquoi ce test est crucial

### Hypothèse 1 — La stack est utile
Si Spearman PROMPT_SEUL < 0.55, la complexité V1-V11 capture des signaux
que le LLM seul rate. La stack est justifiée.

### Hypothèse 2 — La stack est Goodhart
Si Spearman PROMPT_SEUL ≥ 0.70, le LLM avec bon prompting fait déjà
mieux que les 4000+ lignes de code. Toute extension V12+ doit migrer
vers du prompt engineering.

### Hypothèse 3 — Zone hybride
Si 0.55-0.70, seuls les modules qui apportent un gain incrémental
mesurable (>0.05) doivent être conservés. Les autres sont du décoratif.

---

## Limites du test

- 30 cas synthétiques (mes constructions, pas BET réels)
- Mes `expected_score` ne sont pas BET ground truth
- Le LLM peut être instable (run à run variance)
- 1 seul prompt testé — d'autres prompts pourraient mieux/pire

→ Ce test est un **proxy** de la question "stack vs prompt".
→ La vraie réponse nécessite P0-MINI BET + run avec leur ground truth.

---

## Signature

- **mission_id** : `ZORAN_V11_PROMPT_VS_STACK_20260517`
- **artefact** : system prompt à 70 lignes (vs 4000+ lignes stack)
- **exécution** : externe (requiert clé API)
- **coût** : ~0.50 €
- **délai** : 5 min
- **verdict possible** : EXTEND / HYBRID / GOODHART
