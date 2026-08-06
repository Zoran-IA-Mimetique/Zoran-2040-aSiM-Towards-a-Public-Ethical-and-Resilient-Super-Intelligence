# Résultats — Essai ROLES-007

> **VERDICT PRÉ-ENREGISTRÉ, INCHANGÉ : `DISSOCIATION_NON_ETABLIE`.**
>
> Correction d'audit. Une version antérieure de ce document affirmait que « la
> dissociation est établie par R2 et R4 ». **C'était une requalification
> rétroactive du verdict, et elle est retirée.** Un essai dont un critère
> pré-enregistré échoue n'est pas un PASS, quelle que soit la qualité de
> l'analyse postérieure.
>
> L'analyse selon laquelle R2 et R4 suffiraient est conservée, mais reclassée :
> **HYPOTHÈSE EXPLORATOIRE issue de ROLES-007**. Pour devenir un résultat, elle
> exige un protocole distinct — ROLES-008 — figé avant exécution.

Protocole : [`PRE-ENREGISTREMENT-ROLES-007.md`](PRE-ENREGISTREMENT-ROLES-007.md).
Données : [`experiments/resultats_007.json`](experiments/resultats_007.json).
Reproduction : `python -m experiments.run_roles_007`.

---

## 1. Le résultat, en trois nombres

| | Interféromètre **fermé** | Avec décohérence |
| --- | --- | --- |
| Phase accumulée `\|Δφ\|` | **0.120000** | **0.120000** |
| Visibilité finale `V` | 1.000 | 0.169 |
| **`τ_Z` final** | **0.000000** | 1.767 |

**Sur l'interféromètre fermé, `τ_Z` vaut exactement zéro pendant que la phase
accumule `Δφ = 0.12`.**

C'est le cas canonique qui motive tout le cadre — deux histoires, deux temps
propres, une différence de phase. La loi y lit **zéro**.

Et la phase est rigoureusement **identique** dans les deux colonnes : écart
`0.0`. La décohérence ne touche pas l'accumulateur. Elle ne touche que la
lisibilité — et c'est elle seule que `τ_Z` mesure.

| Test | Résultat | |
| --- | --- | --- |
| **R1** la phase accumule (fermé) | `0.120` | **PASSE** |
| **R2** `τ_Z` nul (fermé) | `0.0` exact | **PASSE** — décisif |
| **R3** `τ_Z` non nul avec décohérence | `1.767` | **PASSE** |
| **R4** phase insensible à la décohérence | écart `0.0` | **PASSE** |
| **R5** corrélations de rang | `1.0` contre `1.0` | **ÉCHEC** |

### R5 était mal conçu — mon erreur, et elle ne s'annule pas

Les deux corrélations valent exactement `1.0`. C'était inévitable : `τ_Z`,
`−ln V` et `|Δφ|` croissent tous de façon monotone avec `t`, et une corrélation
de rang ne peut pas les distinguer. **R5 ne pouvait pas discriminer, quel que
soit le résultat.**

Constater après coup qu'un critère était mal conçu **ne le retire pas du
protocole**. Le verdict pré-enregistré tient. Ce qui suit est une lecture des
mesures R1-R4, avec le statut d'hypothèse — pas de conclusion.

## 2. Lecture exploratoire — statut d'hypothèse, pas de résultat

Tout ce qui suit est **HYPOTHÈSE EXPLORATOIRE issue de ROLES-007**, à
pré-enregistrer sous ROLES-008 avant de pouvoir être affirmé.

### Réponse candidate à la question posée

> Qu'est-ce qui joue le rôle de la cohérence, de la transformation et de la
> mémoire ?

**La cohérence ne joue pas un rôle. Elle en joue deux, et le formalisme n'en
reconnaît qu'un.**

| | Pendule | Particule à deux branches |
| --- | --- | --- |
| **Accumulateur** *(porte le temps)* | dérive de `X_i` sous `F` | phase `φ_i = ω_i t` |
| **Lisibilité** *(rend le temps mesurable)* | injectivité de `h : X → f` | visibilité `V = \|⟨Ψ_L\|Ψ_R⟩\|` |
| **Transformation** | `F(X_i, E_i)` | générateur d'évolution de branche |
| **Mémoire** | `X_i` encode l'histoire de `F` | `φ_i` encode l'histoire de `Γ_i` |
| **Ce qui se perd** | `f_1 = f_2` alors que `X_1 ≠ X_2` | `V → 0`, `Δφ` irrécupérable |

La correspondance cherchée entre les deux exemples existe, et elle est celle-ci :

> **La cohérence n'est pas ce qui change. C'est ce qui rend le changement
> lisible.**

Dans le pendule, `h` est non injective : deux histoires distinctes se projettent
sur le même rythme. Dans la particule, `V` décroît : deux histoires distinctes
cessent d'être distinguables à la détection. **C'est la même opération** — une
projection qui perd la distinction entre histoires — et c'est *elle*, et non le
changement d'état, qui est l'analogue commun.

Le mécanisme est donc unique. Ce ne sont pas deux exemples juxtaposés.

## 3. Ce que cela dit de la loi

```text
dτ_Z = τ_* · D(C(e)) · dN
```

`D` est une **perte** de cohérence. La loi fait donc du temps une fonction de la
perte de lisibilité. Or la physique le fait accumuler **dans** un canal dont la
cohérence est ce qui le rend **lisible**.

Deux rôles, et la loi n'en assigne qu'un — au mauvais.

C'est cohérent avec ce qu'ont déjà montré les essais précédents, et cela les
explique :

- [TAU-004](RESULTATS-TAU-004.md) : `τ_*` absorbe le taux du système. Normal —
  `τ_Z` mesure une vitesse de perte, pas une durée accumulée.
- [Rétractation 006](RETRACTATION-FORME-006.md) : `τ_Z = −ln A(t)`. Normal —
  c'est exactement l'intégrale de la perte de lisibilité.

**Les trois constats sont le même constat**, vu de trois côtés.

## 4. Proposition — séparer ce que l'interféromètre sépare

Écrite après les résultats et à partir d'eux, **sans autorité** comme
[V1.1](Z-TEMPS-PHYS-V1.1-PROPOSITION.md).

Deux équations couplées au lieu d'une :

```text
dφ    =  ω(X) · dN          accumulateur — le temps propre
dC/C  = −Λ(e) · dN          lisibilité — la cohérence
```

- **`τ_Z ≡ φ`**, pas `Σ(1 − C)`.
- **`C` ne produit pas le temps. Elle décide s'il est mesurable.**

Ce que la reformulation répare, point par point :

| | Loi actuelle | Loi séparée |
| --- | --- | --- |
| Interféromètre fermé | `τ_Z = 0` malgré `Δτ ≠ 0` | `τ_Z = Δφ` ✓ |
| P1 (`D = 0` à transformation nulle) | vérifiée | vérifiée : `ω = 0` pour un objet figé |
| `τ_*` | absorbe `1/γ` | `ω` est la grandeur du système, plus d'ambiguïté |
| §4 « `C = 0` → temps propre indéfini » | le temps *s'arrête* | **le temps devient illisible** |

Ce dernier point mérite d'être lu deux fois. Le §4 dit : « `C = 0` : dissolution
de l'objet ; temps propre ultérieur indéfini pour cet objet ». Sous la loi
séparée, cette phrase devient exacte au sens physique : la décohérence
n'arrête pas l'accumulation de phase, **elle la rend inaccessible à la mesure**.
`Δφ` existe encore ; plus personne ne peut le lire.

`V · |Δφ|` est un **proxy candidat** de la part encore lisible — pas une mesure
de cette part. Écrire qu'il « mesure la part lisible » supposerait résolues trois
choses qui ne le sont pas, et qu'il faut distinguer :

| | |
| --- | --- |
| Perte de lisibilité **locale** | ce que `V` décroissant décrit dans le canal observé |
| **Décohérence** du sous-système | ce qui se passe dans le système lui-même |
| Information **conservée globalement** | ce que l'environnement emporte, et qui n'est pas détruit |

Le chiffre de 83 % vaut pour le proxy `V · |Δφ|` sur ce modèle à deux branches.
**Ce n'est pas un fait physique établi.** `0.020` contre `0.120` est une
propriété du calcul, pas une mesure du monde.

## 5. Ce que Z-TEMPS ajouterait alors — et c'est étroit

La question du §2 de votre note était : que reste-t-il, une fois retirées la
relativité et la mécanique quantique ?

Sous la loi séparée, la réponse est nette : **rien sur `φ`.** L'accumulateur est
déjà donné par la relativité (`Δτ`) et la mécanique quantique (`Δφ = ω_0 Δτ`).
Z-TEMPS n'a rien à y ajouter et ne doit pas prétendre le contraire.

Ce qui resterait propre au cadre est **`Λ`** — la loi de perte de lisibilité, et
sa structure multi-échelle. C'est un périmètre beaucoup plus étroit que « une
loi du temps », et beaucoup plus défendable.

Mais il faut le dire complètement : **`Λ` reste inajustable tant que les poids
`w_s` ne sont pas fixés indépendamment**, ce qu'a établi la rétractation 006.
La reformulation déplace le problème sur le bon objet ; elle ne le résout pas.

## 6. Ce que cet essai n'établit pas

- **Rien du monde.** Le modèle à deux branches est analytique, `ω_L` et `ω_R`
  sont posés. R1-R4 portent sur une conséquence interne du formalisme.
- **Ni le pendule ni la particule ne prouvent Z-TEMPS.** Le premier illustre
  qu'une projection non injective perd de l'information — sa définition. Le
  second est de la physique établie, vérifiée en interférométrie atomique.
- Rien sur la conscience ni sur l'interprétation de la mécanique quantique.
- La jauge `S` reste `NON_CALCULABLE`, et pour la même raison qu'au §5 : ses
  proxies ne sont pas définis.

---

*Essai ROLES-007 — la dissociation est exacte. La cohérence n'est pas ce qui
change, c'est ce qui rend le changement lisible.*
