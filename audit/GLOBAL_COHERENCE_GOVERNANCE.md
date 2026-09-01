# GLOBAL COHERENCE GOVERNANCE

**Mission** : `ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515`
**Timestamp** : `2026-05-15T20:23:00+02:00`

Document de gouvernance globale du système ZORAN. Synthétise les rôles,
flux, responsabilités, et procédures de décision entre les 5 couches.

---

## 1. Architecture en 5 couches

```
   ┌────────────────────────────────────────────────┐
   │          USER (humain, agent externe)          │
   └───────────────────────┬────────────────────────┘
                           │ requêtes
                           ▼
   ┌────────────────────────────────────────────────┐
   │  L5 — ZEN RUNTIME (cortex opérationnel)        │
   │  • lit CanonicalGraph en read-only              │
   │  • charge contextuel via CLE                    │
   │  • compose lois validées                        │
   │  • répond ou refuse — jamais ne devine         │
   └───────────────────────┬────────────────────────┘
                           │ requête
                           ▼
   ┌────────────────────────────────────────────────┐
   │  L4 — CANONICAL GRAPH (mémoire stable)          │
   │  • lois validées                                │
   │  • compositions démontrées                      │
   │  • runtime_admissible = true                    │
   └─────────────┬────────────────────┬──────────────┘
                 ▲                    │
        promotion│         demotion   │
                 │                    ▼
   ┌────────────────────────────────────────────────┐
   │  L3 — ORACLE                                   │
   │  ┌──────────────────────┐  ┌────────────────┐  │
   │  │  CORE (R-CORE-1..12) │  │ ADAPTIVE       │  │
   │  │  immuable            │←─│ seuils,        │  │
   │  │                      │  │ heuristiques   │  │
   │  └──────────────────────┘  └────────────────┘  │
   └─────────────────────────┬──────────────────────┘
                             │ APPROVE / REJECT
                             ▼
   ┌────────────────────────────────────────────────┐
   │  L2 — DISCOVERY SANDBOX                        │
   │  • lois en incubation                          │
   │  • _sandbox: true, runtime_admissible: false   │
   │  • decay / archive / promotion                 │
   └─────────────────────────┬──────────────────────┘
                             │ produce(L_candidate)
                             ▼
   ┌────────────────────────────────────────────────┐
   │  L1 — DISCOVERY ENGINE (créatif libre)          │
   │  • exploration                                 │
   │  • génération de candidats                     │
   │  • ne touche RIEN au runtime                   │
   └────────────────────────────────────────────────┘
```

---

## 2. Rôles et responsabilités

| couche | écrit | lit | rôle |
|---|---|---|---|
| L5 ZenRuntime | rien | CanonicalGraph | répondre à l'utilisateur |
| L4 CanonicalGraph | promotion via L3 ; demotion via L3 | L3 | mémoire long-terme stable |
| L3 OracleCore | jamais sans MAJOR amendment | L4 + L2 | constitutionnalité |
| L3 OracleAdaptive | seuils + heuristiques sous Core | L4 + L2 + L1 | adaptation calibrée |
| L2 DiscoverySandbox | candidates | propres + L4 | incubation |
| L1 DiscoveryEngine | candidates → L2 | externe | créativité libre |
| User | rien directement | L5 + audit | requérir, valider, contester |

---

## 3. Flux de décision

### 3.1 Ajout d'une nouvelle loi

```
USER (mission de découverte)
  → DiscoveryEngine.produce(L_candidate)
  → DiscoverySandbox.add(L_candidate, _sandbox_state="incubation")
  → [L_candidate gagne en compositions au fil du temps via L1+L2]
  → OracleAdaptive.observe → _promotion_score ≥ 0.75
  → OracleAdaptive.propose_promotion(L_candidate)
  → OracleCore.dryrun_against_R_CORE_*(L_candidate)
  → si APPROVE :
       CanonicalGraph.add(L_candidate, runtime_admissible=true)
       audit/PROMOTION_LOG.json append
       ZenRuntime invalide son cache CLE
  → si REJECT :
       L_candidate reste dans Sandbox
       _promotion_score required +0.10 (anti-thrashing)
```

### 3.2 Modification d'une loi canonique

```
USER (mission de modification)
  → ne peut pas modifier L4 directement
  → demande passe par DiscoveryEngine comme proposition de modification
  → OracleAdaptive : analyse impact sur HS, S_global, fractal_families
  → OracleCore : vérification R-CORE-* (DAG, frames, etc.)
  → si APPROVE :
       CanonicalGraph.modify(law)
       audit/MODIFICATION_LOG.json append avec hash before/after
       ZenRuntime invalide cache
  → si REJECT :
       proposition rejetée avec raison
```

### 3.3 Démotion / suppression

```
audit détecte qu'une loi canonique dégrade HS
  → OracleAdaptive.propose_demotion(law)
  → OracleCore.dryrun(graphe sans la loi)
  → si HS_sans > HS_avec :
       APPROVE
       CanonicalGraph.remove(law) → DiscoverySandbox.add(law, _sandbox_state="review")
       audit/DEMOTION_LOG.json append
       ZenRuntime invalide cache
  → si HS dégrade en absence :
       loi maintenue dans CanonicalGraph (essentielle)
       log "demotion attempted but law is structural"
```

### 3.4 Modification du Core

```
USER (mission MAJOR amendment)
  → audit/CORE_AMENDMENT_PROPOSAL_<id>.md créé
  → mode emergency-only sur tout autre changement
  → audit complet dryrun
  → smoke test
  → si tous les checks passent :
       Core mis à jour (semver MAJOR bump)
       ORACLE_CORE_SPEC.md mis à jour avec section Historique
  → sinon : rollback immédiat, proposal closed
```

---

## 4. Pipeline obligatoire pour toute action

Toute action sur le système doit suivre :

```
1. IDENTIFY : qu'est-ce qui est demandé ?
2. CLASSIFY : quelle couche affecte cette action ?
   - L1/L2 : libre (sandbox, expérimental)
   - L4 : passe par L3 (Oracle)
   - L3 Adaptive : sous validation Core
   - L3 Core : MAJOR amendment seulement
   - L5 : read-only
3. VALIDATE : le pipeline 6-phases s'applique-t-il ?
   - oui pour tout ajout L4
4. EXECUTE : appliquer (avec snapshots)
5. AUDIT : recompute HS, S_global, etc.
6. ROLLBACK SI dégradation
7. LOG : tracer dans audit/
```

---

## 5. Métriques de gouvernance

À auditer en continu :

| métrique | seuil sain | alerte si |
|---|---|---|
| HS | ≥ 0.85 | descente continue 3 audits |
| S_global proxy | stable ± 0.02 | chute > 0.05 |
| inflation_ratio | ≤ 0.05 | montée > 0.05 |
| sandbox_size / canonical_size | ≤ 0.30 | > 0.50 (sandbox grossit trop) |
| promotion_rate | 0.05–0.30 | < 0.05 (DiscoveryEngine produit trop de bruit) ou > 0.50 (Adaptive trop laxiste) |
| demotion_rate | < 0.10 / 90j | > 0.20 (Canonical fragile) |
| MAJOR amendments | 0 / mois en régime stable | > 1 (instabilité Core) |
| runtime refusal rate | < 0.15 (utilisable) | > 0.40 (CanonicalGraph trop pauvre) |

---

## 6. Règles de quorum (futur multi-utilisateur)

Pour l'instant, un seul "auteur" (humain + Claude). Pour un déploiement
multi-utilisateur :

| action | quorum requis |
|---|---|
| Ajout de loi sandbox | 1 (libre) |
| Promotion sandbox → canonical | 2 (auteur + Oracle review) |
| Modification canonical | 2 (auteur + Oracle Core review) |
| Suppression canonical | 3 (auteur + Oracle + Audit externe) |
| Modification R-CORE-* | unanimité documentée |

---

## 7. Audit trail obligatoire

Chaque opération produit un log en append-only :

```
audit/
├── PROMOTION_LOG.json
├── DEMOTION_LOG.json
├── MODIFICATION_LOG.json
├── REJECTION_LOG.json
├── CORE_AMENDMENT_LOG.json
├── ADAPTIVE_HISTORY.log
├── RUNTIME_TELEMETRY.log
├── CLE_TELEMETRY.log
└── ORACLE_DECISIONS.log
```

Aucun log n'est modifié rétroactivement. Ils constituent la **mémoire
épistémique** de la gouvernance.

---

## 8. Indicateurs de santé globale

À chaque audit complet, calculer :

```
zoran_health = {
  "HS": ...,
  "S_global_proxy": ...,
  "fractal_families": ...,
  "inflation_ratio": ...,
  "compositions_demonstrated": ...,
  "sandbox_size": ...,
  "canonical_size": ...,
  "ratio_sandbox_canonical": sandbox / canonical,
  "promotion_rate_30d": ...,
  "demotion_rate_30d": ...,
  "runtime_refusal_rate_30d": ...,
  "core_amendments_total": ...,
  "last_amendment_ts": ...,
  "dominant_family": family with most laws,
  "fractal_families_list": [...],
  "anti_pattern_count_quarantine": ...,
  "audit_trail_completeness": (logs presents) / (logs expected)
}
```

Cet objet est l'**état de santé instantané** du système. À publier dans
`audit/HEALTH_REPORT.json` à chaque audit majeur.

---

## 9. Procédures d'urgence

### 9.1 Si HS chute brutalement (-0.15 ou plus)

1. **Geler** tout ajout L4
2. Audit complet immédiat
3. Identifier la dernière modification cause via INTEGRATION_LOG
4. Proposer rollback
5. Si rollback échoue à restaurer HS → escalation Core amendment

### 9.2 Si CanonicalGraph corrompu (refs cassées, JSON invalide)

1. Restaurer dernier snapshot Git
2. Audit complet
3. Identifier la cause
4. Renforcer la validation pour bloquer la cause

### 9.3 Si Sandbox grossit dangereusement (> 50% du canonical)

1. Geler nouvel ajout sandbox
2. Forcer promotion ou archive sur les plus anciennes
3. Recalibrer DiscoveryEngine pour produire moins, mieux

---

## 10. Principes de gouvernance

1. **Pas d'opacité.** Tout passe par audit log.
2. **Pas d'irréversibilité.** Tout a un rollback path.
3. **Pas d'autorité unique.** Core ↔ Adaptive ↔ Sandbox ↔ Canonical.
4. **Pas de croissance sans démonstration.** Pipeline 6-phases obligatoire.
5. **Pas de validation par accumulation.** Volume ≠ vérité.
6. **Pas de label sans preuve.** Cite ou n'écris pas.
7. **Pas de hubris d'échelle.** Les `limits` sont obligatoires partout.

---

## SIGNATURE

```
DOCUMENT:             GLOBAL_COHERENCE_GOVERNANCE.md
VERSION:              1.0
LAYERS:               5 (Discovery → Sandbox → Oracle → Canonical → Runtime)
DECISION_FLOW:        documented with explicit pipeline
EMERGENCY_PROTOCOLS:  3 (HS chute, corruption, sandbox blow)
GOVERNANCE_PRINCIPLES: 7
AUDIT_LOGS:           9 (append-only)
NEXT_ACTIONS:         (a) créer audit/HEALTH_REPORT.json (état santé)
                      (b) créer dossier audit/logs/ pour append-only
                      (c) câbler audit après chaque action
```

🔶
