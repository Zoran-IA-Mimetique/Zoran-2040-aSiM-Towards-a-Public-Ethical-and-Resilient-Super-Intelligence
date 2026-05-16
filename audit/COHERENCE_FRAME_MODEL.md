# COHERENCE FRAME MODEL

**Mission** : `ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515`
**Timestamp** : `2026-05-15T19:42:00+02:00`
**Mode** : spec

Modèle conceptuel de la **cohérence par cadres**. Pourquoi le système doit
maintenir explicitement les paliers, et comment cela protège ZORAN du
collapse cognitif par confusion d'échelle.

Complément à `FRAME_HIERARCHY_SPEC.md` (qui spécifie le **schéma**) et à
`S_GLOBAL_RULES.md` (qui formalise `S_global`).

---

## 1. Postulat fondamental

> Aucune loi ne calcule seule la totalité du réel.

Toute loi opère **dans un cadre**. Le calcul est cohérent **dans ce
cadre**. Hors de ce cadre, la même loi peut être :
- inopérante (frontière non atteinte)
- partielle (information incomplète)
- contradictoire (en conflit avec d'autres cadres)

Conséquence directe : `S_local` et `S_global` ne mesurent pas la même
chose. Et **aucune agrégation linéaire** des `S_local` ne produit `S_global`.

---

## 2. Quatre paliers d'échelle

| niveau | scope | exemple |
|---|---|---|
| `micro` | 2–5 entités voisines | une loi et ses parents directs |
| `meso`  | une famille canonique entière | famille GHUC (10 lois) |
| `macro` | un domaine de discours | « consolidation scientifique » |
| `systémique` | graphe ZORAN entier + méta-règles | la règle WP11-004 elle-même |

Une loi peut opérer à plusieurs paliers — c'est **explicite** dans son champ
`frames.intermediate`.

---

## 3. Pourquoi le `local` ne suffit pas

Le `local` est :
- mesurable
- testable
- répétable

C'est tentant. Mais c'est aussi le **plus piégeant** :

> *Une belle cohérence locale peut masquer une incohérence systémique.*

Cf. `WP11-005` (Détection de fausse cohérence) qui matérialise précisément
cette règle.

**Exemple historique du corpus** : `VAR-002` avait `S_local = 0.91` et
`S_global = 0.52`. Magnifique localement, désastreux globalement. Détecté
par `WP11-005`, refactoré par P0.5.

---

## 4. Pourquoi le `global` ne suffit pas

Le `global` est :
- aspirationnel
- non observable directement
- toujours partiellement en `proxy`

S'appuyer **uniquement** sur le global, c'est :
- perdre de vue les cas concrets
- naviguer à l'aveugle
- tomber dans la pseudo-théorie générale (le syndrome ISO-005 avant son
  retrait : un méta-attracteur qui « explique tout », donc rien)

---

## 5. Le rôle clé des paliers intermédiaires

Le palier intermédiaire est :
- l'**échelle de mesure réelle** d'une famille
- l'**échelle de transfert** quand on compose des lois
- l'**échelle d'audit** quand on cherche les contradictions

C'est là que le travail scientifique se fait. `local` = donnée brute,
`global` = méta-engagement, `intermediate` = théorie.

---

## 6. Conséquences pratiques sur ZORAN

| règle | conséquence |
|---|---|
| Toute loi déclare ≥ 1 `intermediate` | la théorie est explicite |
| Toute composition opératoire (cf. `compositions[]`) cite un palier | la portée est testable |
| Tout audit Oracle vérifie cohérence par palier | pas de vérité absolue |
| Toute UI affiche le palier actif (futur P0.6+) | l'utilisateur sait ce qu'il regarde |

---

## 7. Le rôle des `proxies`

Un proxy est :
- une mesure **opérationnelle** (codable aujourd'hui)
- mais **pas la mesure exacte** que la théorie demanderait
- toujours **flaggable** comme tel dans la communication

Exemple : `S_global` est aujourd'hui calculé selon `WP11-003` mais
**publié comme `proxy:`** tant que les conditions de gate (R-S2) ne sont
pas atteintes. C'est l'application du modèle de cadres : on opère dans le
cadre `proxy_admissible` jusqu'à passer dans le cadre `scalar_publishable`.

---

## 8. Le rôle des `limits`

C'est le champ **anti-hubris**. Forcer chaque loi à déclarer ce qu'elle
**ne** calcule **pas** :
- révèle les frontières de validité
- empêche l'extrapolation abusive
- rend explicites les domaines à confier à d'autres lois

Exemple : `DVE-002` (« dérivations contrôlées ») dit explicitement
`limits: ["ne réalise pas l'admissibilité — délègue à WP-12"]`. Cela
protège contre l'usage de DVE-002 comme validateur — il **génère**
seulement, il **ne valide pas**.

---

## 9. Modèle algébrique (informel)

Pour une loi `L` et un cadre `c` ∈ `L.frames` :

```
applicable(L, c) ⟺ c ∈ L.frames.local ∪ L.frames.intermediate ∪ L.frames.global
                  ∧ c ∉ L.frames.limits
```

Pour une composition de lois `L1 ∘ L2` dans un cadre `c` :

```
admissible(L1 ∘ L2, c) ⟺ applicable(L1, c) ∧ applicable(L2, c)
                           ∧ ∃ frame_partagé entre L1 et L2 dans c
```

Sans frame partagé, la composition est inadmissible — même si chaque loi
isolée fonctionne dans `c`.

---

## 10. Liens avec les autres pièces du système

| pièce | rôle vis-à-vis des cadres |
|---|---|
| `WP11-001..005` | la cohérence se mesure **par cadre**, pas globalement par défaut |
| `WP12-001..005` | l'admissibilité est **conditionnelle au cadre** |
| `GHUC-001..` | la consolidation respecte les cadres (ne fusionne pas hors-frame partagé) |
| `compositions[]` | chaque composition **cite** son cadre |
| `oracle_rules.json` R-FH-* | l'Oracle **bloque** les calculs hors-cadre |

---

## 11. Tests d'acceptation conceptuels

| test | critère |
|---|---|
| TF1 — toute loi a ≥ 1 intermediate | ✅ vérifié corpus actuel (45/45) |
| TF2 — `local` ≠ `global` syntaxiquement | ✅ vérifié corpus actuel |
| TF3 — `limits` non vide | ✅ vérifié (45/45) |
| TF4 — pas de level inconnu | ✅ enforced par validateur |
| TF5 — composition cite un cadre partagé | à implémenter via Oracle R-FH-* (P0.6) |

---

## 12. Articulation avec « S_local ⊥ S_global »

La règle `WP11-004` interdit l'inférence automatique. Le modèle de cadres
**explique pourquoi** :

> Parce que `S_local` mesure la cohérence dans un cadre étroit
> (un attracteur réduit), tandis que `S_global` mesure la cohérence à
> travers la composition de cadres (graphe complet).
>
> Ce sont deux mesures dans **deux espaces conceptuels différents**.
> L'une ne peut pas se déduire de l'autre par un calcul mécanique — il
> faut **passer par les paliers intermédiaires** (et c'est ça que la
> formule `S_global = α·C_struct + β·C_composition + γ·C_iso − δ·...`
> opérationnalise : la composition est ce qui « traverse » les paliers).

Le modèle de cadres est donc la **justification théorique** de la règle
`WP11-004` qui jusque-là était posée comme axiome.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515
TIMESTAMP:            2026-05-15T19:42:00+02:00
FILES_ANALYZED:       app/data/laws.json (frames),
                      audit/S_GLOBAL_RULES.md, audit/FRAME_HIERARCHY_SPEC.md
RISKS:                modèle de cadres présenté comme « théorie complète »
                      alors qu'il est opérationnel ; à clarifier ;
                      hubris meta — éviter de réifier les paliers comme
                      ontologie absolue
S_LOCAL:              n/a (modèle conceptuel)
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    réifier les paliers ; absolutiser le modèle ;
                      l'utiliser comme nouvelle dérive lexicale
NEXT_ACTIONS:         conserver comme texte de référence ;
                      lié depuis README et MISSION_LOG ;
                      futurs documents doivent y renvoyer pour
                      justifier toute mesure de cohérence
```

🔶
