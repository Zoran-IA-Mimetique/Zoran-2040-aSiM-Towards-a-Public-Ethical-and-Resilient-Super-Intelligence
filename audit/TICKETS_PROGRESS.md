# TICKETS_PROGRESS — Suivi de progression ZORAN Core OS

- **mis à jour** : 2026-05-20T20:55:00Z
- **cadrage** : estimation Oracle (2026-05-20T22:04Z) — source autoritaire
- **source de vérité** pour l'affichage de progression

## Synthèse

**Progression globale ≈ 44 % · 13 tickets restants (8 majeurs · 5 secondaires)**

## Terminé / stabilisé (phase falsification & nettoyage)

✅ Audit zombies · ✅ Falsification V12 adversarial · ✅ REMOVE cluster V8→V12
✅ Découplage `superiority.js` · ✅ Discipline MAX_SECURITY · ✅ IMPACT_MAP
✅ Smoke pipeline stable · ✅ Tests de caractérisation (35 assertions)
✅ Architecture live map · ✅ Réduction dette dormante (−1027 LOC)
✅ Core plus testable / falsifiable · ✅ Gouvernance artefacts générés (S6)
✅ Validation clone propre (T9 — Core livrable confirmé sur clone froid)

## Tickets majeurs restants (9)

| ID | Ticket | Scope | État |
|---|---|---|---|
| T1 | Provider survival réel | backend Fred | ⏳ hors-repo aSiM |
| T2 | API-first sans front | backend Fred | ⏳ hors-repo aSiM |
| T3 | Runtime mobile Android | backend Fred | ⏳ hors-repo aSiM |
| T4 | Offline runtime réel | backend Fred | ⏳ hors-repo aSiM |
| T5 | Rollback runtime réel | backend Fred | ⏳ hors-repo aSiM |
| T6 | P0 humain BET | gated humain | ⛔ BLOQUANT — kit prêt |
| T7 | Provider abstraction live | backend Fred | ⏳ hors-repo aSiM |
| T8 | Event bus runtime | backend Fred | ⏳ hors-repo aSiM |
| T9 | Validation clone propre | repo aSiM | ✅ FAIT — clone froid : units 35/35, smoke 13/14, 0 erreur, 0 module fantôme |

## Tickets secondaires restants (5)

| ID | Ticket | Scope | État |
|---|---|---|---|
| S1 | `conclusion_wrapper` — décision REMOVE | repo aSiM | 🔲 décision Oracle |
| S2 | `cognitive_routing` — décision REMOVE | repo aSiM | 🔲 décision Oracle |
| S3 | `mutation_stability` — à trancher | repo aSiM | 🔲 décision Oracle |
| S4 | Test discriminant compression | repo aSiM | 🔲 bloqué — pas de benchmark de paires |
| S5 | Smoke FAIL `pan_right_drag` | repo aSiM | 🔲 bug runtime à corriger |
| ~~S6~~ | ~~Gouvernance artefacts générés~~ | repo aSiM | ✅ FAIT — `.gitignore` app/preview-*.png |

## Légende

⏳ hors-repo (backend `C:\Users\frede\zoran\`) · ⛔ bloquant action humaine
🔲 actionnable / décidable côté repo aSiM · ✅ fait

## Note de périmètre

Sur les 13 restants, **5 sont actionnables/décidables côté repo aSiM**
(S1-S5) — dont 3 demandent une décision Oracle (S1-S3) et 1 est bloqué (S4,
pas de benchmark de paires). Seul S5 (`pan_right_drag`) est un correctif
exécutable sans décision externe. Les 8 majeurs restants (T1-T5, T7, T8 +
T6 gated humain) relèvent du backend de Fred — non exécutables depuis cette
session. Le centre de gravité a quitté le repo aSiM.
