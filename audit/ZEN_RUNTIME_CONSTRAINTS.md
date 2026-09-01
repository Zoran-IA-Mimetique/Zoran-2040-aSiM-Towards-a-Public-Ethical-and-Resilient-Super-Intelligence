# ZEN RUNTIME CONSTRAINTS

**Mission** : `ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515`
**Timestamp** : `2026-05-15T20:23:00+02:00`

Le **ZenRuntime** est la couche cognitive **opérationnelle**. Elle ne
découvre pas, ne spéculate pas, n'expérimente pas. Elle **charge,
compose, applique, contextualise, stabilise**.

---

## 1. Statut

| propriété | valeur |
|---|---|
| Lit | `app/data/laws.json` (CanonicalGraph) UNIQUEMENT |
| Écrit | RIEN dans CanonicalGraph |
| Écrit dans Sandbox | RIEN |
| Écrit dans Adaptive | RIEN |
| Écrit dans Core | INTERDIT ABSOLUMENT (R-CORE-1) |
| Production | sortie utilisateur (réponses, visualisations, audits ad hoc) |

**Règle absolue** : ZenRuntime est en **READ-ONLY** sur toutes les couches
de gouvernance. Toute modification du graphe passe par
DiscoveryEngine → Sandbox → Adaptive → Core → CanonicalGraph.

---

## 2. Contrainte de chargement contextuel

### 2.1 Pas de chargement intégral

```
INTERDIT : ZenRuntime.load_all_laws()
```

ZenRuntime **ne charge jamais** la totalité du graphe à chaque opération.
Pour 91 lois c'est tolérable, pour 191 lois encore, pour 1000+ : collapse
contextuel.

### 2.2 Chargement par sous-graphe

Pour chaque opération (réponse à une question, audit ad hoc, etc.) :

```
runtime.respond(question):
    relevant_laws = ContextualLoadingEngine.select(question, budget=N_max)
    # cf. CONTEXTUAL_LOADING_ENGINE.md
    subgraph = extract_subgraph(relevant_laws)
    return compose_response(subgraph, question)
```

### 2.3 Budget de chargement

| paramètre | valeur par défaut |
|---|---|
| `N_max` (lois max chargées par opération) | 30 |
| `depth_max` (profondeur de BFS depuis lois ancres) | 2 |
| `kinds_explored` | parent, iso, related |
| `kinds_excluded_by_default` | absorbed_into, depends |

Ces budgets sont gérés par OracleAdaptive (calibration possible).

---

## 3. Filtrage runtime_admissible

```
runtime.load(law_id):
    law = CanonicalGraph.get(law_id)
    if not law:
        return null  # silent miss
    if not law.runtime_admissible:
        # ne devrait jamais arriver dans CanonicalGraph mais double-check
        log_warning(f"runtime_admissible=false on canonical law {law_id}")
        return null
    return law
```

Le double-check est une **ceinture-bretelles** : Sandbox et Canonical sont
séparés physiquement, mais le filtre runtime garantit qu'aucune erreur
de fichier ne fasse fuiter du contenu non admissible.

---

## 4. Composition à l'exécution

ZenRuntime peut composer plusieurs lois pour répondre :

```
runtime.compose(law_a, law_b, context):
    # vérifier qu'une composition existe dans CanonicalGraph
    composition = CanonicalGraph.find_composition(law_a.id, law_b.id)
    if composition is None:
        # pas de composition démontrée — refuser de composer
        return refuse(reason="composition not demonstrated")
    # appliquer la composition selon ses invariants préservés
    return apply_composition(composition, context)
```

**Refus si pas de composition démontrée** : ZenRuntime n'invente pas de
nouvelles compositions à l'exécution. Si une composition est nécessaire
mais non démontrée, c'est un signal pour DiscoveryEngine.

---

## 5. Anti-règles runtime

ZenRuntime **ne doit JAMAIS** :

| anti-règle | raison |
|---|---|
| ❌ Inférer S_global d'un sous-graphe | violation R-CORE-2 (S_global est systémique) |
| ❌ Affirmer une propriété sans citer la loi de preuve | hallucination |
| ❌ Prendre des décisions hors du périmètre des lois chargées | hubris d'échelle |
| ❌ Composer des lois sans composition démontrée | violation R-CORE-3 implicit |
| ❌ Utiliser des lois sandbox | violation R-CORE-1 |
| ❌ Modifier laws.json | violation read-only |
| ❌ Charger plus de N_max lois | violation budget |
| ❌ Spéculer sur des lois absentes du graphe | hallucination |

---

## 6. Mécanisme d'auto-limitation

```
runtime.respond(question):
    laws_needed = analyze_question(question)
    laws_available = ContextualLoadingEngine.select(question)

    if not laws_available:
        return refuse_with_reason(
            "Aucune loi pertinente démontrée dans CanonicalGraph "
            "pour cette question. Explorer via DiscoveryEngine."
        )

    if laws_needed - laws_available:  # set difference
        return partial_response(laws_available,
            note=f"Réponse partielle. Lois manquantes : {missing}. "
                 f"À explorer via DiscoveryEngine.")

    return full_response(laws_available)
```

Le runtime **dit ce qu'il ne sait pas** plutôt que d'inventer.

---

## 7. Mode "audit ad hoc"

L'utilisateur peut demander un audit sur une loi spécifique sans
interrogation cognitive :

```
runtime.audit(law_id):
    if not CanonicalGraph.contains(law_id):
        return f"{law_id} pas dans CanonicalGraph"
    law = CanonicalGraph.get(law_id)
    return {
        "id": law.id,
        "frames": law.frames,
        "compositions": find_compositions(law.id),
        "S_local": law.S_local,
        "S_global_proxy": global_proxy(),
        "runtime_admissible": law.runtime_admissible,
        "fractal_property": is_fractal(law.family),
        "validations_passed": list_validations(law)
    }
```

Cette fonction est **read-only** et ne déclenche aucun calcul global.

---

## 8. Mode "explore"

Si l'utilisateur veut explorer du sandbox (pas du runtime) :

```
runtime.explore(law_id):
    sandbox = SandboxStore.get(law_id)  # ne touche PAS CanonicalGraph
    return {
        ...sandbox_metadata,
        "_sandbox": true,
        "warning": "Loi en incubation — non admissible runtime"
    }
```

Marquage explicite **« sandbox »** dans la réponse pour que l'utilisateur
sache qu'il regarde de l'expérimental.

---

## 9. Performance budget

| opération | budget |
|---|---|
| `runtime.load(N≤30)` | < 5 ms |
| `runtime.compose(2 lois)` | < 10 ms |
| `runtime.respond(question simple)` | < 100 ms |
| `runtime.audit(1 loi)` | < 20 ms |

Si un budget est dépassé, **dégrader gracieusement** : réduire `N_max`,
limiter `depth_max`. Ne **jamais** sacrifier la conformité aux contraintes
de chargement.

---

## 10. Telemetry runtime

Pour chaque opération runtime :

```
{
  "ts": "ISO",
  "operation": "respond" | "audit" | "explore" | "compose",
  "laws_loaded_count": N,
  "laws_loaded_ids": [...],
  "depth_used": d,
  "duration_ms": t,
  "refused_with_reason": null | "...",
  "partial_response": bool
}
```

Append-only dans `audit/RUNTIME_TELEMETRY.log` (futur P0.6+). Permet à
Adaptive de calibrer les budgets et de détecter les opérations qui
fréquemment refusent (signal pour DiscoveryEngine).

---

## 11. État courant (P1 → P1.1 architecture)

L'app actuelle (`app/index.html` + `app/src/main.js`) **n'implémente pas
encore** ces contraintes — elle charge `app/data/laws.json` intégralement
au boot et le passe à `3d-force-graph`.

Cela est acceptable car :
1. C'est un **outil d'exploration**, pas un runtime ZEN au sens cognitif
2. 91 lois est gérable en mémoire
3. L'utilisateur **navigue manuellement** — il fait son propre filtrage

Mais pour devenir un véritable ZenRuntime cognitif (futur ZEN
intégration LLM), il faut implémenter :
- Le chargement contextuel (cf. `CONTEXTUAL_LOADING_ENGINE.md`)
- Le filtrage `runtime_admissible`
- La séparation Sandbox / Canonical en deux fichiers physiques
- La telemetry

Ces implémentations sont **hors scope** de la mission Stage A actuelle —
elles font partie de la **mission ZEN_INTEGRATION** future.

---

## SIGNATURE

```
DOCUMENT:             ZEN_RUNTIME_CONSTRAINTS.md
VERSION:              1.0
LOAD_MODE:            contextual only, no full-graph load
WRITE_PRIVILEGE:      0 (READ-ONLY sur toutes les couches)
COMPOSITION_RULE:     refuse si composition non démontrée
HALLUCINATION_GUARD:  dit ce qu'il ne sait pas plutôt que d'inventer
NEXT_ACTIONS:         (a) implémenter ContextualLoadingEngine (cf. doc dédié)
                      (b) ajouter runtime_admissible:true sur les 91 lois
                      (c) câbler audit/RUNTIME_TELEMETRY.log
                      (d) la version actuelle de app/ reste un outil
                          d'exploration, pas un ZenRuntime cognitif
```

🔶
