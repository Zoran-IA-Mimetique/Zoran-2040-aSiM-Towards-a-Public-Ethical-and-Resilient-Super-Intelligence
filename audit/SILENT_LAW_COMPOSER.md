# SILENT_LAW_COMPOSER

- Mission ID : `ZORAN_DOMAIN_LAW_SELECTION_AND_SINGLE_WINNER_RUNTIME_ENGINE_20260516`
- Date       : 2026-05-16
- Cross-refs : `SILENT_GUIDANCE_V3.md`,
  `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `DOMAIN_LAW_SELECTION_ENGINE.md`, `ANTI_JARGON_PROTOCOL.md`,
  `SINGLE_WINNER_RUNTIME_FORMAT.md`.
- Sources    : `app/src/llm.js::synthesizeOrchestrated`,
  `app/src/superiority.js::orchestratedTask` (laws_used dedupliqué
  via `new Set(... .slice(0, 10))`),
  `app/src/structural_mapping.js::STRUCTURE_PATTERNS`,
  `app/src/jargon.js::detectJargonTerms`.

## 1. Fusion silencieuse en 1 seul appel

Cette mission consolide ce qui auparavant nécessitait 3 appels
(`synthesizeRoute × 3` + méta-fusion implicite par le juge). La
fonction `synthesizeOrchestrated({ question, domain, structures,
lawsByStrategy, parents })` produit **une seule réponse** où les
angles cognitifs de plusieurs stratégies sont *mentalement* combinés
par le LLM, sans que la réponse user ne mentionne `frugale`,
`anti_hallucination`, `structurelle`, ni aucun ID de loi.

Économie pipeline (cf. `superiority.js` commentaire interne) :

```
ancien : 3 × reformulate + 3 × synthesizeRoute + baseline + judge = 8 calls
nouveau : baseline + orchestrated + judge                          = 3 calls
                                                                  −62.5 %
```

## 2. Les 5 angles fusionnés (filtrés par structures)

Le system prompt orchestré assemble dynamiquement un sous-ensemble
de 5 angles selon les `structures` détectées en amont. La logique
exacte est dans `llm.js` lignes 174-191 :

| Angle         | Déclencheurs (`structKeys`)                                 | Texte injecté                                                |
|---------------|-------------------------------------------------------------|--------------------------------------------------------------|
| `STRUCTURE`   | `propagation` \| `causalite` \| `temporalite`                | « décris les effets en cascade et causes racines »           |
| `ACTION`      | `decision_action` \| `risque`                                | « 3-5 étapes concrètes immédiates priorisées par urgence »   |
| `VALIDATION`  | `hypothese_cachee` \| `contradiction` \| `auditabilite`      | « identifie hypothèses cachées + à vérifier »                |
| `BORNAGE`     | `bornage` \| `compression_synthese`                          | « périmètre exact, limites franches »                        |
| `TEMPS`       | `temporalite`                                                | « court terme (urgence) vs long terme (vieillissement) »     |

Si `angles.length === 0` → fallback `'Réponse standard structurée'`.
Les angles sont **jamais nommés textuellement** dans la sortie ; le
prompt précise : *« à ne JAMAIS citer dans la réponse »*.

## 3. Top 5 lois cadrent SANS être citées

`synthesizeOrchestrated` aplatit `lawsByStrategy` en une `Map`
dédupliquée par `l.id`, garde les 5 premières et les injecte ainsi
dans le system :

```
Cadres cognitifs activés MENTALEMENT (à ne JAMAIS citer dans la réponse) :
• <l.title || l.id>
• ...
```

Côté `superiority.js`, le candidat orchestré renvoie quand même
`laws_used` (top 10 dédupliqué) pour les **mesures internes** et
l'affichage `details` (replié par défaut, mission
`SINGLE_WINNER_RUNTIME_FORMAT`). Le user *peut* ouvrir l'accordéon
mais la **réponse principale** reste mono-bloc, sans bibliographie.
Cross-ref `SILENT_GUIDANCE_V3` section 2 : l'enforcement
`detectJargonTerms` post-réponse continue à scorer la contamination.

## 4. Limites honnêtes

- **Sélection d'angle binaire** : un angle est activé dès *une*
  structure du déclencheur matche, sans pondération. Une question
  faiblement causale reçoit le même bloc `STRUCTURE` qu'une
  question centralement causale.
- **Top-5 lois sans déduplication sémantique** : `new Map([l.id, l])`
  déduplique sur l'ID mais pas le contenu. Deux lois équivalentes
  issues de 2 stratégies peuvent saturer la fenêtre.
- **Routes internalisées masquent valeur complémentaire** : si
  `frugale` et `structurelle` produiraient deux angles
  *contradictoires-mais-utiles*, le format mono-réponse écrase
  cette tension au lieu de la rendre visible à l'utilisateur.
- **Enforcement uniquement par prompt** : aucun post-filtre ne
  vérifie que la réponse a effectivement intégré `ACTION` quand
  demandé. `practicalUsefulness` (jargon.js) approche la mesure
  mais ne valide pas angle par angle.
- **`maxTokens: 1000`** : suffit pour 4-7 phrases denses mais pas
  pour une question hybride multi-domaines (BTP + juridique).
