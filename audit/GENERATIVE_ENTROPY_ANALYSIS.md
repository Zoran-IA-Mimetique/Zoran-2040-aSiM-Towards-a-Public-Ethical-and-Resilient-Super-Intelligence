# GENERATIVE ENTROPY ANALYSIS

**Mission** : `ZORAN_DISTRIBUTED_GENERATIVE_LAW_ENGINE_20260516`
**Source** : `tools/distributed_generative_law_engine.py` → `compute_generative_scores()`
**Cross-refs** : `audit/DISTRIBUTED_GENERATIVE_LAW_ENGINE.md`, `audit/DISTRIBUTED_GENERATIVE_REPORT.json`

---

## 1. Définition du score

Le score `generation_entropy` mesure la **dispersion familiale** des
filles candidates proposées par une mère. C'est une entropie de
Shannon normalisée :

```
fams      = Counter(child.family for child in candidates)
p_i       = fams[i] / n_proposed
H(mother) = - Σ p_i · log2(p_i)
generation_entropy = min(1.0, H / log2(3))     # log2(3) ≈ 1.585
```

Cas particulier : si `n_proposed ≤ 1`, on force `entropy = 0.10`
(pas de dispersion mesurable, valeur plancher).

---

## 2. Plage et interprétation

| Plage      | Profil                | Interprétation                                 |
|------------|-----------------------|------------------------------------------------|
| `0.00–0.20`| très focalisé / unique| 1 fille ou 2 filles même famille → générateur précis |
| `0.20–0.40`| focalisé              | 2 filles familles différentes ⇒ H/log2(3)≈0.33-0.63 normalisé à 1/3 |
| `0.40–0.70`| équilibré             | exploration multi-familles cohérente           |
| `> 0.70`   | bruyant               | dispersion suspecte (rare avec n_max=2)        |

Bas = mère **focalisée** (génératrice fiable, scope clair).
Haut = mère **bruyante** (signal d'incohérence du `generative_scope`).

---

## 3. Pourquoi `/log2(3)` et pas `/log2(n_max)` ?

Le diviseur fixé à `log2(3)` (≈ 1.585) anticipe une montée future de
`n_max` jusqu'à 3 filles par mère sans rebreaking l'échelle. Avec le
`n_max=2` actuel, la valeur maximale atteignable par une mère reste
`1/log2(3) ≈ 0.631` — bornée bien sous 1.0, ce qui réserve la zone
haute aux runs élargis.

---

## 4. Mesure runtime

Sur **241 mères**, run du 2026-05-16 :

| Métrique                           | Valeur |
|------------------------------------|-------:|
| `avg_generation_entropy`           | **0.327** |
| Filles totales proposées           | 476    |
| n_max effectif par mère            | 2      |

L'entropie moyenne de 0.327 indique un système **majoritairement
focalisé** : la plupart des mères proposent 2 filles dans 2 familles
différentes mais cohérentes avec leur `FAMILY_AFFINITY`. Aucune
mère bruyante n'est observée (`entropy > 0.70`), ce qui valide la
calibration du scope.

---

## 5. Liens avec les autres scores

- Une mère avec `entropy ≈ 0` ET `derivation_validity == 1.0` est un
  **générateur monomaniaque** : utile mais à surveiller (risque de
  monoculture familiale).
- Une mère avec `entropy ≈ 0.6` ET `oracle_generation_confidence ≥ 0.85`
  est un **générateur pluraliste sain** — profil recherché.
- L'entropie n'entre **pas** dans l'Oracle (pas bloquante) ; elle sert
  uniquement au profilage des mères dans l'UI panel.
