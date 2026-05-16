# LAW RELEVANCE INDEX ENGINE

**Mission** : `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Timestamp** : `2026-05-16T02:04:00+02:00`
**Cross-refs** : `LAW_RETENTION_THRESHOLDS.md`, `CANONICAL_SELECTION_SYSTEM.md`,
`LAW_PROVENANCE_ENGINE.md`

Spec principale du moteur de pertinence. Calcule **8 scores** par loi et
détermine sa destination dans le pipeline de rétention.

---

## 1. Les 8 scores

| score | formule |
|---|---|
| `structural_uniqueness` | `1 − (taille_famille − 1)/50`, capé [0, 1] |
| `cross_domain_relevance` | 0.85 si ≥3 domaines · 0.65 si =2 · 0.45 si =1 · 0.30 sinon |
| `anti_hallucination_value` | `anti_hallucination_score + 0.20` si `kind ∈ {boundary, contradicts}` |
| `propagation_efficiency_v2` | `(impact / max(0.05, prop_cost)) / 4 + 0.10`, capé [0, 1] |
| `runtime_usefulness` | `0.35·velocity + 0.25·propag_v2 + 0.20·anti_hallu + 0.20·frugality` |
| `temporal_survival` | hérité (calculé en amont) |
| `law_relevance_index` | composite (cf. §2) |
| `keep_probability` | LRI + bonus − malus (cf. §3) |

---

## 2. Law Relevance Index (LRI)

```
LRI = 0.25 · runtime_usefulness
    + 0.20 · propagation_efficiency_v2
    + 0.15 · temporal_survival
    + 0.15 · cross_domain_relevance
    + 0.10 · anti_hallucination_value
    + 0.10 · structural_uniqueness
    + 0.05 · llm_relevance_score
```

Plage [0, 1]. Composite calibré pour favoriser :
1. utilité runtime (poids cumulé 0.45 via runtime + propagation)
2. portée temporelle et inter-domaine (0.30)
3. unicité structurelle + anti-hallu (0.20)
4. signal LLM secondaire (0.05)

→ **avg_law_relevance_index = 0.576** sur les 241 lois canoniques.

---

## 3. Keep Probability (KP)

```
KP = LRI
   + 0.10 si superior_law_candidate
   + 0.15 si attractor_tier == "fondateur"
   − 0.20 si experimental_classes == ["toxique_propagationnelle"]
```

Capé [0, 1]. Représente la **probabilité finale** de conserver la loi.

→ **avg_keep_probability = 0.588** sur les 241 lois canoniques.

L'écart KP − LRI ≈ +0.012 reflète la dominance modeste des bonus
fondateur/supérieur sur les malus toxiques (très rares).

---

## 4. Pipeline d'exécution

```
1. Charger laws.json (241 nœuds)
2. Pour chaque nœud :
     a. Calcul des 6 scores composantes
     b. LRI = composite pondéré
     c. KP  = LRI + bonus − malus
     d. retention_status = seuil(KP)   → cf. LAW_RETENTION_THRESHOLDS.md
3. Injecter les 8 scores + retention_status dans le nœud
4. Sauvegarder laws.json + écrire LAW_RELEVANCE_INDEX_REPORT.json
```

Distribution résultante : **121 runtime_candidate / 120 sandbox / 0
canonical / 0 archive / 0 purge**.

---

## SIGNATURE

```
ENGINE:               tools/law_relevance_index_engine.py
SCORES_INJECTED:      8 par loi × 241 lois
LRI_WEIGHTS:          25/20/15/15/10/10/5
BONUSES:              superior +0.10, fondateur +0.15
MALUS:                toxique_propagationnelle −0.20
AVG_LRI:              0.576
AVG_KP:               0.588
REPORT:               audit/LAW_RELEVANCE_INDEX_REPORT.json
```

🔶
