# Résultats — Essai JUMEAUX-005

**Verdict : INDÉCIDABLE.** Aucun coefficient de corrélation n'a été calculé, et
c'est le résultat.

Protocole : [`PRE-ENREGISTREMENT-JUMEAUX-005.md`](PRE-ENREGISTREMENT-JUMEAUX-005.md).
Matrice source : [V1.3](Z-TEMPS-JUMEAUX-CONJOINTS-MATRICE-V1.3.md).
Données : [`experiments/resultats_005.json`](experiments/resultats_005.json).
Reproduction : `python -m experiments.run_twins_005`.

---

## 1. Le codage

| Cas | `s` partage | sur combien de classes | `a` autonomie | sur combien d'items | codable |
| --- | --- | --- | --- | --- | --- |
| J1 — pygopages, moelle en U | 1.000 | 2 / 4 | 1.000 | 2 / 3 | oui |
| J2 — parapagus dicephalus | 0.667 | 3 / 4 | — | **0 / 3** | **non** |
| J3 — thoraco-omphalo-ischiopage | 0.667 | 3 / 4 | 1.000 | 2 / 3 | oui |
| J4 — craniopage (Hogan) | 1.000 | **1 / 4** | 0.500 | 2 / 3 | oui |

Chaque valeur est justifiée par la citation de la fiche correspondante dans
`experiments/run_twins_005.py`, ligne par ligne, pour être contestée.

**n = 3.** J2 sort : la fiche dit « spécimen anatomique ; aucune donnée
comportementale ». Conformément au protocole, il n'est **pas** codé zéro — une
absence de mesure n'est pas une absence d'autonomie.

## 2. Pourquoi rien ne peut être conclu

Trois obstacles indépendants. Chacun suffirait.

### 2.1 La taille rend le test impossible, quelle que soit la donnée

C'est calculé dans le pré-enregistrement, **avant** le codage :

| `n` | meilleur `p` atteignable | avec une inversion de rang |
| --- | --- | --- |
| **3** | **0.1667** | 0.5000 |
| 4 | 0.0417 | 0.1667 |
| 5 | 0.0083 | 0.0417 |

À `n = 3`, même un ordonnancement **parfait** des trois cas donnerait
`p = 0.167`. Il n'existe aucune configuration des données qui passe sous 0.05.
Le critère J2 du protocole se déclenche : **aucun ρ n'est calculé.**

Ce n'est pas de la prudence. Calculer un ρ sur trois points et le publier
donnerait à un non-résultat la forme typographique d'une mesure.

### 2.2 Les indices produisent des ex æquo, qui bloquent le test exact

`s = [1.000, 0.667, 1.000]` et `a = [1.000, 1.000, 0.500]`. Deux ex æquo sur
trois cas, sur les deux variables. La loi exacte par permutations suppose un
ordre strict : elle ne s'applique pas.

Même à `n = 4` ou `n = 5`, ce blocage subsisterait tant que les indices restent
des rapports sur deux ou trois items.

### 2.3 Un indice à dénominateur 1 n'est pas une mesure

`s = 1.000` pour J4 est calculé sur **une seule classe de relations
documentée** — la connexion nerveuse. Les trois autres sont `inconnu`. Le cas le
plus « partagé » du tableau doit son score maximal au fait qu'on n'a codé qu'une
chose sur lui.

C'est exactement la pathologie mesurée dans
[GRANULARITE-002](RESULTATS-GRANULARITE-002.md) : un nombre qui a la forme d'une
mesure et le contenu d'un artefact. Ici l'artefact n'est pas
l'échantillonnage, c'est **la densité de documentation**.

## 3. Ce que l'indice d'autonomie mesure réellement

Il faut le dire, parce que la conclusion en dépend : `a` compte des éléments
**documentés**, pas des capacités. J1 et J3 obtiennent `a = 1.000` parce qu'ils
ont été séparés chirurgicalement, donc suivis, donc décrits. J4 obtient 0.500
parce que ses sœurs n'ont jamais été séparées, ce qui rend l'item
« fonction post-séparation » sans objet.

**`a` mesure donc en partie le fait d'avoir été opéré.** Or être opérable
dépend du degré de partage. Les deux variables sont couplées par le protocole de
soin lui-même, avant toute biologie.

C'est le biais de sélection annoncé au §7 du pré-enregistrement, et il est pire
que prévu : il ne contamine pas seulement l'échantillon, il contamine la
**définition** de la variable dépendante.

## 4. Ce dont on aurait besoin

| Objectif | Exigence |
| --- | --- |
| Simplement pouvoir conclure | **`n >= 4`** cas codables, avec un ordonnancement parfait |
| Un résultat qui survit à une inversion | **`n >= 5`** |
| Lever les ex æquo | indices sur au moins 4 items documentés par cas, pas 1 ou 2 |
| Rendre `a` indépendante du soin | une mesure d'autonomie qui ne dépende pas de la séparation chirurgicale |

Les trois premières lignes sont atteignables : elles demandent de lire les
articles sources plutôt que la matrice, et d'étendre la série. **La quatrième
ne l'est probablement pas** en études documentaires rétrospectives.

## 5. Ce qui n'est pas remis en cause

Rien de la matrice V1.3 n'est contredit par cet essai. Ses verdicts tiennent
tels quels :

- `PASS anatomique` pour plusieurs architectures locales dans un cadre partagé ;
- `PASS` pour l'existence de relations partagées documentées ;
- `HYPOTHÈSE TESTABLE` pour des temps propres distincts ;
- `NON_MESURÉ` pour une conscience fusionnée ;
- `NON ÉTABLIE` pour la loi physique générale.

L'essai ne porte que sur **la corrélation proposée comme étape suivante**, et il
dit qu'elle n'est pas encore calculable. La matrice reste un cadre de
documentation valide ; elle n'est simplement pas encore un jeu de données.

## 6. Périmètre respecté

- Aucune inférence sur l'expérience subjective de personnes identifiables. La
  colonne phénoménale est restée `NON_MESURÉ` par construction, conformément à
  H4 de la matrice.
- Le codage lit la matrice V1.3. **Les articles sources n'ont pas été
  consultés** : ce n'est pas une extraction depuis PubMed, et aucune valeur ci-dessus
  ne doit être citée comme telle.
- Aucune variable ne code une valeur, une qualité de vie ou un pronostic.

---

*Essai JUMEAUX-005 — indécidable à trois cas. Le protocole a été conçu pour
pouvoir le dire plutôt que pour produire un nombre.*
