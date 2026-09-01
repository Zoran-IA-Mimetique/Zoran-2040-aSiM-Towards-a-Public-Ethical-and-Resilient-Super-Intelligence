# Pré-enregistrement — Essai PROXY-C-001

**Protocole fixé avant l'essai, conformément à Z-TEMPS-PHYS-V1 §8 et §10.**

> « La prochaine étape […] consiste à construire le premier proxy physique de `C`,
> avec un protocole fixé avant l'essai, puis à vérifier s'il transfère entre deux
> familles de systèmes sans régression de cadre. » — §10

Ce document est écrit et versionné **avant** toute exécution. Le commit qui
l'introduit ne contient aucun résultat : c'est la seule preuve d'antériorité que
nous puissions offrir, et elle est vérifiable dans l'historique git.

---

## 1. Ce que cet essai peut et ne peut pas établir

L'essai porte sur des systèmes **synthétiques**, pas physiques. La famille 1 du
§8 — horloge physique de référence — est absente de ce dépôt.

Conséquence, admise d'avance : **cet essai ne peut rien confirmer.** Il peut
seulement réfuter — montrer que la machinerie est incohérente, ou qu'aucun `τ_*`
ne transfère même entre deux systèmes dont nous contrôlons entièrement la
dynamique. Un succès ne dirait rien du monde ; un échec dirait quelque chose de
la loi candidate.

Cette asymétrie est la raison d'être de l'essai. Un proxy qui échoue déjà sur du
synthétique n'a pas à être porté en laboratoire.

## 2. Proxy candidat, déclaré

`ztemps.proxy.RelationalOverlapProxy`, lecture littérale du §2 :

```text
C_s = max         fraction des relations de l'échelle s qui sont
      g ∈ G       conservées  (|r' - r| <= θ)
                  ET compatibles  (r · r' >= 0, pas d'inversion de signe)
```

- **θ (tolérance) = 0.05**, fixé maintenant, sur des relations sans dimension.
- **Échelles** : emboîtées, `LOCAL ⊆ OBJET ⊆ CADRE ⊆ GLOBAL`. L'emboîtement est
  la lecture retenue de l'invariant 5 : une échelle supérieure contient les
  relations des échelles inférieures et ne peut donc pas les effacer.
- **Alignement** : maximum sur le groupe de symétries déclaré, comme l'exige le
  §2. L'invariance par symétrie est ainsi vraie par construction, pas vérifiée
  après coup.

## 3. Paramètres libres — réduits à un seul

| Paramètre | Traitement | Justification |
| --- | --- | --- |
| `w_s` | **Fixés uniformes à 1/4**, non ajustés | Nous n'avons aucune base principielle pour différencier les échelles. Les estimer ajouterait trois degrés de liberté et affaiblirait le test d'autant. |
| `θ` | **Fixé à 0.05**, non ajusté | Idem. |
| `τ_*` | **Seul paramètre estimé**, moindres carrés par l'origine sur le jeu de calibration | §3 : « constante de conversion éventuellement universelle, à mesurer ». |

Un seul paramètre libre, estimé sur un jeu disjoint du jeu d'évaluation. La
séparation est **imposée par le code** : `ztemps.law.tau_z` lève
`CalibrationLeakError` si les deux jeux s'intersectent.

## 4. Jeux, fixés d'avance

| Rôle | Système | Graine |
| --- | --- | --- |
| Calibration | Décohérence contrôlée (§8, famille 2) | 20400 |
| Évaluation intra-famille | Décohérence contrôlée, réplicat indépendant | 20402 |
| Évaluation inter-familles | Mémoire perturbée (§8, famille 3) | 20401 |

**Faiblesse déclarée d'avance** : la famille 3 n'a pas de temps propre
indépendant. Son « temps de référence » est l'exposition cumulée à la
perturbation, qui est une convention de notre part. Le test inter-familles est
donc plus faible que ce que le §8 demande, et un échec sur ce seul point devra
être imputé au protocole autant qu'à la loi.

## 5. Critères, fixés d'avance

`e_rel` = erreur relative médiane entre `τ_Z(N)` et le temps de référence, sur
les pas où le temps de référence est non nul.

| Test | Énoncé | Seuil | Statut |
| --- | --- | --- | --- |
| **T1** | `τ_Z` strictement croissant avec le temps de référence, dans les deux familles | strict | Requis |
| **T2** | Transfert **intra-famille** : `τ_*` calibré sur 20400, appliqué à 20402 | `e_rel <= 0.15` | Requis |
| **T3** | Transfert **inter-familles** : le même `τ_*` appliqué à la famille mémoire | `e_rel <= 0.30` | Requis — c'est le test du §10 |
| **T4** | Invariance de représentation sous le groupe de réétiquetage déclaré | écart `<= 1e-9` | Requis |
| **T5** | Conservation des cadres : quatre échelles, aucun poids nul | exact | Requis |

**T1 teste P5 au sens faible** (monotonie). **T2 et T3 testent P5 au sens fort**
(« relation stable après calibration ») et visent directement le falsificateur
du §7, tiret 3 : « aucun paramètre stable `τ_*` n'est transférable entre
expériences ».

## 6. Engagements

1. Aucun critère, seuil, graine ou paramètre de la présente section ne sera
   modifié après consultation des résultats.
2. Si T3 échoue, **le résultat est publié comme échec**, dans
   `RESULTATS-PROXY-C-001.md`, sans réajustement du proxy dans le même commit.
3. Si un réajustement est jugé nécessaire ensuite, il donnera lieu à un
   **nouveau pré-enregistrement** (`PROXY-C-002`) et l'essai 001 restera publié.
4. Aucun horodatage n'entre dans le calcul de `C` (invariant 3). Le temps de
   référence n'est lu qu'au moment de comparer, jamais de mesurer.

---

*Pré-enregistrement PROXY-C-001 — figé. Résultats dans un commit ultérieur.*
