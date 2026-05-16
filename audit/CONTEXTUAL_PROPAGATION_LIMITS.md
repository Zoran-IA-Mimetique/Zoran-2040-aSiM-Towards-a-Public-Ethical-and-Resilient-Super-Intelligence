# CONTEXTUAL PROPAGATION LIMITS

**Mission** : `ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515`

Limites contextuelles de propagation : où s'arrêter, pourquoi.

---

## 1. `propagation_depth_limit` par loi

Calculé selon coût propagation :
- `propagation_cost > 0.50` → depth limit = **1** (très contraint)
- `0.30 < pc ≤ 0.50` → depth = **2**
- `pc ≤ 0.30` → depth = **3** (libre BFS)

Distribution :
| depth limit | nb lois | profil |
|---|---:|---|
| 1 | 12 | hubs + lois fortement contraintes |
| 2 | 95 | nœuds intermédiaires |
| 3 | 134 | feuilles et lois frugales |

→ Majorité (55%) peut propager librement à depth 3.

---

## 2. Pourquoi limiter la propagation ?

| risque sans limite | conséquence |
|---|---|
| Charge tout le graphe par récursion | overload runtime |
| Inclut lois éloignées | dérive contextuelle |
| Récursion infinie | crash CLE |
| Coût computationnel explosif | latency unsuporrtable |

Limiter `depth ≤ 3` borne effectivement le sous-graphe chargé.

---

## 3. Garde-fous additionnels

| garde-fou | seuil |
|---|---|
| `boundary_score < 0.30` → ne pas charger | strict |
| `drift_probability > 0.60` → warn et alternative | warn |
| `propagation_cost > 0.70` → depth limit forcé à 1 | strict |
| Cap N_max_hard = 50 lois absolues | strict |

---

## 4. Mécanisme d'arrêt

Pendant un BFS d'expansion CLE :

```python
def expand_bounded(start_id, query, depth_max):
    visited = {start_id}
    frontier = [start_id]
    for d in range(depth_max):
        next_f = []
        for cur in frontier:
            cur_node = get(cur)
            # check si on doit s'arrêter à ce nœud
            if cur_node.drift_probability > 0.60: continue
            if d + 1 > cur_node.propagation_depth_limit: continue
            for nb in neighbors(cur):
                if nb in visited: continue
                if get(nb).boundary_score < 0.30: continue
                visited.add(nb)
                next_f.append(nb)
        frontier = next_f
        if len(visited) >= 50: break  # hard cap
    return visited
```

→ La propagation **s'arrête naturellement** quand :
- atteint depth max
- rencontre une loi avec drift élevé
- atteint cap absolu N_max = 50

---

## 5. SIGNATURE

```
MISSION_ID:           ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515
DEPTH_DISTRIBUTION:   1:12, 2:95, 3:134
GUARD_RAILS:          4 mécanismes d'arrêt
HARD_CAP:             N_max=50 lois absolues
```

🔶
