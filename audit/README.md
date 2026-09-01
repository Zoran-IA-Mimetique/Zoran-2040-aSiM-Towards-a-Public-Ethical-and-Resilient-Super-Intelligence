# `audit/` — Oracle Read-Only Deliverables

Livrables des 5 missions Oracle (read-only) du `2026-05-15T19:03:00+02:00`.

Aucun document ici ne modifie le code ni les données du graphe. Tous sont
des **spécifications, audits, ou protocoles** consultables.

---

## Mission 1 — Honnêteté structurelle

| document | rôle |
|---|---|
| `../P0_5_SPEC.md` (racine) | Contrat de vocabulaire, prédicats formels, plan de refactor, critères d'acceptation P0.5 |
| `P0_5_RISKS.md` | 9 risques si P0.5 n'est pas exécuté ; score agrégé 0.52 |
| `P0_5_ADMISSIBILITY.md` | Prédicats A1–A6 (nœud, lien, famille, claim, attracteur, fractal) appliqués au corpus actuel ; taux 77% |

## Mission 2 — Topologie relationnelle

| document | rôle |
|---|---|
| `TOPOLOGY_AUDIT.md` | Inventaire des faux clusters, faux attracteurs, inflation, redondances, branches mortes. Score HT = 0.05 |
| `EDGE_SYSTEM_SPEC.md` | Système d'arêtes typées (7 kinds), schémas, migration VAR/ISO |
| `edge_types.json` | Version machine-readable des schémas d'arêtes |
| `RELATIONAL_COLLISIONS.md` | 10 collisions identifiées (1 critique, 2 fortes, 5 modérées, 2 latentes) |

## Mission 3 — Validation fractale

| document | rôle |
|---|---|
| `FRACTAL_VALIDATION.md` | Test `fractal_property` sur ULG, GHUC, WP11 : 0/3 passent |
| `RECURSIVE_PATTERNS.md` | Distinction templating / récursivité / modularité ; 0 récursivité réelle |
| `FAILED_FRACTAL_CLAIMS.md` | ~10 usages publics inadmissibles du mot « fractal » à corriger |

## Mission 4 — Charge cognitive

| document | rôle |
|---|---|
| `COGNITIVE_AUDIT.md` | Mesure des 4 dimensions de charge ; score cognitif global 0.59 |
| `VISUAL_SILENCE_REPORT.md` | Score de silence visuel par élément ; global +0.40, particules à -0.6 |
| `OVERLOAD_ZONES.md` | 8 zones cartographiées ; 4 zones HAUTES priorité avant scaling |

## Mission 5 — Oracle global de cohérence

| document | rôle |
|---|---|
| `GLOBAL_ORACLE_SPEC.md` | Spec du composant Oracle bloquant continu |
| `S_GLOBAL_RULES.md` | 11 règles formelles régissant S_global ; conformité actuelle 3/11 |
| `CHAOS_PREVENTION.md` | Protocole en 5 paliers, 9 déclencheurs |
| `PRUNING_PROTOCOL.md` | Triggers de pruning, garde-fous, période de grâce, rollback 7j |
| `oracle_rules.json` | Catalogue machine-readable de toutes les règles R-* |

---

## Synthèse exécutive

| dimension | valeur actuelle | cible P0.5 |
|---|---|---|
| HS (honnêteté structurelle) | ≈ 0.32 | ≥ 0.75 |
| HT (honnêteté topologique) | ≈ 0.05 | ≥ 0.80 |
| admissibilité globale | 77% | ≥ 95% |
| familles passant fractal_property | 0/3 | ≥ 1/3 |
| règles S_global conformes | 3/11 | ≥ 9/11 |
| zones HAUTES priorité non traitées | 4 | 0 |
| usages publics « fractal » sans preuve | ~10 | 0 |

---

## Statut

- **Mode Oracle actif** : aucun code modifié, aucune donnée touchée.
- **Verdict global** : P0 est utile comme prototype démonstratif. P0.5
  est nécessaire avant tout scaling pour transformer les labels en
  propriétés démontrées.
- **Décision en attente** : autorisation d'exécution P0.5 (sortie d'Oracle)
  ou itération de la spec si points contestés.

🔶
