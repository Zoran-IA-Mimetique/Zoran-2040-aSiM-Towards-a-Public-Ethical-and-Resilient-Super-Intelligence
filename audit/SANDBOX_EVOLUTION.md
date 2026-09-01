# SANDBOX EVOLUTION

**Mission** : `ZORAN_REVERSIBLE_100_LAWS_PIPELINE_20260515`

État et trajectoire d'évolution de la DiscoverySandbox.

---

## 1. État actuel

| | |
|---|---:|
| Fichier | `app/data/laws_sandbox.json` |
| Schema | `sandbox_reversible_v1` |
| Nodes total | 71 (initial 100 candidats - 29 quarantinés - 0 promus = 71) |
| Edges total | 70 (parents only — pas d'iso/contradicts en sandbox initial) |
| Compositions sandbox | 0 (compositions inter-sandbox à ajouter en Phase II) |
| _sandbox_state distribution | incubation : 70 ; archived : 0 ; review : 0 ; promoted : 0 |

(Note : 1 loi rollback test SBX-ULG-101 → reste 70 incubation après nettoyage.)

---

## 2. Cycle de vie observé

```
init                  → incubation
30 jours (futur)      → si non revisitée : decay_score +0.10
contradiction         → archive_reason = "contradiction"
score > 0.7           → state = "decayed"
score > 1.0           → state = "archived" (jamais purgé)
_promotion_score≥0.75 → state = "review" → CORE dryrun → state = "promoted" si OK
```

État actuel : tous à `incubation` (instances fraîches).

---

## 3. Métriques attendues (12 mois projection)

| métrique | M+1 | M+3 | M+6 | M+12 |
|---|---:|---:|---:|---:|
| Incubation | 60 | 40 | 25 | 10 |
| Decayed | 8 | 18 | 25 | 30 |
| Archived | 2 | 10 | 15 | 25 |
| Promoted | 0 | 3 | 6 | 6 |

Promotion rate cible : ~5-15% sur 12 mois (lois robustes seules). Decay
rate cible : ~70-80% (la majorité ne survivent pas au stress
épistémologique).

---

## 4. Évolution attendue des scores

`_promotion_score` augmente si la loi gagne :
- des compositions nouvelles cross-batch
- des isomorphismes confirmés
- des invariants stables sur audits successifs

`_decay_score` augmente si :
- la loi n'est jamais revisitée par un audit
- ses dépendances sandbox sont rollback
- une contradiction non-résolue persiste

---

## 5. Mécanismes d'audit récurrents

```bash
# Audit hebdomadaire
python3 tools/sandbox_pipeline.py decay
python3 tools/sandbox_pipeline.py status

# Évaluation promotion (Adaptive auto)
# Pour chaque sandbox node :
#   if _promotion_score >= 0.75:
#     propose promote_to_core_dryrun
#     if HS_after >= HS_before:
#       commit promotion
#     else:
#       reject + +0.10 threshold required for next try
```

---

## 6. Relation avec CanonicalGraph

| invariant | preuve |
|---|---|
| Aucune fuite sandbox → canonical | fichier physiquement séparé + audit no-leak |
| Aucune fuite canonical → sandbox sauf via démotion | démotion via `tools/sandbox_pipeline.py demote` seulement |
| Réversibilité 100% | rollback testé sur SBX-ULG-101 |
| HS canonical insensible au sandbox | mesuré : 1.000 stable |

---

## 7. Cas d'usage de la sandbox

1. **Exploration libre** — DiscoveryEngine dépose ses candidats
2. **Évaluation contre stress** — chaque loi candidate testée
3. **Promotion uniquement si stable** — flux contrôlé vers canonical
4. **Mémoire épistémologique** — archived ≠ effacée, conservée
5. **Anti-thrashing** — seuil promotion +0.10 par échec

---

## SIGNATURE

```
MISSION_ID:           ZORAN_REVERSIBLE_100_LAWS_PIPELINE_20260515
TIMESTAMP:            2026-05-15T20:44:00+02:00
SANDBOX_NODES:        70 (post-rollback test)
SANDBOX_STATE:        incubation × 70 (initial state)
PROMOTION_RATE_12M:   cible 5-15%
DECAY_RATE_12M:       cible 70-80%
NEVER_PURGE:          true
```

🔶
