# ANTI-DRIFT PROTOCOL

**Mission** : `ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515`

Protocole anti-dérive contextuelle.

---

## 1. Détection de dérive

Une dérive se produit quand :
- une loi distante du sujet est chargée
- une loi à drift_probability > 0.60 entraîne d'autres
- une cascade de propagation amène hors-sujet

---

## 2. `drift_probability(L, topic_dist)`

```
drift = 0.6 × topic_dist / 4.0
      + 0.4 × (1 si description contient "universel/tout" sinon 0)
```

→ Lois éloignées et "universalisantes" ont drift élevé.

---

## 3. Top suspects (drift élevé)

| id | drift | raison |
|---|---:|---|
| GHUC-006 | 0.70 | distance 2 + mot "tout" |
| WP11-011 | 0.70 | distance 2 + "tout/universel" dans desc |
| WP12-017, -019, SDE-015 | 0.70 | similaire |

Ces lois sont **valides** dans leur scope mais doivent être **filtrées
out** des chargements pour requêtes spécifiques.

---

## 4. Actions correctives

| niveau drift | action |
|---|---|
| < 0.30 | aucune (loi normale) |
| 0.30–0.60 | warning telemetry |
| 0.60–0.80 | refus chargement sauf demande explicite |
| > 0.80 | refus catégorique |

---

## 5. Détection cascade dérive

Pendant un BFS expansion, si > 30% des nœuds candidats ont drift > 0.60,
**stop propagation immédiate** + telemetry alert "cascade dérive".

---

## 6. Récupération post-dérive

Si dérive détectée a posteriori :
1. Logger l'événement
2. Rétro-évaluer les seuils
3. Adaptive propose ajustement seuil
4. Core dryrun

---

## SIGNATURE

```
MISSION_ID:           ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515
DRIFT_FORMULA:        topic_dist + universalism penalty
SUSPECTS_IDENTIFIED:  ~10 lois à drift ≥ 0.60
CASCADE_DETECTION:    seuil 30% candidats
```

🔶
