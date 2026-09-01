# BEST_PRACTICES_CODING.md

Version: 2026-06
Statut: OBLIGATOIRE
Applicabilité: Claude, Codex, GPT, IA Builder, IA QA, IA Audit

---

## OBJECTIF

Produire du code : fonctionnel, testable, observable, maintenable, sécurisé,
réversible, traçable. Aucune modification ne doit être réalisée sans preuve.

## REGLE 0 — PREUVE AVANT AFFIRMATION
Interdiction de déclarer « corrigé / résolu / fonctionnel / terminé » sans
preuve réelle (test automatisé, log, benchmark, capture, résultat utilisateur).

## REGLE 1 — ANALYSE AVANT CODE
Identifier problème réel, cause racine, effets secondaires, composants
impactés, puis produire un plan. Interdiction du patch au hasard.

## REGLE 2 — MODIFICATIONS MINIMALES
Plus petit changement possible, impact maximal, risque minimal.

## REGLE 3 — TRAÇABILITE COMPLETE
Chaque modification : ID unique, date, auteur IA, fichiers touchés, motif,
tests exécutés, preuves, rollback. Format `MOD-ID-YYYYMMDD-HHMM`.
→ Voir `CHANGELOG.md`.

## REGLE 4 — BACKUP OBLIGATOIRE
Avant toute modification : sauvegarde / commit / snapshot. Rollback documenté.

## REGLE 5 — OBSERVABILITE
Toute fonctionnalité observable : logs, erreurs explicites, timestamps,
contexte. → `src/lib/logger.ts`.

## REGLE 6 — WATCHDOG
Processus critique : watchdog, heartbeat, redémarrage contrôlé, journalisation.
→ `src/lib/scheduler.ts` (`NotificationScheduler`).

## REGLE 7 — TESTS
Unitaires (normal/limite/erreur), intégration (flux réel), non-régression.
Aucun merge sans test.

## REGLE 8 — REVUE DE CODE
Checklist : fonctionnel, architecture, lisibilité, complexité, performance,
sécurité, logs, tests.

## REGLE 9 — SECURITE
Validation des entrées, contrôle d'accès, secrets, permissions, logs
sécurisés. Jamais de secret en clair / clé API en dur / secret dans Git.
→ Validation/assainissement des imports JSON dans `src/lib/backup.ts`.

## REGLE 10 — CI/CD
Build, lint, tests, audit sécurité, déploiement, rollback automatisables.
→ `.github/workflows/ci.yml`.

## REGLE 11 — DOCUMENTATION
Objectif, entrées, sorties, dépendances, limites connues. → `APP_README.md`.

## REGLE 12 — DETECTION DE DETTE TECHNIQUE
Signaler code mort, doublons, dépendances/fichiers/routes inutilisés.

## REGLE 13 — IMPACT FUTUR
Calculer impact local/global, risque, maintenabilité, extensibilité.

## REGLE 14 — CHECKLIST FINALE
Build OK · Tests OK · Logs OK · Sécurité OK · Performance OK · Non-régression OK
· Documentation OK · Rollback OK · Preuves fournies · Validation utilisateur.

---

## FORMAT DE LIVRAISON OBLIGATOIRE

```
STATUS: PASS / PARTIEL / FAIL
CAUSE RACINE:
FICHIERS TOUCHES:
PREUVES:
RISQUES RESTANTS:
ROLLBACK:
PROCHAINE ACTION:
```
