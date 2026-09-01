# CTA_RUNTIME_V13 — Spec d'implémentation

mission_id : ZORAN_CTA_CLICKABLE_RUNTIME_V13_20260517
date       : 2026-05-18
commits    : voir branche `claude/zoran-fractal-law-tree-pPfzR` (HEAD post-V13)

## Pivot

Les CTA actuels (pré-V13) étaient **cognitifs mais pas UX** :
phrases noyées dans le texte, sans affordance visuelle, sans typage,
sans hiérarchie. Diagnostic utilisateur (métriques CC_inst=9.6/10) :
> *"ZORAN génère de très bons candidats CTA, mais pas encore des objets CTA."*

V13 transforme ces CTA implicites en **objets UX cliquables typés**.

## Architecture

Trois modules cœur (additifs, pas de breaking change runtime) :

| Fichier | Rôle |
|---|---|
| `app/src/cta_schema.js` | Parser + types + sérialisation des markers |
| `app/src/cta_priority_engine.js` | Cap 1 principal + 1 secondaire + 1 falsif (SDE-029) |
| `app/src/cta_metrics.js` | Tracking sessionStorage opens/asked/dwell/fast-close |

Refactorings :

| Fichier | Changement |
|---|---|
| `app/src/superiority_render.js` | `parseInlineCTAs()` pipeline V13 (extract → prioritize → render) |
| `app/src/chat.js` | `openCtaPopup()` typé multi-niveau, métriques wired |
| `app/style.css` | 5 variantes typées (dot color), 3 criticités (border-left, opacity) |
| `app/src/llm.js` | Prompt few-shot V13 avec exemple BTP complet |

## Syntaxe LLM V13

```
{cta:TYPE|label=X|crit=high|cout=X|delai=X|preuve=X|risque=X|detail=X}
```

- **TYPE** (obligatoire) : `terrain | falsif | risque | juridique | monitor | action`
- **label** (obligatoire) : texte affiché sur le bouton (2-6 mots)
- **crit** : `high | medium | low` — défaut `medium`
- **cout / delai / preuve / risque / detail** : champs optionnels riches

Backward-compat : `{cta:label}` et `{cta:label | détail}` continuent à fonctionner,
typés `action` par défaut.

## Pipeline render

1. **Fallback heuristique** : si réponse ZORAN sans aucun marker, injecter
   2-3 markers minimalistes depuis patterns (normes → monitor, verbes
   d'action → terrain, étapes → action).
2. **Extraction** : `extractAllCtas(escapedHtml)` retourne tous les markers
   avec leur position dans le texte.
3. **Priority engine** : `prioritize(candidates)` retourne `{keep, drop}`
   avec au maximum 3 keep (1 principal + 1 secondaire + 1 falsif).
4. **Render** : keep → boutons typés avec `data-cta` (base64 JSON) ;
   drop → texte simple (label seul, info préservée).
5. **Click** : décode `data-cta` → ouvre popup typé multi-niveau,
   track métriques.

## Popup multi-niveau

| Niveau | Contenu | UI |
|---|---|---|
| 1 | Badges (type, criticité, slot) + label | `<div class="head">` toujours visible |
| 2 | Coût, délai, preuve, risque | `<table>` toujours visible si ≥ 1 champ |
| 3 | Détail technique enrichi | `<details>` accordion replié par défaut |

Actions : "Poser cette question" (relance chat + métriques.asked++) ou Fermer.

## Style visuel (anti-bruit)

- Fond bouton : `rgba(255,255,255,0.04)` (très sobre)
- Bordure : `rgba(255,255,255,0.18)` (discrète)
- **Dot coloré** uniquement par type (6×6 px) — la couleur n'inonde pas le fond
- Criticité high → bordure gauche 3px de la couleur du type
- Criticité low → opacity 0.78 (signal d'optionnalité)
- Pas d'animation parasite, pas de glow, pas d'emoji

## Validation runtime (7 tests Playwright)

`tools/cta_v13_runtime_check.mjs` — verdict PASS ✓

| Test | Résultat |
|---|---|
| 1. Render V13 + priority cap 1+1+1 | 3 buttons / 5 markers, slots distincts |
| 2. Popup typé multi-niveau | head, badges, table, accordion, ask OK |
| 3. Métriques sessionStorage | opens=1, by_type=falsif |
| 4. "Poser cette question" | input filled, overlay closed, asked=1 |
| 5. Compat legacy `{cta:label\|détail}` | typé `action` ✓ |
| 6. Démotion silencieuse hors quota | 5 labels visibles (3 boutons + 2 texte) |
| 7. Screenshot capture | `audit/CTA_V13_POPUP_CAPTURE.png` |

Smoke test : 13/14, 0 console error.

## Gaps assumés

- Le LLM Sonnet n'a pas encore été testé en runtime avec le nouveau few-shot ;
  il faudra mesurer le ratio markers-LLM vs fallback-heuristique sur 10 questions.
- Les métriques sont locales (sessionStorage) — pas de remontée serveur.
- La popup ne gère pas le mode keyboard navigation (Tab, Enter sur boutons).
