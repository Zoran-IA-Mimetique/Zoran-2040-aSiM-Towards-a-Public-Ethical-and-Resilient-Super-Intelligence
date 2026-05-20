# TICKETS_PROGRESS — Suivi de progression ZORAN Core OS

- **mis à jour** : 2026-05-20T20:55:00Z
- **cadrage** : estimation Oracle (2026-05-20T22:04Z) — source autoritaire
- **source de vérité** pour l'affichage de progression

## Synthèse

**Progression globale ≈ 42 % · 14 tickets restants (9 majeurs · 5 secondaires)**

## Terminé / stabilisé (phase falsification & nettoyage)

✅ Audit zombies · ✅ Falsification V12 adversarial · ✅ REMOVE cluster V8→V12
✅ Découplage `superiority.js` · ✅ Discipline MAX_SECURITY · ✅ IMPACT_MAP
✅ Smoke pipeline stable · ✅ Tests de caractérisation (35 assertions)
✅ Architecture live map · ✅ Réduction dette dormante (−1027 LOC)
✅ Core plus testable / falsifiable · ✅ Gouvernance artefacts générés (S6)

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
| T9 | Validation clone propre | repo aSiM | 🔲 ACTIONNABLE ici |

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

Sur les 14 restants, **8 sont actionnables/décidables côté repo aSiM**
(T9 + S1-S5) — dont 3 demandent une décision Oracle et 1 est bloqué (S4).
Les 8 autres majeurs (T1-T5, T7, T8 + T6 gated) relèvent du backend de Fred
ou d'une action humaine. Le centre de gravité quitte le repo aSiM.
