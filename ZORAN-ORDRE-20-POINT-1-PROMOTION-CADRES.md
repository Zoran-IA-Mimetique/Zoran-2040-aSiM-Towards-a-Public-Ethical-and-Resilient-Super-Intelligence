# Ordre de travail §20 — point 1 : objet `CadreCausal` et promotion

**Statut : livré. `S = NON_MESURÉ`.**

> Ajouter au moteur multicadres un objet `CadreCausal` et une fonction
> proposer/promotionner les cadres selon les sept critères, sans prétendre à la
> perfection.

Lettre de mission : [`LETTRE_DE_MISSION_ZORAN_REPRISE_TOTALE_2026-08-06.docx`](LETTRE_DE_MISSION_ZORAN_REPRISE_TOTALE_2026-08-06.docx).
Code : [`zoran/cadres.py`](zoran/cadres.py), [`zoran/hierarchies.py`](zoran/hierarchies.py).
Exécution : `python -m experiments.run_cadres_008`.

---

## 1. Ce qui a été fait, et ce qui ne l'a pas été

**Fait** — points 1, 2 et 3 de l'ordre de travail : l'objet `CadreCausal`, la
fonction de promotion sur les sept critères du §12.1, et les deux hiérarchies
déclarées du §13 et du §14.

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
- **Aucun gel de proxys ni de seuils.** C'est le point 4 de l'ordre de travail,
  et il vient après.

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

## 4. Une question rendue au demandeur

En déclarant R1 — Voisinage, la lettre liste « température » parmi ses proxys.
R0 — Bille liste « température de contact ». Ce sont vraisemblablement deux
grandeurs distinctes, mais rien ne le dit explicitement.

**Je ne l'ai pas tranché.** J'ai omis « température » de R1 et signalé l'omission
en note, plutôt que de créer un recouvrement non tracé qui aurait fait échouer
le critère 7 — ou, pire, de l'inscrire comme partage sans mandat.

Deux issues, et le choix vous revient :

1. Ce sont deux grandeurs distinctes → réintroduire « température » dans R1 sous
   un nom qui les sépare ;
2. C'est la même grandeur → la tracer explicitement dans `variables_partagees`,
   ce que le §22 autorise : « Les cadres se recouvrent uniquement si les
   variables partagées sont explicitement tracées ».

Dans les deux cas, une ligne à changer. Tant que ce n'est pas tranché, le proxy
reste absent de R1, ce qui est le choix le plus conservateur.

## 5. Suite immédiate — point 4 de l'ordre

> Geler les proxys, les seuils, les liens causaux et les données manquantes
> avant calcul.

C'est la marche suivante, et elle est bloquante pour les points 5 à 8. Elle
demande vos arbitrages, pas du code : quels seuils, quel sens, quelle criticité,
quel traitement des absences.

## 6. Ce que rien de tout cela n'établit

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

*Point 1 livré. 96 tests. `S = NON_MESURÉ`.*
