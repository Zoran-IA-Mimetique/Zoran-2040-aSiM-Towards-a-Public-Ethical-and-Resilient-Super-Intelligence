# DOMAIN_DOMINANCE_MATRIX

- Mission ID : `ZORAN_GLOBAL_RUNTIME_SUPERIORITY_AND_DOMAIN_DOMINANCE_20260516`
- Date       : 2026-05-16
- Cross-refs : `DOMAIN_NATIVE_RESPONSE_ENGINE.md`,
  `LIVE_RUNTIME_SUPERIORITY_PROTOCOL.md`,
  `GLOBAL_COGNITIVE_ORCHESTRATION_ENGINE.md`,
  `DOMAIN_FITNESS_MODEL.md`,
  `ZORAN_AUTONOMY_STRESS_REPORT.md`
- Sources    : `app/src/domain_detection.js::detectDomain`,
  `app/src/superiority.js::runSuperiorityComparison`,
  `audit/ZORAN_AUTONOMY_STRESS_REPORT.md` (50 prompts → cellules
  partielles), `tools/build_dominance_matrix.mjs` (à créer).

## 1. Structure cible 8 × 8

8 domaines (lignes, depuis `DOMAIN_LEXICONS`) × 8 candidats
(colonnes : baseline + orchestré + 6 routes ZORAN). Chaque cellule
contient le winrate du candidat sur ce domaine.

```
                baseline orchestré frugale anti_hallu struct temp prop runtime
btp             ?        ?         ?       ?          ?      ?    ?    ?
medicine        ?        ?         ?       ?          ?      ?    ?    ?
legal           ?        ?         ?       ?          ?      ?    ?    ?
physics         ?        ?         ?       ?          ?      ?    ?    ?
ai_robustness   ?        ?         ?       ?          ?      ?    ?    ?
epistemology    ?        ?         ?       ?          ?      ?    ?    ?
business        ?        ?         ?       ?          ?      ?    ?    ?
general         ?        ?         ?       ?          ?      ?    ?    ?
```

Lecture cible V2 : chaque ligne doit avoir un candidat ZORAN qui
domine la baseline ; sinon la mission `DOMAIN_DOMINANCE` n'est pas
réussie pour ce domaine.

## 2. Calcul du winrate par cellule

Pour un domaine `d` et un candidat `c` :

```
prompts_d   = { p ∈ benchmark | detectDomain(p).key === d }
wins_c_in_d = #{ p ∈ prompts_d | result(p).verdict === c.label }
winrate(d, c) = wins_c_in_d / |prompts_d|
```

- `verdict` provient de `judgeResponses` (`llm.js`).
- Seuil de signification : `|prompts_d| ≥ 10` (≥ 20 idéal).
- Compléter par `argumented_grade_20` moyen pour distinguer
  *winrate 30 % grade 17* (proche) de *winrate 30 % grade 12*
  (faible).

## 3. État actuel — matrice partielle 50 prompts

Le `ZORAN_AUTONOMY_STRESS_REPORT` (offline, heuristiques Python)
couvre ~7 des 8 domaines, partiellement :

| Domaine          | Prompts estim. | Couverture | Source catégorie report                 |
|------------------|----------------|------------|-----------------------------------------|
| `btp`            | ~5-6           | partielle  | *BTP structurel*                         |
| `medicine`       | ~4-5           | partielle  | *Médecine ambiguë*, *Pathologies lentes* |
| `legal`          | ~3-4           | faible     | *Juridique contradictoire*               |
| `physics`        | ~2-3           | faible     | *Physique théorique*                     |
| `ai_robustness`  | ~2-3           | faible     | *IA robustesse*                          |
| `epistemology`   | ~3             | partielle  | *Épistémologie*, *Théories émergentes*   |
| `business`       | ~0-1           | quasi nulle| non couvert                              |
| `general`        | ~15-20         | sur-couvert | *Ambiguës*, *Long-context*, etc.        |

Winrates approximatifs (ré-agrégés depuis *Spécialisation par
catégorie* du report) :

```
                baseline frugale anti_hallu struct
btp             ~20%     ~40%    ~20%       ~0%
medicine        ~10%     ~10%    ~20%       ~20%
legal           ~60%     ~20%    ~20%       ~0%
physics         ~33%     ~0%     ~33%       ~33%
epistemology    ~67%     ~33%    ~0%        ~0%
```

La colonne `orchestré` est **vide partout** : aucun benchmark live
n'a été exécuté avec `synthesizeOrchestrated`. Matrice actuelle :
**7 × 6 lacunaire**, pas 8 × 8.

## 4. Path vers la matrice complète V2

1. **Dataset rééquilibré** : 200+ prompts ~25/domaine (vs 50 actuels
   sur-représentés `general`). Ajouts prioritaires : business
   (CAC, runway, pricing), legal (RGPD, responsabilité, contrats),
   ai_robustness (jailbreak, RAG, eval set).
2. **Run live** via `LIVE_RUNTIME_SUPERIORITY_PROTOCOL` — sans
   appels LLM, aucune cellule ne peut être confirmée.
3. **Variance ≥ 3 runs** par cellule pour mesurer `σ(winrate)`.
4. **Outil `tools/build_dominance_matrix.mjs`** : agrège
   `benchmark_live_results.json` par `detectDomain(prompt).key` ×
   `verdict`, sort CSV + HTML heatmap.
5. **Cellules `< 10` prompts grisées** pour ne pas suggérer de
   signal là où il n'y en a pas.

Objectif V2 : pour chaque domaine `d`, qu'au moins **un** candidat
ZORAN ait `winrate(d, c) > winrate(d, baseline) + 0.10` — dominance
domaine empirique de **+10 pts** sur la baseline.

## 5. Limites honnêtes

- **Matrice incomplète** : 7/8 domaines, business quasi-absent,
  plusieurs cellules < 5 prompts.
- **Pas de colonne orchestré** : `synthesizeOrchestrated` ajouté en
  position 2 mais jamais exécuté en benchmark agrégé.
- **Winrates offline ≠ live** : wins du report basés sur
  heuristiques Python, pas sur notes juge LLM. À traiter comme
  proxies.
- **`detectDomain` mismatch possible** : *« combien coûte de virer
  un mur ? »* peut basculer `general` ou `business`, biaisant la
  cellule BTP.
- **Granularité catégorie ≠ domaine** : projection
  catégorie → `DOMAIN_LEXICONS` manuelle et approximative.
- **`tools/build_dominance_matrix.mjs` n'existe pas** : ce spec
  décrit l'outil cible, pas son implémentation.
- **Objectif mission `wins ≥ 70 %` ZORAN > baseline non atteint** —
  gap mesurable seulement une fois la matrice V2 saturée.
