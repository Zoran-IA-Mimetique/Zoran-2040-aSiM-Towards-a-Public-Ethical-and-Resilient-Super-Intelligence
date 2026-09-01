# NOISE_MINIMIZATION_ENGINE — Spec

**Mission** : `ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516`
**Implémentation** : `tools/noise_minimization_engine.py`
**Rapport runtime** : `audit/NOISE_CONTRIBUTION_REPORT.json`
**Spec liée** : `audit/COGNITIVE_SELECTION_ENGINE.md`

## Principe fondamental

> Toute loi `L_i` est traitée comme un **COÛT POTENTIEL**.
> Elle n'est conservée runtime que si `Gain(L_i) > Coût(L_i)`.
> Sinon : la loi est du **BRUIT RUNTIME** et doit être écartée.

## Définition opérationnelle du bruit

`bruit` = tout élément (lexical, propagationnel, runtime, topologique,
cognitif) qui augmente le coût, l'imprécision, la dérive **sans gain
utile démontré**. Ce n'est pas une notion subjective : c'est un
résiduel mesurable `coût − utilité` projeté sur le graphe runtime.

## 12 scores injectés par loi

| Score                   | Formule (résumée) |
|-------------------------|-------------------|
| `runtime_gain`          | `0.40·impact + 0.30·llm + 0.30·velocity − (0.50·propag + 0.30·implicit/20 + 0.20·dep)` |
| `noise_contribution`    | `clip(0.40·propag + 0.30·implicit/20 + 0.20·dep − 0.30·impact + 0.30)` |
| `precision_gain`        | `0.30 + 0.20·attractor + 0.15·superior + 0.15·S_local + 0.20·anti_hallu` |
| `drift_risk`            | `0.20 + 0.30·collapse + 0.20·(1−resilience) + 0.30·implicit/20 (+0.20 si toxique)` |
| `frugality_ratio`       | `max(0, gain) / (propag + noise) + 0.10` |
| `runtime_usefulness`    | `0.50·gain + 0.30·snr + 0.20·velocity` |
| `runtime_efficiency`    | `clip(gain + 0.30)` |
| `signal_to_noise`       | `signal / (signal + noise)` |
| `noise_ratio`           | `noise / max(signal, 0.05)` |
| `precision_per_cost`    | `precision_gain / propag / 3 + 0.10` |
| `structural_usefulness` | `0.20 + bonus(attractor, boundary, parents+children)` |
| `keep_runtime`          | booléen — décision ET-stricte (cf. infra) |

## Critère `keep_runtime` — ET-strict

```
keep_runtime(L) ⇔
      signal_to_noise(L) ≥ 0.50
  AND frugality_ratio(L) ≥ 0.30
  AND runtime_gain(L)    > 0
```

Les trois conditions sont obligatoires. Une loi qui passe deux des
trois critères est **rejetée runtime**. Cette rigidité est volontaire :
elle force chaque loi à justifier sa charge propagationnelle par un
gain net positif, un ratio signal/bruit majoritaire et une frugalité
au-dessus du seuil de retour sur investissement.

## Résultats runtime (corpus complet)

| Métrique                  | Valeur      | Cible       |
|---------------------------|-------------|-------------|
| Lois scorées              | 241         | —           |
| `keep_runtime = true`     | 147 (61.0 %) | —           |
| Rejet runtime             | 94 (39.0 %) | —           |
| Avg `runtime_gain`        | +0.354      | > 0         |
| Avg `noise_contribution`  | **0.282**   | ≤ 0.02      |
| Avg `signal_to_noise`     | 0.540       | ≥ 0.95      |
| System `S/N`              | **0.556**   | ≥ 0.95      |

Le moteur atteint un sous-graphe runtime **plus petit de 39 %** que le
corpus initial, mais reste **loin** des objectifs absolus de bruit
(`≤ 0.02`) et de S/N (`≥ 0.95`). Cf. `audit/NOISE_CONTRIBUTION_REPORT.md`
pour le détail honnête de cet écart.
