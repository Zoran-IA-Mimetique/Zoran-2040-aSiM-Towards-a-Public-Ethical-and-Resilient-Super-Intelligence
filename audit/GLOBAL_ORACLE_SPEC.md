# GLOBAL ORACLE SPEC

**Mission Oracle** : `ZORAN_GLOBAL_COHERENCE_ORACLE_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Spécification du **Oracle global de cohérence** : composant qui audite
en continu le graphe ZORAN et empêche le collapse global, indépendamment
de la croissance.

Référence machine-readable : `audit/oracle_rules.json`.

---

## 1. Rôle

L'Oracle global est un **composant arbitre** :
- il **n'écrit pas** dans le graphe ;
- il **lit** l'état complet du graphe ;
- il **émet des verdicts** : `admissible` / `warn` / `reject` ;
- il **bloque** les opérations qui dégradent S_global au-delà du seuil ;
- il **trace** chaque décision avec timestamp et raison.

Il est distinct du module `app/src/oracle.js` actuel, qui ne fait que de
l'audit ponctuel descriptif. La version P0.5+ doit être **bloquante** et
**continue**.

---

## 2. Variables d'état

| variable | type | description |
|---|---|---|
| `S_local(n)` | `[0,1]` | cohérence autour du nœud `n` (existant) |
| `S_global` | `[0,1]` | calculé selon `P0_5_SPEC.md §1.5` (composition + struct + iso) |
| `density_limit` | seuils | `{soft: 2.8, hard: 3.5}` (liens/nœud) |
| `chaos_threshold` | seuil | `0.20` (entropie relationnelle normalisée) |
| `pruning_trigger` | seuil | `weight < 0.45 ∧ degree ≤ 1` |
| `admissibility_score` | `[0,1]` | fraction d'objets passant les prédicats A1–A6 |
| `inflation_ratio` | `[0,1]` | fraction de nœuds qui sont des relations déguisées |
| `false_coherence_count` | int | nombre de nœuds où `S_local − S_global > 0.30` |

---

## 3. Fonctions Oracle

### 3.1 `audit(graph) → Report`

Évaluation complète, non bloquante. Produit un rapport structuré listant
chaque règle évaluée, son verdict et les nœuds/liens concernés.

### 3.2 `evaluate_addition(graph, addition) → Verdict`

Avant tout ajout (nœud ou lien), calcule :

```
ΔS_global = S_global(graph ∪ {addition}) − S_global(graph)
verdict = admissible      si ΔS_global ≥ 0
        | warn            si −0.005 ≤ ΔS_global < 0
        | reject          si ΔS_global < −0.005
```

### 3.3 `propose_consolidations(graph) → List[Op]`

Propose des opérations de consolidation (fuse/absorb/prune/hierarchize/
compress, cf. `P0_5_SPEC.md §7`). N'exécute pas — propose.

### 3.4 `detect_chaos(graph) → ChaosReport`

Calcule :
- entropie de la distribution des `kind` parmi les liens
- variance de degree par famille
- nombre de cycles dans les liens `related` (devraient être un graphe
  acyclique semantique sinon redondance)
- fraction de nœuds isolés ou faiblement connectés

Si `entropie_normalisée > chaos_threshold` → alerte chaos.

### 3.5 `verify_invariants(graph) → InvariantReport`

Pour chaque famille `F` :
- vérifie que `F.invariant` est déclaré
- vérifie que les enfants de `F` respectent l'invariant déclaré
- pour les familles désignées fractales (P0_5_SPEC §4) : vérifie
  `fractal_property(F)`

### 3.6 `compute_HS(graph) → number`

Calcule le score d'honnêteté structurelle (cf. `P0_5_SPEC.md §10`).

---

## 4. Règles d'arrêt

L'Oracle **bloque** l'ajout si **l'un** des cas suivants :

| règle | condition | action |
|---|---|---|
| R-DEN-1 | `links/nodes > density_limit.hard` après ajout | reject |
| R-INV-1 | ajout d'un lien `iso` sans `invariants[]` non vide | reject |
| R-REC-1 | ajout d'un `parent` créant un cycle dans le DAG | reject |
| R-CTR-1 | ajout d'un `contradicts` sans réciprocité explicite | warn-then-auto-repair |
| R-MAX-1 | dépassement de `max_kinds_per_pair = 2` | reject |
| R-INF-1 | ajout d'un nœud à `family ∉ FAMILIES_CANONIQUES` | reject |
| R-WP1-1 | calcul S_global échouant (proxy active depuis > 7 jours) | warn (rappel à publier `proxy`) |

---

## 5. Règles de vigilance (non bloquantes)

| règle | condition | action |
|---|---|---|
| R-DEN-2 | `links/nodes ∈ [2.8, 3.5]` | warn + recommendation de pruning |
| R-FC-1 | `false_coherence_count` augmente | warn + flag VAR concernées |
| R-CTR-2 | `contradicts / nodes < 0.04` | warn (sous-représentation) |
| R-CTR-3 | `contradicts / nodes > 0.15` | warn (sur-représentation, possible bruit) |
| R-ISO-1 | nœud avec `related` vers ≥ 5 racines canoniques | warn (gravité potentielle) |
| R-ATR-1 | nœud déclaré attracteur sans `attractor_tier` | warn |
| R-INF-2 | `inflation_ratio > 0.10` | warn |
| R-FRC-1 | usage public de « fractal » sans famille citée | warn |

---

## 6. Sorties

### 6.1 Format Report

```json
{
  "mission_id": "ZORAN_GLOBAL_COHERENCE_ORACLE_20260515",
  "timestamp": "ISO-8601",
  "graph_state": {
    "nodes": 40,
    "links": 95,
    "density": 2.38,
    "S_global": "proxy:0.71",
    "HS": 0.78
  },
  "verdicts": [
    {"rule": "R-DEN-2", "severity": "warn", "context": "..."},
    ...
  ],
  "consolidations_proposed": [
    {"op": "absorb", "source": "WP12-004", "target": "WP12-001", "rationale": "..."}
  ],
  "blocked_operations": [
    {"op": "add_link", "target": {...}, "rule": "R-INV-1", "reason": "iso without invariants"}
  ]
}
```

### 6.2 UI integration

- Statusbar : afficher `HS = 0.XX` à côté de S_local/S_global.
- Au refus d'ajout : modal explicatif citant la règle bloquante.
- Indicateur de chaos : badge orange/rouge si `R-DEN-2` ou `R-FC-1` actifs.

---

## 7. Continuous mode

L'Oracle s'exécute :
- au **chargement** : audit complet, affichage du HS dans la statusbar.
- à **chaque modification de graphe** (ajout/suppression/edit nœud/lien) :
  evaluate_addition + bloquer si reject.
- à **chaque ouverture du panneau Oracle** (touche `O`) : audit complet
  + propose_consolidations.
- en **arrière-plan** (web worker, P1) : recompute S_global chaque 30s
  si modifications.

---

## 8. Intégration avec les autres documents

| document | rôle |
|---|---|
| `P0_5_SPEC.md §1.5` | définition `S_global` (composition + struct + iso) |
| `audit/S_GLOBAL_RULES.md` | énoncé formel des règles `S_global` |
| `audit/CHAOS_PREVENTION.md` | protocole en cas de chaos détecté |
| `audit/PRUNING_PROTOCOL.md` | quand et comment proposer pruning |
| `audit/edge_types.json` | schémas validés au chargement |
| `audit/oracle_rules.json` | règles R-* machine-readable |

L'Oracle global ne duplique pas ces docs — il les **consomme**.

---

## 9. Anti-règles (ce que l'Oracle NE doit PAS faire)

- ❌ inférer S_global comme moyenne pondérée de S_local (violation WP11-004)
- ❌ accepter un ajout au seul motif que S_local augmente
- ❌ bloquer un ajout sans citer la règle (transparence obligatoire)
- ❌ exécuter des consolidations sans propagation explicite à l'utilisateur
- ❌ s'auto-désactiver (toggle utilisateur acceptable, mais avec
  avertissement persistant)

---

## SIGNATURE

```
MISSION_ID:           ZORAN_GLOBAL_COHERENCE_ORACLE_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       P0_5_SPEC.md, app/src/oracle.js, audit/edge_types.json
RISKS:                Oracle qui s'auto-valide ; règles R-* qui se neutralisent
                      mutuellement (à tester) ; performance en mode continu
S_LOCAL:              n/a (spec)
S_GLOBAL:             n/a
TOP_COLLISIONS:       R-CTR-2 et R-CTR-3 (sous- vs sur-représentation) ;
                      R-DEN-1 et R-DEN-2 (cohabitation hard/soft)
TOP_FAKE_PATTERNS:    Oracle « décoratif » qui n'a pas pouvoir de blocage —
                      à éviter
NEXT_ACTIONS:         1. en P0.5 exec : étendre app/src/oracle.js avec
                         evaluate_addition + règles R-*
                      2. câbler la statusbar pour afficher HS
                      3. modaliser le refus d'ajout
```

🔶
