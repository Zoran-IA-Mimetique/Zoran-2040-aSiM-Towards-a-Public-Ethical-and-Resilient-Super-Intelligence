# ANTI_JARGON_PROTOCOL

- Mission ID : `ZORAN_STRUCTURAL_QUERY_MAPPING_AND_META_NOISE_REDUCTION_20260516`
- Date       : 2026-05-16
- Cross-refs : `META_NOISE_REDUCTION_ENGINE.md`,
  `CONCRETE_RUNTIME_ALIGNMENT.md`, `STRUCTURAL_QUERY_MAPPING_ENGINE.md`,
  `META_OVERLOAD_ANALYSIS.md`, `MULTI_WINNER_REFORMULATION_ENGINE.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`
- Sources    : `app/src/llm.js::synthesizeRoute` (system prompt
  réécrit, règles 1–5), `reformulateQuestion`, `synthesizeBaseline`.

## 1. Principe — séparation raisonnement / vocabulaire

Le protocole anti-jargon repose sur une asymétrie unique :

```
Stratégie cognitive  →  INFLUENCE le raisonnement interne     (oui)
Stratégie cognitive  →  POLLUE le vocabulaire externe          (non)
```

Autrement dit : `frugale`, `anti_hallucination`, `structurelle` et
`temporelle` doivent **se voir** dans la *forme du raisonnement* mais
ne doivent **jamais** apparaître comme *étiquettes textuelles* dans la
réponse à l'utilisateur. Le user du domaine ne sait pas ce qu'est une
« route ZORAN » et n'a aucune raison de l'apprendre pour obtenir une
réponse utile sur ses murs porteurs.

## 2. Liste des termes interdits (système prompt)

Encodés en clair dans le system prompt de `synthesizeRoute`
(`app/src/llm.js`) règle n°2 :

```
INTERDIT : "loi", "cadre", "S_local", "propagation",
           "WP11/12", "GHUC", "PAL", "frugalité",
           "borne", "auditabilité"
```

Cette liste est volontairement **non exhaustive** (le prompt finit par
*« etc. »*) : elle cible les jargonismes les plus toxiques observés
empiriquement sur le cas BTP. Une liste exhaustive et un parser de
détection sont reportés à `META_OVERLOAD_ANALYSIS.md` (v2).

## 3. Channels de l'influence stratégique

Chaque stratégie a un **canal de transmission interne** documenté dans
le prompt et utilisé comme guide-rail pour Claude :

| Stratégie            | Canal interne (raisonnement)               | Sortie attendue                              |
|----------------------|--------------------------------------------|----------------------------------------------|
| `frugale`            | bref + essentiel                           | réponse courte, va à l'os                    |
| `anti_hallucination` | prudent + sourcé                           | formulations conditionnelles, mentions       |
| `structurelle`       | articule global → intermédiaire → local    | structure multi-niveaux apparente            |
| `temporelle`         | court terme vs long terme                  | distinction délais / horizons                |

Le critère de réussite : un lecteur du domaine doit pouvoir *deviner*
la stratégie sans qu'aucun mot ZORAN n'ait été prononcé.

## 4. Limites honnêtes

- **Aucune garantie d'enforcement** : Claude reste libre d'ignorer le
  prompt. Les modèles plus petits (Haiku) sont plus enclins à
  désobéir, surtout sur des questions ZORAN méta où le jargon
  redevient légitime.
- **Pas de post-filtre** : aucune fonction n'inspecte la réponse
  produite pour détecter les termes interdits avant affichage. C'est
  un protocole **déclaratif**, pas **vérifié**.
- **Pas de score quantitatif** : `zoran_jargon_density` est défini
  conceptuellement (`META_OVERLOAD_ANALYSIS.md`) mais non calculé.
- **Channels stratégiques décrits, non mesurés** : on espère que
  `frugale` produit une réponse plus courte, mais aucun benchmark
  longueur-par-stratégie n'est implémenté.
- **Liste de termes hard-codée** : aucune extension automatique au
  vocabulaire ZORAN futur — chaque nouveau jargon devra être ajouté
  manuellement au prompt.
- **Le judge LLM `judgeResponses` ne mesure pas séparément le jargon**
  ; il est noyé dans l'axe `noise` du composite
  `runtime_superiority`.
