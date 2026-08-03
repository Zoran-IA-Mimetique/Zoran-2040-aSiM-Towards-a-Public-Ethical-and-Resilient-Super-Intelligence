# Rétractation — l'essai FORME-006 n'était pas un test

**Ce que j'ai annoncé était faux.** J'ai présenté FORME-006 comme « la première
prédiction sans paramètre libre » du cadre. Elle n'en est pas une. Vérification
faite après coup, sur un doute, et le doute était fondé.

Les [résultats de FORME-006](RESULTATS-FORME-006.md) restent publiés tels quels.
Ce document dit ce qu'ils valent réellement.

---

## 1. Ce que FORME-006 mesurait en réalité

Sur une enveloppe uniforme `A(t) = exp(-(t/T)^β)`, toutes les relations décroissent
identiquement. Le proxy renvoie alors `C = A(t_k)/A(t_{k-1})`, et comme
`Σ_s w_s = 1` :

```text
D = 1 - A_k/A_{k-1}  ≈  -ln(A_k/A_{k-1})  =  ln A_{k-1} - ln A_k
```

La somme **télescope** :

```text
τ_Z(t) = Σ D = ln A(0) - ln A(t) = -ln A(t) = (t/T)^β
```

Mesuré : `τ_Z` colle à `-ln A(t)` à **0.6 %** pour `β = 2`, **1.9 %** pour
`β = 0.5`.

**`τ_Z` ne fait que recalculer le logarithme de la décroissance.** Que sa pente
log-log vaille `β` n'est pas une prédiction sur le monde : c'est
`ln(exp(-(t/T)^β)) = -(t/T)^β`, une identité algébrique.

## 2. Conséquences

**Des données réelles n'auraient rien tranché.** Une courbe `T1`, une courbe
Ramsey, n'importe quelle décroissance mesurée aurait donné `ACCORD` — quelle que
soit la physique sous-jacente, parce que le résultat est garanti par
l'arithmétique. J'ai envoyé chercher un jeu de données qui ne pouvait pas
réfuter la loi.

**F4 et F5 ne prouvaient pas ce que j'ai dit.** L'indépendance aux poids tenait
uniquement parce que les quatre échelles étaient *identiques* : avec une seule
enveloppe, `Σ_s w_s (1-C) = (1-C)` quels que soient les poids. Le `1.3·10⁻¹⁵`
était l'arithmétique d'une somme pondérée valant 1, pas une propriété de la loi.

## 3. Où est le contenu réel — et le problème qu'il pose

La trivialité vient de l'enveloppe **unique**. Dès que les échelles décroissent
différemment, `τ_Z` cesse d'être `-ln` de quoi que ce soit de simple.

Mesuré, avec les paires adjacentes en gaussien (`β = 2`) et les autres en
exponentiel (`β = 1`) :

| Échelle lue | pente de `τ_Z` |
| --- | --- |
| `LOCAL` | 1.996 |
| `OBJET` | 1.485 |

L'échelle `OBJET` donne un **mélange**, ni 1 ni 2. Voilà le contenu propre de la
loi : la combinaison multi-échelle.

Sauf que le mélange dépend des poids :

| Poids | pente de `τ_Z` |
| --- | --- |
| uniformes | 1.610 |
| `LOCAL` dominant (0.97) | 1.980 |
| `GLOBAL` dominant (0.97) | 1.490 |

**Toute pente entre 1.49 et 1.98 est atteignable en réglant `w_s`.** Le paramètre
libre est de retour, et il couvre une large part de l'intervalle plausible.

## 4. Le dilemme, énoncé nettement

> **Enveloppe unique** → `τ_Z = -ln A(t)`. La loi est une identité algébrique.
> Elle ne peut pas être réfutée parce qu'elle ne dit rien.
>
> **Échelles à décroissances différentes** → `τ_Z` est un mélange non trivial,
> mais sa pente se règle par les poids `w_s`, que rien ne fixe indépendamment.
> Elle ne peut pas être réfutée parce qu'elle s'ajuste.

Dans les deux cas, pas de test.

C'est une forme du falsificateur du §7 tiret 5 — « la formule ne produit aucune
prédiction nouvelle par rapport à une simple redéfinition de l'horloge » — plus
sévère que ce que le §7 anticipait : dans le cas uniforme, `τ_Z` n'est même pas
une redéfinition d'horloge, c'est le logarithme de la mesure d'entrée.

## 5. Ce qu'il faudrait pour en sortir

Une seule voie, et elle est exigeante : **fixer les poids `w_s` indépendamment
des données à expliquer.**

Le §3 de la spécification le demandait déjà — « paramètres à estimer sur un jeu
de calibration séparé […] ils ne peuvent pas être ajustés pour confirmer une
série de résultats déjà observés ». Ce n'était pas une précaution de méthode :
c'est la condition sans laquelle la loi n'a pas de contenu.

Il faut donc, dans l'ordre :

1. une règle qui détermine `w_s` à partir de la structure de l'objet, pas de ses
   trajectoires ;
2. un système dont les échelles décroissent **différemment** et de façon mesurée
   séparément ;
3. alors seulement, la pente du mélange devient une prédiction.

Tant que 1 n'existe pas, aucune donnée ne peut ni valider ni invalider la loi.
**Ce n'est pas un problème de données. C'est un problème de spécification.**

## 6. Ce que je retire

- L'affirmation « premier énoncé réfutable sans paramètre libre » : **retirée**.
- La recommandation d'aller mesurer `T1` et `T2*` pour trancher : **retirée**.
  Le script `experiments/acquire_qubit_006.py` reste dans le dépôt, il fonctionne,
  mais il ne répond pas à la question qu'on croyait lui poser.
- Le verdict `INSTRUMENT_VALIDÉ` de FORME-006 : **conservé**. L'instrument fait
  bien ce qu'il fait. C'est son interprétation qui était fausse, pas son code.

## 7. Pourquoi c'était détectable, et pourquoi je ne l'ai pas vu

Le télescopage était visible dès l'écriture du pré-enregistrement. J'ai validé
l'instrument sur quatre valeurs de `β`, obtenu des écarts de 0.004 avec
`r² > 0.9999999`, et pris cette précision pour une confirmation. Une précision de
`10⁻⁷` sur une loi de puissance aurait dû m'alerter : les mesures physiques ne
sont jamais aussi propres. **C'était trop beau parce que c'était de l'algèbre.**

C'est le même piège que ceux repérés dans les essais précédents — la variation
cumulée à 98.8 % de bruit, le `T2` à `10⁻¹⁶`, l'indice de partage à dénominateur
1. La différence est que cette fois, c'est moi qui l'ai posé.

---

*Rétractation publiée le jour même de l'essai. Les résultats de FORME-006 ne
sont pas modifiés — ils sont réinterprétés.*
