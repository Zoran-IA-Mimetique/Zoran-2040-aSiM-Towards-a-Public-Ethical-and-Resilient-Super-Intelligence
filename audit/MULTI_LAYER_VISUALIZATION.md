# MULTI_LAYER_VISUALIZATION — Spec

**Mission** : `ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516`
**Timestamp** : `2026-05-16T01:55:00+02:00`
**Cross-refs** : `MULTI_CORE_PATTERN_ENGINE.md`, `META_PATTERN_LAYERS.md`,
`LAYER_MANAGER_SYSTEM.md`, `CORE_GRAVITY_DETECTION.md`

---

## 1. Intégration 3D

Le graphe 3D rend simultanément les **8 noyaux émergents** détectés
sur les 241 lois. Chaque core fournit une couche de lecture
indépendante, colorée par sa famille dominante, et pilotée depuis le
Layer Manager du sidebar (`#cores-list`). Topologie sous-jacente
**inchangée** : forces D3, edges, positions partagées par tous les
calques. Le calque n'agit que sur l'opacité matérielle.

## 2. Cartographie cores → familles

| core_id      | family | size | swatch                                  |
|--------------|--------|-----:|-----------------------------------------|
| CORE-02-DVE  | DVE    |   26 | `familyColor('DVE')`                    |
| CORE-06-WP12 | WP12   |   33 | `familyColor('WP12')`                   |
| CORE-05-WP11 | WP11   |   37 | `familyColor('WP11')`                   |
| CORE-01-ULG  | ULG    |   26 | `familyColor('ULG')`                    |
| CORE-04-GHUC | GHUC   |   37 | `familyColor('GHUC')`                   |
| CORE-07-SDE  | SDE    |   28 | `familyColor('SDE')`                    |
| CORE-08-PAL  | PAL    |   21 | `familyColor('PAL')`                    |
| CORE-03-UDE  | UDE    |   33 | `familyColor('UDE')`                    |

Tailles `[21, 26, 26, 28, 33, 33, 37, 37]` (médiane 30,5). La
palette est identique à celle du panneau Familles → cohérence
visuelle cross-panneau immédiate pour l'opérateur.

## 3. Comportement focus + toggle

| action opérateur                       | effet runtime                                  |
|----------------------------------------|------------------------------------------------|
| Clic sur item de noyau                 | `selectNode(c.gravity_center[0], true)` → focus caméra 800ms |
| Clic sur badge `✓`/`∅`                 | toggle opacité 1.00 ↔ 0.05 (transition douce) |
| Bouton `tous`                          | force tous les cores à `visible=true`          |
| Bouton `isoler`                        | isole le core du nœud sélectionné              |

Les **centres de gravité** (top-3 nœuds composite par core) sont
mis en évidence au focus via `selectNode()` → ring d'highlight,
neighbors illuminés, panneau de détail ouvert sur le centre primaire
(`XXX-001` dans 7/8 cores, `UDE-019` pour CORE-03-UDE).

## 4. Anti-overload visuel

Trois garde-fous co-conçus avec le moteur de détection :

- **MAX_CORES = 8** : cap dur, refuse toute 9ᵉ couche (économise
  ressource graphique et charge cognitive).
- **MIN_CORE_SIZE = 3** : exclut micro-clusters bruyants.
- **MIN_DENSITY = 0.06** (relaxé si `size ≥ 15`) : filtre les
  faux-noyaux à edges faibles.

Coverage runtime mesurée : **100% des 241 nœuds couverts**,
`orphan_count = 0`. `runtime_relevance ∈ [0.456, 0.482]` — fourchette
serrée qui valide l'équilibre du clustering par famille (aucun core
n'écrase visuellement les autres). Le toggle préserve la topologie :
masquage = lecture filtrée, jamais suppression — retour instantané
sans recalcul des forces D3.
