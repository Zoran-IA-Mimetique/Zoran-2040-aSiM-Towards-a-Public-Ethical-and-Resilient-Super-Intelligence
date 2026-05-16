# ORACLE ADAPTIVE SPEC

**Mission** : `ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515`
**Timestamp** : `2026-05-15T20:23:00+02:00`

L'**OracleAdaptive** est la couche évolutive de l'Oracle. Elle **peut**
apprendre de nouveaux patterns, ajuster les seuils, intégrer de
nouvelles heuristiques — **toujours sous contrôle** de l'OracleCore
(`ORACLE_CORE_SPEC.md`).

---

## 1. Statut

| propriété | valeur |
|---|---|
| Modifiable | OUI sous validation Core |
| Auto-modifiable | NON — toute proposition passe par audit |
| Versionnement | semver, MINOR pour ajout, PATCH pour calibration |
| Rollback | toujours disponible (snapshots successifs) |

---

## 2. Périmètre

L'Adaptive prend en charge ce que le Core **ne fixe pas** :

| domaine Adaptive | exemples |
|---|---|
| seuils numériques | `density_soft`, `density_hard`, `chaos_entropy_threshold`, `false_coherence_gap_warn`, `correlation_local_global_warn` |
| coefficients de formules | α, β, γ, δ pour S_global ; poids HS |
| heuristiques de détection | gravitational attractor (`R-ISO-1`), composition counting |
| critères de quarantaine sandbox | decay rules, promotion rules |
| dictionnaires de synonymie | pour `GHUC-002-b-i` |
| profils de calibration | par contexte d'usage (production, demo, pédagogique) |

L'Adaptive **ne touche pas** :
- les 12 règles R-CORE-*
- la liste des familles canoniques
- le schéma des nœuds / arêtes (réservé Core via MAJOR)
- le pipeline 6-phases (réservé Core)

---

## 3. Modèle de mise à jour

### 3.1 Source des propositions

Les propositions d'ajustement viennent de :

| source | type |
|---|---|
| Audit Oracle continu | détection de drift (ex. corrélation L/G monte) |
| Mission utilisateur explicite | ajustement ciblé (ex. « relâcher R-S2 ») |
| Évaluation post-batch | feedback intégré après chaque ajout (ex. P1) |
| Tests croisés | détection systématique (ex. `tools/demonstrate_all_laws.py`) |

### 3.2 Pipeline de validation Adaptive

```
1. Adaptive propose un changement (PROPOSAL).
2. Core évalue : la proposition viole-t-elle une R-CORE-* ?
   - OUI → REJECT immédiat, log dans audit/ADAPTIVE_REJECTIONS.log
   - NON → étape 3
3. Dry-run : appliquer le changement sur copie du graphe
4. Recalculer HS, S_global, fractal_families, etc.
5. Si HS_après ≥ HS_avant ET S_global_après ≥ S_global_avant − 0.02 :
   - APPROVE : appliquer la modification
   - Logger dans audit/ADAPTIVE_HISTORY.log avec snapshot avant/après
6. Sinon : REJECT + log
```

### 3.3 Versionnement

Chaque modification = bump PATCH ou MINOR :

```
ADAPTIVE_VERSION = "1.0.0"
   - PATCH : ajustement de seuil (ex. 1.0.0 → 1.0.1)
   - MINOR : nouvelle heuristique ou règle Adaptive (ex. 1.0.0 → 1.1.0)
   - MAJOR : réservé Core
```

---

## 4. Heuristiques Adaptive actuelles

### 4.1 Calibration des seuils

Tous les seuils dans `audit/oracle_rules.json` champ `thresholds` sont
gérés par Adaptive. Valeurs courantes (héritées P0.5) :

| seuil | valeur | origine |
|---|---|---|
| `density_soft` | 2.8 | empirique P0.5 |
| `density_hard` | 3.5 | empirique P0.5 |
| `false_coherence_gap_warn` | 0.30 | WP11-005 |
| `chaos_entropy_threshold` | 0.20 | empirique |
| `correlation_local_global_warn` | 0.60 | WP11-004 |
| `JS_divergence_max_for_auto_similarity` | 0.15 | fractal P3 |
| `compositions_required_for_S_global_scalar` | 3 | R-S2 |

Toute modification de ces seuils = mise à jour `oracle_rules.json` +
log Adaptive.

### 4.2 Calibration des coefficients S_global

| coefficient | valeur | rôle |
|---|---|---|
| α (C_struct) | 0.35 | poids intégrité refs |
| β (C_composition) | 0.40 | poids compositions opératoires |
| γ (C_iso) | 0.15 | poids iso avec invariants |
| δ (contradictions_density penalty) | 0.10 | pénalité contradictions |

Recommandé en P0.6 : recalibrer via `WP11-006` (Calibration de S_global)
sur jeu d'audits historiques.

### 4.3 Calibration HS

| coefficient | valeur |
|---|---|
| inflation_weight | 0.25 |
| fractal_weight | 0.30 |
| composition_weight | 0.20 |
| iso_invariants_weight | 0.15 |
| contradictions_weight | 0.10 |

Recommandation HS_v2 (cf. `HS_EVOLUTION.md §5`) : redistribuer pour
inclure un terme `robustness_under_perturbation` (nouvelle heuristique
Adaptive).

---

## 5. Détection de drift

L'Adaptive surveille en continu :

| métrique | seuil de drift |
|---|---|
| HS variation > 0.10 sur 10 audits consécutifs | alerte |
| corrélation L/G > 0.70 sustained | alerte critique |
| compositions admissibles ratio < 0.80 | alerte |
| ratio de quarantine > 0.50 sur batch | alerte (pipeline trop strict) |
| ratio de quarantine < 0.05 sur batch | alerte (pipeline trop laxiste) |

Sur alerte critique : Adaptive propose ajustement → Core évalue.

---

## 6. Mémoire Adaptive

Adaptive maintient :

```
audit/ADAPTIVE_STATE.json (proposed format)
{
  "version": "1.0.0",
  "thresholds": {...},        # copie courante
  "history": [
    {
      "ts": "ISO",
      "change": "thresholds.density_soft 2.8 → 3.0",
      "reason": "...",
      "HS_before": 0.80, "HS_after": 0.81,
      "approved_by": "core_dryrun_pass"
    }
  ]
}
```

À chaque opération, l'historique est append-only (jamais effacé) — c'est
la mémoire d'apprentissage.

---

## 7. Garde-fou anti-dérive

L'Adaptive **ne peut pas** s'auto-modifier sans Core. Concrètement :

```
function adaptive_propose(change):
    core_violations = check_against_R_CORE_rules(change)
    if core_violations:
        log_rejection(change, core_violations)
        return REJECT

    snapshot = current_state()
    apply_dryrun(change)
    metrics_after = audit_full()

    if metrics_after.HS < metrics_after.HS_before:
        rollback_dryrun()
        log_rejection(change, "HS degraded")
        return REJECT

    if metrics_after.S_global_proxy < snapshot.S_global_proxy - 0.02:
        rollback_dryrun()
        log_rejection(change, "S_global degraded > 0.02")
        return REJECT

    commit_change(change)
    log_approval(change, snapshot, metrics_after)
    return APPROVE
```

---

## 8. Interaction avec Discovery Sandbox

Adaptive observe Discovery Sandbox (`DISCOVERY_SANDBOX_SPEC.md`) :

- Si une loi sandbox prouve sa stabilité (composition, fractalité) →
  Adaptive **propose** sa promotion vers CanonicalGraph.
- Le Core vérifie la conformité, puis APPROVE ou REJECT.
- Adaptive **n'a pas** le pouvoir d'écrire directement dans
  CanonicalGraph.

---

## 9. Anti-règles Adaptive

L'Adaptive **ne doit JAMAIS** :

- ❌ s'auto-élargir le périmètre (ex. modifier R-CORE-* sous prétexte d'« amélioration »)
- ❌ se court-circuiter le dryrun
- ❌ accepter un changement qui dégrade HS « parce que c'est temporaire »
- ❌ lisser des contradictions (cf. R-CORE-9 : contradicts symétrique)
- ❌ activer un mode « relax » global

---

## SIGNATURE

```
DOCUMENT:             ORACLE_ADAPTIVE_SPEC.md
VERSION:              1.0
SCOPE:                seuils, coefficients, heuristiques, calibrations
NON_SCOPE:            R-CORE-*, familles canoniques, schémas, pipeline 6-phases
GOVERNANCE:           toute proposition passe par Core dryrun
ROLLBACK:             snapshot avant chaque modification
NEXT_ACTIONS:         (a) créer audit/ADAPTIVE_STATE.json (état courant)
                      (b) câbler audit/ADAPTIVE_HISTORY.log (append-only)
                      (c) recalibrer α,β,γ,δ via WP11-006 sur jeu d'audits
                      (d) implémenter HS_v2 avec terme robustness
```

🔶
