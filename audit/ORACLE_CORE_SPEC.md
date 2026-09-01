# ORACLE CORE SPEC

**Mission** : `ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515`
**Timestamp** : `2026-05-15T20:23:00+02:00`
**Mode** : Oracle d'architecture cognitive, READ-ONLY → spec exécutable

L'**OracleCore** est la couche immunitaire constitutionnelle du système
ZORAN. Ses règles sont **quasi-immuables** : leur modification exige une
méta-validation extrêmement stricte (consensus + audit complet + version
bump explicite + rollback path documenté).

---

## 1. Statut

| propriété | valeur |
|---|---|
| Modifiable librement ? | **NON** |
| Modifiable via OracleAdaptive ? | **NON** |
| Modifiable via majorité utilisateur ? | **NON** |
| Modifiable comment ? | uniquement par méta-validation explicite documentée dans `audit/CORE_AMENDMENTS.md` (à créer si jamais une modification est tentée) |
| Versionnement | semver strict, MAJOR change = breaking |
| Rollback path | toujours conservé pour la version précédente |

---

## 2. Règles constitutionnelles (immuables)

### 2.1 R-CORE-1 : Séparation Discovery / Runtime

```
ZenRuntime ne charge JAMAIS un nœud n tel que n.runtime_admissible = false
∧ ZenRuntime ne charge JAMAIS un nœud absent de CanonicalGraph
```

Toute violation = collapse cognitif imminent.

### 2.2 R-CORE-2 : Indépendance S_local / S_global

(Hérité de `WP11-004`.)

```
∀ implémentation, ∀ contexte :
   S_global ≠ f(S_local₁, S_local₂, ..., S_localₙ) seuls
S_global doit inclure au minimum :
   - C_struct (intégrité des références)
   - C_composition (compositions opératoires démontrées)
   - C_iso (isomorphismes avec invariants explicites)
```

Toute formule de S_global qui dépend uniquement de S_local viole ce
constitutionnel.

### 2.3 R-CORE-3 : Composition obligatoire

```
∀ loi L à intégrer dans CanonicalGraph :
   |compositions(L)| ≥ 3
```

`compositions(L)` = lois distinctes liées à L via parent / sibling /
grand-parent / iso / contradicts / related / composition explicite.

### 2.4 R-CORE-4 : Frames obligatoires

```
∀ loi L : frames(L) ⊇ {local, intermediate, global, proxies, limits}
∧ |L.frames.intermediate| ≥ 1
∧ |L.frames.limits| ≥ 1
```

Le champ `limits` est l'**antidote au sur-calcul**. Sans `limits`, la loi
revendique tout, donc rien.

### 2.5 R-CORE-5 : Traçabilité obligatoire

Toute opération (ajout, modification, suppression, fusion) doit être
loguée avec :
- timestamp
- mission_id
- avant / après (hash ou diff)
- raison
- rollback_path

### 2.6 R-CORE-6 : Rollback automatique sur dégradation

```
SI HS_après < HS_avant ⇒ rollback automatique
SI S_global_proxy_après < S_global_proxy_avant − 0.05 ⇒ rollback automatique
SI inflation_ratio_après > 0.05 ⇒ rollback automatique
```

Rien d'irréversible n'arrive sans franchir explicitement ces seuils.

### 2.7 R-CORE-7 : DAG sur les arêtes parent

```
Le sous-graphe des arêtes kind='parent' doit former un DAG global.
```

Aucun cycle dans la hiérarchie. Sinon : récursion infinie, ambiguïté
d'attracteur.

### 2.8 R-CORE-8 : Iso requiert invariants

(Hérité de `EDGE_SYSTEM_SPEC.md`.)

```
∀ arête e : kind(e) = 'iso' ⇒ |e.invariants| ≥ 1
                            ∧ chaque invariant est un string ≥ 8 chars
```

Pas d'iso sans invariant explicite. Sans cette règle, les iso deviennent
des `related` déguisés.

### 2.9 R-CORE-9 : Contradicts requiert réciproque

```
∀ arête e : kind(e) = 'contradicts'
   ⇒ ∃ e' tel que kind(e') = 'contradicts' ∧ e'.source = e.target ∧ e'.target = e.source
```

La contradiction est par définition symétrique. Stockage unilatéral =
typage erroné.

### 2.10 R-CORE-10 : Pas d'inférence en cascade S_global

(Hérité de `S_GLOBAL_RULES.md` R-S10.)

```
S_global(t) ↑  ⇏  S_global(t+1) ↑ par défaut
Chaque évaluation de S_global est indépendante des précédentes.
```

Pas de "biais d'inertie" qui valide automatiquement les augmentations
futures.

### 2.11 R-CORE-11 : Familles canoniques fixes

```
families ∈ {ULG, DVE, UDE, GHUC, WP11, WP12, SDE, PAL}
```

Toute tentative d'ajouter une famille hors de ce set = violation
constitutionnelle. Si une nouvelle famille est nécessaire, MAJOR version
bump + audit complet documenté + relecture totale du graphe.

### 2.12 R-CORE-12 : Aucun label sans preuve

```
∀ usage public d'un label fort (« fractal », « attracteur », « universel ») :
   doit citer la famille ou la loi de preuve
```

Hérité de `audit/FAILED_FRACTAL_CLAIMS.md`. Le moratoire P0.5 a été
levé en P1 mais la règle reste : citer ou ne pas écrire.

---

## 3. Procédure de modification du Core

Si une modification du Core devient nécessaire :

```
1. Créer audit/CORE_AMENDMENT_PROPOSAL_<id>.md décrivant :
   - règle visée
   - raison (pas une opinion — un fait constaté)
   - impact prévu sur HS, S_global, fractal_families
   - rollback path (commit SHA antérieur)

2. Geler toutes les autres modifications (mode emergency-only)

3. Audit complet du graphe avec la règle modifiée appliquée hypothétiquement

4. Dry-run du smoke test avec la nouvelle règle

5. Si HS reste ≥ 0.85 ET S_global proxy stable :
   - MAJOR version bump (CORE_VERSION)
   - commit séparé "CORE AMENDMENT R-CORE-X v1.0 → v2.0"
   - mise à jour du présent document avec section « Historique »

6. Si une étape échoue : rollback immédiat
```

**Aucune modification du Core dans le même commit que d'autres changements.**

---

## 4. Versioning

| version | date | changements |
|---|---|---|
| 1.0 | 2026-05-15 | constitution initiale (R-CORE-1 à R-CORE-12) |

---

## 5. Audit programmatique

Toutes les règles R-CORE-* doivent être encodées dans `audit/oracle_rules.json`
sous le champ `core_constitutional_rules`. L'Oracle runtime DOIT vérifier
toutes ces règles à chaque opération. Une violation = `reject`.

État actuel `audit/oracle_rules.json` (P0.5) :
- R-DEN-1, R-INV-1, R-REC-1, R-MAX-1, R-INF-1, R-WP11-INFERENCE, R-S2 sont
  déjà des règles bloquantes.
- À ajouter en P0.6 : marquage explicite `severity: "constitutional"` sur
  ces règles + nouvelles R-CORE-3, R-CORE-4, R-CORE-5, R-CORE-9.

---

## 6. Limites du Core

Le Core **ne dit pas** :
- ❌ quel contenu doit avoir une loi (sémantique libre)
- ❌ quels coefficients utiliser (réservé à OracleAdaptive)
- ❌ quelle UX appliquer (libre)
- ❌ quel ordre de priorité entre familles (réservé à la gouvernance)

Le Core dit **uniquement** :
- ✅ ce qui constitue une violation **structurelle** du système
- ✅ ce qui justifie un **rollback automatique**
- ✅ ce qui ne peut **jamais** entrer dans Runtime

---

## SIGNATURE

```
DOCUMENT:             ORACLE_CORE_SPEC.md
VERSION:              1.0
RULES_DEFINED:        12 (R-CORE-1 à R-CORE-12)
MUTABILITY:           quasi-immuable
RUNTIME_ENFORCEMENT:  obligatoire (à câbler dans oracle_rules.json)
NEXT_ACTIONS:         (a) marquer ces règles dans oracle_rules.json
                          avec severity: "constitutional"
                      (b) implémenter validate_constitutional() dans
                          tools/validate_laws.py
                      (c) si modification du Core un jour requise :
                          créer audit/CORE_AMENDMENT_PROPOSAL_*.md
```

🔶
