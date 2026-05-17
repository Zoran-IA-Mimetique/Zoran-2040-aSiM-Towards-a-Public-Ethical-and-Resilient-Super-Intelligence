# MASSIVE EVALUATION V3 — Rapport

**Mission** : `MASSIVE_EVALUATION_V3_20260517`
**Corpus** : 100 textes (5 archétypes × 20)
**Métriques** : 24 mesures par texte
**Total** : 2400 évaluations en 43 ms

## Verdict global discrimination

| Verdict | Nombre métriques | % |
|---|---|---|
| STRONG (≥ 2.0)    | 12  | 50% |
| MODERATE (≥ 1.0)  | 8 | 33% |
| WEAK (≥ 0.5)      | 4    | 17% |
| NO_SIGNAL (< 0.5) | 0 | 0% |

## Top 10 métriques discriminantes

| Métrique | Discr. ratio | Verdict | High arch | Low arch |
|---|---|---|---|---|
| goodhart_metric_tunnel | 700 | STRONG | ARCH_GOODHART_PUR (0.7) | ARCH_VERBEUX_VIDE (0) |
| goodhart_proxy_collapse | 5.01 | STRONG | ARCH_GOODHART_PUR (0.767) | ARCH_VERBEUX_VIDE (0) |
| goodhart_fired_count | 4.66 | STRONG | ARCH_GOODHART_PUR (3.45) | ARCH_VERBEUX_VIDE (0) |
| goodhart_risk | 4.28 | STRONG | ARCH_GOODHART_PUR (0.587) | ARCH_VERBEUX_VIDE (0) |
| goodhart_systemic_health | 4.28 | STRONG | ARCH_SYSTEMIC_RICHE (1) | ARCH_GOODHART_PUR (0.413) |
| sys_composite | 3.96 | STRONG | ARCH_SYSTEMIC_RICHE (0.449) | ARCH_GOODHART_PUR (0.267) |
| global_usefulness | 2.81 | STRONG | ARCH_TERRAIN_PRO (0.606) | ARCH_JARGON_ZORAN (0.429) |
| sys_causal_robustness | 2.61 | STRONG | ARCH_SYSTEMIC_RICHE (0.6) | ARCH_GOODHART_PUR (0.36) |
| sys_multiscale | 2.53 | STRONG | ARCH_SYSTEMIC_RICHE (0.412) | ARCH_VERBEUX_VIDE (0) |
| concrete_runtime_alignment | 2.13 | STRONG | ARCH_TERRAIN_PRO (0.665) | ARCH_JARGON_ZORAN (0.384) |

## Métriques sans signal


## Scores composites par archétype

| Archétype | jargon | useful_info_v2 | sys_composite | goodhart_risk |
|---|---|---|---|---|
| ARCH_GOODHART_PUR | 0 | 0.405 | 0.267 | 0.587 |
| ARCH_SYSTEMIC_RICHE | 0 | 0.69 | 0.449 | 0 |
| ARCH_JARGON_ZORAN | 0.249 | 0 | 0.35 | 0 |
| ARCH_TERRAIN_PRO | 0 | 0.81 | 0.303 | 0 |
| ARCH_VERBEUX_VIDE | 0 | 0.171 | 0.3 | 0 |

## Honnêteté

- Corpus **synthétique** construit par permutation de phrases-graines.
  Pas de réponses LLM réelles.
- Mesure la **discrimination des métriques entre archétypes connus** —
  pas la qualité absolue. Une métrique STRONG distingue clairement
  Goodhart vs systemic, mais ne dit pas qu'elle prédit la "vraie qualité".
- Une métrique NO_SIGNAL ne réagit pas aux différences entre archétypes
  → soit elle est insensible (lex incomplet), soit elle mesure une
  dimension orthogonale aux archétypes choisis.
- Validation live (sur réponses Claude/Sonnet réelles) reste à faire.