# MASSIVE EVALUATION V4 — Rapport

**Mission** : `MASSIVE_EVALUATION_V4_20260517`
**Corpus** : 140 textes (5 archétypes × 20)
**Métriques** : 32 mesures par texte
**Total** : 4480 évaluations en 65 ms

## Verdict global discrimination

| Verdict | Nombre métriques | % |
|---|---|---|
| STRONG (≥ 2.0)    | 16  | 50% |
| MODERATE (≥ 1.0)  | 12 | 38% |
| WEAK (≥ 0.5)      | 3    | 9% |
| NO_SIGNAL (< 0.5) | 1 | 3% |

## Top 10 métriques discriminantes

| Métrique | Discr. ratio | Verdict | High arch | Low arch |
|---|---|---|---|---|
| domain_leak_detected | 1000 | STRONG | ARCH_DOMAIN_LEAK (1) | ARCH_SEDUCTIVE_FRAGILE (0) |
| goodhart_metric_tunnel | 700 | STRONG | ARCH_GOODHART_PUR (0.7) | ARCH_DOMAIN_LEAK (0) |
| goodhart_proxy_collapse | 5.01 | STRONG | ARCH_GOODHART_PUR (0.767) | ARCH_DOMAIN_LEAK (0) |
| goodhart_fired_count | 4.66 | STRONG | ARCH_GOODHART_PUR (3.45) | ARCH_DOMAIN_LEAK (0) |
| domain_leak_score | 4.54 | STRONG | ARCH_DOMAIN_LEAK (0.84) | ARCH_SEDUCTIVE_FRAGILE (0) |
| goodhart_risk | 4.28 | STRONG | ARCH_GOODHART_PUR (0.587) | ARCH_DOMAIN_LEAK (0) |
| goodhart_systemic_health | 4.28 | STRONG | ARCH_SYSTEMIC_RICHE (1) | ARCH_GOODHART_PUR (0.413) |
| sys_composite | 3.96 | STRONG | ARCH_SYSTEMIC_RICHE (0.449) | ARCH_GOODHART_PUR (0.267) |
| sys_causal_robustness | 2.61 | STRONG | ARCH_SYSTEMIC_RICHE (0.6) | ARCH_GOODHART_PUR (0.36) |
| fragility_risk | 2.59 | STRONG | ARCH_SEDUCTIVE_FRAGILE (0.6) | ARCH_SYSTEMIC_RICHE (0.19) |

## Métriques sans signal

- `fragility_perturbation_rob` — range 0, std 0.001 → tous archétypes confondus

## Scores composites par archétype

| Archétype | jargon | useful_info_v2 | sys_composite | goodhart_risk |
|---|---|---|---|---|
| ARCH_GOODHART_PUR | 0 | 0.405 | 0.267 | 0.587 |
| ARCH_SYSTEMIC_RICHE | 0 | 0.69 | 0.449 | 0 |
| ARCH_JARGON_ZORAN | 0.249 | 0 | 0.35 | 0 |
| ARCH_TERRAIN_PRO | 0 | 0.81 | 0.303 | 0 |
| ARCH_VERBEUX_VIDE | 0 | 0.171 | 0.3 | 0 |
| ARCH_SEDUCTIVE_FRAGILE | 0 | 0.855 | 0.307 | 0.09 |
| ARCH_DOMAIN_LEAK | 0 | 0.36 | 0.3 | 0 |

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