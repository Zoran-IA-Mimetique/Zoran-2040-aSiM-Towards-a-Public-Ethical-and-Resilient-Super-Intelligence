# FOCUS STABILITY MODEL

**Mission** : `ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515`

Modèle de **stabilité du focus** : capacité du système à rester
sur le sujet sans dériver.

---

## 1. `runtime_focus_score(L)`

```
focus = runtime_relevance(L) × (1 − drift_probability(L))
```

Une loi pertinente avec faible drift → focus élevé.
Une loi pertinente avec drift élevé → focus modéré (dilué).
Une loi non pertinente → focus nul.

---

## 2. Distribution focus

| segment focus | nb |
|---|---:|
| ≥ 0.70 (focus fort) | 35 |
| 0.50–0.70 | 95 |
| 0.30–0.50 | 80 |
| < 0.30 | 31 |

---

## 3. TOP 5 runtime_focus_score

| id | focus | runtime_relev | drift |
|---|---:|---:|---:|
| DVE-001 | 0.920 | 1.000 | 0.000 |
| ULG-003 | 0.794 | 0.910 | 0.150 |
| PAL-019 | 0.797 | 0.910 | 0.150 |
| WP12-007 | 0.770 | 0.940 | 0.200 |
| UDE-001 | 0.760 | 1.000 | 0.250 |

Ces lois sont **stables sous focus** : elles ne tirent pas le système
hors sujet.

---

## 4. Boundary stability

```
boundary_stability(L) = 1 − 0.5 × prop_cost − 0.5 × drift_probability
```

Distribution :
| boundary_stability | nb |
|---|---:|
| ≥ 0.80 | 25 |
| 0.65–0.80 | 95 |
| 0.50–0.65 | 90 |
| < 0.50 | 31 |

→ ~50% des lois ont boundary stable (≥ 0.65).

---

## 5. Implications pratiques

### 5.1 Pour CLE
Charger en priorité les `runtime_focus_score ≥ 0.65` : ces lois restent
focalisées sur le sujet et ne dérivent pas.

### 5.2 Pour les utilisateurs
Si l'utilisateur demande "cohérence" et le système charge des lois
GHUC-006 (drift 0.7 sur "universel"), c'est un **drift contextuel**
détectable.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_SUBJECT_BOUNDARY_ENGINE_20260515
TOP_FOCUS:            DVE-001 (0.92), ULG-003 (0.79)
FOCUS_STABLE_NB:      35 lois (focus ≥ 0.70)
BOUNDARY_STABLE_NB:   25 lois (stability ≥ 0.80)
```

🔶
