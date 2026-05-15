# RELATIONAL COLLISIONS

**Mission Oracle** : `ZORAN_RELATIONAL_TOPOLOGY_AUDIT_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY
**Fichier audité** : `app/data/laws.json`

Liste exhaustive des collisions structurelles détectées dans le graphe
actuel. Chaque collision a une **sévérité** et un **verdict** (légitime /
collision réelle / à trancher).

---

## C1. Multi-parentalité cross-family — VAR-002

| | |
|---|---|
| nœud | `VAR-002` |
| parents | `DVE-003`, `UDE-003` |
| familles parentes | DVE, UDE |
| sévérité | 🟠 forte (sous régime VAR-comme-famille) |
| nature | catégorielle |

**Diagnostic** : `VAR-002` appartient simultanément à 3 familles (sa propre
VAR + DVE + UDE). Si VAR est une famille, c'est une violation de
`A3_canonical_root_unique` au sens de l'arbre d'appartenance.

**Verdict après refactor** : disparaît automatiquement — `VAR-002` devient
une arête `derives` entre deux dérivés (ex. `DVE-003-variant` et
`UDE-003-variant`), ou plus simplement deux arêtes parallèles.

---

## C2. Multi-parentalité cross-family — VAR-003

| | |
|---|---|
| nœud | `VAR-003` |
| parents | `ULG-002`, `GHUC-002` |
| sévérité | 🟠 forte |
| nature | catégorielle + sémantique |

Idem C1, mais **plus subtil** : la sémantique est « absorbée par GHUC » donc
la double parentalité encode une *absorption*, pas une dérivation. C'est un
**typage incorrect** : ce devait être `(ULG-002, GHUC-002, absorbed_into)`.

**Verdict** : `absorbed_into` après refactor.

---

## C3. Gravitation déclarative — ISO-005

| | |
|---|---|
| nœud | `ISO-005` |
| related | 7 moteurs canoniques (ULG-001, DVE-001, UDE-001, WP11-001, WP12-001, SDE-001, PAL-001) |
| sévérité | 🔴 critique |
| nature | systémique |

**Diagnostic** : un nœud qui pointe vers 7 racines canoniques sans
démonstration des invariants conjoints crée un attracteur gravitationnel.
Toute exploration du graphe finira par ISO-005, ce qui produit une illusion
de clôture systémique.

**Verdict** : suppression OU démonstration formelle des 7 invariants (un par
moteur). Voir `P0_5_SPEC.md §6`.

---

## C4. Contradiction non-réciproque — WP11-005 ↔ UDE-003

| | |
|---|---|
| source | `WP11-005` |
| cible | `UDE-003` |
| stocké côté | uniquement WP11-005.contradictions = ['UDE-003'] |
| réciproque | absente côté UDE-003 |
| sévérité | 🟡 modérée |
| nature | typage |

**Diagnostic** : une contradiction est par définition symétrique. Stocker
unilatéralement viole la sémantique de la relation.

**Verdict** : ajouter automatiquement le tuple réciproque pendant la
migration (cf. `EDGE_SYSTEM_SPEC.md §4.4`).

---

## C5. Inflation de `related` intra-famille

| | |
|---|---|
| liens concernés | ~12 sur 38 |
| exemples | `WP11-002 related WP11-004` alors que `WP11-004 parent WP11-002` |
| sévérité | 🟡 modérée |
| nature | redondance |

**Diagnostic** : la relation est déjà capturée par `parent`. Le `related`
duplique sans apporter d'info.

**Verdict** : nettoyer (≈ 12 liens à supprimer).

---

## C6. Sous-représentation des contradictions

| | |
|---|---|
| count actuel | 1 sur 50 nœuds = 2% |
| plancher attendu | 4% (cf. `P0_5_SPEC.md §9`) |
| sévérité | 🟡 modérée |
| nature | calibration |

**Diagnostic** : un système cognitif sans contradictions internes est
soit (a) trivialement consistant et donc inintéressant, soit (b)
sur-harmonisé par construction. Probable (b).

**Cas de contradictions structurellement attendues qui manquent** :
- `WP12-003` (minimalité) vs `WP12-004` (fertilité) : tension classique
  rasoir d'Occam ↔ production de prédictions. **À expliciter**.
- `DVE-001` (génération de variantes) vs `GHUC-003` (pruning) : tension
  expansion ↔ compression. **À expliciter**.
- `SDE-002` (dualité observateur/objet) vs `ULG-003` (invariance
  morphologique) : tension symétrie ↔ asymétrie observationnelle.

**Verdict** : ajouter ≥ 3 contradictions structurelles documentées.

---

## C7. Pseudo-attracteur GHUC-001 (sans citation externe)

| | |
|---|---|
| nœud | `GHUC-001` |
| weight | 1.0 |
| description | « Attracteur majeur » |
| citations externes canoniques | 0 |
| sévérité | 🟡 modérée |
| nature | claim |

**Diagnostic** : déclarer attracteur méta (μ0) exige ≥ 2 racines canoniques
externes qui le citent en `related`. Aucune ne le fait actuellement.

**Verdict** : reclasser μ1 OU créer les liens manquants si justifiés
(probable, GHUC est une consolidation explicite des autres moteurs).

---

## C8. Pseudo-attracteur PAL-001

Comme C7.

---

## C9. Templating uniforme 5-par-famille

| | |
|---|---|
| pattern | toutes les familles ont exactement 5 nœuds (1 + 4) |
| sévérité | 🟢 latente |
| nature | suspect de génération |

**Diagnostic** : cette uniformité est statistiquement improbable dans un
corpus réel émergent. C'est probablement un artefact de bootstrap.

**Verdict** : non-bloquant. Lever progressivement par l'approfondissement
(`P0_5_SPEC.md §4`) qui produira des asymétries naturelles.

---

## C10. Multi-kind potentiel entre `ULG-001` et descendants

Le nœud racine ULG a plusieurs enfants directs + il est cité par `SDE-001`
(via `related`) + il est lié à `ISO-001` par parentalité d'isomorphisme.
**Plusieurs chemins** sans collision claire mais à surveiller post-refactor :
si `ULG-001` et `SDE-001` sont à la fois liés par `iso` et `related`, c'est
une violation de `max_kinds_per_pair` (cf. `edge_types.json`).

**Verdict** : après refactor, garder uniquement `iso` (plus fort) et
supprimer le `related` correspondant.

---

## Synthèse

| sévérité | count |
|---|---|
| 🔴 critique | 1 (C3 ISO-005) |
| 🟠 forte | 2 (C1, C2 multi-parent VAR) |
| 🟡 modérée | 5 (C4, C5, C6, C7, C8) |
| 🟢 latente | 2 (C9, C10) |

**Total** : 10 collisions identifiées. **5 sont des artefacts de
typage** (C1, C2, C4, C5, C10) qui disparaissent après refactor §3 du SPEC.
**3 sont des claims à étayer** (C3, C7, C8). **2 sont des calibrations**
(C6, C9).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_RELATIONAL_TOPOLOGY_AUDIT_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/data/laws.json
RISKS:                C3 (ISO-005) propage une fausse clôture systémique ;
                      C6 (sous-représentation) désensibilise l'Oracle
S_LOCAL:              n/a (audit de collisions)
S_GLOBAL:             n/a
TOP_COLLISIONS:       C3 ISO-005 gravité ; C1+C2 multi-parent VAR ;
                      C6 contradictions sous-représentées ;
                      C7+C8 attracteurs sans citation externe ;
                      C5 related intra-famille redondants
TOP_FAKE_PATTERNS:    templating uniforme 5/famille ;
                      attracteur sans palier déclaré ;
                      ISO-005 comme méta-explication non démontrée
NEXT_ACTIONS:         exécuter §3 du SPEC ; ajouter ≥ 3 contradictions
                      structurelles ; statuer ISO-005 ; reclasser attracteurs
```

🔶
