# LAW RETENTION THRESHOLDS

**Mission** : `ZORAN_LAW_PROVENANCE_AND_RELEVANCE_INDEX_SYSTEM_20260516`
**Timestamp** : `2026-05-16T02:04:00+02:00`
**Cross-refs** : `LAW_RELEVANCE_INDEX_ENGINE.md`, `CANONICAL_SELECTION_SYSTEM.md`

Système des 5 seuils de rétention basés sur `keep_probability`. Cartographie
chaque loi vers un statut opérationnel sans purge automatique.

---

## 1. Les 5 seuils

```
keep_probability ≥ 0.80   → canonical            (noyau certifié)
0.60 ≤ KP < 0.80          → runtime_candidate    (chargeable runtime)
0.40 ≤ KP < 0.60          → sandbox              (incubation)
0.20 ≤ KP < 0.40          → archive              (dead-letter conservé)
       KP < 0.20          → purge_candidate      (proposé suppression)
```

Aucune transition n'est automatique : `retention_status` est un **label**
qui alimente la pipeline `CANONICAL_SELECTION_SYSTEM.md` (revue manuelle
ou Adaptive).

---

## 2. Distribution actuelle (241 lois canoniques)

| statut | nb | % | seuil |
|---|---:|---:|---|
| `canonical` | 0 | 0.0% | KP ≥ 0.80 |
| `runtime_candidate` | **121** | **50.2%** | 0.60–0.80 |
| `sandbox` | **120** | **49.8%** | 0.40–0.60 |
| `archive` | 0 | 0.0% | 0.20–0.40 |
| `purge_candidate` | 0 | 0.0% | < 0.20 |

avg_KP = **0.588** → exactement à la frontière runtime_candidate/sandbox,
ce qui explique la distribution bimodale 121 ⇄ 120.

---

## 3. Lecture du skew

Le corpus est polarisé sur la zone **[0.40, 0.80]** :
- **0 canonical** : aucune loi ne dépasse 0.80 → les seuils sont
  conservateurs par design pour la mission initiale (éviter sur-promotion).
- **0 archive / 0 purge** : aucune loi en dessous de 0.40 → corpus
  globalement sain, aucune toxique détectée.
- **bimodal 50/50** entre runtime_candidate et sandbox → seuil 0.60 sert
  effectivement de **median splitter** sur cet ensemble.

---

## 4. Recommandation d'évolution

Les seuils actuels sont **volontairement permissifs** pour la première
itération. À mesure que :
- `velocity_score` se stabilise sur observations runtime réelles
- `temporal_survival` accumule des données long-terme
- `superior_law_candidate` est validé/invalidé manuellement

→ resserrer progressivement les seuils :
```
v2 proposé :  canonical          ≥ 0.75   (−0.05)
              runtime_candidate  0.55–0.75 (−0.05)
              sandbox            0.35–0.55 (−0.05)
              archive            0.15–0.35
              purge              < 0.15
```

Recalibration via observation de la distribution **après 3 mois** de runtime
production. Surveillé par `Adaptive`.

---

## SIGNATURE

```
THRESHOLDS:           5 (canonical / runtime / sandbox / archive / purge)
CURRENT_DIST:         0 / 121 / 120 / 0 / 0
AVG_KP:               0.588
SKEW:                 bimodal 50/50 runtime ⇄ sandbox
NO_AUTO_PURGE:        true (archive = dead-letter conservé)
NEXT_CALIB:           v2 −0.05 sur seuils canonical/runtime/sandbox après 3 mois
```

🔶
