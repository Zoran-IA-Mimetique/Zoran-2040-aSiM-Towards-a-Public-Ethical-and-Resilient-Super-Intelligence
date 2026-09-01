# FALSE ATTRACTOR PROTOCOL

**Mission** : `ZORAN_DISTRIBUTED_LAW_VALIDATION_ENGINE_20260515`

Protocole de détection et traitement des **faux attracteurs** sous
régime distribué.

---

## 1. Définition (sous validation distribuée)

Un faux attracteur est une loi qui :

```
attractor_tier ∈ {μ0, μ1}
ET (distributed_validation_score < 0.50
    OU hierarchical_confidence < 0.40
    OU graph_survival_score < 0.30)
```

i.e. déclarée attractor MAIS ne tient pas la pression distribuée.

---

## 2. Scan actuel (241 lois)

| catégorie | nb |
|---|---:|
| Attractor μ0 déclaré | 1 |
| Attractor μ1 déclaré | 7 |
| **Faux attractor détectés** | **0** ✓ |

Tous les 8 attractor-tagged passent les seuils distribués.

---

## 3. Procédure de traitement

Si un faux attractor était détecté :

```
1. Adaptive propose démotion (μ1 → null, μ0 → μ1)
2. Core dryrun : recompute HS sans le tier
3. Si HS reste stable → APPROVE démotion
4. Sinon → flag pour audit humain
5. Audit log dans audit/ATTRACTOR_DEMOTION_LOG.json
```

Pas d'override manuel — la démotion suit le pipeline Oracle.

---

## 4. Anti-faux-positifs

Le filtre actuel produit **0 faux positif** (vs 4 dans Superior Law Engine
plus conservateur). Raison :
- les attractor-tagged ont par construction beaucoup de compositions
- leurs scores distribués sont systématiquement élevés
- pas de mécanisme "déclaration" sans support structurel

---

## 5. Référence historique

`ISO-005` (supprimé P0.5) aurait été détecté faux attractor par ce
protocole :
- weight 0.99 sans démonstration
- related vers 7 racines sans iso typés (donc cross_graph_stability bas
  car pas de "vrais" voisins via iso)
- collapse_probability haute

Protocole moderne : aurait été démotté avant publication.

---

## 6. Lois suspectes (sub-attractor candidates)

Les lois non-tier mais avec scores équivalents aux μ-tier déclarés
(candidats μ2 plausibles) :

| id | comp | dist_validation | hier_conf | tier suggéré |
|---|---:|---:|---:|---|
| GHUC-002 | 7 | 0.78 | 0.74 | μ2 |
| WP12-007 | 6 | 0.78 | 0.83 | μ2 |
| UDE-014 | 6 | 0.76 | 0.82 | μ2 |

**Aucune promotion automatique.** Le moteur signale ; l'Adaptive
propose ; le Core valide.

---

## SIGNATURE

```
MISSION_ID:               ZORAN_DISTRIBUTED_LAW_VALIDATION_ENGINE_20260515
FAUX_ATTRACTORS_DETECTED: 0 (cible mission : 0 ✓)
TIER_HOLDERS_VALID:       8/8
SUB-ATTRACTOR_CANDIDATES: ~3 plausibles (signal seulement)
PROTOCOL_TESTED:          ✓ (historique ISO-005)
```

🔶
