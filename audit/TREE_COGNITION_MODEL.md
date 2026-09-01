# TREE COGNITION MODEL

**Mission** : `ZORAN_HIERARCHICAL_SPATIAL_TOPOLOGY_V3_20260515`
**Timestamp** : `2026-05-15T20:39:00+02:00`

Modèle de **cognition arborescente** : pourquoi représenter ZORAN comme
un arbre 3D vivant améliore la cognition de l'utilisateur, et quelles
sont les limites de cette métaphore.

---

## 1. La cognition humaine est arborescente par défaut

| domaine | exemple |
|---|---|
| linguistique | arbre syntaxique des phrases |
| logique | arbre de preuve / déduction |
| organisation | hiérarchie organisationnelle |
| classification | taxonomies biologiques |
| navigation | arbre de fichiers |
| science | discipline → sous-discipline → spécialité |

Le cerveau **traite efficacement** les arbres grâce à des heuristiques
spatiales-cognitives héritées (cf. `VERTICALITY_MODEL.md §1`).

ZORAN exploite ça **sans mentir** : la structure est réellement
arborescente (DAG des `parent` edges) avec **des ponts non-arborescents**
(iso, related, contradicts).

---

## 2. Multi-parentalité tolérée

Un arbre strict est trop rigide pour une cognition réelle. ZORAN admet
la **multi-parentalité** :

- Une loi peut avoir plusieurs parents `parent` (héritage multiple)
- Plus de relations `iso`, `related`, `contradicts`, `absorbed_into`,
  `depends`

Ces relations **non-hiérarchiques** ne participent **pas** au calcul
du `hierarchical_depth` (qui prend le min des parents) mais
**enrichissent** le graphe en ponts horizontaux.

Le résultat est un **arbre + ponts** : arbre dominant verticalement,
ponts dominants horizontalement.

---

## 3. Trois niveaux de lecture cognitive

### 3.1 Vue d'ensemble (zoom out)

L'utilisateur voit **5 niveaux** :
- Canopée (μ0)
- Stratum supérieur (μ1 / racines canoniques)
- Tronc (canoniques + sous-cas)
- Branches (instances, dérivations)
- Racines (feuilles spécialisées)

→ **« il y a une hiérarchie » + « il y a 8 familles »** (couleurs)

### 3.2 Vue famille (zoom + focus famille)

L'utilisateur clique sur une famille (sidebar). La caméra s'oriente
vers le centre de gravité de la famille.

→ **« voici comment GHUC est structuré, du méta-attractor aux instances »**

### 3.3 Vue loi (clic sphère)

Panneau ouvert. Affichage des `frames`, `compositions`, `relations`.

→ **« voici exactement ce que cette loi prétend, et ce qu'elle ne calcule pas »**

---

## 4. Les ponts iso comme connexions transversales

Visuellement, les arêtes `iso` traversent l'arbre **latéralement** (à
hauteur similaire). Cela rend visible :

- **L'unité conceptuelle** entre familles distinctes (ex. ULG-001 ↔
  SDE-001 via ISO-001)
- **Les compositions opératoires** (GHUC ∘ DVE)
- **Les transferts d'invariants**

Ces ponts ne créent pas de hiérarchie supplémentaire : ils relient des
nœuds **de niveaux similaires**. C'est l'œil humain qui les perçoit
naturellement comme « connexions horizontales ».

---

## 5. Les contradictions comme rupteurs

Les arêtes `contradicts` sont visuellement distinctes (rouge) et
constituent les **points de tension** du système.

Visuellement, elles **lient deux lois souvent à hauteurs proches**
(intra-famille typiquement). C'est volontaire : une contradiction est
une **tension intra-stratum**, pas une rupture verticale.

L'utilisateur voit immédiatement où le système **vit avec ses tensions**
plutôt que les masquer.

---

## 6. Les sandbox (futur) : sous l'horizon

Les lois sandbox apparaissent **sous le sol** :
- Y < -250
- opacity = 0.4
- couleur désaturée
- contour pointillé

L'utilisateur **sait** instantanément qu'elles sont **expérimentales
non admissibles runtime**. Pas de confusion possible.

C'est la métaphore du **substrat racinaire** : le sol nourrit l'arbre
mais n'est pas l'arbre.

---

## 7. Limites de la métaphore arborescente

### 7.1 Pas de vrai sommet unique

ZORAN a **8 racines canoniques de famille**, pas une seule racine
mondiale. La canopée contient au moins 8 nœuds. Ce n'est donc pas un
arbre strict mais une **forêt** avec des ponts (iso) entre les
canopées.

C'est conceptuellement plus honnête : il n'y a **pas d'attracteur
unique** au-dessus de tous les autres. GHUC-001 (μ0) est le plus haut
mais n'est pas un commandement absolu — c'est un attracteur
opérationnel.

### 7.2 Les feuilles ne sont pas des « culs-de-sac »

Dans un arbre biologique, les feuilles sont des terminaux (production de
photosynthèse). Dans ZORAN, les feuilles sont des **instances
opérationnelles** (le runtime utilise principalement les feuilles pour
les cas concrets).

C'est presque inversé : les feuilles ZORAN sont **où le travail se
fait**, les racines sont les principes abstraits.

### 7.3 Les racines (feuilles ZORAN) peuvent évoluer

Une feuille spécialisée peut **monter** si elle accumule des
compositions et devient référente pour de nombreuses autres lois. Le
système n'est pas figé : la verticalité est **dynamique**.

---

## 8. Cohabitation avec la non-arborescence

Pour insister : ZORAN n'est **pas** un arbre. C'est :

```
Un DAG hiérarchique (arêtes parent) + un graphe dense (autres arêtes)
+ une projection visuelle verticale (Y = structural_rank)
```

Cette triple nature est honnête : la métaphore arborescente
**guide la perception** sans **mentir sur la structure**.

---

## 9. Évolution future : floraison saisonnière

Idée P0.6+ : si le système atteint une « saison de stabilité » (HS > 0.95
sustainée 30 jours), faire **fleurir** légèrement les attracteurs μ0
visuellement (halo doré pulsant **lent** ; pas de néon).

C'est une récompense esthétique pour stabilité — et un signal
cognitif que le système est en bonne santé.

À évaluer en P0.6 — pas implémenté en V3.

---

## 10. Risques de la métaphore

| risque | mitigation |
|---|---|
| Confusion arbre = strict | document explicit (cf. §7) |
| Élévation de l'autorité (μ0 = vérité absolue) | tag `proxy:` sur S_global maintenu |
| Stigmatisation des feuilles (« moins importantes ») | feuilles peuvent monter dynamiquement |
| Sandbox = « inférieur » | sandbox = **futur** stockage de potentialité |
| Métaphore biologique trop forte | ZORAN est computationnel, pas biologique |

---

## SIGNATURE

```
DOCUMENT:             TREE_COGNITION_MODEL.md
VERSION:              1.0
COGNITIVE_GAIN:       lecture immédiate du graphe sans clic
HONEST_METAPHOR:      arbre dominant + ponts non-arborescents
DYNAMIC:              feuilles peuvent monter ; sandbox peut être promu
NEXT_ACTIONS:         documenter dans README pour utilisateurs
                      ne pas réifier la métaphore biologique
```

🔶
