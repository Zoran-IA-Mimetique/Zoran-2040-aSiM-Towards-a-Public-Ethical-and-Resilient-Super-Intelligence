# V13_MAX_SECURITY_PROTOCOL — Protocole laboratoire haute fiabilité

- **mission_id** : ZORAN_V13_MAX_SECURITY_LAB_PROTOCOL_20260520
- **adopté le** : 2026-05-20T17:35:00Z
- **portée** : tout développement sur le ZORAN Core jusqu'au freeze septembre 2026
- **logique opératoire** : aviation / nucléaire / médical critique

## Principe

Le laboratoire n'est plus un terrain d'expérimentation rapide. C'est un
environnement d'ingénierie contrôlée. **La vitesse n'est plus une qualité.**
La qualité est : survie au réel, traçabilité, absence de régression, stabilité
sous contrainte.

## Priorités (ordre strict)

1. Cohérence
2. Robustesse
3. Réalité
4. Auditabilité
5. Falsifiabilité
6. Lisibilité
7. *Seulement ensuite* : performance

## Protocole avant chaque développement

Aucune ligne de code n'est écrite avant d'avoir parcouru les 6 étapes :

| Étape | Action | Livrable |
|---|---|---|
| 1. Cartographie | Lire architecture, dépendances, impacts, benchmarks concernés | `IMPACT_MAP` (voir `V13_IMPACT_MAP_PROTOCOL.md`) |
| 2. Hypothèses | Ce que le patch améliore / pourrait casser / ne mesure pas | section du commit |
| 3. Contre-hypothèses | Pourquoi le patch pourrait être mauvais / inutile / Goodhart / cosmétique | section du commit |
| 4. Patch minimal | Patch minimal falsifiable — interdiction de sur-correction | diff ≤ 500 lignes |
| 5. Tests | avant + après + benchmark + régression + rendering + runtime + adversarial | smoke + runtime check |
| 6. Validation humaine | Si impact fort : pause, revue, relecture | signature Oracle |

## Mode chirurgical — autorisé / interdit

La validation interne est forte, la validation externe (BET) est absente.
Conséquence : **mode chirurgical**, pas STOP total.

**Autorisé** : stabilisation · correction de bugs · clarification d'architecture ·
réduction de bruit · refactor de lisibilité · instrumentation · UX passive ·
audit · isolation expérimentale · anti-régression · falsification.

**Interdit** : inflation architecturale · nouvelles couches lourdes · nouveaux
moteurs complexes · nouvelles métriques massives · claims d'expertise absolue ·
dérive « référence définitive ».

## Règle fondatrice

> AUCUNE nouvelle sophistication architecturale tant que le niveau précédent
> n'a pas été falsifié, validé, ou explicitement rejeté.

Le « niveau précédent » actuel = architecture V11/V12. Son gate de falsification
= P0-MINI BET réel (`P0_MINI_BET_PROTOCOL.md`), **non exécuté à ce jour**.

## Horodatage & signature obligatoires

Chaque test, benchmark, décision, patch, rollback, refactor, audit porte :

- un timestamp ISO (`2026-05-20T17:35:00Z`)
- une signature au format :

```json
{
  "agent": "CLAUDE",
  "mission_id": "...",
  "commit": "...",
  "scope": ["fichiers"],
  "reason": "...",
  "result": "...",
  "timestamp": "ISO8601"
}
```

## Question directrice (avant chaque commit)

> « Si ce patch partait demain dans un tribunal, un chantier, ou un audit réel,
> survivrait-il ? »

Et : « Résiste-t-il mieux au réel, ou paraît-il seulement plus intelligent ? »
Si la réponse est « paraît » → ne pas commiter.

## Documents liés

- `V13_CRITICAL_LAB_RULES.md` — interdictions terminales
- `V13_IMPACT_MAP_PROTOCOL.md` — comment produire un IMPACT_MAP
- `V13_PATCH_DISCIPLINE.md` — format des patchs, anti-patch-chaotique
- `V13_REGRESSION_MATRIX.md` — matrice de non-régression
- `ARCHITECTURE_LIVE_MAP.md` — carte runtime des moteurs (auto-générée)
- `critical_patch_log.jsonl` — journal signé de tous les patchs
