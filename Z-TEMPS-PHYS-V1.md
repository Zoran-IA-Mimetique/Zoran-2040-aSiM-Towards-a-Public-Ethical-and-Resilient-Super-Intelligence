# Z-TEMPS-PHYS-V1
## Spécification falsifiable de la cinématique physique de la cohérence

**Statut :** loi candidate, non encore loi physique établie  
**Objet :** construire la passerelle entre Z-TEMPS et les onze moteurs Zoran  
**Principe :** le temps propre d’un objet est la manifestation mesurable de ses transformations relationnelles.

## 1. Séparation stricte des niveaux

### Posé

- Un objet est une structure de relations mesurables.
- Une transformation est un passage entre deux configurations relationnelles.
- Le compteur `N` compte les transformations élémentaires ; il n’est pas le temps.
- L’objet est identifié à symétrie près : une translation, rotation ou représentation équivalente ne détruit pas nécessairement son identité.

### À démontrer

- Une mesure physique de la cohérence `C`.
- Une fonction universelle reliant les transformations au temps propre.
- Une correspondance avec le temps propre relativiste dans les cas connus.

## 2. Objet et profil de cohérence

Pour une transformation `e`, on ne réduit pas d’abord la cohérence à un scalaire. On mesure un profil :

```text
C(e) = [C_local, C_objet, C_cadre, C_global]
```

Chaque composante mesure la proportion de relations conservées et compatibles à l’échelle considérée, après alignement par le groupe de symétries déclaré.

Conditions de domaine :

```text
0 < C_s(e) <= 1   : l’objet reste définissable à l’échelle s
C_s(e) = 0        : l’identité de l’objet cesse d’être définie à l’échelle s
```

`C = 0` ne signifie pas « temps égal à zéro ». Il signifie que le porteur du temps n’est plus défini.

## 3. Loi candidate

La forme générale est :

```text
dτ_Z = τ_* · D(C(e)) · dN
```

avec :

- `τ_Z` : temps propre Z-TEMPS ;
- `τ_*` : constante de conversion éventuellement universelle, à mesurer ;
- `D` : mesure de transformation cohérentielle ;
- `N` : compteur de transformations, sans temps présupposé.

La forme minimale testable est :

```text
D(C(e)) = Σ_s w_s · (1 - C_s(e))
```

Les poids `w_s` sont des paramètres à estimer sur un jeu de calibration séparé. Ils ne peuvent pas être ajustés pour confirmer une série de résultats déjà observés.

Intégration discrète :

```text
τ_Z(N) = τ_* · Σ[e=1..N] D(C(e))
```

## 4. Interprétation physique

Le temps propre n’est pas une substance qui s’écoule dans l’objet. Il est la quantité cumulée de transformation que l’objet peut subir tout en restant identifiable.

```text
C = 1       : aucune transformation identifiante ; temps propre nul pour cette étape
0 < C < 1   : transformation et persistance ; temps propre défini
C = 0       : dissolution de l’objet ; temps propre ultérieur indéfini pour cet objet
```

Le temps des autres objets peut continuer : la fin du temps propre d’un objet n’est pas la fin du temps global des objets qui persistent.

## 5. Invariants obligatoires

Une implémentation physique acceptable doit vérifier :

1. invariance par changement de coordonnées ;
2. invariance par les symétries déclarées de l’objet ;
3. absence de temps dans la définition de `C` et de `N` ;
4. indépendance vis-à-vis d’un choix arbitraire de base d’observables ;
5. conservation des cadres inférieurs et pairs lors de toute agrégation ;
6. traçabilité de chaque valeur : objet, transformation, échelle, proxy, incertitude.

## 6. Prédictions falsifiables

### P1 — fermeture

À transformation nulle, `D(C)=0`. Un système parfaitement fermé ne produit pas de temps propre phénoménal dans ce cadre.

### P2 — dissolution

Lorsque `C` tombe à zéro à l’échelle pertinente, l’objet cesse d’avoir un temps propre défini. Une mesure ultérieure doit être attribuée à un nouvel objet ou à un résidu distinct.

### P3 — accumulation

À nombre de transformations égal, un profil de perte cohérentielle plus élevé doit produire un `τ_Z` plus grand.

### P4 — mémoire

À défaut de correction active, la survie structurelle doit décroître avec la transformation cumulée. La forme exacte de cette décroissance reste à tester ; elle ne doit pas être imposée par avance.

### P5 — correspondance physique

Sur une horloge physique bien définie, `τ_Z` doit être monotone avec le temps propre relativiste et présenter une relation stable après calibration.

## 7. Falsificateurs prioritaires

La loi candidate est refusée ou révisée si :

- `τ_Z` dépend du choix de représentation plutôt que des relations physiques ;
- deux familles physiques exigent des fonctions `D` incompatibles sans raison structurelle ;
- aucun paramètre stable `τ_*` n’est transférable entre expériences ;
- `τ_Z` ne corrèle pas au temps propre de systèmes de référence ;
- la formule ne produit aucune prédiction nouvelle par rapport à une simple redéfinition de l’horloge ;
- une autre mesure plus simple explique tous les résultats avec moins d’hypothèses.

## 8. Protocole expérimental minimal

Trois familles doivent être comparées :

1. horloge physique de référence ;
2. système quantique soumis à une décohérence contrôlée ;
3. mémoire physique ou réseau neuronal matériel soumis à des perturbations contrôlées.

Pour chaque objet :

```text
mesurer les relations initiales
appliquer une transformation connue
mesurer le profil C(e)
calculer τ_Z sans utiliser l’horodatage comme entrée de C
comparer τ_Z au temps propre de référence
répéter sur un protocole aveugle
```

Le temps de référence sert uniquement à tester la prédiction, jamais à définir `C`.

## 9. Passerelle vers les onze moteurs

```text
M1  : extraction de l’objet et de ses relations
M2  : identification des transformations
M3  : calcul du profil de cohérence multi-échelle
M4  : détection des pertes et incompatibilités
M5  : suivi des traces et de la mémoire
M6  : estimation de la persistance
M7  : calcul de τ_Z
M8  : projection des trajectoires admissibles
M9  : comparaison des futurs
M10 : décision sous contraintes
M11 : audit, falsification et journalisation
```

Z-TEMPS ne remplace aucun moteur. Il fournit une variable transversale candidate : la transformation cohérentielle cumulée d’un objet.

## 10. Verdict actuel

```text
Cadre conceptuel                 PASS
Définition sans temps primitif   PASS provisoire
Profil multi-échelle             À formaliser
Mesure physique universelle C    NON_MESURÉ
Loi dτ_Z                         CANDIDATE
Correspondance relativiste       NON_MESURÉ
Prédiction nouvelle              À établir
Statut de loi physique           NON ACQUIS
```

La prochaine étape n’est pas d’ajouter une nouvelle formule. Elle consiste à construire le premier proxy physique de `C`, avec un protocole fixé avant l’essai, puis à vérifier s’il transfère entre deux familles de systèmes sans régression de cadre.
