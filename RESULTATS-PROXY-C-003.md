# Résultats — Essai PROXY-C-003

**Verdict : ÉCHEC sur T3.** Quatre critères sur cinq passent, contre deux sur
cinq en [PROXY-C-001](RESULTATS-PROXY-C-001.md).

Protocole : [`PRE-ENREGISTREMENT-PROXY-C-003.md`](PRE-ENREGISTREMENT-PROXY-C-003.md).
Décisions appliquées : [`DECISIONS-SPEC-001.md`](DECISIONS-SPEC-001.md).
Données : [`experiments/resultats_003.json`](experiments/resultats_003.json).
Reproduction : `python -m experiments.run_transfer_003`.

---

## 1. Comparaison 001 → 003

Mêmes familles, graines, poids, critères et seuils. Seules D1 et D2 changent.

| Test | 001 | 003 | |
| --- | --- | --- | --- |
| T1 monotonie de `τ_Z` | non monotone | **monotone dans les trois familles** | ÉCHEC → **PASSE** |
| T2 transfert intra-famille | `0.430` | `1.7 · 10⁻¹⁶` | ÉCHEC → **PASSE** |
| T3 transfert inter-familles | `1.000` | `0.727` | ÉCHEC → **ÉCHEC** |
| T4 invariance de représentation | `0.0` | `2.2 · 10⁻¹⁶` | PASSE → PASSE |
| T5 conservation des cadres | exact | exact | PASSE → PASSE |

`τ_* = 2.9840`. Plus aucune dissolution : les trois familles intègrent leurs 24
pas, là où deux d'entre elles s'arrêtaient au pas 1 sous la règle de 001.

**D1 et D2 font ce qu'elles annonçaient.** La saturation a disparu, la
dissolution prématurée aussi.

## 2. T2 à 10⁻¹⁶ : pourquoi ce chiffre ne vaut presque rien

Le résultat qui a l'air le plus spectaculaire est le moins informatif, et il
serait malhonnête de le laisser passer pour une réussite.

Sur la famille décohérence, `C_OBJET` vaut **0.916218871651 à chaque pas et pour
chaque graine**, soit exactement `exp(-γ·Δt)`. La raison est structurelle : le
rapport de recouvrement est **invariant d'échelle**, et la graine ne change que
les amplitudes initiales `ρ⁰_ij`. Elles se simplifient intégralement entre
numérateur et dénominateur.

Autrement dit, **les deux jeux « indépendants » de la famille décohérence sont
le même jeu** du point de vue du proxy. T2 ne mesure pas un transfert : il
vérifie que le proxy ne dépend pas d'un paramètre dont il est analytiquement
indépendant. Le `10⁻¹⁶` est de l'arithmétique flottante, pas une preuve.

**C'est un défaut du protocole de 001, hérité tel quel par 003**, et il n'avait
pas été vu à la rédaction. Un test intra-famille digne de ce nom doit faire
varier `γ`, pas la graine. Il est inscrit en tête de l'essai 004.

## 3. T3 échoue encore — `e_rel = 0.727`

Rappel de la faiblesse redéclarée avant l'essai : la famille mémoire n'a pas de
temps propre indépendant, son « temps de référence » est une convention. L'échec
est donc **imputable au protocole autant qu'au proxy**, comme annoncé.

Profils de la famille mémoire, qui montrent que le proxy y fonctionne :
`C_OBJET` va de 0.881 au pas 1 à 0.927 au pas 24, sans dissolution, avec une
variation lente et régulière. Rien d'aberrant. C'est la **conversion** entre les
deux familles qui échoue, pas la mesure dans chacune.

## 4. Le vrai résultat de cet essai : `τ_*` ne peut pas être universel

Cette section n'est pas un critère pré-enregistré. C'est une conséquence
analytique de ce que 003 a mesuré, et elle pèse plus lourd que T3.

Sous décroissance exponentielle de taux `γ` et de pas `Δt`, le proxy donne :

```text
C_s = e^(-γΔt)                       (constant, mesuré : 0.916218871651)
D   = Σ_s w_s (1 - C_s) = 1 - e^(-γΔt)
τ_Z = τ_* · N · (1 - e^(-γΔt))
t   = N · Δt
```

d'où, pour que la calibration donne `τ_Z = t` :

```text
τ_* = Δt / (1 - e^(-γΔt))  ≈  1/γ   quand γΔt << 1
```

**`τ_*` absorbe l'inverse du taux de décohérence du système calibré.** Deux
systèmes de taux différents exigeront donc deux `τ_*` différents, dans un
rapport `γ₂/γ₁`. Le falsificateur du §7 tiret 3 — « aucun paramètre stable `τ_*`
n'est transférable entre expériences » — **est déclenché par construction**, et
pas par accident de mesure.

Deux lectures possibles, et le choix appartient aux auteurs :

- **`τ_*` est per-système.** Alors ce n'est pas une constante de conversion
  « éventuellement universelle » comme le dit le §3, mais un paramètre de
  système, et le §3 doit être réécrit.
- **`τ_*` est universel.** Alors `D` doit être normalisé de façon à évacuer le
  taux — par exemple en rapportant la perte cohérentielle à une perte de
  référence propre au système. Mais toute normalisation de ce genre risque de
  rendre `τ_Z` proportionnel à `N` seul, c'est-à-dire de le vider de son contenu.

Il y a un troisième chemin, et c'est peut-être le bon : **assumer que
`τ_Z ∝ γ·t` est le contenu de la théorie et non un défaut.** Le §4 dit que le
temps propre est « la quantité cumulée de transformation que l'objet peut subir
tout en restant identifiable » ; un objet qui se transforme deux fois plus vite
accumule alors deux fois plus de temps propre dans le même temps de laboratoire.
C'est cohérent — mais c'est incompatible avec P5, qui demande une relation
stable avec le temps propre relativiste. **P5 et le §4 se contredisent**, et
l'essai 003 rend cette contradiction visible.

## 5. Ce que cet essai n'établit pas

- Les systèmes restent synthétiques. Un succès ne dirait rien du monde.
- T2 ne teste pas ce qu'il prétend tester (§2 ci-dessus).
- La famille 1 du §8 — horloge physique de référence — reste absente.
- P4 n'est toujours pas testée et ne doit pas l'être avant que sa forme soit
  établie expérimentalement.

## 6. Suite — essai 004

1. **Test intra-famille réel** : faire varier `γ`, pas la graine. C'est le test
   que T2 aurait dû être.
2. **Tester directement la conclusion du §4** : calibrer `τ_*` à `γ₁` et
   l'évaluer à `γ₂`, avec la prédiction quantitative `τ_*(γ) ∝ 1/γ`. Si elle se
   vérifie, `τ_*` est un paramètre de système et le §3 doit être réécrit.
3. **Trancher P5 contre §4** — mais c'est une décision de spécification, pas un
   essai, et elle vient après le résultat de 004.

---

*Essai PROXY-C-003 — quatre critères sur cinq, et une contradiction interne mise
au jour dans la spécification.*
