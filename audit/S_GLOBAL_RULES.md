# S_GLOBAL RULES

**Mission Oracle** : `ZORAN_GLOBAL_COHERENCE_ORACLE_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Énoncé **formel** des règles régissant `S_global`. Ces règles sont
obligatoires et inviolables. Toute violation par le code, les claims ou
les ajouts au graphe constitue une régression à corriger immédiatement.

---

## R-S0 — Définition non-dérivée de S_global

```
S_global ≠ Σᵢ wᵢ · S_local(nᵢ)
```

**Énoncé** : S_global n'est jamais calculable comme combinaison linéaire ou
non-linéaire des S_local. Tout code qui le fait viole `WP11-004`.

**Vérification** : grep dans le repo pour `mean(S_local`, `sum(S_local`,
`avg(S_local` utilisés comme `S_global` → 0 occurrence tolérée hors
contexte de proxy explicitement signalée.

**Statut actuel** : ⚠ violation dans `app/src/main.js` (statusbar affiche
moyenne comme S_global sans tag `proxy`). Voir `P0_5_SPEC.md §1.5`.

---

## R-S1 — Décomposition obligatoire

```
S_global = α · C_struct + β · C_composition + γ · C_iso − δ · contradictions_density
```

avec :

| terme | définition | poids |
|---|---|---|
| `C_struct` | `1 − broken_refs / total_refs` | α = 0.35 |
| `C_composition` | fraction des paires μ₀ ayant une composition opératoire démontrée (cf. `P0_5_SPEC.md §5`) | β = 0.40 |
| `C_iso` | fraction des liens `iso` avec `invariants[]` non vide | γ = 0.15 |
| `contradictions_density` | `count(contradicts) / count(nodes)`, borné `[0, 0.20]` | δ = 0.10 |

Somme des poids non-négatifs : `α + β + γ = 0.90`. Le terme négatif `δ`
agit comme pénalité.

---

## R-S2 — Drapeau proxy obligatoire

```
afficher_S_global_scalaire(graph) ⟺ C_composition(graph) ≥ 3 / N_attractors_μ₀
```

**Énoncé** : tant que moins de 3 paires μ₀ ont une composition opératoire
démontrée, `S_global` doit s'afficher avec le tag `proxy` dans toute UI
publique.

**Vérification** : avant chaque affichage de `S_global` dans une statusbar
ou un rapport, calculer `C_composition` et conditionner l'affichage.

**Statut actuel** : ⚠ aucune composition démontrée. Affichage `0.779`
non-conforme.

---

## R-S3 — Borne stricte

```
S_global ∈ [0, 1]
```

Si calcul donne hors borne (par exemple via mauvais poids), c'est un bug à
corriger, pas une valeur à publier.

---

## R-S4 — Sensibilité unitaire

```
∀ ajout admissible(x) : |ΔS_global(x)| ≤ 0.05
```

**Énoncé** : un ajout admissible ne doit pas faire varier S_global de plus
de 5%. Au-delà, c'est un signal de **fragilité** : le système était
sous-déterminé. Audit obligatoire.

---

## R-S5 — Monotonie sous compression

```
S_global(GHUC(graph)) ≥ S_global(graph) − ε,  avec ε ≤ 0.02
```

**Énoncé** : la consolidation GHUC ne doit pas dégrader S_global de plus de
2%. Au-delà, la compression n'est pas admissible.

---

## R-S6 — Stabilité sous renommage

```
S_global(graph) = S_global(rename(graph))
```

Permutation des identifiants ne change rien à S_global. Test trivial mais
critique pour valider que le calcul ne dépend pas de l'ordre.

---

## R-S7 — Décorrélation locale → globale

```
corrélation(S_local, S_global) ≤ 0.50 sur l'ensemble du graphe
```

**Énoncé** : si la corrélation entre la moyenne des S_local et S_global est
trop forte, le système retombe dans le piège `WP11-004`. Il faut que
S_global capte des aspects (composition, iso, contradictions) que S_local
ne capte pas.

**Vérification** : audit périodique, recalculer la corrélation.

---

## R-S8 — Non-publication sans audit

```
publier(S_global) ⟹ audit(graph) précédent dans 24h ∧ HS ≥ 0.50
```

**Énoncé** : on ne publie pas une valeur de S_global sans avoir audité le
graphe dans les 24h et constaté un score d'honnêteté structurelle minimal.

---

## R-S9 — Trace obligatoire

Toute valeur publiée de S_global doit être accompagnée de :
- `timestamp`
- `mission_id`
- `coefficients (α, β, γ, δ) utilisés`
- `C_composition observée`
- `tag proxy/scalaire`
- `graph fingerprint (hash)`

---

## R-S10 — Pas d'inférence en cascade

```
S_global(graph₁) ↑ ∧ graph₂ = ajout(graph₁, x) ⇏ S_global(graph₂) ↑
```

**Énoncé** : une augmentation passée de S_global n'autorise pas à supposer
qu'une augmentation future continuera. Chaque addition est ré-évaluée.

---

## Résumé tabulaire

| règle | nature | bloquante ? | violation actuelle ? |
|---|---|---|---|
| R-S0 | définition | oui | ⚠ partielle (proxy non taggée) |
| R-S1 | décomposition | oui | ⚠ pas implémentée (proxy = moyenne) |
| R-S2 | drapeau proxy | oui | ⚠ ignorée |
| R-S3 | borne | oui | ✅ ok |
| R-S4 | sensibilité | warn | n/a (pas mesuré) |
| R-S5 | monotonie GHUC | warn | n/a |
| R-S6 | stabilité renommage | oui | ✅ ok (calcul actuel le respecte) |
| R-S7 | décorrélation | warn | ⚠ corrélation actuelle ≈ 0.94 (trop forte) |
| R-S8 | non-publication | oui | ⚠ violée à chaque affichage |
| R-S9 | trace | oui | ⚠ non-implémentée |
| R-S10 | pas d'inférence cascade | méta | n/a |

**Score de conformité actuel** : ~3/11 règles respectées. P0.5 doit le porter
à ≥ 9/11.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_GLOBAL_COHERENCE_ORACLE_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/src/oracle.js, app/src/main.js, P0_5_SPEC.md
RISKS:                R-S0 violée (proxy non taggée) propage une fausse
                      mesure systémique dans toute communication
S_LOCAL:              n/a
S_GLOBAL:             actuellement publié 0.779 — proxy non taggée, donc
                      à reclasser en `proxy:0.779` jusqu'à C_composition ≥ 3/N
TOP_COLLISIONS:       R-S0 vs UI actuelle ; R-S2 vs statusbar ;
                      R-S7 (corrélation trop forte) vs implémentation actuelle
TOP_FAKE_PATTERNS:    S_global présentée comme moyenne « équivalente » ;
                      pas de trace par règle R-S9 ;
                      audit ponctuel au lieu de continu
NEXT_ACTIONS:         1. tagger « proxy » immédiatement sur la statusbar
                      2. implémenter R-S1 (calcul décomposé)
                      3. ajouter R-S9 (trace) à chaque audit
                      4. ré-évaluer R-S7 (décorrélation cible ≤ 0.50)
```

🔶
