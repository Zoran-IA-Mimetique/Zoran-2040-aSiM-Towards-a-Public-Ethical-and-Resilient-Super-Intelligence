# NOISE_CONTRIBUTION_REPORT — Format & lecture

**Mission**: `ZORAN_NOISE_MINIMIZATION_AND_LAW_SELECTION_ENGINE_20260516`
**Implémentation**: `tools/noise_minimization_engine.py`
**Rapport runtime**: `audit/NOISE_CONTRIBUTION_REPORT.json`
**Specs liées**: `audit/NOISE_MINIMIZATION_ENGINE.md`, `audit/SIGNAL_TO_NOISE_ANALYSIS.md`

## Format du rapport JSON

```
{
  mission_id, timestamp, laws_scored,
  decisions{keep,reject}, keep_runtime_count, reject_count, reduction_pct,
  avg_runtime_gain, avg_noise_contribution, avg_signal_to_noise,
  avg_frugality_ratio, system_signal_to_noise, global_noise_ratio,
  top10_noise_contributors: [{id, 12 scores}] × 10,
  top10_signal_to_noise:    [{id, 12 scores}] × 10,
  rejected_sample:          [{id, snr, fr, rg}] × 20
}
```

## Top 10 contributeurs de bruit (runtime actuel)

| Rang | ID         | noise | snr   | rg     | keep  |
|------|------------|-------|-------|--------|-------|
| 1    | GHUC-001   | 0.665 | 0.000 | −0.105 | false |
| 2    | DVE-001    | 0.614 | 0.000 | −0.065 | false |
| 3    | WP12-001   | 0.585 | 0.013 | +0.007 | false |
| 4    | WP12-009   | 0.564 | 0.046 | +0.027 | false |
| 5    | ULG-001    | 0.561 | 0.000 | −0.026 | false |
| 6    | UDE-001    | 0.552 | 0.064 | +0.038 | false |
| 7    | UDE-009    | 0.537 | 0.073 | +0.042 | false |
| 8    | WP11-001   | 0.533 | 0.132 | +0.081 | false |
| 9    | WP12-007   | 0.519 | 0.109 | +0.063 | false |
| 10   | DVE-008    | 0.519 | 0.071 | +0.040 | false |

100 % des top-bruit sont rejetés runtime — l'engine est cohérent.

## Top 10 signal-to-noise (runtime actuel)

| Rang | ID            | snr   | rg     | noise | frugality | keep |
|------|---------------|-------|--------|-------|-----------|------|
| 1    | UDE-030       | 0.848 | +0.628 | 0.113 | 1.000     | true |
| 2    | SDE-028       | 0.846 | +0.618 | 0.112 | 1.000     | true |
| 3    | SDE-002-b-i   | 0.845 | +0.615 | 0.113 | 1.000     | true |
| 4    | SDE-002-a-i   | 0.843 | +0.614 | 0.114 | 1.000     | true |
| 5    | SDE-002-b-ii  | 0.843 | +0.611 | 0.114 | 1.000     | true |
| 6    | SDE-002-a-ii  | 0.842 | +0.612 | 0.115 | 1.000     | true |
| 7    | UDE-028       | 0.834 | +0.632 | 0.126 | 1.000     | true |
| 8    | WP11-002-b-i  | 0.824 | +0.613 | 0.131 | 1.000     | true |
| 9    | WP11-002-a-i  | 0.822 | +0.615 | 0.133 | 1.000     | true |
| 10   | WP11-002-b-ii | 0.822 | +0.609 | 0.132 | 1.000     | true |

100 % des top-S/N sont conservés runtime — l'engine est cohérent.

## Sample 20 rejetées (extrait `rejected_sample`)

| ID         | snr   | fr    | rg     | porte bloquante         |
|------------|-------|-------|--------|-------------------------|
| ULG-001    | 0.000 | 0.100 | −0.026 | rg + snr + fr           |
| ULG-002    | 0.012 | 0.107 | +0.007 | snr + fr                |
| ULG-003    | 0.267 | 0.312 | +0.148 | snr                     |
| ULG-004    | 0.356 | 0.422 | +0.193 | snr                     |
| ULG-005    | 0.436 | 0.565 | +0.249 | snr (à 0.064 du seuil)  |
| DVE-001    | 0.000 | 0.100 | −0.065 | rg + snr + fr           |
| DVE-002    | 0.229 | 0.265 | +0.127 | snr + fr                |
| DVE-003    | 0.333 | 0.377 | +0.184 | snr                     |
| DVE-004    | 0.489 | 0.667 | +0.293 | snr (à 0.011 du seuil)  |
| DVE-005    | 0.166 | 0.206 | +0.088 | snr + fr                |
| UDE-001    | 0.064 | 0.133 | +0.038 | snr + fr                |
| UDE-004    | 0.487 | 0.584 | +0.302 | snr (à 0.013 du seuil)  |
| UDE-005    | 0.485 | 0.582 | +0.301 | snr                     |
| GHUC-001   | 0.000 | 0.100 | −0.105 | rg + snr + fr           |
| GHUC-002   | 0.146 | 0.189 | +0.083 | snr + fr                |
| GHUC-003   | 0.386 | 0.423 | +0.232 | snr                     |
| GHUC-004   | 0.403 | 0.455 | +0.231 | snr                     |
| WP11-001   | 0.132 | 0.178 | +0.081 | snr + fr                |
| WP11-002   | 0.382 | 0.413 | +0.232 | snr                     |
| WP11-003   | 0.384 | 0.422 | +0.240 | snr                     |

La quasi-totalité des rejets se concentre sur `snr < 0.50`. Une dizaine de lois
sont à <0.02 du seuil — récupérables via ajustement amont de `runtime_impact_score`.

## Statut des sous-objectifs mission

| Sous-objectif              | Cible      | Mesuré | Écart        | Statut       |
|----------------------------|------------|--------|--------------|--------------|
| Avg `noise_contribution`   | ≤ 0.02     | 0.282  | **+0.262**   | **NON ATTEINT** |
| System S/N                 | ≥ 0.95     | 0.556  | **−0.394**   | **NON ATTEINT** |
| Réduction runtime          | non chiffrée | 39.0 % | —          | atteint partiellement |
| `keep_runtime` cohérent    | 100 % top/bottom alignés | 100 % | 0 | **OK** |
| 12 scores injectés / loi   | 241 lois   | 241    | 0            | **OK**       |

### Lecture honnête du gap

- `noise ≤ 0.02` est **structurellement inatteignable** par filtrage seul :
  l'offset `+0.30` et la composante `0.40·propagation_cost` plantent un
  plancher ≥ 0.10. Atteindre la cible exigerait un élagage amont des lois
  propagantes ou une refonte de la formule.
- `S/N ≥ 0.95` requiert soit `runtime_gain` ≥ 5.3 (impossible, plafond = 1.0)
  soit `noise ≤ 0.02` (cf. point précédent).
- Le moteur est **valide opérationnellement** (réduction 39 %, cohérence
  top/bottom 100 %) mais **insuffisant seul** : les cibles supposent une
  refonte du graphe source, hors périmètre de ce moteur.
