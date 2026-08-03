# Pré-enregistrement — Essai JUMEAUX-005

**Protocole fixé avant l'essai.** Le commit qui introduit ce document ne contient
aucun résultat.

## 1. Objet

La [matrice des jumeaux conjoints V1.3](Z-TEMPS-JUMEAUX-CONJOINTS-MATRICE-V1.3.md)
désigne comme prochaine étape : « transformer ces fiches en variables comparables
et rechercher une relation entre degré de partage corporel et autonomie
individuelle ».

Cet essai fait exactement cela, **et rapporte d'abord ce que le nombre de cas
permet de conclure.**

## 2. Périmètre, et ce qui en est exclu

Cet essai est un travail **documentaire et méthodologique** sur des cas publiés.
Il ne produit aucune inférence sur l'expérience subjective de personnes
identifiables.

- Le codage porte uniquement sur ce que les fiches de la matrice V1.3 énoncent.
  **Les articles sources n'ont pas été consultés** : le codage est donc une
  lecture de la matrice, pas une extraction depuis PubMed, et il est étiqueté
  comme tel partout.
- La colonne phénoménale reste `NON_MESURÉ` **par construction**, conformément à
  H4 de la matrice. Aucun codage ne s'en approche, y compris pour les cas
  nommés.
- Aucune variable ne code une valeur, une qualité de vie ou un pronostic.

## 3. Variables, définies avant le codage

Le modèle de la matrice est `R_total = R_A + R_B + R_AB`. Les deux variables en
découlent directement.

**Indice de partage** `s` — proportion des classes de relations documentées comme
partagées, sur quatre classes déclarées : `nerveuse`, `vasculaire`, `squelettique`,
`viscérale`. Une classe compte comme partagée seulement si la fiche l'affirme ;
un silence n'est **pas** un partage, et n'est pas non plus une absence — il est
codé `inconnu` et retiré du dénominateur.

**Indice d'autonomie** `a` — trois éléments binaires : autonomie motrice
documentée, préférences ou comportements distincts documentés, fonction propre
après séparation documentée. Un cas sans aucune donnée comportementale n'est pas
codé `0` : il est **non codable**, et sort de l'analyse.

## 4. Hypothèse testée

Reformulation de H1-H3 de la matrice en énoncé réfutable :

> `s` et `a` sont négativement corrélés : plus le partage corporel est étendu,
> moins l'autonomie individuelle documentée est grande.

Test : ρ de Spearman, **loi exacte par énumération des permutations**. Les
approximations asymptotiques sont fausses à cette taille, pas seulement
imprécises. Seuil retenu : `α = 0.05`, unilatéral.

## 5. Détectabilité, calculée avant de coder

C'est le point central de ce pré-enregistrement. La loi exacte donne le plus
petit `p` **atteignable** à chaque taille, quelle que soit la donnée :

| `n` | Ordre parfait | Une inversion de rang |
| --- | --- | --- |
| 3 | `p = 0.1667` | `p = 0.5000` |
| 4 | `p = 0.0417` | `p = 0.1667` |
| 5 | `p = 0.0083` | `p = 0.0417` |
| 6 | `p = 0.0014` | `p = 0.0083` |

Conséquences, déclarées avant de savoir combien de cas seront codables :

- **À `n = 3`, aucune donnée ne peut conclure.** Le meilleur résultat possible —
  un ordonnancement parfait — donne `p = 0.167`. Publier une corrélation à cette
  taille serait publier du bruit.
- **À `n = 4`, seul un ordonnancement parfait conclut**, à `p = 0.042`. Une seule
  inversion, et `p` remonte à 0.167. Un résultat qui exige la perfection n'est
  pas un résultat robuste.
- **À `n = 5`, le résultat survit à une inversion.** C'est le premier seuil
  raisonnable.

## 6. Critères, fixés d'avance

| Test | Énoncé | Décision |
| --- | --- | --- |
| **J1** | Nombre de cas codables sur les deux variables | rapporté, sans seuil |
| **J2** | Si `n < 4` : **aucun test de corrélation n'est effectué** | l'essai conclut à l'indécidabilité |
| **J3** | Si `n >= 4` : ρ exact et `p` unilatéral | conclusion si `p <= 0.05` |
| **J4** | Robustesse : le résultat survit-il à une inversion de rang ? | rapporté systématiquement |

**J2 est un engagement à ne pas produire de nombre.** Calculer un ρ sur trois
cas et le publier avec son intervalle de confiance donnerait à un non-résultat
l'apparence d'une mesure. Le protocole l'interdit d'avance.

## 7. Ce que l'essai ne pourra pas dire

- Rien sur la conscience. H4 de la matrice reste `NON_MESURÉ`.
- Rien de causal. Même une corrélation nette ne distinguerait pas « le partage
  réduit l'autonomie » de « les cas les plus partagés sont documentés
  différemment ».
- **Le biais de sélection est total et non corrigeable.** Les cas publiés sont
  ceux qui ont survécu jusqu'à l'imagerie, atteint la chirurgie, ou présenté un
  intérêt suffisant pour être publiés. L'autonomie est corrélée à la survie, qui
  est corrélée à la publication. Toute relation observée est confondue à la
  source, et aucune taille d'échantillon ne répare cela.

## 8. Engagements

1. Aucun seuil, aucune règle de codage ci-dessus ne sera modifié après avoir vu
   les données.
2. Le codage de chaque cas sera publié ligne par ligne, avec sa provenance, pour
   être contestable.
3. Si l'essai est indécidable, il sera publié comme indécidable, et le nombre de
   cas nécessaires sera indiqué.

---

*Pré-enregistrement JUMEAUX-005 — figé. Résultats dans un commit ultérieur.*
