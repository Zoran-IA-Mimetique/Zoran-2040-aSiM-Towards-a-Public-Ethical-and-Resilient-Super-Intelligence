# CLAUDE.md — ZORAN 2040 aSiM

Ce fichier est lu automatiquement par Claude Code au démarrage de chaque
session. Il consolide les obligations systématiques pour ce projet.

## Branche de développement obligatoire

Toute modification doit se faire sur :
`claude/zoran-fractal-law-tree-pPfzR`

Commit + push à chaque mission terminée. Toujours créer une PR (draft)
si elle n'existe pas.

## Obligation systématique — Skills

À chaque démarrage de mission **et avant toute action significative** :

1. **Examiner les skills disponibles** dans la conversation (liste fournie
   par le système au démarrage). Aucun skill ne doit être deviné — n'invoquer
   que ceux explicitement listés.
2. **Activer le ou les skills pertinents** pour la tâche en cours.
   Mapping de référence (à adapter au contexte) :
   - Code review / qualité finale → `review`, `simplify`
   - Sécurité avant merge → `security-review`
   - Hooks runtime (auto-format, session start, post-compact) →
     `update-config`, `session-start-hook`
   - Tâches récurrentes (CI watch, PR babysitting) → `loop`
   - Réduction frictions de permissions → `fewer-permission-prompts`
   - Anthropic SDK / Claude API code → `claude-api`
   - Initialiser un nouveau projet ou CLAUDE.md → `init`
   - Configurer raccourcis clavier → `keybindings-help`
3. **Ne pas mentionner un skill sans l'invoquer via le tool `Skill`**.
4. **Si un skill manque** pour une tâche prioritaire, le signaler dans la
   réponse et proposer une alternative outillée (Agent, Bash, etc.).

## Référence : setup Boris Cherny (Claude Code @ Anthropic)

GitHub officiel : `github.com/bcherny`.
Setup public détaillé : `howborisusesclaudecode.com`.
Communauté : `0xquinto/bcherny-claude`, `llcoolblaze/claude-boris`,
`meleantonio/ChernyCode`.

Patterns à viser progressivement pour ce projet :

### CLAUDE.md (ce fichier)
- Documenter chaque erreur reprise par le user → règle persistante
  (« always use X », « never do Y »).
- Maintenir un répertoire `notes/` par tâche.

### `.claude/commands/` (slash commands)
- `/commit-push-pr` — workflow PR automatisé
- `/techdebt` — détecte + supprime duplications en fin de session
- `/babysit` — auto-fix CI + review comments

### `.claude/agents/` (subagents)
- `code-simplifier` — clean après chaque sprint
- `verify-app` — e2e tests
- `ReadOnly` — agent restreint en lecture seule
- Préférer `isolation: worktree` pour les runs parallèles

### `settings.json` hooks
- **PostToolUse** : auto-format après chaque édition
- **SessionStart** : charger contexte projet (statut git, smoke test)
- **PreToolUse** : log des commandes bash sensibles
- **Stop** : nudge si tâche incomplète
- **PostCompact** : re-injecter les instructions critiques après compaction

## Obligation systématique — Bugs (méthode iterate-fix)

Pour tout bug ou régression signalée, appliquer la boucle :

  ANALYZE → MODIFY → TEST RUNTIME → VERIFY → repeat until verified

Règles strictes :
- **Pas de validation théorique** (« semble correct », « devrait marcher »)
- **Preuve runtime obligatoire** : capture/log/state observable, pas
  uniquement lecture de code
- Pour les régressions visuelles : capture before/after via Playwright
- Pour les régressions logiques : assertions empiriques (smoke test, logs)
- À chaque échec : isoler la cause exacte AVANT de patcher
- Patch minimal, chirurgical, sans refactor global

NB : un skill `iterate-fix` peut exister dans certains setups. S'il n'est
pas listé dans les skills disponibles de la session, appliquer la méthode
manuellement (cette section) — ne pas l'invoquer comme un skill.

## Standards du projet ZORAN

- Stack vanilla CDN (Three.js + 3d-force-graph), zero build
- Smoke test obligatoire avant claim « terminé » :
  `node tools/smoke_test.mjs` (≥ 10/10 ok, 0 console error)
- Honnêteté empirique > optimisme : documenter les gaps mission
  (ex : noise S/N=0.556 vs objectif 0.95) dans les specs
- Toute mission ZORAN aboutit à : engine Python + UI block + smoke test
  + capture + spec markdown dans `audit/`

## Anti-patterns interdits

- Promotion automatique sandbox → laws.json (toujours via Oracle)
- Création de lois sans SHA512 + provenance + filiation
- Génération infinie / explosion combinatoire (cap MAX_CORES=8, MAX_CHILDREN=50)
- Surcharge visuelle (≥ 6 routes simultanées MAX)
- Modifier sans relecture des moteurs amont (propagation, runtime,
  temporal, oracle)
