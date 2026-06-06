# Routine Cognitive — MVP V1

Application **PWA mobile-first** pour afficher et notifier des **micro-actions
cognitives et comportementales**.

- ✅ Aucun backend
- ✅ Aucune authentification
- ✅ Stockage **100 % local** (IndexedDB)
- ✅ Fonctionne hors-ligne (Service Worker / PWA)
- ✅ Compatible mobile, dépliable Z Fold 6, thème clair/sombre

---

## 1. Objectif (REGLE 11 — documentation)

Aider l'utilisateur à installer de petites routines cognitives via des rappels
locaux non intrusifs. Les données ne quittent jamais l'appareil.

## 2. Fonctionnalités

| Écran | Contenu |
|-------|---------|
| **Aujourd'hui** | Actions prévues / réalisées / ignorées + boutons `FAIT` `PLUS TARD` `PAUSE` |
| **Mes routines** | Liste complète, édition (titre, description, catégorie, heure suggérée, heure perso., actif/pause), suppression |
| **Ajouter** | Création d'une routine **ou** import par lot (une ligne = une routine) |
| **Historique** | Prévues / réalisées / ignorées par jour / semaine / mois |
| **Réglages** | Nb max de notifications, plage horaire autorisée, thème, export/import JSON |

**Catégories** : Focus, Énergie, Calme, Créativité, Sommeil, Apprentissage.

**15 routines préchargées** au premier lancement (Eau froide visage, Mot du
jour, 3 minutes de silence, Gratitude, …).

### Notifications locales

```
🧠 Routine Cognitive
[Titre]
[FAIT] [PLUS TARD] [PAUSE]
```

- `FAIT` → action marquée réalisée
- `PLUS TARD` → reportée (snooze)
- `PAUSE` → routine mise en pause

Gérées par le Service Worker (`src/sw.ts`) qui relaie l'action vers l'app.

## 3. Stack technique

React 18 · TypeScript · Vite · PWA (`vite-plugin-pwa`, Workbox) ·
Service Worker · IndexedDB (`idb`) · Vitest + Testing Library.

## 4. Démarrage

```bash
npm install      # installer les dépendances
npm run dev      # serveur de développement
npm run build    # build de production (dossier dist/)
npm run preview  # prévisualiser le build
npm test         # lancer les tests (51 tests)
npm run lint     # vérification ESLint
```

## 5. Architecture

```
src/
  data/        # catégories + routines préchargées
  db/          # couche IndexedDB (+ tests d'intégration)
  lib/         # logique pure : dates, scheduling, scheduler+watchdog,
               # logger (observabilité), bulkImport, backup (export/import)
  store/       # AppContext (état React, actions)
  components/  # BottomNav, RoutineCard, ActionButtons, CategoryBadge
  screens/     # Today, Routines, Add, History, Settings
  sw.ts        # Service Worker (précache + actions de notification)
```

## 6. Conformité BEST_PRACTICES_CODING.md

- **REGLE 5 — Observabilité** : `src/lib/logger.ts` (timestamp, niveau, scope,
  contexte) ; chaque opération clé est journalisée.
- **REGLE 6 — Watchdog** : `NotificationScheduler` avec heartbeat + watchdog et
  redémarrage contrôlé (`src/lib/scheduler.ts`).
- **REGLE 7 — Tests** : unitaires (cas normal/limite/erreur), intégration
  IndexedDB et flux utilisateur (`*.test.ts(x)`).
- **REGLE 9 — Sécurité** : toute donnée importée (JSON) est **validée et
  assainie** avant usage (`src/lib/backup.ts`).
- **REGLE 10 — CI/CD** : `.github/workflows/ci.yml` (build, lint, tests, audit).
- **REGLE 12 — Dette** : suppression d'une routine ⇒ nettoyage des logs liés
  (pas d'orphelins).

Voir `CHANGELOG.md` pour la traçabilité des modifications (REGLE 3).

## 7. Limites connues (MVP V1)

- Les notifications planifiées dépendent d'un onglet/PWA actif (pas de push
  serveur, par conception « sans backend »). Le Service Worker gère les clics.
- L'estimation « Prévues » de l'historique est basée sur les routines actives
  courantes (pas de recomptage rétroactif jour par jour).
- Compatibilité notifications selon le navigateur (iOS Safari limité).
