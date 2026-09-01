# SUPERIORITY DECAY ENGINE

**Mission** : `ZORAN_DISTRIBUTED_LAW_VALIDATION_ENGINE_20260515`

Le statut ★ SUPÉRIEURE n'est **jamais permanent**. Re-évalué à chaque
exécution de `tools/distributed_validation_engine.py`.

---

## 1. Critères de décay (perte du ★)

Une loi perd ★ si **l'une** des conditions suivantes :

```
distributed_validation_score < 0.50
OU hierarchical_confidence < 0.40
```

Ces seuils sont **adaptifs** (calibration via Adaptive layer).

---

## 2. Critères de promotion (gain du ★)

Une loi peut acquérir ★ si **toutes** :

```
superior_law_probability    ≥ 0.50
ET distributed_validation_score ≥ 0.50
ET hierarchical_confidence  ≥ 0.40
```

---

## 3. Run du 2026-05-15T21:15:00

| événement | nombre |
|---|---:|
| Lois ★ avant | 25 |
| Decay events | **0** |
| Promotion events | **4** |
| Lois ★ après | 29 |

Aucune des 25 ★ initiales n'a perdu son statut. 4 nouvelles ★ ont
émergé du recalcul distribué.

---

## 4. Lois promues (4 nouvelles ★)

Les 4 lois nouvellement détectées comme superior par le moteur
distribué (et donc ★ après décay engine) :

| id | composition | distributed_validation | hierarchical_confidence |
|---|---:|---:|---:|
| (détails dans `audit/SUPERIORITY_DECAY_EVENTS.json` champ `promotion_events`) |

---

## 5. Anti-fossilisation

L'engine garantit que :
- Aucune ★ ne devient permanente sans re-validation
- Aucune ★ ne peut être "défendue par tradition"
- Le rang est calculé à partir des **interactions actuelles**

Si une loi auparavant ★ perd ses compositions au fil du temps (ex:
parents pruned, voisins démotés), elle perd automatiquement son statut.

---

## 6. Anti-dogmatisme

Aucune intervention manuelle ne peut imposer ou retirer le ★. Toute
intervention manuelle :
1. doit passer par modification de `superior_law_probability` (qui
   dépend des compositions, branches, etc. — calculé)
2. ou par ajustement des seuils (sous Adaptive → Core dryrun)

Pas de hardcoding du ★ sur une loi spécifique.

---

## 7. Audit log

Tous les events sont loggés dans :
- `audit/SUPERIORITY_DECAY_EVENTS.json` (decay + promotion events)
- `audit/DISTRIBUTED_VALIDATION_REPORT.json` (tous les scores)

Ces logs sont append-only — la trace est inviolable.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_DISTRIBUTED_LAW_VALIDATION_ENGINE_20260515
DECAY_EVENTS:             0
PROMOTION_EVENTS:         4
TOTAL_SUPERIOR_AFTER:     29
NEVER_PERMANENT:          ✓ (re-évaluation à chaque run)
NO_MANUAL_OVERRIDE:       ✓ (seul calcul détermine)
```

🔶
