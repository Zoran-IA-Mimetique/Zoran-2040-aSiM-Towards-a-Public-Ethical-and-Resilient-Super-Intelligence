# Z-TEMPS-PHYS-V1.1 — proposition de révision

**Statut : proposition de l'implémentation. Sans autorité tant qu'elle n'est pas
adoptée par les auteurs.**

[V1](Z-TEMPS-PHYS-V1.md) reste publiée et inchangée. Ce document ne la remplace
pas : il propose les modifications que les quatre essais rendent nécessaires, et
**chaque modification cite l'essai qui l'impose**. Une révision qu'on ne peut pas
tracer à une mesure n'a rien à faire ici.

## Table des modifications

| § de V1 | Modification | Imposée par |
| --- | --- | --- |
| §2 | Contrainte de forme sur les proxies admissibles | [001](RESULTATS-PROXY-C-001.md) F1 |
| §2 / §4 | Dissolution rattachée à l'échelle `OBJET` | [001](RESULTATS-PROXY-C-001.md) F2 |
| §3 | `τ_*` cesse d'être « éventuellement universelle » | [004](RESULTATS-TAU-004.md) |
| §5 | Nouvel invariant 7 : granularité déclarée | [002](RESULTATS-GRANULARITE-002.md) |
| §6 | P5 scindée en P5a et P5b, **P5b retirée** | [004](RESULTATS-TAU-004.md) |
| §7 | Tiret 3 requalifié ; nouveau falsificateur | [004](RESULTATS-TAU-004.md), [002](RESULTATS-GRANULARITE-002.md) |
| §10 | Verdict mis à jour | tous |

---

## §2 révisé — objet et profil de cohérence

*Inchangé, plus une contrainte de forme.*

Le profil `C(e) = [C_local, C_objet, C_cadre, C_global]` et les conditions de
domaine restent ceux de V1. S'y ajoute :

> **Forme admissible d'un proxy.** Un proxy de `C` est admissible s'il vérifie,
> outre les invariants du §5 :
>
> 1. **continuité en magnitude** — `C_s` doit dépendre de l'amplitude des
>    relations, pas seulement d'un décompte à seuil. Un proxy à seuil absolu
>    déclare « conservées » les relations d'un objet dont l'amplitude a décru
>    sous ce seuil, et mesure donc un objet éteint comme parfaitement cohérent ;
> 2. **dissolution par extinction** — si toutes les relations d'une échelle
>    tendent vers zéro, `C_s` doit tendre vers 0, jamais vers 1.
>
> Ces deux conditions ne sont pas des recommandations de mise en œuvre : un
> proxy qui les viole produit un `τ_Z` qui s'arrête pendant que l'objet se
> dégrade, ce qui contredit le §4.

*Motif : essai 001, constat F1 — le proxy à seuil `θ = 0.05` mesurait `C = 1`
sur un système entièrement décohéré.*

## §4 révisé — dissolution

*Une phrase de V1 est remplacée.*

V1 disait : « `C = 0` : dissolution de l'objet ; temps propre ultérieur indéfini
pour cet objet », sans dire à quelle échelle. Le §2 disait « à l'échelle `s` ».
Les deux formulations ne coïncidaient pas.

> **L'échelle porteuse de l'identité doit être déclarée avec l'objet.** Par
> défaut c'est `OBJET`.
>
> - `C` nulle à l'échelle porteuse → l'objet est dissous, `τ_Z` ultérieur
>   indéfini.
> - `C` nulle à une autre échelle → cette échelle contribue sa perte maximale
>   à `D` et l'intégration se poursuit.
>
> Faire dissoudre l'objet par la perte d'une sous-structure (`LOCAL`) ou d'un
> contexte (`CADRE`, `GLOBAL`) confond les niveaux que le §1 sépare. Cela rend
> en outre la dissolution sensible à la cardinalité de l'échelle : une échelle à
> cinq relations atteint zéro bien plus facilement qu'une à quinze, ce qui
> réintroduit une dépendance au découpage — le falsificateur du §7 tiret 1 par
> une porte dérobée.

*Motif : essai 001, constat F2 — `C_LOCAL = 0` arrêtait l'intégration alors que
`C_OBJET` valait encore 0.467.*

## §3 révisé — la loi candidate

*La forme est inchangée. Le statut de `τ_*` change.*

```text
dτ_Z = τ_* · D(C(e)) · dN
```

V1 : « `τ_*` : constante de conversion **éventuellement universelle**, à
mesurer. »

> **V1.1 : `τ_*` est la constante de temps propre du système mesuré. Elle n'est
> pas universelle, et sa non-universalité est démontrable, pas conjecturale.**
>
> Pour toute mesure `D` continue s'annulant à la transformation identité — ce
> que P1 impose — et pour un système de taux de transformation `γ` échantillonné
> au pas `Δt` :
>
> ```text
> D    ≈ D'(0) · γΔt          quand γΔt << 1
> τ_Z  = τ_* · N · D = τ_* · D'(0) · γ · t
> τ_*  = 1 / (D'(0) · γ)      pour que la calibration donne τ_Z = t
> ```
>
> Changer de proxy ne modifie que `D'(0)`. **La dépendance au taux est une
> propriété de la forme de la loi, pas du choix de `C`.**
>
> Toute campagne doit donc publier `τ_*` avec le système auquel il se rapporte.
> Un `τ_*` sans système déclaré n'est pas une mesure.

*Motif : essai 004 — prédiction retrouvée à `2.6·10⁻¹⁵` sur six taux, `γ·τ_*`
constant à 1.9 %, transfert de `γ = 0.35` vers `γ = 1.6` faux de 293 %.*

### Ce qui a été écarté

**Normaliser `D` pour évacuer le taux.** Toute normalisation de ce genre rend
`τ_Z` proportionnel à `N` seul. `τ_Z` cesserait alors de mesurer ce que `N` ne
mesure pas déjà, et le §7 tiret 5 s'appliquerait : « la formule ne produit aucune
prédiction nouvelle par rapport à une simple redéfinition de l'horloge ». Cette
issue est fermée.

## §5 révisé — invariants obligatoires

Les six invariants de V1 sont conservés sans modification. Un septième s'ajoute.

> **7. Granularité déclarée.** Toute grandeur cumulée sur une trajectoire — au
> premier chef `τ_Z` lui-même — doit être publiée avec :
>
> ```text
> V(k)   la valeur à une granularité d'agrégation k DÉCLARÉE
> p      l'exposant d'agrégation, mesuré sur au moins trois granularités
> net    la variation nette entre états extrêmes
> ```
>
> `p` est le diagnostic : proche de 0, la grandeur est robuste ; proche de 1.5,
> elle mesure la fréquence d'acquisition et non la transformation. La variation
> totale d'une trajectoire bruitée diverge quand le pas d'échantillonnage tend
> vers zéro : une valeur cumulée sans granularité déclarée n'est comparable à
> rien, pas même à elle-même d'une campagne à l'autre.

*Motif : essai 002 — sur les trois nombres publiés du pilote multi-domaine,
`p = 1.589` et la part de bruit est d'au moins 98.8 %.*

## §6 révisé — prédictions falsifiables

P1, P2, P3, P4 inchangées. **P5 est scindée.**

> **P5a — monotonie par système.** Sur une horloge physique bien définie, `τ_Z`
> doit être monotone avec le temps propre relativiste de *ce* système.
> *Statut : confirmée sur systèmes synthétiques (essai 003, T1). Non mesurée sur
> système physique.*
>
> **P5b — relation stable entre systèmes.** ~~Après calibration, `τ_Z` doit
> présenter une relation stable avec le temps propre relativiste,
> transférable d'un système à l'autre.~~
> **RETIRÉE. Réfutée par l'essai 004.**

### Pourquoi retirer plutôt que corriger

Parce que le §4 dit déjà l'inverse de ce que P5b demandait. Si le temps propre
est « la quantité cumulée de transformation que l'objet peut subir tout en
restant identifiable », alors un objet qui se transforme deux fois plus vite
**doit** accumuler deux fois plus de temps propre dans le même temps de
laboratoire. Ce n'est pas une anomalie à corriger, c'est la thèse.

`τ_Z` n'est pas un temps d'horloge rééchelonné. C'est une grandeur
transformationnelle, sans commune mesure entre objets de taux différents — ce
qui est cohérent avec le §1 (« le compteur `N` n'est pas le temps ») et avec le
refus, au §9, de faire de Z-TEMPS un moteur de plus.

Retirer P5b est une perte apparente et un gain réel : la loi cesse de promettre
ce qu'elle ne peut pas tenir.

## §7 révisé — falsificateurs prioritaires

Les falsificateurs de V1 sont conservés, avec deux amendements.

> **Tiret 3, requalifié.** « Aucun paramètre stable `τ_*` n'est transférable
> entre expériences » n'est plus un falsificateur : c'est une **propriété
> établie** de la loi (§3 révisé). Il est remplacé par :
>
> > *`γ · τ_*` n'est pas constant à taux variable, pour un même système et un
> > même proxy.*
>
> **Nouveau tiret.** *Une grandeur cumulée publiée sans granularité déclarée, ou
> dont l'exposant d'agrégation `p` est proche de 1.5, ne mesure pas la
> transformation de l'objet.*

## §10 révisé — verdict actuel

```text
Cadre conceptuel                    PASS
Définition sans temps primitif      PASS provisoire
Profil multi-échelle                FORMALISÉ           (essais 001, 003)
Contrainte de forme sur les proxies ÉTABLIE             (essai 001)
Mesure physique universelle C       NON_MESURÉ
Loi dτ_Z                            CANDIDATE
τ_* universelle                     RÉFUTÉE             (essai 004)
Correspondance relativiste P5a      NON_MESURÉ
Correspondance relativiste P5b      RÉFUTÉE             (essai 004)
Prédiction nouvelle                 À établir
Statut de loi physique              NON ACQUIS
```

Trois lignes ont changé de statut, et deux d'entre elles ont **empiré**. C'est
la forme normale d'un programme qui avance : une spécification dont aucune ligne
ne se dégrade jamais n'est pas testée.

## Ce que la prochaine étape reste

Inchangée depuis V1 §10, et rien dans ces quatre essais ne l'a entamée :
**construire le premier proxy physique de `C`**, sur la famille 1 du §8 — une
horloge physique de référence. Tout ce qui précède a été fait sur des systèmes
synthétiques ou par voie analytique. Aucune ligne de ce dépôt ne mesure le monde.

---

*Z-TEMPS-PHYS-V1.1 — proposition, sans autorité. V1 reste la spécification en
vigueur tant que celle-ci n'est pas adoptée.*
