# V13_CRITICAL_LAB_RULES — Règles critiques du laboratoire

- **mission_id** : ZORAN_V13_MAX_SECURITY_LAB_PROTOCOL_20260520
- **adopté le** : 2026-05-20T17:35:00Z
- **statut** : règles non négociables jusqu'au freeze septembre 2026

## Logique aviation / nucléaire / médical critique

Avant toute action : **comprendre → simuler → falsifier → vérifier → seulement
ensuite modifier.** Aucune urgence ne justifie de sauter une étape.

## Interdictions terminales

| # | Interdit |
|---|---|
| 1 | Précipitation |
| 2 | Patch émotionnel |
| 3 | Dev « à l'instinct » |
| 4 | Modification non tracée |
| 5 | Benchmark opaque |
| 6 | Ajout sans falsification |
| 7 | Correction sans compréhension de la cause |
| 8 | Inflation architecturale / couche cosmétique |
| 9 | Claim d'expertise absolue (« niveau BET », « tribunal-grade ») sans validation humaine |
| 10 | Architecture défendue émotionnellement (attachement) |

## P0 humain — toujours bloquant

Même si un module semble excellent : **aucun claim** « niveau expert »,
« BET-like », « tribunal-grade », « référence absolue » sans validation humaine
externe (`P0_MINI_BET_PROTOCOL.md`). P0-MINI n'est pas exécuté → tous ces
claims sont actuellement interdits.

## Le vrai risque septembre

Ce n'est plus le Goodhart. C'est la **dette de compréhension architecturale** :
un Core que Codex hériterait sans savoir ce qui tourne, ce qui est mort, ce qui
est expérimental, ce qui est validé, ce qui est placebo, ce qui est zombie.

État mesuré au 2026-05-20 : **13 modules dormants, 1957 LOC mortes (17,5%)**
(voir `ARCHITECTURE_LIVE_MAP.md`). Réduire cette dette est prioritaire sur
toute nouvelle fonctionnalité.

## Orientation stratégique V13

Le système doit évoluer vers : **moins de bruit, moins de magie, moins de
cosmétique — plus de réalité, plus d'opposabilité, plus de robustesse.**

Corollaire : « V13 = soustraction » a plus de cohérence que « V13 = nouvelle
couche ». Un système mature cherche la compression, la réduction, la
survivabilité, la lisibilité, la preuve — **avant** la sophistication.

## Critère de maturité

Le système est mature quand il devient capable de **refuser de se complexifier
lui-même**. Le STOP architectural NO-BUILD du 2026-05-20 (refus de créer V13
par cohérence méthodologique, voir `V13_ADVERSARIAL_EXISTING_INVENTORY.md`) est
un exemple de ce critère appliqué.

## Question terminale

À chaque brique : « Apporte-t-elle une capacité réelle impossible à obtenir
avec un bon prompt, trois modules simples, et un LLM correctement contraint ? »
Si NON → supprimer.

## Traçabilité obligatoire

Chaque étape produit : commit · benchmark · cas d'échec · cas invalidants ·
rollback · limites · décision explicite **KEEP / REMOVE / CONDITIONAL / REBUILD**.
