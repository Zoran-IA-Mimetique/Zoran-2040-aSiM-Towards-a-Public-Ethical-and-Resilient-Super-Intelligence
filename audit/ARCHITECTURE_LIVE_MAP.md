# ARCHITECTURE_LIVE_MAP — Carte runtime des moteurs ZORAN Core

> **AUTO-GÉNÉRÉ** par `tools/architecture_live_map.mjs` — ne pas éditer à la main.
> Re-run le script pour rafraîchir. Toute divergence = signal de dérive.

- **mission_id** : ZORAN_V13_MAX_SECURITY_LAB_PROTOCOL_20260520
- **généré le** : 2026-05-20T20:23:46.240Z
- **entry point** : `main.js` (chargé par `index.html`)
- **hub scoring** : `superiority.js`

## Synthèse

| Métrique | Valeur |
|---|---|
| Modules totaux | 45 |
| LOC totales | 10213 |
| Modules branchés (atteignables depuis main.js) | 39 |
| Modules **dormants** (hors graphe) | **6** |
| **LOC mortes** (dormantes) | **930** (9.1%) |

## Méthode

Analyse statique du graphe d'imports ES modules. Un module est **branché** s'il
est atteignable par BFS depuis `main.js`. Il est **dormant** sinon
(code exporté que rien n'importe transitivement → mort runtime).

- `scoring` = atteignable depuis `superiority.js` (participe au calcul de score)
- `ui` = importé directement par `chat.js` / `panel.js` / `main.js`
- `inbound` = nombre de modules qui importent ce module
- `falsifié` : un module dormant ne tourne jamais → **non falsifiable par construction**.
  Les modules actifs sont marqués `non-vérifié` (falsification empirique = audit à faire).
- `validé_humain` : **non** pour tous — P0-MINI BET externe non exécuté (factuel).

## Table des moteurs (triée par LOC)

| module | LOC | branché | dormant | scoring | UI | inbound | falsifié | validé humain | status |
|---|---|---|---|---|---|---|---|---|---|
| `main.js` | 1591 | oui | — | — | — | 0 | non-vérifié | non | entrée |
| `chat.js` | 832 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |
| `panel.js` | 811 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |
| `superiority_render.js` | 725 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |
| `llm.js` | 609 | oui | — | oui | oui | 3 | non-vérifié | non | actif·scoring |
| `rezo_engine.js` | 378 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `btp_supremacy_engine.js` | 275 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `parsimony_detector.js` | 264 | oui | — | oui | — | 3 | non-vérifié | non | actif·scoring |
| `superiority.js` | 256 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |
| `causal_compression_engine.js` | 254 | — | oui | — | — | 1 | non (mort) | non | DORMANT |
| `ambiguity_detector.js` | 232 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `zoran_cta_engine.js` | 202 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `truncation_detector_v11.js` | 201 | — | oui | — | — | 0 | non (mort) | non | DORMANT |
| `fragility_detector.js` | 172 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `complexity_estimator.js` | 167 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `meta_metric_auditor.js` | 163 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `causal_density.js` | 159 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `anti_goodhart.js` | 158 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `noise_killer.js` | 152 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `identity_gate.js` | 149 | oui | — | oui | — | 3 | non-vérifié | non | actif·scoring |
| `cta_schema.js` | 146 | oui | — | — | — | 1 | non-vérifié | non | actif |
| `jargon.js` | 145 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `systemic_coherence.js` | 141 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `conclusion_wrapper.js` | 129 | — | oui | — | — | 0 | non (mort) | non | DORMANT |
| `cognitive_routing.js` | 128 | — | oui | — | — | 0 | non (mort) | non | DORMANT |
| `oracle.js` | 128 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |
| `structural_mapping.js` | 128 | oui | — | oui | oui | 3 | non-vérifié | non | actif·scoring |
| `vernacular_wisdom_engine.js` | 125 | — | oui | — | — | 0 | non (mort) | non | DORMANT |
| `user_profile.js` | 123 | oui | — | oui | oui | 4 | non-vérifié | non | actif·scoring |
| `superiority_deltas.js` | 120 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `completion.js` | 112 | oui | — | oui | — | 3 | non-vérifié | non | actif·scoring |
| `route_specialization.js` | 101 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `cta_metrics.js` | 100 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |
| `overthink_detector.js` | 99 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `domain_detection.js` | 98 | oui | — | oui | — | 4 | non-vérifié | non | actif·scoring |
| `graph.js` | 96 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |
| `mutation_stability.js` | 93 | — | oui | — | — | 0 | non (mort) | non | DORMANT |
| `cta_priority_engine.js` | 83 | oui | — | — | — | 1 | non-vérifié | non | actif |
| `superiority_metrics.js` | 81 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `seductive_complexity.js` | 72 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `domain_leak.js` | 70 | oui | — | oui | — | 2 | non-vérifié | non | actif·scoring |
| `superiority_gating.js` | 44 | oui | — | oui | — | 1 | non-vérifié | non | actif·scoring |
| `colors.js` | 37 | oui | — | — | — | 1 | non-vérifié | non | actif |
| `search.js` | 35 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |
| `history.js` | 29 | oui | — | — | oui | 1 | non-vérifié | non | actif·UI |

## Modules DORMANTS — dette runtime à trancher

- `causal_compression_engine.js` — 254 LOC, inbound=1 — **6 exports morts**
- `truncation_detector_v11.js` — 201 LOC, inbound=0 — **5 exports morts**
- `conclusion_wrapper.js` — 129 LOC, inbound=0 — **3 exports morts**
- `cognitive_routing.js` — 128 LOC, inbound=0 — **4 exports morts**
- `vernacular_wisdom_engine.js` — 125 LOC, inbound=0 — **2 exports morts**
- `mutation_stability.js` — 93 LOC, inbound=0 — **1 exports morts**

**Total : 930 LOC de code mort.** Chaque module dormant exige
une décision explicite **KEEP / REMOVE / REBUILD** (voir `V13_ADVERSARIAL_EXISTING_INVENTORY.md`
pour le cluster adversarial). Un Core livré à Codex en septembre ne doit contenir
**aucun module zombie non décidé**.
