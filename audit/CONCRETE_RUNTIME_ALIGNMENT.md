# CONCRETE_RUNTIME_ALIGNMENT

- Mission ID : `ZORAN_STRUCTURAL_QUERY_MAPPING_AND_META_NOISE_REDUCTION_20260516`
- Date       : 2026-05-16
- Cross-refs : `META_NOISE_REDUCTION_ENGINE.md`,
  `ANTI_JARGON_PROTOCOL.md`, `STRUCTURAL_QUERY_MAPPING_ENGINE.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`, `REAL_WORLD_QUERY_MAPPING.md`,
  `BASELINE_COMPARISON_SYSTEM.md`
- Sources    : `app/src/llm.js::synthesizeRoute`,
  `app/src/chat.js::compete`, `app/src/structural_mapping.js::mapStructural`.

## 1. Principe — les lois aident le raisonnement, ne le remplacent pas

Le piège récurrent du benchmark 2026-05-16 :

> ZORAN traitait les lois comme du **contenu de réponse** plutôt que comme
> un **angle de pensée**.

La règle de cette mission inverse l'asymétrie :

```
Loi  ⊂  Cadre cognitif d'arrière-plan        (toujours)
Loi  ∉  Texte de la réponse à l'utilisateur   (jamais en surface)
```

Une réponse alignée *concrete-runtime* est jugeable par un humain du
domaine **sans** qu'il sache que ZORAN existe. Si l'on retire la
mention de la loi et que la réponse devient incomplète, la réponse était
mal construite : le raisonnement reposait sur la béquille du jargon, pas
sur la maîtrise du domaine.

## 2. Cas concret BTP — où ZORAN échouait

Question : *« Un maître d'ouvrage veut supprimer plusieurs murs porteurs… »*

| Avant mission                                  | Après mission (cible)                              |
|------------------------------------------------|----------------------------------------------------|
| `maxTopicRelevance = 0.023` (off-topic)        | 4 structures détectées, 6 familles activées        |
| 0 réponse, banner *« hors-domaine ZORAN »*     | Pipeline LLM tourne avec contexte structural       |
| Si LLM tournait : *« compresser propagation »* | *« étude de structure + bureau de contrôle… »*     |
| User : préfère trivialement Claude brut        | User : ZORAN parle BTP, jugement réel possible     |

C'est le **premier cas réel** qui force le système à expliciter
la séparation cadre-cognitif / surface-textuelle.

## 3. Chemin de mesure — `concrete_runtime_gain`

Score envisagé (v2, non implémenté) :

```
concrete_runtime_gain =
    0.40 · domain_vocabulary_overlap(answer, question)
  + 0.30 · (1 − zoran_jargon_density(answer))
  + 0.30 · user_actionability(answer)        # heuristique : verbes d'action,
                                             #              acteurs, étapes
```

Où :
- `domain_vocabulary_overlap` = recouvrement tokens question ∩ tokens
  réponse, normalisé. Proxy de « tu réponds dans MA langue ».
- `zoran_jargon_density` cf. `META_OVERLOAD_ANALYSIS.md`.
- `user_actionability` = score heuristique (présence de verbes d'action,
  d'acteurs nommés, d'ordre temporel) — à définir précisément v2.

## 4. Limites honnêtes

- Aucun de ces trois sous-scores n'est implémenté à date.
- Le seul signal concret-runtime disponible aujourd'hui = jugement du
  juge LLM via `judgeResponses` (axes `precision`, `noise`,
  `coherence`) — déjà biaisé Claude-juge-de-Claude.
- Pas de dataset annoté humain par domaine (BTP, juridique, médical) — la
  notion d'« utilité concrète » reste qualitative.
- Le cas BTP est un *N=1* anecdotique. Aucune réplication statistique.
- L'alignement *concrete-runtime* est aujourd'hui garanti uniquement par
  le system prompt de `synthesizeRoute` ; rien ne re-checke la sortie.
