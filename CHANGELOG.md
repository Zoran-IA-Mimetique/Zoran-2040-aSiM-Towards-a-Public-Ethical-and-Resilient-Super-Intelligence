# CHANGELOG — Traçabilité (REGLE 3)

Format des identifiants : `MOD-ID-YYYYMMDD-HHMM`.

---

## MOD-INIT-20260606-0747

- **Date** : 2026-06-06
- **Auteur IA** : Claude Code (assistant IA Builder)
- **Motif** : Création de l'application **Routine Cognitive — MVP V1** (PWA
  mobile-first de micro-actions cognitives, sans backend, stockage local).
- **Fichiers touchés** : création du projet complet
  - Config : `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`,
    `.eslintrc.cjs`, `.gitignore`, `.github/workflows/ci.yml`
  - App : `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/sw.ts`
  - Domaine : `src/types.ts`, `src/data/*`
  - Logique : `src/lib/{dates,scheduling,scheduler,logger,bulkImport,backup,notifications}.ts`
  - Données : `src/db/database.ts`, `src/store/AppContext.tsx`
  - UI : `src/components/*`, `src/screens/*`
  - PWA : `public/manifest` (généré), `public/icons/*`, `public/favicon.svg`
  - Tests : `src/**/*.test.ts(x)`, `src/test/setup.ts`
  - Doc : `APP_README.md`, `CHANGELOG.md`
- **Tests exécutés** :
  - `npm test` → **51 tests OK** (unitaires cas normal/limite/erreur,
    intégration IndexedDB, flux utilisateur).
  - `npm run lint` → **0 erreur, 0 warning**.
  - `npm run build` → **build OK** (PWA + Service Worker générés, précache 11
    entrées / ~194 KiB).
- **Preuves** : sorties de `npm test`, `npm run lint`, `npm run build`
  (consignées dans la PR).
- **Rollback** : `git revert` du commit, ou suppression de la branche
  `claude/routine-cognitive-mvp-BQ9nA`. Aucune donnée persistante côté serveur
  (application 100 % locale).
