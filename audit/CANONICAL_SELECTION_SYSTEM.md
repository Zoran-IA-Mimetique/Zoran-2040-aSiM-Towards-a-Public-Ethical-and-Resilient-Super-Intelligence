# CANONICAL SELECTION SYSTEM

**Mission** : `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Timestamp** : `2026-05-16T02:04:00+02:00`
**Cross-refs** : `LAW_RELEVANCE_INDEX_ENGINE.md`, `LAW_RETENTION_THRESHOLDS.md`,
`DISCOVERY_SANDBOX_SPEC.md`

Système qui pilote la circulation d'une loi entre les **5 tiers de
rétention**. Aucune purge automatique ; promotion uniquement via revue
explicite.

---

## 1. Pipeline de sélection

```
┌──────────────────────────┐
│ LAW_RELEVANCE_INDEX      │   calcule KP par loi
│       ENGINE             │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ retention_status         │   mapping KP → label
│ = seuil(KP)              │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ Revue manuelle / Adaptive│   décide promotion / démotion
│ (jamais auto)            │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│ Mouvement de tier        │   move(file) + log audit
└──────────────────────────┘
```

---

## 2. Transitions autorisées

| from → to | déclencheur | exigence |
|---|---|---|
| `sandbox` → `runtime_candidate` | KP franchit 0.60 sur 2 runs | Core APPROVE |
| `runtime_candidate` → `canonical` | KP ≥ 0.80 + frames complets | Core APPROVE |
| `canonical` → `runtime_candidate` | HS_avec < HS_sans (dégradation) | Adaptive démote |
| `runtime_candidate` → `sandbox` | KP retombe < 0.60 sur 2 runs | auto-label |
| `sandbox` → `archive` | KP < 0.40 stable sur 3 runs | auto-label |
| `archive` → `purge_candidate` | KP < 0.20 | **revue obligatoire** |

→ Une loi peut donc se déplacer dans les deux sens. Aucune transition
n'est destructive sans intervention humaine.

---

## 3. Garanties non-destructives

- **Pas de purge automatique** : `purge_candidate` est un *label*, jamais
  un `rm`. Suppression réelle uniquement après revue explicite + log.
- **Archive = dead-letter conservé** : la loi reste dans `laws.json` (ou
  `laws_sandbox.json`) avec `retention_status = "archive"`. Lisible
  par les audits historiques.
- **Filiation préservée** : même si une loi est archivée, ses
  `child_laws` continuent d'exister et leur `derivation_chain` la
  référence (cf. `LAW_PROVENANCE_ENGINE.md` §1).

---

## 4. État actuel

Sur les 241 lois canoniques :
- **121 runtime_candidate** → éligibles au chargement runtime
- **120 sandbox** → en incubation, non chargées par défaut
- **0 archive / 0 purge** → corpus globalement actif

avg_LRI = 0.576 · avg_KP = 0.588 → le système est en **régime nominal**
sans nécessiter de promotion ou démotion à ce stade.

Recommandation : laisser 30 jours d'observation runtime avant la
première vague de promotion `runtime_candidate → canonical` (cf.
`LAW_RETENTION_THRESHOLDS.md` §4 pour recalibration v2).

---

## SIGNATURE

```
PIPELINE:             KP → retention_status → revue → mouvement
TRANSITIONS:          6 (3 promotions / 3 démotions)
AUTO_PURGE:           false
ARCHIVE_POLICY:       conservé en place avec label
CURRENT_STATE:        121 RC + 120 SBX (0 canonical, 0 archive, 0 purge)
NEXT_REVIEW:          +30 jours runtime avant 1ère promotion
```

🔶
