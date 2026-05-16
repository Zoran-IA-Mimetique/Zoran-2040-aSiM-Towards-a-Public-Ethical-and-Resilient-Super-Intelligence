# COGNITIVE LOAD BOUNDARY

**Mission** : `ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515`

Bornage de la **charge cognitive** : N_max lois chargées simultanément.

---

## 1. Hard cap : N_max = 50 lois

Au-delà :
- saturation visuelle (3D)
- saturation runtime LLM
- coûts opérationnels prohibitifs
- dégradation perception utilisateur

---

## 2. Soft cap : N_recommend = 30 lois

CLE par défaut charge **30 lois max**. Cap dur 50 réservé aux audits
exhaustifs.

---

## 3. Hiérarchie de charge

1. **μ0 / μ1 attractors directement pertinents** (priorité haute)
2. **Lois enfants directs** depuis ancres
3. **Sub-attractors de chemin** (boundary_score ≥ 0.60)
4. **Compositions touchant ancres**
5. **Voisinage iso / related modéré**

L'ordre est strict par `contextual_priority`.

---

## 4. Mesures empiriques

Sur le corpus 241 lois, une requête typique active :

| catégorie | N moyen chargé |
|---|---:|
| Requête famille spécifique (ex. "WP-11") | 15–25 |
| Requête concept transverse (ex. "cohérence") | 20–30 |
| Requête vague (ex. "que dit ZORAN") | 30 (cap soft) |
| Requête hors-sujet | 0 (refus) |

---

## 5. Budget computationnel par opération

| budget | valeur |
|---|---|
| BFS expansion (depth ≤ 3) | < 10 ms |
| Filtrage boundary | < 5 ms |
| Ranking final | < 3 ms |
| Total CLE | < 20 ms |

Coûts mesurés empiriquement sur 241 lois canoniques.

---

## 6. Anti-overload protocols

Si la requête tente d'activer > 50 lois :
1. Refus immédiat avec message explicite
2. Suggestion : reformulation requête plus précise
3. Telemetry : log overload attempt

Aucune dégradation silencieuse — toujours feedback utilisateur.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515
HARD_CAP:             50 lois
SOFT_CAP:             30 lois (défaut CLE)
TYPICAL_LOAD:         15-30 selon requête
OVERLOAD_PROTOCOL:    refus + suggestion
```

🔶
