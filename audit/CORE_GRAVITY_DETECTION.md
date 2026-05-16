# CORE_GRAVITY_DETECTION — Spec

**Mission** : `ZORAN_MULTI_CORE_PATTERN_LAYERS_AND_RUNTIME_UI_FIXES_20260516`
**Timestamp** : `2026-05-16T01:55:00+02:00`
**Cross-refs** : `MULTI_CORE_PATTERN_ENGINE.md`, `META_PATTERN_LAYERS.md`,
`tools/multi_core_pattern_engine.py` (composite_score, lignes 73-81)

---

## 1. Définition du centre de gravité

Pour chaque core, `gravity_center` = **3 nœuds top-composite** au
sein du cluster. Ces 3 nœuds sont les ancres pivots du noyau : ils
concentrent simultanément la centralité structurelle (PageRank),
la qualité intrinsèque (S_local, frugalité) et le statut canonique
(superior, fondateur).

```python
top3 = sorted(members,
              key=lambda m: -composite_score(nodes_map[m], pr.get(m, 0))
             )[:3]
```

Le **premier élément** `gravity_center[0]` sert de cible de focus
caméra lors d'un clic sur l'item dans le Layer Manager.

## 2. Formule composite

```
composite(n) = 3.00 · PageRank(n)
             + 0.30 · superior_law_candidate(n)
             + 0.20 · (attractor_tier == "fondateur")
             + 0.20 · S_local(n)        // défaut 0.7
             + 0.20 · frugality_score(n) // défaut 0.5
             + 0.15 · velocity_score(n)  // défaut 0.4
```

Le poids 3.0 sur PageRank assure la **dominance structurelle** :
un nœud isolé ne peut pas devenir centre de gravité même s'il est
superior + fondateur (max 0.50 contre PageRank typique 0.005-0.03
× 3 = 0.015-0.09 pour 241 nœuds). Les bonus catégoriels servent à
**départager** des nœuds à PageRank équivalent.

## 3. Centres observés (runtime 2026-05-16)

| core           | gravity_center[0] | [1]      | [2]          |
|----------------|-------------------|----------|--------------|
| CORE-02-DVE    | DVE-001           | DVE-002  | DVE-008      |
| CORE-06-WP12   | WP12-001          | WP12-007 | WP12-020     |
| CORE-05-WP11   | WP11-001          | WP11-003 | WP11-002     |
| CORE-01-ULG    | ULG-001           | ULG-003  | ULG-002      |
| CORE-04-GHUC   | GHUC-001          | GHUC-003 | GHUC-002     |
| CORE-07-SDE    | SDE-001           | SDE-002  | SDE-028      |
| CORE-08-PAL    | PAL-001           | PAL-002  | PAL-002-b-i  |
| CORE-03-UDE    | UDE-001           | UDE-019  | UDE-014      |

7/8 cores ont `XXX-001` en première position : confirme le rôle
canonique des lois racines de famille. CORE-03-UDE place UDE-019
en seconde position, signal d'un sous-attracteur émergent à
investiguer.

## 4. Usage runtime

- **Focus caméra** : clic sur item de Layer Manager →
  `selectNode(c.gravity_center[0], true)` (cf. `LAYER_MANAGER_SYSTEM.md`).
- **Tooltip** : les 3 centres sont listés dans le `title` de l'item.
- **Annotation report** : `audit/MULTI_CORE_DETECTION_REPORT.json`
  conserve `gravity_center` par core pour audit hors-runtime.
