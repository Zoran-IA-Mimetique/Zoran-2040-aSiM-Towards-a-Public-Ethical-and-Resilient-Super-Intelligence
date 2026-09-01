# RUNTIME BOUNDARY RULES

**Mission** : `ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515`

Règles de bornage runtime : ce que ZenRuntime peut/doit/ne doit pas
charger.

---

## 1. Règles d'admission runtime

Pour qu'une loi soit chargée par CLE :

```
LOAD(L, query) ⟺
    L.runtime_admissible == true
  ∧ L.boundary_score ≥ 0.30
  ∧ L.drift_probability ≤ 0.60
  ∧ L.S_propagated ≥ 0.60
  ∧ topic_distance(L, query) ≤ 3
```

5 critères cumulatifs. Tout échec = refus de charger.

---

## 2. Règles de priorité (ordre de chargement)

```
priority = L.boundary_score × L.contextual_priority × (1 − L.drift_probability)
```

Tri descending → charger les top-N premier (N borné par `N_max=30`).

---

## 3. Règles d'arrêt propagation

```
STOP propagation BFS quand :
   depth atteint propagation_depth_limit(L)
  OU L.drift_probability > 0.60
  OU L.boundary_score < 0.30
  OU N total chargé ≥ 50 (cap absolu)
```

---

## 4. Cas d'usage

### 4.1 Question utilisateur générale : "cohérence locale vs globale"

Pipeline :
1. Anchors = WP11-001, WP11-002, WP11-003, WP11-004 (mots-clés détectés)
2. BFS depth=2 depuis ces ancres
3. Filtrer par boundary_score ≥ 0.30
4. Cap à N=30 par contextual_priority

Lois chargées attendues : famille WP11 entière + ISO-002 vers WP12 +
quelques compositions.

Lois **NON** chargées : ULG-005 (palieronique propagation), même si
liée à WP11 distantement — sa topic_distance > 3.

### 4.2 Question hors-sujet : "Comment cuisiner du riz ?"

Pipeline :
1. Aucun anchor lexical
2. Refus immédiat
3. Runtime répond "Aucune loi pertinente dans CanonicalGraph"

---

## 5. Anti-règles

ZenRuntime ne doit JAMAIS :
- ❌ charger une loi avec `drift_probability > 0.80` (forte dérive)
- ❌ charger une loi sans `runtime_admissible`
- ❌ dépasser N_max_hard = 50 lois
- ❌ charger les sandbox laws (laws_sandbox.json séparé)
- ❌ ignorer le `topic_distance`

---

## 6. Telemetry

Toutes les actions de chargement loggées :

```jsonc
{
  "ts": "...", "query": "...",
  "anchors": [...],
  "loaded_count": N,
  "loaded_ids": [...],
  "refused_count": M,
  "refused_reasons": {"drift_too_high": K, "boundary_too_low": L, ...},
  "depth_used": d,
  "duration_ms": t
}
```

Append-only dans `audit/RUNTIME_BOUNDARY_TELEMETRY.log` (futur P0.7+).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515
ADMISSION_CRITERIA:   5 cumulatifs
STOP_CONDITIONS:      4 (depth, drift, boundary, cap)
ANTI_RULES:           5
```

🔶
