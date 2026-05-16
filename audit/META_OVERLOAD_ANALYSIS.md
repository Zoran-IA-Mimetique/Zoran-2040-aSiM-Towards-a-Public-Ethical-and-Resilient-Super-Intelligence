# META_OVERLOAD_ANALYSIS

- Mission ID : `ZORAN_STRUCTURAL_QUERY_MAPPING_AND_META_NOISE_REDUCTION_20260516`
- Date       : 2026-05-16
- Cross-refs : `META_NOISE_REDUCTION_ENGINE.md`,
  `ANTI_JARGON_PROTOCOL.md`, `CONCRETE_RUNTIME_ALIGNMENT.md`,
  `RUNTIME_SUPERIORITY_ENGINE.md`, `STRUCTURAL_RETRIEVAL_SYSTEM.md`,
  `NOISE_MINIMIZATION_ENGINE.md`
- Sources    : `app/src/llm.js::synthesizeRoute` (prompt anti-jargon),
  `judgeResponses` (axe `noise` actuel, sans isolation jargon).

## 1. Hypothèse — la densité de jargon trahit la sur-méta

Observation empirique du benchmark 2026-05-16 : une réponse ZORAN
sature en jargon (« loi », « cadre », « S_local », « propagation »…)
**dès** qu'elle dépasse environ 1 terme jargon pour 10 tokens. À ce
seuil, le lecteur du domaine décroche : il a l'impression que le
système répond *à lui-même* plutôt qu'à *sa question*.

Hypothèse formalisée :

```
zoran_jargon_density > 0.10  ⇒  réponse over-meta
                             ⇒  perte d'utilité concrete-runtime
```

Le seuil `0.10` est un *prior empirique*, calibré sur ~5 réponses
ZORAN observées avant le patch META_NOISE_REDUCTION. Aucune
validation statistique.

## 2. Mesure proposée — `jargon_density` v2 (non implémentée)

Algorithme cible :

```
JARGON_VOCAB = [
  'loi', 'lois', 'cadre', 'cadres', 's_local', 's_global',
  'propagation', 'wp11', 'wp12', 'wp-11', 'wp-12',
  'ghuc', 'pal', 'dve', 'ude', 'sde', 'ulg',
  'frugalité', 'frugale', 'borne', 'bornage',
  'auditabilité', 'auditable', 'oracle', 'route',
  'cognitif', 'cognitive', 'composition', 'admissibilité',
]

jargon_density(answer) =
    | tokens(answer) ∩ JARGON_VOCAB |  /  | tokens(answer) |
```

À implémenter dans un futur module `app/src/jargon_meter.js`,
appelable depuis `judgeResponses` ou en post-filtre de
`synthesizeRoute`. Aucune ligne de code n'existe à ce jour.

## 3. Composite `meta_noise` proposé (v2)

```
user_overlap(answer, question) =
    | tokens(answer) ∩ tokens(question) |  /  | tokens(question) |

meta_noise = 0.5 · jargon_density(answer)
           + 0.5 · (1 − user_overlap(answer, question))
```

Lecture :

- Si la réponse est saturée de jargon **et** ne réutilise aucun mot
  de la question → `meta_noise → 1.0` (max sur-méta).
- Si la réponse est en langage du domaine **et** reprend des termes
  de la question → `meta_noise → 0.0` (alignement maximal).
- Les deux poids `0.5 / 0.5` sont choisis pour l'équilibre symétrique
  ; aucune justification empirique.

Ce score viendrait compléter (pas remplacer) l'axe `noise` actuel du
juge LLM, qui mélange aujourd'hui *verbiage* et *jargon* sans
isoler la cause.

## 4. Limites honnêtes & dépendances

- **Aucune ligne implémentée à date** : `jargon_density`,
  `user_overlap`, et le composite `meta_noise` sont des spécifications
  conceptuelles. Le module `jargon_meter.js` est à créer en v2.
- **`JARGON_VOCAB` est une liste fermée** : tout nouveau néologisme
  ZORAN (`SiM`, `aSiM`, `Zoran-fractal`…) doit être ajouté à la
  main. Pas de détection morpho.
- **Tokenisation naïve assumée** (split whitespace + lowercase) :
  pose problème pour les composés (`s_local`, `wp-11`).
- **Le seuil `0.10` est anecdotique** (N=5 réponses observées). Il
  faut un dataset annoté pour le valider.
- **`user_overlap` favorise les questions verbeuses** : une question
  courte a peu de tokens, donc une réponse réutilisant 1–2 mots
  saturera artificiellement le score à 1.0.
- **Aucun couplage runtime** : tant que `judgeResponses` n'intègre
  pas l'axe `meta_noise`, le composite `runtime_superiority`
  (`RUNTIME_SUPERIORITY_ENGINE.md` §4) reste insensible à la
  pollution jargon.
- **Pas de telemetry historique** : on ne peut pas re-scorer les
  benchmarks passés avant que le compteur existe.
