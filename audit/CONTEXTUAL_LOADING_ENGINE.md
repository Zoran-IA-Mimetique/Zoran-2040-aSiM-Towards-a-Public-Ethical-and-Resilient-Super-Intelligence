# CONTEXTUAL LOADING ENGINE

**Mission** : `ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515`
**Timestamp** : `2026-05-15T20:23:00+02:00`

Le **ContextualLoadingEngine** (CLE) est le mécanisme par lequel ZenRuntime
sélectionne le sous-graphe pertinent pour une opération. Il garantit que
le runtime **ne charge jamais** plus de N_max lois à la fois, et que les
lois chargées sont **sémantiquement** liées à la requête.

---

## 1. Statut

| propriété | valeur |
|---|---|
| Lit | CanonicalGraph (laws.json) |
| Écrit | RIEN |
| Filtre | runtime_admissible = true seulement |
| Budget | défini par OracleAdaptive |

---

## 2. API

```
ContextualLoadingEngine.select(query, budget=N_max, mode='balanced'):
    """Renvoie un sous-graphe (≤ N_max lois) pertinent pour query."""
    anchors = identify_anchors(query)
    candidates = expand_from_anchors(anchors, depth=depth_max)
    ranked = rank_candidates(candidates, query, mode)
    selected = ranked[:budget]
    subgraph = extract_subgraph(selected)
    return subgraph
```

Modes :
- `balanced` : équilibre entre proximité textuelle et structure
- `topology` : privilégie la cohérence structurelle
- `lexical` : privilégie le matching textuel

---

## 3. Identification des ancres

```
identify_anchors(query) -> list[law_id]:
    # 1. Exact ID match (ex. "ULG-001" dans la query)
    direct_ids = regex_extract_ids(query)
    if direct_ids: return direct_ids

    # 2. Family match (ex. "GHUC", "WP11")
    families = regex_extract_families(query)
    if families:
        return [f.canonical_root for f in families]

    # 3. Lexical match sur titles + descriptions
    tokens = tokenize(query)
    matches = score_lexical(tokens, all_canonical_laws)
    return matches[:3]  # top 3 anchors
```

**Toujours ≤ 3 ancres** pour éviter d'élargir trop. Si aucune ancre
trouvée → `null`, le runtime refuse.

---

## 4. Expansion BFS bornée

```
expand_from_anchors(anchors, depth):
    visited = set(anchors)
    frontier = list(anchors)
    for d in range(depth):
        next_frontier = []
        for node_id in frontier:
            for edge in CanonicalGraph.edges_of(node_id):
                if edge.kind not in {'parent', 'iso', 'related'}:
                    continue
                other = edge.other_endpoint(node_id)
                if other not in visited:
                    visited.add(other)
                    next_frontier.append(other)
        frontier = next_frontier
    return visited
```

Profondeur maximale : 2 par défaut. Cela donne (anchors → enfants →
petits-enfants OR iso-related). Au-delà, dilution sémantique.

---

## 5. Ranking

```
rank_candidates(candidates, query, mode):
    scored = []
    for cand in candidates:
        s = 0
        # proximité aux ancres (BFS hop count)
        s += 1.0 / (1 + hop_distance(cand, anchors))

        # poids structurel
        s += 0.30 * cand.weight

        # bonus tier attractor
        if cand.attractor_tier == 'μ0': s += 0.40
        elif cand.attractor_tier == 'μ1': s += 0.20

        # bonus fractal family
        if cand.family in fractal_families: s += 0.10

        # bonus lexical (dot-product token vectors)
        if mode in ('balanced', 'lexical'):
            s += 0.20 * lexical_score(cand, query)

        # malus instabilité
        if cand.stability == 'instable': s -= 0.30
        elif cand.stability == 'absorbée': s -= 0.50

        scored.append((s, cand))
    scored.sort(reverse=True)
    return [c for _, c in scored]
```

---

## 6. Extraction du sous-graphe

```
extract_subgraph(law_ids):
    nodes = [CanonicalGraph.get(id) for id in law_ids]
    edges = [e for e in CanonicalGraph.edges
             if e.source in law_ids and e.target in law_ids]
    compositions = [c for c in CanonicalGraph.compositions
                    if all(p in law_ids for p in c.pair)]
    families = list(set(n.family for n in nodes))
    return Subgraph(nodes, edges, compositions, families)
```

Le sous-graphe contient **uniquement** les arêtes et compositions dont
**les deux extrémités** sont chargées. Pas d'arêtes "pendantes".

---

## 7. Garde-fous

### 7.1 Hard cap

```
if len(selected) > N_max_hard:
    # ne devrait jamais arriver, mais double-check
    log_critical("CLE: budget hard exceeded")
    selected = selected[:N_max_hard]
```

`N_max_hard` = 50 (cap absolu, indépendant du `budget` paramétré).

### 7.2 Connectivité minimale

```
if not is_connected(subgraph):
    # subgraphe fragmenté = mauvais signal
    largest_component = max(connected_components(subgraph), key=len)
    log_warning(f"CLE: subgraph fragmenté, retenu composante {len(largest_component)}/{len(subgraph)}")
    return Subgraph_from(largest_component)
```

Si le sous-graphe n'est pas connexe, garder la plus grande composante.
Évite les chargements incohérents.

### 7.3 Filtre runtime_admissible

```
selected = [s for s in selected if s.runtime_admissible]
```

Filtre final : aucune loi sandbox ne peut sortir, même par accident.

---

## 8. Cache

```
cache: LRU(size=64)

select(query, budget, mode):
    key = hash(query, budget, mode)
    if key in cache:
        return cache[key]
    result = _compute_select(query, budget, mode)
    cache[key] = result
    return result
```

LRU 64 entrées. Cache invalidé au changement de version `CanonicalGraph`
(version bump quand promotion / démotion).

---

## 9. Telemetry

Chaque appel logue :

```
{
  "ts": "ISO",
  "query": "...",
  "anchors": [...],
  "candidates_count": N,
  "selected_count": M,
  "depth_used": d,
  "mode": "balanced",
  "duration_ms": t,
  "cache_hit": bool
}
```

Append-only dans `audit/CLE_TELEMETRY.log`. Permet à Adaptive de
calibrer le budget.

---

## 10. Cas d'usage

### 10.1 Question utilisateur factuelle

```
query = "Que dit ZORAN sur la cohérence locale vs globale ?"
```

CLE :
1. Anchors : recherche lexicale → WP11-001, WP11-002, WP11-003, WP11-004
2. Expansion : enfants WP11-* + iso vers WP12-001 (via ISO-002 P0.5)
3. Ranking : favorise WP11-004 (μ1 + fractal family)
4. Selection : top 12 lois pertinentes
5. Subgraph extrait, retourné à runtime pour composition

### 10.2 Audit ad hoc d'une loi

```
runtime.audit("GHUC-001")
```

CLE :
1. Anchor : GHUC-001 (direct ID match)
2. Expansion : tous les descendants GHUC + ISO directs (cf. compositions)
3. Selection : 10–15 lois (famille GHUC complète)
4. Subgraph contient compositions + audit complet

### 10.3 Aucune loi pertinente

```
query = "Comment cuisiner du riz ?"
```

CLE :
1. Anchors : aucun match (lexical score < 0.1)
2. Retourne `null`
3. Runtime refuse : "Aucune loi pertinente démontrée pour cette question."

---

## 11. Implémentation actuelle

Le `ContextualLoadingEngine` **n'est pas encore implémenté** dans
l'app web actuelle (qui charge intégralement laws.json pour
visualisation). Cette spec définit son comportement futur lors de
l'intégration ZEN cognitive.

Composants à développer (mission ZEN_INTEGRATION) :
- `app/src/cle.js` : implémentation JavaScript (côté client web)
- `tools/cle.py` : implémentation Python (côté backend si applicable)
- API REST optionnelle pour exposer le CLE comme service

---

## 12. Anti-règles

CLE **ne doit JAMAIS** :
- ❌ Charger de lois sandbox
- ❌ Dépasser N_max_hard = 50
- ❌ Renvoyer un sous-graphe fragmenté sans warning
- ❌ Inférer des compositions absentes
- ❌ Utiliser un cache invalide (post-promotion)
- ❌ Inventer des liens non présents dans CanonicalGraph

---

## SIGNATURE

```
DOCUMENT:             CONTEXTUAL_LOADING_ENGINE.md
VERSION:              1.0
DEFAULT_BUDGET:       30 lois max par opération
HARD_CAP:             50 lois absolues
DEPTH_MAX:            2 (BFS depuis ancres)
ANCHORS_MAX:          3
MODES:                balanced | topology | lexical
NEXT_ACTIONS:         (a) implémenter app/src/cle.js (futur ZEN)
                      (b) implémenter tools/cle.py (audit offline)
                      (c) câbler CLE_TELEMETRY.log
                      (d) tests unitaires sur ranking
```

🔶
