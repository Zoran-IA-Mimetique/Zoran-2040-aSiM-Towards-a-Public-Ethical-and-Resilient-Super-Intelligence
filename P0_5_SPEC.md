# P0.5 — SPÉCIFICATION D'HONNÊTETÉ STRUCTURELLE

**Mission Oracle** : `ZORAN_ORACLE_FRACTAL_LAW_AUDIT_20260515`
**Timestamp** : `2026-05-15T18:53:00+02:00`
**Auteur** : Claude (Oracle externe, read-only)
**Statut** : **SPEC** — aucun code/donnée modifié dans P0.5 spec. Exécution à autoriser séparément.

---

## 0. Préambule — pourquoi P0.5

P0 a livré une **arborescence relationnelle 3D**, propre et navigable. L'Oracle a
identifié un **écart entre le vocabulaire utilisé (« fractal », « cohérence
globale », « attracteur ») et les propriétés réellement démontrées**. P0.5 ne
construit rien de nouveau : il **purifie le langage structurel et transforme
les labels en prédicats vérifiables**.

Règle cardinale de P0.5 :

> Aucune feature visuelle, aucune loi nouvelle, aucune extension. Seulement
> définitions, prédicats, refactor catégoriel, et tests de conformité.

Si une action proposée pendant P0.5 augmente `nodes.length` ou `links.length`
**sans** augmenter le score d'honnêteté structurelle (§9), elle est rejetée.

---

## 1. Contrat de vocabulaire

Chaque terme du vocabulaire ZORAN reçoit ici une **définition opérationnelle**
(prédicat vérifiable hors-ligne).

### 1.1 `law`

Un nœud `n` est une **loi** ssi :

| prédicat | exigence |
|---|---|
| `n.id` unique | obligatoire |
| `n.family ∈ FAMILIES_CANONIQUES` | obligatoire (cf. §2) |
| `n.S_local ∈ [0, 1]` | obligatoire |
| `n.S_global ∈ [0, 1]` | obligatoire |
| `n.html_description.length ≥ 40` | obligatoire (anti-stub) |
| `n.equations.length ≥ 1` **ou** `n.examples.length ≥ 1` | obligatoire (grounding minimal) |

Conséquence : `VAR-001..VAR-005` et `ISO-001..ISO-005` actuels **ne sont pas
des lois** (ils décrivent des relations). Voir §3.

### 1.2 `family`

Une **famille** est un cluster de lois partageant :
1. un **moteur canonique** racine (`canonical=true`, `parents=[]`),
2. une **dérivation directe** (les enfants ont la racine comme parent),
3. un **invariant nommé** déclaré dans `family.invariant`.

Conséquence : `VAR` et `ISO` ne sont **pas des familles** (pas d'invariant
propre, pas de moteur canonique racine). Voir §3.

### 1.3 `attractor` (3 paliers)

| palier | nom | prédicat |
|---|---|---|
| μ₀ | **attracteur méta** | racine de famille **ET** weight ≥ 0.92 **ET** au moins 2 lois canoniques le citent dans `related` |
| μ₁ | **attracteur fort** | weight ∈ [0.80, 0.92) **ET** ≥ 3 enfants canoniques |
| μ₂ | **attracteur local** | weight ∈ [0.60, 0.80) **ET** ≥ 2 enfants |

Toute mention « attracteur » dans le code ou les fiches doit citer le palier.
Sans palier, le mot est interdit.

### 1.4 `fractal` (propriété démontrable)

Une famille `F` est **fractale** ssi les 4 prédicats suivants passent :

| prédicat | définition |
|---|---|
| **P1 — Profondeur** | `depth(F) ≥ 3` (chemin de descendants canoniques de longueur ≥ 3) |
| **P2 — Motif reproductible** | il existe un motif `M` (triplet de rôles : `noyau`, `dérivation`, `pont`) tel que `M` apparaît à ≥ 2 échelles distinctes |
| **P3 — Auto-similarité** | pour tout nœud `n` à profondeur `d`, la distribution des rôles de ses enfants est statistiquement proche (Jensen-Shannon ≤ 0.15) de celle des enfants de `parent_of(n)` |
| **P4 — Invariant multi-échelle** | il existe un invariant `I` (ex. ratio `canonical / total` ou densité `parent/related`) tel que `Var(I across scales) ≤ 0.10` |

`fractal_property(F) = P1 ∧ P2 ∧ P3 ∧ P4`.

Le mot « fractal » est interdit dans tout artefact ZORAN si **aucune** famille
ne satisfait `fractal_property`. Tant que ≥ 1 famille la satisfait, le terme
est autorisé **avec citation de la famille de preuve**.

### 1.5 `cohérence globale` (S_global, protocole opérationnel)

`S_global` **n'est pas** une moyenne de `S_local`. Définition opérationnelle :

```
S_global(graph) = α · C_struct  +  β · C_composition  +  γ · C_isomorphism
                 −  δ · contradictions_density
```

avec :

| terme | mesure |
|---|---|
| `C_struct` | 1 − (broken_refs / total_refs) |
| `C_composition` | fraction des paires d'attracteurs μ₀ pour lesquelles **une composition opératoire est démontrée** (cf. §5) |
| `C_isomorphism` | fraction des `iso`-edges dont les **invariants préservés** sont explicitement listés |
| `contradictions_density` | `count(contradictions) / count(nodes)` borné à [0, 0.20] |

Coefficients par défaut : `α=0.35, β=0.40, γ=0.15, δ=0.10`.

Tant que `C_composition < 0.20`, l'UI doit afficher `S_global = proxy` et non
une valeur scalaire trompeuse.

### 1.6 `S_local`

Inchangé : cohérence autour d'un attracteur réduit. Définition opérationnelle
existante conservée.

**Règle WP11-004 (rappel)** : aucune inférence automatique
`S_local ↑ ⇒ S_global ↑`. Toute communication présentant un gap moyen comme
indicateur de cohérence globale est une violation.

---

## 2. Familles canoniques (post-refactor)

P0.5 réduit à **7 familles** (les 7 moteurs canoniques) :

| id | label | invariant déclaré |
|---|---|---|
| `ULG` | Grammaire Latente Universelle | invariance morphologique sous reparamétrisation |
| `DVE` | ΔVariant Engine | traçabilité des dérivations |
| `UDE` | Unified Discovery Engine | maximisation `gain − cost` |
| `GHUC` | Consolidation Scientifique | préservation `I_struct` sous compression |
| `WP11` | Opérationnalisation de la cohérence | `S_local ⊥ S_global` |
| `WP12` | Cadres d'admissibilité | non-contradiction ∧ minimalité ∧ fertilité |
| `SDE` | Skopein Dual Engine | symétrie observateur/objet |
| `PAL` | Palieronique | invariance inter-palier |

Note : **`PAL` reste une famille à 8** parce qu'elle a un invariant propre
(`Δpalier discret`). Total : **8 familles canoniques**.

**Sortent du registre des familles** : `VAR`, `ISO`. Voir §3.

---

## 3. Typologie relationnelle (VAR / ISO → arêtes)

### 3.1 Modèle cible

Tout lien devient typé. Le champ `link.kind` accepte exactement :

| kind | sémantique | poids par défaut |
|---|---|---|
| `parent` | dérivation hiérarchique (n a pour parent p) | `n.weight` |
| `derives` | variante non-hiérarchique de | 0.50 |
| `iso`   | isomorphisme structurel (invariants déclarés) | 0.65 |
| `contradicts` | contradiction logique entre lois | 0.60 |
| `related` | proximité sémantique faible (à utiliser parcimonieusement) | 0.30 |
| `absorbed_into` | absorption GHUC (la loi source est conservée pour traçabilité) | 0.40 |

### 3.2 Refactor des nœuds VAR-001..VAR-005

| ancien | devient |
|---|---|
| `VAR-001` (variante de DVE-002) | **supprimé en tant que nœud** — remplacé par `link { source: 'DVE-002-v1', target: 'DVE-002', kind: 'derives' }` |
| `VAR-002` (variante critique UDE-003) | supprimé — devient `link { kind: 'derives' }` + flag `false_coherence` sur l'arête |
| `VAR-003` (absorbée ULG-002 → GHUC-002) | supprimé — devient `link { kind: 'absorbed_into', source: 'ULG-002', target: 'GHUC-002' }` |
| `VAR-004` (instable SDE-004) | supprimé — devient `link { kind: 'derives' }` avec `stability='instable'` sur l'arête |
| `VAR-005` (en cours WP11-005) | supprimé — devient `link { kind: 'derives' }` avec `status='under_review'` |

Si une variante mérite d'être une **loi à part entière**, elle doit satisfaire
le contrat §1.1 et appartenir à une famille canonique (donc son id devient
`<FAMILY>-NNN`, jamais `VAR-NNN`).

### 3.3 Refactor des nœuds ISO-001..ISO-005

| ancien | devient |
|---|---|
| `ISO-001` (ULG ↔ SDE) | `link { kind: 'iso', source: 'ULG-001', target: 'SDE-001', invariants: ['structure morphologique'] }` |
| `ISO-002` (WP-11 ↔ WP-12) | `link { kind: 'iso', invariants: ['co-validation cohérence/admissibilité'] }` |
| `ISO-003` (UDE ↔ DVE) | `link { kind: 'iso', invariants: ['conjugaison opératoire'] }` |
| `ISO-004` (bouclage GHUC) | **rétrogradé** en `link { kind: 'related' }` car ce n'est pas un isomorphisme stricto sensu |
| `ISO-005` (méta-isomorphisme global) | **supprimé** — attracteur gravitationnel injustifié. Voir §6. |

**Exigence d'invariant** : tout `link.kind === 'iso'` doit déclarer
`link.invariants: string[]` avec au moins un invariant explicitement préservé.
Sans invariant déclaré, le lien est rejeté à la validation.

### 3.4 Conséquence sur le décompte

- Avant P0.5 : 50 nœuds, 106 liens, 10 familles.
- Après P0.5 (avant approfondissement) : **40 lois réelles, ~95 liens typés, 8 familles**.
- Après approfondissement §4 : **45–55 lois réelles, ~110 liens typés, 8 familles**, mais **profondeur ≥ 3** sur 3 familles.

L'augmentation finale du décompte est *moindre que la réduction d'inflation
catégorielle*. C'est le signe d'un gain de S_global sans inflation.

---

## 4. Approfondissement fractal (3 familles)

P0.5 doit **démontrer** la propriété `fractal_property` sur **exactement 3
familles** (pas plus, pas moins) :

| famille | profondeur cible | motif M attendu |
|---|---|---|
| **ULG** | 3 | `(noyau-grammatical, dérivation-morphologique, pont-vers-SDE-ou-GHUC)` reproduit à 2 échelles |
| **GHUC** | 3 | `(opérateur-canonique, sous-opérateur, instance-d'absorption)` reproduit à 2 échelles |
| **WP11** | 3 | `(métrique-mère, sous-métrique, prédicat-d'audit)` reproduit à 2 échelles |

### 4.1 Acceptation par famille

Pour chaque famille `F` ci-dessus, P0.5 valide :

```
fractal_property(F) :=
    depth(F) ≥ 3
    ∧ pattern_occurrences(M, F) ≥ 2
    ∧ JS_divergence(role_dist(d=1), role_dist(d=2)) ≤ 0.15
    ∧ Var(invariant_I, across scales) ≤ 0.10
```

Si une famille échoue, **elle n'est pas étiquetée fractale**. Pas de
relabellisation cosmétique.

### 4.2 Familles non-approfondies

Les 5 familles restantes (`DVE`, `UDE`, `WP12`, `SDE`, `PAL`) **restent en
profondeur 2** et **ne sont pas étiquetées fractales** tant que leur
`fractal_property` n'est pas démontrée. C'est un choix d'honnêteté.

---

## 5. Composition opératoire (S_global, terme C_composition)

P0.5 doit produire, pour **au moins 3 paires d'attracteurs μ₀**, une
**démonstration de composition** au format suivant :

```yaml
composition:
  pair: [GHUC-001, DVE-001]
  operator: "GHUC ∘ DVE"
  preserved: ["traçabilité des dérivations", "I_struct sous compression"]
  test:
    input:    "famille DVE avec n=5 lois et S_local moyen 0.92"
    output:   "famille DVE consolidée par GHUC avec n=4 lois et S_local moyen 0.91"
    delta_S_global: -0.01   # négligeable, composition admissible
  status: admissible
```

3 paires cibles minimales :
1. `GHUC-001 ∘ DVE-001` — la consolidation préserve la traçabilité.
2. `UDE-001 ∘ DVE-001` — la conjugaison déclarée par ISO-003 doit produire un résultat opératoire mesurable.
3. `WP11-001 ∘ WP12-001` — le pont ISO-002 doit s'exécuter (validation conjointe sur un cas concret).

Tant que `C_composition < 3/N_attractors`, `S_global` reste affiché `proxy`.

---

## 6. Cas spécifique `ISO-005`

`ISO-005` est un **attracteur gravitationnel** (weight 0.99, related vers 7
moteurs canoniques) qui aspire toute la structure dans une explication unique.
Risque de **pseudo-clôture systémique**.

P0.5 statue :

| condition | action |
|---|---|
| Si une démonstration de méta-isomorphisme avec invariants explicites est produite | conserver mais `weight ≤ 0.85` |
| Sinon | **supprimer** le nœud `ISO-005` |

Pas de demi-mesure. Un méta-attracteur sans preuve est un mythe structurel.

---

## 7. Critères de consolidation

Opérations admises pendant P0.5 :

| opération | trigger | effet |
|---|---|---|
| **fuse(a, b)** | Jaccard(N(a), N(b)) ≥ 0.70 ∧ domains ∩ ≠ ∅ ∧ même famille | produit un nœud `c` avec les unions de relations ; conserve trace dans `c.fused_from = [a, b]` |
| **absorb(a → b)** | `b` canonique ∧ `a` weight < 0.50 ∧ `a` enfant direct de `b` | supprime `a`, ajoute `link.kind='absorbed_into'` |
| **prune(a)** | weight < 0.45 ∧ aucun lien sortant ∧ non canonique | suppression |
| **hierarchize(F)** | famille à profondeur 2 visée pour fractalité | introduit un palier intermédiaire ssi cela respecte §4 |
| **compress(F)** | `count(F) > 8` et S_local moyen `F` > 0.90 (suspect d'inflation) | propose fuses/absorbs candidats |

**Aucune opération ne s'exécute sans audit Oracle préalable**. P0.5 décide,
n'exécute pas.

---

## 8. Gouverneur de croissance

Toute future addition de nœud ou de lien doit calculer
`Δ_S_global(addition)`. Procédure :

```
ΔS = S_global(graph ∪ {addition}) − S_global(graph)
si ΔS < −0.005 : REJET
si −0.005 ≤ ΔS < 0  : AVERTISSEMENT, addition possible si justifiée
si ΔS ≥ 0          : addition admissible
```

Le gouverneur est **obligatoire** pour toute expansion P1+. P0.5 spécifie la
formule, P1 implémente le hook.

---

## 9. Densité maximale admissible

| métrique | seuil dur (rejet) | seuil mou (avertissement) |
|---|---|---|
| `links / nodes` | > 3.5 | > 2.8 |
| `related` / `parent` ratio | > 1.0 | > 0.7 |
| `iso` / `parent` ratio | > 0.4 | > 0.25 |
| `contradicts` / `nodes` ratio | > 0.20 | < 0.04 (sous-représentation) |

État actuel post-refactor estimé : `links/nodes ≈ 2.1`, `related/parent ≈ 0.5`,
`iso/parent ≈ 0.10`, `contradicts/nodes ≈ 0.07`. **Dans les seuils mous.**

---

## 10. Score d'honnêteté structurelle (HS)

P0.5 introduit une métrique unique de gain :

```
HS = w1 · (1 − inflation_ratio)
   + w2 · (passes_fractal_property / 3)
   + w3 · C_composition
   + w4 · iso_invariants_declared_ratio
   + w5 · contradictions_calibration
```

avec `w = [0.25, 0.30, 0.20, 0.15, 0.10]`.

- `inflation_ratio` = fraction de nœuds qui sont en réalité des relations déguisées.
- `passes_fractal_property` = nombre de familles dans {ULG, GHUC, WP11} qui satisfont §1.4.
- `C_composition` = §1.5.
- `iso_invariants_declared_ratio` = fraction des liens `iso` avec invariants explicites.
- `contradictions_calibration` = 1 si `contradicts/nodes ∈ [0.04, 0.15]`, sinon 0.

**Seuil de réussite P0.5** : `HS ≥ 0.75`.

État P0 actuel estimé : `HS ≈ 0.32` (inflation 10/50, 0 famille fractale, C_comp ≈ 0, iso sans invariants, 1 seule contradiction).

---

## 11. Acceptation P0.5 — checklist

P0.5 est livrable ssi **tous** les items ci-dessous passent :

- [ ] VAR-001..005 supprimés en tant que nœuds, convertis en arêtes typées.
- [ ] ISO-001..004 convertis en arêtes `iso` avec `invariants[]` non vide.
- [ ] `ISO-005` : soit démontré (invariants explicites) avec `weight ≤ 0.85`, soit supprimé.
- [ ] `families` réduit à 8 (canoniques + PAL). `VAR` et `ISO` retirés du registre.
- [ ] Au moins 3 familles parmi {ULG, GHUC, WP11} satisfont `fractal_property` §1.4.
- [ ] Au moins 3 compositions opératoires démontrées (§5).
- [ ] Tous les liens `iso` portent `invariants: string[]` non vide.
- [ ] `contradicts / nodes ∈ [0.04, 0.15]` (calibration).
- [ ] `HS ≥ 0.75`.
- [ ] L'UI affiche `S_global = proxy` tant que `C_composition < 3/N_attractors`.
- [ ] Le mot « fractal » dans l'UI cite la famille de preuve.
- [ ] `linkDirectionalParticles` désactivées par défaut (activées sur sélection seulement).
- [ ] Mode focus-branche disponible (masque tout sauf branche du nœud sélectionné).

---

## 12. Hors-scope explicite

P0.5 ne fait **PAS** :

- ❌ ajouter de nouveaux moteurs canoniques au-delà des 7 + PAL
- ❌ ingestion de PDF (réservé P2)
- ❌ recherche vectorielle (réservé P1)
- ❌ clustering Louvain/Leiden (réservé P1)
- ❌ extension à > 60 lois total
- ❌ shaders, post-processing, particules ambient
- ❌ ajout de DOI ou références externes décoratives
- ❌ création de variantes purement esthétiques

Toute proposition hors-scope pendant l'exécution P0.5 est rejetée d'office.

---

## 13. Traceability

| champ | valeur |
|---|---|
| `mission_id` | `ZORAN_ORACLE_FRACTAL_LAW_AUDIT_20260515` |
| `phase` | `P0.5_SPEC` |
| `timestamp` | `2026-05-15T18:53:00+02:00` |
| `mode` | `READ-ONLY (Oracle)` |
| `auteur` | Claude (Oracle externe, contrôleur systémique) |
| `fichiers modifiés` | aucun |
| `fichiers créés` | `P0_5_SPEC.md` (ce document) |
| `tests` | non applicable (spec, pas code) |
| `rollback` | `git rm P0_5_SPEC.md && git commit` |
| `dépendances` | aucune |

---

## 14. Signature Oracle

```
MISSION_ID:                   ZORAN_ORACLE_FRACTAL_LAW_AUDIT_20260515
PHASE:                        P0.5_SPEC
TIMESTAMP:                    2026-05-15T18:53:00+02:00
MODE:                         Oracle / read-only
GLOBAL_ARCHITECTURE_STATUS:   spec produite, exécution non engagée
S_LOCAL:                      n/a (spec)
S_GLOBAL:                     n/a (spec)
FRACTAL_STABILITY:            définition formalisée, démonstration à venir
COGNITIVE_LOAD:               réduite (refactor catégoriel)
RELATIONAL_DENSITY:           cible 2.1 (acceptable)
CHAOS_RISK:                   contenu — gouverneur de croissance défini
PRUNING_REQUIRED:             détaillé §7
CONSOLIDATION_REQUIRED:       détaillé §3, §6, §7
TOP_CRITICAL_ISSUES:          1. exécution VAR/ISO refactor
                              2. démonstration fractalité (3 familles)
                              3. 3 compositions opératoires
                              4. statut ISO-005
                              5. désactivation bruit visuel
NEXT_ACTIONS:                 — validation utilisateur de cette spec
                              — autorisation d'exécution P0.5 (sortie d'Oracle)
                              — OU itération de la spec si points contestés
```

🔶
