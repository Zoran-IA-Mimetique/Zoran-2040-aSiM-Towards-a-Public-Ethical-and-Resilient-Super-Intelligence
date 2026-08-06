# Ordre de travail §20 — points 1, 2, 3 et 4

**Statut : points 1, 2, 3 et 4 livrés sur 8. `S = NON_MESURÉ`.**

> **Correction.** Une version antérieure de ce document et son résumé annonçaient
> « 1 point sur 8 ». C'était faux : les points 2 et 3 — les deux hiérarchies
> déclarées — étaient livrés en même temps que le point 1. Le point 4 l'est
> depuis. Le décompte exact est **4 sur 8**.

> Ajouter au moteur multicadres un objet `CadreCausal` et une fonction
> proposer/promotionner les cadres selon les sept critères, sans prétendre à la
> perfection.

Lettre de mission : [`LETTRE_DE_MISSION_ZORAN_REPRISE_TOTALE_2026-08-06.docx`](LETTRE_DE_MISSION_ZORAN_REPRISE_TOTALE_2026-08-06.docx).
Code : [`zoran/cadres.py`](zoran/cadres.py), [`zoran/hierarchies.py`](zoran/hierarchies.py), [`zoran/proxys.py`](zoran/proxys.py).
Exécution : `python -m experiments.run_cadres_008`.

---

## 1. Ce qui a été fait, et ce qui ne l'a pas été

**Fait** — points 1 à 4 : l'objet `CadreCausal`, la fonction de promotion sur
les sept critères du §12.1, les deux hiérarchies déclarées du §13 et du §14, et
le gel de structure des proxys.

**Pas fait, délibérément** :

- **Rien n'a été réécrit.** La conclusion d'audit du §18 l'interdit : « Ne pas
  le réécrire aveuglément : ajouter d'abord au moteur actuel un module minimal
  de promotion ». Le moteur v0 et ses 7 tests unitaires ne sont pas dans ce
  dépôt ; ce module s'ajoute, il ne remplace rien.
- **Aucun calcul de `S` ni de `Φ_C`.** Le §27 fixe `S = NON_MESURÉ`, le §12.2
  interdit une valeur numérique de `Φ_C` hors domaine défini. Aucune fonction
  du module n'en produit.
- **Aucune sélection automatique de hiérarchie.** Le module juge des cadres
  **déclarés**. Il ne prétend pas être le « sélecteur parfait » dont le §18
  établit le statut `NON RETROUVÉ`.
- **Aucune valeur de seuil.** Le gel du point 4 porte sur la structure ; les
  valeurs restent `NON_MESURÉ` jusqu'à exécution des protocoles (§23).

## 2. Résultat de la promotion

### Roulement (§13)

| Niveau | Verdict | Motif |
| --- | --- | --- |
| R0 — Bille | **cadre** | sept critères satisfaits |
| R1 — Voisinage | **cadre** | sept critères satisfaits |
| **R2 — Relation antipodale** | **relation** | NON_MESURÉ : frontière, triplet, causalité testable, invariant |
| R3 — Roulement complet | **cadre** | sept critères satisfaits |
| R4 — Machine | **cadre** | sept critères satisfaits |
| R5 — Planète | **NON_MESURÉ** | NON_MESURÉ : proxys, triplet, causalité, invariant |

**R2 n'est pas promu**, et c'est le point de vigilance central du §13. La lettre
exige un protocole qui isole le secteur antipodal, mesure ses variables propres
et teste une causalité distincte. Rien de cela n'est acquis. Le compter comme
cadre créerait le chevauchement et le double comptage que le §13 signale.

Ce refus n'est pas une politesse documentaire : un test le verrouille, et il
échouera si quelqu'un promeut R2 sans compléter les quatre critères manquants.

### Batterie (§14)

| Niveau | Verdict |
| --- | --- |
| B0 — Cellule | **cadre** |
| B1 — Voisines | **cadre** |
| B2 — Pack | **cadre** |
| B3 — Régulateur | **cadre** |
| B4 — Planète | **NON_MESURÉ** |

La règle des deux cadres du §0 est satisfaite dans les deux hiérarchies.

## 3. Verrous encodés dans le code

Chacun correspond à une interdiction de la lettre, et chacun est verrouillé par
un test — pas seulement documenté.

| Verrou | Où | Comportement |
| --- | --- | --- |
| Règle de promotion (§12.1) | `promouvoir()` | ne peut pas retourner `CADRE` avec un critère absent ; `repli=CADRE` lève une erreur |
| NON_MESURÉ (§2) | `criteres_locaux()` | un champ absent vaut `None`, **jamais `False`** — l'absence n'est pas une négation |
| Aucune moyenne (§12.2) | `RapportPromotion` | aucun score, aucune agrégation numérique ; conjonction de portes |
| Double comptage (§12.1 c.7) | `_double_comptage()` | jugé sur la hiérarchie ; un proxy commun non tracé le déclenche |
| Deux cadres (§0) | `evaluer_hierarchie()` | compte les cadres **promus**, pas les niveaux déclarés |
| Champ vide | `__post_init__` | refusé à la construction : `None` explicite plutôt que coquille silencieuse |

## 4. Question thermique — arbitrée par l'auteur

`R0_temperature_contact` et `R1_temperature_voisinage` ont **la même dimension
physique sans être la même observable** :

| | Lieu de mesure | Nature |
| --- | --- | --- |
| `R0_temperature_contact` | interface bille–piste | pics rapides, résolus temporellement |
| `R1_temperature_voisinage` | film, cage, zone de contacts | agrégée spatialement et temporellement |

**Elles restent séparées**, et le lien est déclaré comme **transfert causal**
`R0 → R1` (`proxys.TRANSFERTS_ROULEMENT`) plutôt que comme partage de variable.
Les fusionner produirait exactement le double comptage — ou la perte
d'information — que le §12.1 interdit.

Le transfert lui-même reste `NON_MESURÉ` : retard et facteur de forme ne sont pas
calibrés.

## 5. Point 4 — gel de la structure, livré

> Geler les proxys, les seuils, les liens causaux et les données manquantes
> avant calcul.

Je m'étais déclaré bloqué sur ce point en attendant vos seuils. **C'était une
erreur** : la structure se gèle sans inventer une seule valeur.

**Gelé** — identité, grandeur, unité, lieu de mesure, **sens** du seuil,
criticité, traitement des absences, protocole de calibration. Six proxys du
roulement dans `zoran/proxys.py`.

**Non gelé, et c'est l'objet du gel** — la **valeur** des seuils, qui reste
`None`, c'est-à-dire `NON_MESURÉ`. Le §23 l'exige.

Le code interdit de tricher : **un seuil chiffré sans protocole de calibration
déclaré est refusé à la construction**. On ne peut pas poser un nombre sans dire
comment il s'obtiendrait.

Conséquence directe, calculée : `portes_absolues()` retourne les proxys critiques
dont le seuil manque. **Elle n'est pas vide.** Aucune porte absolue n'est donc
calculable, et le §24 interdit toute comparaison relative tant que c'est le cas.

Détail notable : `R1_epaisseur_film` est le seul proxy dont le sens est
`DECROISSANT_DEGRADE`. Le sens est déclaré par proxy, jamais supposé uniforme.

## 6. Suite — point 5

> Développer le premier passage NASA historique à 1,4 Ah et appliquer les portes
> absolues.

Bloqué, mais pour une raison désormais explicite et non plus par défaut : les
portes absolues exigent des seuils calibrés, et les protocoles de calibration
sont déclarés sans avoir été exécutés. Le §17 rappelle en outre que le premier
passage NASA historique est un développement **non aveugle** — une confirmation
indépendante reste obligatoire.

## 7. Ce que rien de tout cela n'établit

- **Aucune validation physique.** `PASS structurel` logiciel, comme le §16 le
  classe pour le moteur v0. La validation physique reste `NON_MESURÉE`.
- **Aucune conclusion sur ZORAN.** Les corpus prioritaires du §1 — Z1, la
  démonstration par applications, la falsification assistée, la Note Scellée
  Sigma v1 — n'ont pas été consultés dans cette session. La checklist §21 n'est
  donc **pas** satisfaite, et aucune conclusion sur ZORAN ne doit être tirée de
  ce livrable.
- `S` et `F_s` restent `NON_MESURÉS`, motif inchangé : proxys, seuils et
  pondérations non calibrés.

---

*Points 1 à 4 livrés sur 8. 102 tests. `S = NON_MESURÉ`.*
