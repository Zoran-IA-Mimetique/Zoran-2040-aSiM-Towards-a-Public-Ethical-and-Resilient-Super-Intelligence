# GENERATION ORACLE

**Mission** : `ZORAN_DISTRIBUTED_GENERATIVE_LAW_ENGINE_20260516`
**Source** : `tools/distributed_generative_law_engine.py` → `generation_oracle()`
**Cross-refs** : `audit/DISTRIBUTED_GENERATIVE_LAW_ENGINE.md`, `audit/DISTRIBUTED_GENERATIVE_REPORT.json`

---

## 1. Rôle

Filtre bloquant entre la phase *proposition de filles* et la
DiscoverySandbox. Aucune fille candidate n'atteint
`laws_sandbox.json` sans avoir passé les 6 checks. L'Oracle ne note
pas — il refuse ou accepte.

---

## 2. Les 6 checks bloquants

| # | Check                       | Critère formel                                            | Si violé |
|---|-----------------------------|-----------------------------------------------------------|----------|
| 1 | `pertinence_locale`         | `child.estimated_S_local ≥ 0.70`                          | reject `pertinence_locale_insuffisante` |
| 2 | `redondance`                | `child.id ∉ existing_ids(graph)`                          | reject `redondance_id` |
| 3 | `propagation_excessive`     | `child.estimated_propagation_cost ≤ 0.85`                 | reject `propagation_excessive` |
| 4 | `auto_référentialité`       | `child.parent_id ≠ child.id`                              | reject `auto_référentialité` |
| 5 | `famille_interdite`         | `child.family ∉ mother.forbidden_expansions`              | reject `famille_interdite` |
| 6 | `anti_drift` (composite)    | enveloppe combinée des 5 précédents + `oracle_constraints[]` héritées | reject par cause initiale |

Une fille est `accepted = True` ssi `len(rejections) == 0`.

---

## 3. Rejection breakdown (runtime réel)

Sur **476 filles proposées** par **241 mères** (n_max=2 chacune) :

| reason                              | count | % rejets |
|-------------------------------------|------:|---------:|
| `pertinence_locale_insuffisante`    |   111 |   100.0% |
| `redondance_id`                     |     0 |     0.0% |
| `propagation_excessive`             |     0 |     0.0% |
| `auto_référentialité`               |     0 |     0.0% |
| `famille_interdite`                 |     0 |     0.0% |
| **TOTAL**                           | **111** | **100%** |

→ 365 acceptées (76.7 %), puis réduites à 50 par la cap anti-explosion.

---

## 4. Interprétation

Le fait que 100 % des rejets proviennent du seul check `pertinence_locale`
indique que :

- les bornes de propagation (0.85) et la famille (`FAMILY_AFFINITY`) sont
  déjà bien dimensionnées en amont par `derive_generative_scope()`,
- la collision d'ID est structurellement impossible (suffixe `-d{i}`
  garanti unique par mère),
- l'auto-référence ne peut pas survenir car `child_id = "{gap}-{mother}-d{i}"`,
- la couche `pertinence_locale` joue donc le rôle réel de filtre qualité.

L'Oracle reste calibré conservateur : préférer rejeter une bonne fille
qu'accepter une mauvaise.
