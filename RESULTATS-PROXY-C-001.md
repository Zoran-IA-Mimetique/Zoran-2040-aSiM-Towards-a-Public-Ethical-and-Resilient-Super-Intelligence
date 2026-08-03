# Résultats — Essai PROXY-C-001

**Verdict : ÉCHEC.** Trois critères sur cinq ne passent pas.

Protocole : [`PRE-ENREGISTREMENT-PROXY-C-001.md`](PRE-ENREGISTREMENT-PROXY-C-001.md),
figé avant exécution. Données brutes : [`experiments/resultats_001.json`](experiments/resultats_001.json).
Reproduction : `python -m experiments.run_transfer_001`.

Aucun seuil, aucune graine, aucun paramètre du pré-enregistrement n'a été
modifié après consultation des résultats. Deux corrections d'instrument ont été
faites et sont déclarées en §4 ci-dessous.

---

## 1. Résultats

| Test | Mesure | Seuil | Verdict |
| --- | --- | --- | --- |
| **T1** monotonie de `τ_Z` | non monotone dans les deux familles | strict | **ÉCHEC** |
| **T2** transfert intra-famille | `e_rel = 0.430` | ≤ 0.15 | **ÉCHEC** |
| **T3** transfert inter-familles | `e_rel = 1.000` | ≤ 0.30 | **ÉCHEC** |
| **T4** invariance de représentation | écart `0.0` (exact) | ≤ 1e-9 | **PASSE** |
| **T5** conservation des cadres | 4 échelles, aucun poids nul | exact | **PASSE** |

`τ_*` estimé sur la famille de calibration : **0.9711**.

## 2. Trois constats, par ordre de gravité

### F1 — Le proxy sature : un système entièrement décohéré est mesuré « parfaitement cohérent »

Famille décohérence, profils par pas :

| Pas | `C_LOCAL` | `C_OBJET` | `C_CADRE` | `C_GLOBAL` |
| --- | --- | --- | --- | --- |
| 1 | 0.200 | 0.200 | 0.200 | 0.200 |
| 3 | 0.200 | 0.267 | 0.267 | 0.267 |
| 12 | **1.000** | **1.000** | **1.000** | **1.000** |
| 24 | **1.000** | **1.000** | **1.000** | **1.000** |

À partir du pas ~12, `C = 1` partout, donc `D = 0`, donc `dτ_Z = 0` : **le temps
propre de l'objet s'arrête alors que l'objet continue de se dégrader.** C'est
l'inverse de ce que la loi veut dire.

La cause est mécanique. Le proxy lit la variation d'une configuration à la
suivante. Quand les cohérences `|ρ_ij|` ont décru vers zéro, l'écart pas-à-pas
`ρ_0(q^{k-1} - q^k)` passe sous la tolérance θ : chaque relation est déclarée
« conservée » — au sens strict, elle l'est, puisqu'elle ne bouge presque plus.
Un objet mort est parfaitement stable.

**Ce constat n'est pas un défaut d'implémentation. C'est une ambiguïté du §2**,
et c'est la question principale que cet essai renvoie à la spécification :

> « la proportion de relations **conservées** et compatibles à l'échelle
> considérée » — conservées *par rapport à quoi* ?
>
> - **Lecture A, incrémentale** (celle qui a été implémentée) : par rapport à la
>   configuration précédente. C'est ce que suggère « pour une transformation
>   `e` », et c'est ce qui donne le résultat absurde ci-dessus.
> - **Lecture B, référentielle** : par rapport à une configuration de référence
>   de l'objet. `C` mesurerait alors la persistance de l'identité depuis
>   l'origine, décroîtrait de façon monotone, et la saturation disparaîtrait.
>
> Mais la lecture B casse la forme même de la loi : `dτ_Z = τ_* · D(C(e)) · dN`
> est écrite comme une différentielle, donc sur une grandeur locale à la
> transformation. Avec la lecture B, `D` n'est plus une propriété de `e` mais de
> l'histoire complète, et l'intégration `Σ D(C(e))` compte plusieurs fois la
> même perte.
>
> **Aucune des deux lectures ne fonctionne telle quelle.** C'est un point à
> trancher dans la spécification, pas dans le code.

### F2 — Une échelle à faible cardinalité dissout l'objet entier

Famille mémoire, pas 1 : `C_LOCAL = 0.000` tandis que `C_OBJET = 0.467`.
L'échelle LOCAL ne contient que 5 relations (les paires adjacentes de la
chaîne) ; il suffit que ces 5 soient perdues au même pas pour que l'objet soit
déclaré dissous — alors que près de la moitié de ses relations internes tiennent
encore, et qu'aux pas 2 et 3 `C_LOCAL` remonte à 0.800 puis 0.200.

Conséquence sur l'essai : la famille mémoire s'arrête au pas 1, `τ_Z = 0`, d'où
`e_rel = 1.000` exactement en T3.

**Deux questions au §4**, que la spécification ne tranche pas :

1. `C_s = 0` à *une* échelle doit-il rendre `τ_Z` indéfini pour l'objet entier,
   ou seulement à cette échelle ? Le §2 dit « l'identité de l'objet cesse d'être
   définie **à l'échelle s** » ; le §4 dit « dissolution de l'objet ». Les deux
   phrases ne disent pas la même chose, et l'implémentation a dû choisir.
2. La dissolution doit-elle être robuste à la cardinalité de l'échelle ? Une
   échelle à 5 relations atteint 0 par accident statistique bien plus souvent
   qu'une échelle à 15. En l'état, la dissolution dépend de la finesse du
   découpage — ce qui ressemble à une dépendance au choix de représentation,
   c'est-à-dire au falsificateur du §7, tiret 1, par une porte dérobée.

### F3 — `τ_*` ne transfère pas

`e_rel = 0.430` dès l'intra-famille, `1.000` en inter-familles. Le falsificateur
du §7 tiret 3 — « aucun paramètre stable `τ_*` n'est transférable entre
expériences » — est **déclenché**.

Nuance importante : F3 est très probablement une conséquence de F1 et F2, pas un
résultat indépendant. Un proxy qui sature et qui dissout à tort ne peut pas
produire de constante transférable. F3 ne condamne donc pas la loi candidate ; il
condamne ce proxy-ci.

## 3. Ce qui tient

**T4 passe avec un écart exactement nul.** Sous le groupe de symétries déclaré de
l'objet — {identité, retournement de la chaîne} — le profil `C` est rigoureusement
invariant. Le falsificateur du §7 tiret 1 (« `τ_Z` dépend du choix de
représentation ») **ne s'applique pas à ce proxy**, et c'est un résultat réel :
l'alignement par maximum sur le groupe déclaré, prescrit au §2, fait ce qu'on
attend de lui.

C'est la seule bonne nouvelle de l'essai, et elle est solide.

## 4. Corrections d'instrument, déclarées

Deux modifications ont été faites après la première exécution. Ni l'une ni
l'autre ne touche à un paramètre, un seuil ou une graine du pré-enregistrement.

1. **`fit_tau_star` renvoie `None` au lieu de lever une exception** quand
   `Σ S² = 0`. Un instrument qui ne mesure rien doit l'enregistrer, pas
   s'interrompre. Un critère non mesurable est compté comme **non passé** —
   l'absence de mesure n'est pas un succès.
2. **T4 appliquait une rotation cyclique**, qui n'est pas un automorphisme d'une
   chaîne (elle l'est d'un anneau). Le test exigeait donc une invariance que la
   spécification n'a jamais demandée, et échouait avec un écart de 0.2. Corrigé
   par l'application du retournement, membre effectif du groupe déclaré, et par
   la déclaration explicite du groupe dans `ztemps.systems.path_symmetries`.
   **C'était une erreur de ma part dans l'instrument, pas un constat sur le proxy.**

## 5. Ce que cet essai n'établit pas

- Rien sur la loi candidate `dτ_Z = τ_* · D(C(e)) · dN`. Les systèmes sont
  synthétiques ; leur dynamique est posée par nous. Un échec ici réfute le proxy,
  pas la loi.
- Rien sur la famille 1 du §8 — horloge physique de référence — qui reste absente.
- Rien sur P4 : aucune loi de survie n'a été testée, ni ne doit l'être avant que
  sa forme soit établie expérimentalement.

## 6. Suite

Conformément à l'engagement 3 du pré-enregistrement, **le proxy n'est pas
réajusté dans ce commit** et l'essai 001 reste publié tel quel.

Un essai 002 suppose d'abord une décision de spécification, pas de code :

1. **Trancher F1** — par rapport à quoi `C` mesure-t-elle la conservation ? Si
   ni A ni B ne convient, la forme différentielle de la loi est peut-être à
   revoir, ce qui dépasse le mandat d'une implémentation.
2. **Trancher F2** — dissolution par échelle ou dissolution globale, et
   robustesse à la cardinalité.
3. Alors seulement : `PRE-ENREGISTREMENT-PROXY-C-002.md`, avec un proxy révisé
   et les mêmes exigences de séparation calibration / évaluation.

Les deux premières questions appartiennent aux auteurs de Z-TEMPS-PHYS-V1.

---

*Essai PROXY-C-001 — publié comme échec, conformément au protocole.*
