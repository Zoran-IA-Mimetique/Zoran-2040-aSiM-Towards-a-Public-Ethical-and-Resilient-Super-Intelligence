# ZORAN_CONSOLIDATION_ENGINE_V1

Robot déterministe de consolidation, conforme au plan canonique minimal
**ZORAN-PLAN-CANONIQUE-MINIMAL:v1.1** (§15 « Robot de consolidation » et
§15.1 « LEGACY_CODE_RECOVERY »).

- **Mode :** `DRY_RUN` strict. Aucune mutation de `main`, aucune écriture hors
  du répertoire `--out`, aucune application de patch, aucun merge/push/déploiement.
- **Python :** ≥ 3.9, bibliothèque standard uniquement (zéro dépendance).
- **Déterminisme :** JSON canonique (clés triées), horloge injectable
  (`--now` ou `ZCE_NOW`), rejouable bit à bit (prouvé par test).

## Ce que le moteur fait (plan §15)

1. lit le manifeste des fichiers, le graphe des liaisons et le registre des
   écarts, validés par schéma, **fail-closed** ;
2. contrôle chaque fichier avant intervention (racine, existence, symlink,
   taille, SHA-256) et attribue ID, méta-ID, type, champ, dates UTC, SHA,
   relations et provenance (contrat d'objet du §8) ;
3. classe chaque objet : `KEEP`, `WIRE`, `CORRECT`, `SUPPORT`, `ARCHIVE`,
   `DUPLICATE` ou `QUARANTINE` — règles ordonnées R1→R7, chaque décision
   porte sa règle et sa cause ;
4. résout les relations typées et détecte orphelins, doublons, chemins
   pendants et guards manquants ;
5. calcule la cohérence numérique par cadre et totale, avant et après
   (formule `S=(β×ΔΦ_coh)/(1+T+σ)`, agrégation `min` sans compensation,
   veto conservateur `S=0 [0,100] BOUNDED_CONSERVATIVE` si donnée absente) ;
6. **scelle le rollback avant** de proposer un patch minimal, borné
   (budget de modification, rayon d'impact) et réversible ;
7. émet un `PACK_REQUEST` pour chaque brique manquante — il n'installe
   jamais rien lui-même ;
8. n'admet un candidat LLM qu'après la porte déterministe
   (`gate-candidate`) : schéma fermé, clés d'exécution interdites, budget
   de diff, tests + falsificateur + preuve de rollback exigés ; décision
   `ACCEPT_FOR_SANDBOX` / `REJECT` / `ROLLBACK`, jamais d'exécution ;
9. produit manifestes, preuves, reçus, journal append-only et certificat
   de contrôle, chaque sortie hachée SHA-256.

## Interdictions câblées (guards)

| Guard | Effet |
|---|---|
| `GUARD_DRY_RUN_ONLY` | `zce apply` refuse toujours (code 3) en V1 |
| `GUARD_NO_SILENT_DELETE` | aucune suppression ; un doublon est proposé à l'archivage explicite |
| `GUARD_NO_LLM_EXECUTION` | aucun code LLM exécuté ; clé `command`/`shell`/`exec`… = rejet |
| `GUARD_NO_HISTORICAL_ENGINES` | moteurs 00–11 jamais chargés ni patchés |
| `GUARD_PROTECTED_COMPONENTS` | ZMOS, K3, NLP, Amygdale, moteur 4.0, ZenMOS jamais réécrits |
| `GUARD_MODIFICATION_BUDGET` | ≤ 10 patchs/run, ≤ 3 fichiers/patch, ≤ 80 lignes de diff |
| `GUARD_IMPACT_RADIUS` | cibles hors des préfixes autorisés bloquées |
| `GUARD_ROLLBACK_FIRST` | plan de rollback scellé avant le plan de patch (prouvé au journal) |

## Commandes exactes

Depuis `consolidation_engine/` :

```bash
# tests déterministes (33 tests)
python3 -m unittest discover -s tests

# valider les trois entrées gelées
python3 -m zce validate --manifest sample/inputs/manifest.json \
  --graph sample/inputs/relation_graph.json --ledger sample/inputs/gap_ledger.json

# dry-run complet sur l'échantillon gelé (horodatage gelé → rejouable bit à bit)
python3 -m zce dry-run --root sample/frozen_tree \
  --manifest sample/inputs/manifest.json \
  --graph sample/inputs/relation_graph.json \
  --ledger sample/inputs/gap_ledger.json \
  --out sample/reference_run --now 2026-08-28T12:00:00Z

# porte déterministe des candidats LLM
python3 -m zce gate-candidate --candidate sample/candidates/llm_candidate_ok.json   # exit 0
python3 -m zce gate-candidate --candidate sample/candidates/llm_candidate_bad.json  # exit 3

# l'application est structurellement refusée en V1
python3 -m zce apply   # exit 3, GUARD_DRY_RUN_ONLY
```

## Sorties d'un run

Toutes stampées avec le contrat d'objet du §8 (object_id, meta_id, dates
UTC, `content_sha256`, provenance, guards, rollback, verdict) :

`ZCE_RUN_MANIFEST_V1.json`, `ZCE_DECISIONS_V1.json`, `ZCE_FINDINGS_V1.json`,
`ZCE_ROLLBACK_PLAN_V1.json`, `ZCE_PATCH_PLAN_V1.json`,
`ZCE_PACK_REQUESTS_V1.json`, `ZCE_COHERENCE_MEASURE_V1.json`,
`ZCE_JOURNAL_V1.jsonl`, `ZCE_CONTROL_CERTIFICATE_V1.json`.

Le run de référence commité dans `sample/reference_run/` est rejouable :
relancer la commande `dry-run` ci-dessus doit reproduire les mêmes octets.

## Conventions de mesure V1 (déclarées, pas cachées)

- Cadres `PASS` à 100, `FAIL` sinon ; agrégation = minimum des six cadres.
- Cellules « avant » : classe `DETERMINISTIC_OBSERVED`, intervalle `[S,S]`,
  preuve 1,0. Cellules « après » : classe **`PROJECTED_DRY_RUN`** (extension
  V1) : la projection suppose patchs appliqués et paquets livrés ; intervalle
  conservateur `[0,S]`, preuve 0,5, `runtime_promotion=false`. Elle ne
  certifie **aucun** comportement runtime.
- Seul le cadre `local` distingue avant/après en V1 ; les cinq autres
  mesurent le processus du run (validation, causes, guards, journal, reçus).
- Dénominateur nul = cas « rapport vide » du §12 : ratio 1, la mesure reste
  possible ; une donnée réellement absente déclenche le veto conservateur nommé.

## Rollback

- **Du moteur lui-même :** supprimer le répertoire de sortie du run ; le
  dry-run ne laisse aucune autre trace (prouvé par le test
  `test_frozen_tree_never_modified`).
- **De chaque patch futur :** `ZCE_ROLLBACK_PLAN_V1.json` fixe, avant toute
  proposition, le SHA-256 de référence et la procédure de restauration de
  chaque cible ; le journal prouve l'ordre (`ROLLBACK_PLAN_SEALED` seq 6 <
  `PATCH_PLAN_PROPOSED` seq 7).
- **De ce livrable :** revert du commit ; aucun fichier existant du dépôt
  n'est modifié.

## Suite prévue (hors V1)

L'inventaire réel (~800 objets) sera injecté sous forme de
`ZORAN_ACTIVE_MANIFEST_V1.json` + `ZORAN_RELATION_GRAPH_V1.json` +
`ZORAN_GAP_LEDGER_V1.json` conformes aux schémas de `schemas/`, **sans
recoder le moteur**. L'application réelle (opérations 7–8 du §15 : branche
isolée, PRE K3, rejeu des tests, POST K3) exige une version ultérieure et
une décision humaine ; V1 la refuse structurellement.
