# V13_PATCH_DISCIPLINE — Discipline de patch

- **mission_id** : ZORAN_V13_MAX_SECURITY_LAB_PROTOCOL_20260520
- **adopté le** : 2026-05-20T17:35:00Z

## Aucun patch silencieux

Le message de commit `fix bug` est interdit. Chaque correction documente :

```
CAUSE        — la cause racine identifiée (pas le symptôme)
CORRECTION   — ce qui a été changé et pourquoi c'est minimal
RISQUE RESTANT — ce que la correction ne couvre pas
LIMITES      — le périmètre hors de portée du patch
VALIDATION   — preuve runtime (smoke, runtime check, benchmark)
```

## Patch minimal, falsifiable

- 1 step = 1 commit, diff ≤ 500 lignes.
- Interdiction de sur-correction : on corrige la cause, pas trois choses « tant
  qu'on y est ».
- Préférer un patch chirurgical falsifiable à un refactor opportuniste.

## Refus du patch chaotique

Interdits :
- empiler des `if` défensifs
- patchs locaux contradictoires
- regex défensives infinies
- `try/catch` silencieux qui avalent l'erreur
- « quick fixes »
- duplication de logique

## Seuil d'audit architectural

Si **3 patchs successifs** touchent le même composant, OU si **10+ bugs**
émergent du même fichier → **audit architectural obligatoire** avant tout
nouveau patch. Le fichier est probablement structurellement fragile.

## Refonte contrôlée

Si un fichier devient illisible / patché 15 fois / incohérent / impossible à
raisonner → **REFACTOR contrôlé**. Conditions du refactor :

- préserver les benchmarks
- préserver l'UX
- préserver les scores
- préserver le rendering
- préserver le comportement runtime observable

Un refactor qui change un benchmark sans justification est un échec de refactor.

## Méthode bug — iterate-fix (rappel CLAUDE.md)

```
ANALYZE → MODIFY → TEST RUNTIME → VERIFY → repeat until verified
```

- Pas de validation théorique (« semble correct »).
- Preuve runtime obligatoire : capture / log / état observable.
- À chaque échec : isoler la cause exacte AVANT de patcher.

## Journalisation

Chaque patch produit une ligne dans `audit/critical_patch_log.jsonl` :

```json
{"ts":"ISO8601","mission_id":"...","commit":"sha","scope":["fichiers"],
 "cause":"...","correction":"...","risque_restant":"...","verdict":"PASS|FAIL"}
```

## Règle 2-FAIL

2 FAIL consécutifs sur le même objectif = STOP. Signaler via
`critical_patch_log.jsonl` avec `"verdict":"BLOCKER"` et escalader avant de
retenter. Ne pas boucler en patch impulsif.

## Benchmarks sacrés

Aucun benchmark supprimé / remplacé / modifié / repondéré sans : justification
écrite + timestamp + signature + impact documenté. Un benchmark qui « gêne »
n'est pas supprimé — il est compris.
