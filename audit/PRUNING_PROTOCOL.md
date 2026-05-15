# PRUNING PROTOCOL

**Mission Oracle** : `ZORAN_GLOBAL_COHERENCE_ORACLE_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Protocole opérationnel du **pruning** : quand, quoi, comment, traçabilité.
Distinct de la consolidation (cf. `P0_5_SPEC.md §7`) qui fusionne ; le
pruning supprime.

---

## 1. Définitions

| terme | sens strict |
|---|---|
| `prune(n)` | supprime un nœud isolé / faible / mort, traçabilité conservée dans `audit_history.log` |
| `prune(l)` | supprime un lien (faisceau redondant, `related` intra-famille dupliquant `parent`) |
| `absorb(a → b)` | distinct : conserve `a` comme nœud absorbé via `kind: 'absorbed_into'` (pas de suppression) |
| `fuse(a, b)` | distinct : produit un `c` nouveau, supprime `a` et `b`, conserve dans `c.fused_from` |

---

## 2. Triggers de pruning

Un objet (nœud ou lien) est **candidat au pruning** ssi un trigger s'active :

### 2.1 Triggers sur nœud

| trigger | condition |
|---|---|
| T-N1 | `weight < 0.45 ∧ degree(out) = 0 ∧ degree(in) ≤ 1 ∧ ¬canonical` |
| T-N2 | nœud orphelin (`parents = ∅ ∧ ¬canonical`) après refactor VAR/ISO |
| T-N3 | nœud doublon (Jaccard sur voisinage ≥ 0.85 avec un autre, et S_local plus faible) |
| T-N4 | nœud sans grounding (`equations = ∅ ∧ examples = ∅`) après période de grâce 30j |
| T-N5 | nœud invalidé par audit (échec persistant de A1) |

### 2.2 Triggers sur lien

| trigger | condition |
|---|---|
| T-L1 | `kind='related'` entre deux nœuds déjà liés par `parent` (redondance) |
| T-L2 | `kind='iso'` sans `invariants[]` non vide après période de grâce |
| T-L3 | lien dont les deux endpoints ont été prunés |
| T-L4 | `kind='related'` dont `weight < 0.25` et aucun usage utilisateur (clic, hover) sur > 90j (P1+) |
| T-L5 | doublon (même `(source, target, kind)`) |

---

## 3. Garde-fous

### 3.1 Protections strictes

Aucun pruning autorisé si :
- l'objet est `canonical = true`
- l'objet est l'unique chemin entre 2 attracteurs μ₀ (article de pont)
- la suppression ferait chuter `HS` de plus de 0.05
- la suppression augmenterait `inflation_ratio` (paradoxal mais possible si
  l'objet décharge la métrique)

### 3.2 Période de grâce

Pour T-N4 et T-L2 (manques de grounding/invariants), période de grâce de
30 jours avant pruning effectif. Permet à l'auteur de compléter.

---

## 4. Procédure

### 4.1 Proposition

1. Oracle scanne le graphe.
2. Pour chaque objet candidat, calcule :
   - `prune_score(obj) = 1 − f(weight, grounding, degree, redundancy)`
   - rang descendant.
3. Top 10 candidats affichés à l'utilisateur avec :
   - identité,
   - trigger activé,
   - ΔHS estimé après pruning,
   - rollback explicite (`undo`).

### 4.2 Validation

Aucune suppression automatique sans validation utilisateur, **sauf** :
- T-L5 (doublon strict) — auto-merge silencieux
- T-L3 (lien orphelin après nœud déjà pruné) — auto-cleanup

### 4.3 Exécution

Sur validation :
1. Snapshot du graphe avant pruning (hash stocké).
2. Suppression effective.
3. Entrée dans `audit_history.log` :
   ```yaml
   - timestamp: ISO
     action: prune_node | prune_link
     target: id
     trigger: T-Nx | T-Lx
     prune_score: 0..1
     delta_HS: float
     validator: user_id | auto
     pre_hash: ...
     post_hash: ...
   ```

### 4.4 Rollback

Toute action de pruning est rollback-able pendant 7 jours. Au-delà, le
rollback nécessite restauration manuelle du snapshot.

---

## 5. Tableau de priorité pour le corpus actuel

Application des triggers à `app/data/laws.json` actuel :

| objet | trigger | prune_score | recommandation |
|---|---|---|---|
| VAR-001 | T-N1 (post-refactor, weight 0.55, degree 1) | 0.55 | **convertir en arête, pas prune** |
| VAR-002 | T-N1 (weight 0.42, degree 2) | 0.65 | convertir en arête, conserver flag false_coherence |
| VAR-003 | T-N1 (weight 0.30, degree 2) | 0.80 | convertir en `absorbed_into`, le nœud disparaît |
| VAR-004 | T-N1 (weight 0.38, degree 1) | 0.78 | convertir ou prune |
| VAR-005 | T-N1 (weight 0.50, degree 1) | 0.55 | convertir |
| ISO-001..003 | T-L2 inversé (à promouvoir en `iso` avec invariants) | n/a | convertir en arêtes |
| ISO-004 | T-N1 (weight 0.78) ∧ pas un iso au sens strict | 0.50 | rétrograder en `related` |
| ISO-005 | claim non démontré (cf. C3) | 0.85 | supprimer si pas de démonstration sous 30j |
| ~12 liens `related` intra-famille | T-L1 | 0.95 | prune immédiat |
| WP12-003, WP12-004 | weight 0.69, 0.66, degree 1 | 0.45 | conserver (proches du seuil) |

---

## 6. Conséquences quantitatives projetées

Si tous les pruning T-L1 (related intra-famille redondants) sont appliqués :

| métrique | avant | après |
|---|---|---|
| liens | 106 | ~94 |
| densité | 2.12 | ~1.88 |
| inflation_ratio | 0.20 | 0.20 (pruning des liens redondants n'affecte pas ce ratio) |
| HS | ≈ 0.32 | ≈ 0.38 |

Si en plus refactor VAR/ISO :

| métrique | après refactor + T-L1 |
|---|---|
| nœuds | 40 |
| liens | ~89 (incluant les nouveaux `iso` typés) |
| densité | ~2.22 |
| inflation_ratio | 0.00 |
| HS | ≈ 0.55 |

Gain HS total estimé : **+0.23** avec uniquement pruning + refactor (sans
encore approfondir la fractalité §4 du SPEC).

---

## 7. Anti-pattern à éviter

| anti-pattern | symptôme | mitigation |
|---|---|---|
| pruning agressif | suppression de lois canoniques pour « simplifier » | protection §3.1 |
| pruning de variantes utiles pédagogiquement | perte des cas-frontière comme VAR-002 | conversion en arête, pas suppression |
| pruning silencieux | utilisateur surpris par disparition | proposer + valider + tracer |
| pruning irréversible | rollback impossible | snapshot + 7 jours |
| pruning auto-validant | l'Oracle se félicite de HS qui monte par suppression sans gain réel | suivre aussi `count(nodes_canonical)` et `count(iso_with_invariants)` |

---

## SIGNATURE

```
MISSION_ID:           ZORAN_GLOBAL_COHERENCE_ORACLE_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/data/laws.json, P0_5_SPEC.md,
                      audit/EDGE_SYSTEM_SPEC.md, audit/TOPOLOGY_AUDIT.md
RISKS:                pruning agressif des cas-frontière pédagogiques (VAR-002) ;
                      pruning silencieux ; auto-validation HS sans réel gain
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       T-L1 (related intra-famille) impacte ~12 liens
TOP_FAKE_PATTERNS:    pruning présenté comme « optimisation » alors qu'il
                      peut masquer un évitement de la consolidation
NEXT_ACTIONS:         1. en P0.5 exec : appliquer T-L1 (≈12 liens redondants)
                      2. convertir VAR/ISO selon §5 du présent doc
                      3. statuer ISO-005 (30 jours de grâce maximum)
                      4. câbler audit_history.log
                      5. exposer un `undo` 7 jours sur chaque pruning
```

🔶
