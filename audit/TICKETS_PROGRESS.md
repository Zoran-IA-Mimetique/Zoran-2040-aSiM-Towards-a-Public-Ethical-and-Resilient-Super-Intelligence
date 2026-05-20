# TICKETS_PROGRESS — Suivi de progression ZORAN Core OS

- **mis à jour** : 2026-05-20T21:20:00Z
- **cadrage** : estimation Oracle + mission CLAUDE_CORE_DISCIPLINE_V2
- **source de vérité** pour l'affichage de progression

## Synthèse — deux jauges séparées (règle CLAUDE_CORE_DISCIPLINE_V2)

**Progression INGÉNIERIE ≈ 46 %**
**Progression VALIDATION RÉELLE ≈ 0 %** (P0-MINI BET non exécuté)

**12 tickets restants — 8 majeurs · 4 secondaires**

> Interdiction de fusionner les deux jauges. Tant que T6 (P0 humain) est à 0 %,
> la validation réelle reste à 0 % — ZORAN reste un prototype interne.

## Terminé / stabilisé (phase falsification & nettoyage)

✅ Audit zombies · ✅ Falsification V12 adversarial · ✅ REMOVE cluster V8→V12
✅ Découplage `superiority.js` · ✅ Discipline MAX_SECURITY · ✅ IMPACT_MAP
✅ Smoke pipeline stable · ✅ Tests de caractérisation (35 assertions)
✅ Architecture live map · ✅ Réduction dette dormante (−1027 LOC)
✅ Core plus testable / falsifiable · ✅ Gouvernance artefacts générés (S6)
✅ Validation clone propre (T9) · ✅ Smoke 14/14 — `pan_right_drag` corrigé (S5)

## Tickets majeurs (T1-T9 — 8 restants, T9 fait)

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

## Tickets secondaires (S1-S6 — 4 restants, S5/S6 faits)

| ID | Ticket | Scope | État |
|---|---|---|---|
| S1 | `conclusion_wrapper` — décision REMOVE | repo aSiM | 🔲 décision Oracle |
| S2 | `cognitive_routing` — décision REMOVE | repo aSiM | 🔲 décision Oracle |
| S3 | `mutation_stability` — à trancher | repo aSiM | 🔲 décision Oracle |
| S4 | Test discriminant compression | repo aSiM | 🔲 bloqué — pas de benchmark de paires |
| ~~S5~~ | ~~Smoke FAIL `pan_right_drag`~~ | repo aSiM | ✅ FAIT — bug du test corrigé, smoke 14/14 |
| ~~S6~~ | ~~Gouvernance artefacts générés~~ | repo aSiM | ✅ FAIT — `.gitignore` app/preview-*.png |

## Légende

⏳ hors-repo (backend `C:\Users\frede\zoran\`) · ⛔ bloquant action humaine
🔲 actionnable / décidable côté repo aSiM · ✅ fait

## Note de périmètre

Sur les 12 restants, **4 sont décidables côté repo aSiM** (S1-S4) — dont 3
demandent une décision Oracle (S1-S3) et 1 est bloqué (S4, pas de benchmark
de paires). **Plus aucun ticket n'est exécutable par Claude seul sans décision
externe** : le périmètre repo aSiM est épuisé. Les 8 majeurs restants
(T1-T5, T7, T8 + T6 gated humain) relèvent du backend de Fred. Le centre de
gravité a quitté le repo aSiM — la suite est runtime backend + P0 humain.
