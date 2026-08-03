# Passerelle — Manifeste du Z-temps ↔ Z-TEMPS-PHYS-V1

*Document de liaison · v1.0*

Ce dépôt contient désormais deux textes qui portent le même nom et ne disent pas
la même chose. Les confondre serait une faute, et c'est le premier objet de
cette passerelle.

## 1. Deux registres, pas deux versions

| | [Manifeste du Z-temps](MANIFESTE_Z-TEMPS_v1.md) | [Z-TEMPS-PHYS-V1](Z-TEMPS-PHYS-V1.md) |
| --- | --- | --- |
| Nature | Position et engagements | Loi physique candidate |
| Objet | Le temps d'un système d'IA gouvernable | Le temps propre d'un objet physique |
| Vérité visée | Tenue de parole, opposabilité | Falsifiabilité, correspondance mesurée |
| Réfuté par | Un engagement non tenu | Un falsificateur du §7 |
| Statut | Déclaratif, assumé comme tel | `NON ACQUIS` (§10) |

Le manifeste dit *ce que le projet s'oblige à faire*. PHYS-V1 dit *ce qui
pourrait être vrai du monde*. Un manifeste ne se falsifie pas ; une loi ne se
respecte pas. Le seul pont légitime entre les deux est celui-ci : **si PHYS-V1
tient, alors les quatre régimes du manifeste cessent d'être des conventions
d'ingénierie et deviennent des conséquences.** Tant que le statut est
`NON ACQUIS`, ils restent des conventions — et le manifeste doit continuer à les
justifier par lui-même.

## 2. Correspondance des quatre régimes

| Régime du manifeste | Dans PHYS-V1 | Ce qui change si la loi tient |
| --- | --- | --- |
| Temps **stratifié** | Profil `C = [C_local, C_objet, C_cadre, C_global]` (§2) | Les quatre couches mémoire cessent d'être un choix d'architecture : elles deviennent les échelles auxquelles la cohérence est définie |
| Temps **réversible** (ΔM11.3) | Conditions de domaine et P2 : `C = 0` est irréversible | La réversibilité a une frontière physique, pas seulement opérationnelle : en deçà de la dissolution, rien ne revient |
| Temps **synchrone** (PolyResonator) | `N` compte les transformations sans temps présupposé (§1) | Le référentiel commun entre agents n'est plus une convention de protocole mais un compteur de transformations partagé |
| Temps **opposable** (EthicChain) | Invariant 6, traçabilité de chaque valeur | L'audit porte sur des grandeurs mesurées, pas sur des décisions déclarées |

La correspondance est une *hypothèse de travail*. Elle n'est pas démontrée et
aucun test de ce dépôt ne l'établit.

## 3. Ce que l'implémentation de référence couvre

Le paquet [`ztemps/`](ztemps/) rend exécutables les parties de PHYS-V1 qui le
peuvent aujourd'hui, et refuse d'aller plus loin.

**Implémenté et testé** (23 tests, `python -m unittest discover -s tests -t .`) :

- conditions de domaine du §2, profil complet obligatoire sur les quatre échelles ;
- `D(C(e)) = Σ_s w_s · (1 - C_s(e))` et l'intégration discrète `τ_Z(N)` (§3) ;
- arrêt à la dissolution : `C_s = 0` interrompt l'accumulation et marque `τ_Z`
  ultérieur comme indéfini, sans annuler le temps déjà accumulé (§4, P2) ;
- séparation calibration / évaluation du §3, rendue **exécutable** : des poids
  sans jeu de calibration déclaré ne peuvent pas être construits, et une
  intersection entre calibration et évaluation lève `CalibrationLeakError` ;
- invariants 1, 2, 4 (un vérificateur d'invariance par groupe déclaré), 3
  (contrôle des observables temporels), 5 (conservation des cadres), 6
  (traçabilité structurelle) ;
- prédictions P1, P2, P3 comme tests.

**Délibérément non implémenté** :

- **la mesure de `C`** — c'est le `NON_MESURÉ` du §10 et l'étape que la spec
  elle-même désigne comme la prochaine ; le paquet consomme des profils fournis
  par un proxy externe et n'en produit aucun ;
- **P4** — aucune loi de décroissance de la survie n'est fournie, et un test
  échoue si quelqu'un en ajoute une : « elle ne doit pas être imposée par
  avance » ;
- **`τ_*`** — aucune valeur par défaut ; l'appelant doit la fournir et la
  spec la déclare « à mesurer » ;
- **P5** — le test existe et se déclare `skipped` faute d'horloge physique de
  référence dans le dépôt.

## 4. Points ouverts rencontrés en implémentant

Trois décisions ont dû être prises que la spécification ne tranche pas. Elles
sont signalées ici plutôt que dissimulées dans le code.

1. **Lecture de l'invariant 5.** « Conservation des cadres inférieurs et pairs
   lors de toute agrégation » a été implémenté comme : aucune échelle ne peut
   être omise de l'agrégation, et aucun poids `w_s` ne peut être nul. C'est une
   lecture défendable — un poids nul efface un cadre — mais ce n'est pas la
   seule possible. **À confirmer par les auteurs.**
2. **Portée de l'invariant 3.** Le contrôle d'absence de temps primitif est
   *nominal* : il inspecte les noms d'observables. Un horodatage nommé `x_3`
   passe. C'est un garde-fou contre l'erreur ordinaire, pas une preuve. Une
   vérification structurelle demanderait un typage des observables que la spec
   ne définit pas encore.
3. **Comportement à la dissolution.** Le §4 dit que le temps propre ultérieur
   est indéfini, sans dire ce qu'il advient de la transformation *qui* dissout.
   Choix retenu : elle n'est pas intégrée, et `τ_Z` conserve la valeur atteinte
   avant elle. L'alternative — intégrer le dernier pas puis s'arrêter — est
   défendable et donnerait une valeur différente.

Deux autres sont apparues en *exécutant* le protocole, et elles pèsent plus
lourd que les trois précédentes. Elles sont documentées en détail dans
[`RESULTATS-PROXY-C-001.md`](RESULTATS-PROXY-C-001.md) :

4. **Par rapport à quoi `C` mesure-t-elle la conservation ?** Lecture
   incrémentale (par rapport à la configuration précédente) ou référentielle
   (par rapport à une configuration d'origine) ? La première rend un système
   entièrement décohéré « parfaitement cohérent » ; la seconde casse la forme
   différentielle de la loi. **Aucune ne fonctionne telle quelle.**
5. **`C_s = 0` à une seule échelle dissout-il l'objet entier ?** Le §2 dit
   « à l'échelle s », le §4 dit « dissolution de l'objet ». Et la dissolution
   dépend alors de la cardinalité de l'échelle, ce qui réintroduit une
   dépendance à la représentation par une porte dérobée.

Les questions 4 et 5 appartiennent aux auteurs de la spécification. Elles
bloquent l'essai 002.

## 5. Effet sur la feuille de route du manifeste

La feuille de route de la v1 du manifeste (§VI) prévoyait v2 = horloge logique,
v3 = protocole de mesure, v4 = EthicChain de référence. PHYS-V1 la déplace :

- **v2 est absorbée.** Le compteur `N` de PHYS-V1 *est* l'horloge logique
  cherchée, et il est meilleur que ce qui était prévu : il ne présuppose pas de
  temps. La spec d'horodatage devient une spec de comptage de transformations.
- **v3 devient l'étape critique et change d'objet.** Il ne s'agit plus de rendre
  reproductibles les métriques PolyResonator, mais de construire **le premier
  proxy de `C`**, protocole fixé avant l'essai, et de tester son transfert entre
  deux des trois familles du §8. C'est ce que demande le §10.
  **Premier essai fait, et échoué** : voir le pré-enregistrement
  [`PROXY-C-001`](PRE-ENREGISTREMENT-PROXY-C-001.md) et ses
  [résultats](RESULTATS-PROXY-C-001.md). Trois critères sur cinq ne passent pas.
  L'invariance de représentation, elle, passe exactement.
  **Second essai** : [`GRANULARITE-002`](PRE-ENREGISTREMENT-GRANULARITE-002.md)
  → [résultats](RESULTATS-GRANULARITE-002.md), qui chiffre le verrou de
  résolution nommé par le pilote multi-domaine. Toute variation cumulée publiée
  sans granularité déclarée déclenche le falsificateur du §7, tiret 1.
- **v4 se rapproche.** L'invariant 6 et les `Record` du paquet donnent déjà le
  format de ligne qu'EthicChain doit journaliser.

---

*Passerelle Z-temps v1.0 — document ouvert, contributions par pull request.*
