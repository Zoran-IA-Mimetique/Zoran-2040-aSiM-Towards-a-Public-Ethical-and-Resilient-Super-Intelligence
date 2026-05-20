# V13_IMPACT_MAP_PROTOCOL — Cartographie d'impact avant tout dev

- **mission_id** : ZORAN_V13_MAX_SECURITY_LAB_PROTOCOL_20260520
- **adopté le** : 2026-05-20T17:35:00Z

## Règle

Le développement aveugle est interdit. Avant de modifier un composant, on
produit un **IMPACT_MAP** : la liste explicite de ce que le changement touche,
directement et indirectement.

## Outil de base

`tools/architecture_live_map.mjs` génère le graphe d'imports complet dans
`audit/impact_map_runtime.json`. C'est la source de vérité statique. Re-run
après toute modification de structure d'imports.

## Contenu obligatoire d'un IMPACT_MAP

Pour chaque modification envisagée, renseigner :

| Champ | Description |
|---|---|
| `fichiers_touchés` | Fichiers édités directement |
| `appels_descendants` | Modules importés par le fichier touché (ce qu'il consomme) |
| `appels_montants` | Modules qui importent le fichier touché (ce qui dépend de lui) |
| `propagation_possible` | Chemins de propagation transitive (BFS sur le graphe) |
| `risques_UI` | Rendering, popups, CTA, panneaux impactés |
| `risques_scoring` | `superiority.js` et moteurs de score impactés |
| `risques_benchmark` | Benchmarks `audit/*.json` dont le résultat peut bouger |
| `risques_rendering` | `superiority_render.js`, `panel.js`, templates |
| `risques_runtime` | Boot, graphe 3D, événements, smoke test |

## Procédure

1. Identifier le `module_cible`.
2. Lire `impact_map_runtime.json` → relever `appels_montants` (inbound) et
   `appels_descendants` (imports).
3. Pour chaque importateur montant, évaluer si le changement de contrat
   (signature, valeur de retour, effet de bord) le casse.
4. Croiser avec `ARCHITECTURE_LIVE_MAP.md` : si le module cible est **dormant**,
   le risque de propagation runtime est nul (mais le risque de réveiller du
   code non testé est réel — un module dormant branché devient un module non
   falsifié actif).
5. Lister les benchmarks impactés en cherchant le nom du module dans `audit/`.
6. Écrire l'IMPACT_MAP dans le corps du commit ou un fichier dédié si > 20 lignes.

## Cas particulier — réveiller un module dormant

Brancher un module dormant n'est PAS un patch anodin : on introduit du code
non falsifié dans le chemin runtime. Traiter comme un **ajout de couche** :
soumis à la règle fondatrice (falsification requise). Mesurer avant/après sur
les benchmarks existants.

## Anti-pattern

❌ « je modifie `X.js`, ça devrait aller » sans regarder les `appels_montants`.
✅ « `X.js` a 4 importateurs montants : A, B, C, D. Le changement de signature
de `foo()` casse B et D qui passent 2 arguments. Patch B et D dans le même
commit, ou garde la rétro-compat. »
