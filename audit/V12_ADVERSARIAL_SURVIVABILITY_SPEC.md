# V12 ADVERSARIAL SURVIVABILITY — Spec minimal

**Mission** : `ZORAN_V12_ADVERSARIAL_SURVIVABILITY_20260517`
**Lignes** : 250 (cible 150-300 mission respectée)
**Module** : `app/src/adversarial_survivability_engine.js`

> Pivot : moteur de **destruction d'hypothèses** plutôt que d'évaluation
> de cohérence. Question : *"quelles hypothèses survivent au contradictoire ?"*

---

## 5 couches (architecture mission)

### LAYER 1 — Claim Extraction
Extrait claims atomiques en 5 types : causal, temporal, instrumentation,
responsibility, prediction.

### LAYER 2 — Hostile Refutation
Génère 4 contre-hypothèses par claim causal (inversion temporelle,
confondant tiers, artefact statistique, échelle incompatible).

### LAYER 3 — Physical Survivability
Délègue à `physical_causality_validator` + ajoute 2 tests V12 :
- Incompatibilités micro/macro (condensation→tassement)
- Violations thermodynamiques (effet précède cause)

### LAYER 4 — Tribunal Mode
5 attaques expert adverse :
- no_instrumentation (claims causaux sans mesures)
- no_temporal_bound (prédictions sans horizon)
- no_legal_reference (claims décennale sans article)
- no_quantification (causalité sans chiffres)
- no_falsification (claims sans contre-hypothèse)

### LAYER 5 — Irreversibility Filter
Compteur final : survivors = causal_claims - destroyed - fragile.
Score composite : 0.40 × physical + 0.30 × (1-fragile_ratio) + 0.30 × confidence.

---

## Verdict empirique

**V12 = 0.204 Spearman vs V11 = 0.646** sur 30 cas.

**Gain V12 sur cas ciblés** :
- A4 CAUSALITE_INVERSEE : 4.7 ✓ (V11 5.8 ✗)
- C2 CAUSAL_INVERSEE_SUBTLE : 3.2 ✓ (V11 4.5)

**Échec V12 sur cas neutres** : default score 7.0 quand aucun claim causal
extrait → 26/30 cas affectés.

→ V12 utile comme **filtre conditionnel**, pas comme remplaçant global.

---

## Honnêteté empirique

- V11 reste dominant globalement
- V12 résout LR-2 (causalité inversée) sur cas où claims causaux extraits
- V12 souffre d'extraction trop stricte (V12-LR-1)
- Pas de rebuild architectural (1 critère sur 3 de la règle décision mission)
- P0-MINI BET réel reste verrou absolu
