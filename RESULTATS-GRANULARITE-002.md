# Résultats — Essai GRANULARITE-002

**Estimateur validé.** G1, G2 et G3 passent, donc G4 est interprétable.

Protocole : [`PRE-ENREGISTREMENT-GRANULARITE-002.md`](PRE-ENREGISTREMENT-GRANULARITE-002.md),
figé avant exécution. Données brutes : [`experiments/resultats_002.json`](experiments/resultats_002.json).
Reproduction : `python -m experiments.run_granularity_002`.

---

## 1. Validation de l'estimateur

| Test | Mesure | Attendu | Verdict |
| --- | --- | --- | --- |
| **G1** signal lisse monotone | `p = 0.002` | `<= 0.15` | **PASSE** |
| **G2** bruit stationnaire pur | `p = 1.509` | `[1.35 ; 1.65]` | **PASSE** |
| **G3** mélange de composition connue | écart `0.0005` sur la fraction de bruit | `<= 0.10` | **PASSE** |

G3 mérite d'être lu deux fois : sur un mélange dont la composition est connue,
l'estimateur retrouve une fraction de bruit de **0.9962** contre **0.9957**
vraie. L'écart est de 0.05 %. L'instrument fait ce qu'on lui demande.

## 2. G4 — application aux trois nombres du pilote

Entrées, telles que publiées dans le
[pilote V1.5](Z-TEMPS-CROSS-DOMAIN-PILOT-V1.5.md) : `V(1) = 28.717`,
`V(16) = 0.695`, `net = 0.349`.

| Grandeur inférée | Valeur |
| --- | --- |
| Exposant d'agrégation `p` | **1.589** |
| Part attribuable à la transformation | 0.349 |
| Part attribuable à l'échantillonnage, à la granularité fine | 28.368 |
| **Fraction de bruit (minorant)** | **98.78 %** |

### Ce que l'exposant dit

`p = 1.589`. Le pré-enregistrement fixait deux repères : `p ≈ 0` pour une
grandeur robuste à la granularité, `p ≈ 1.5` pour un bruit stationnaire additif.

**1.589 est à côté de 1.5 et à 1.6 unité de 0.** La variation cumulée brute de
l'oscillateur se comporte comme du bruit stationnaire échantillonné, pas comme
une grandeur physique.

Rappel exigé par l'engagement 3 : 98.78 % est un **minorant**, obtenu sous
l'hypothèse la plus favorable au signal (`S = net`, signal monotone). Si le
signal réel n'est pas monotone, sa variation propre est plus grande — mais alors
`p` s'éloigne encore de 1.5, ce qui déplace le problème sans le résoudre.

## 3. Conséquence sur le pilote

Le pilote écrit :

> « La trajectoire contient donc beaucoup plus d'information transformationnelle
> que ses seuls états initial et final. »

**La conclusion tient. Le nombre qui la soutient, non.**

| Lecture | Rapport trajectoire / états extrêmes |
| --- | --- |
| Avec la variation brute `28.717 / 0.349` | ×82 |
| Avec la variation à blocs de 16 `0.695 / 0.349` | **×2.0** |

L'écart entre les deux lectures est d'un facteur 41, et c'est l'ordre de
grandeur du bruit, pas celui du phénomène. La trajectoire contient bien plus
d'information que ses extrémités — **environ le double**, pas quatre-vingts
fois.

Ce n'est pas une correction de détail. Un facteur 41 sur la grandeur centrale
d'un pilote change ce que le pilote démontre.

## 4. Ce qui n'est pas remis en cause

- **Le verdict `PASS multi-domaine pour la calculabilité et la structure
  qualitative` tient.** Rien ici ne le conteste : la variation cumulée est
  calculable dans les deux domaines, avec une structure de calcul commune.
- **Le `NON MESURÉ` pour l'universalité de la métrique tient**, et cet essai le
  renforce plutôt qu'il ne l'affaiblit.
- **La positivité et la sensibilité à la transformation** ne sont pas affectées.

## 5. Ce qui doit être révisé

### 5.1 « Dépendance au chemin » n'est pas un invariant tant que `p` n'est pas publié

Le pilote liste la dépendance au chemin parmi les invariants communs observés.
Une dépendance au chemin qui décroît en `k^-1.5` sous agrégation **est une
dépendance à l'échantillonnage**, pas au chemin. Les deux sont indiscernables
sur un seul nombre. Elles se distinguent par `p`, et par lui seul.

### 5.2 Traitement du bruit inégal entre les deux domaines

Le qubit reçoit une correction par variance binomiale — **10.9 % sous la mesure
brute**, et c'est de la bonne pratique. L'oscillateur est rapporté brut, alors
que la part d'artefact y est de **98.8 %**.

Les deux domaines ne sont donc pas traités de la même façon, ce qui affaiblit
précisément ce que le pilote revendique : « une architecture de calcul commune ».
La correction appliquée au qubit doit être étendue à l'oscillateur, où elle pèse
neuf fois plus lourd.

### 5.3 Aucune variation cumulée ne devrait être publiée seule

Recommandation concrète, applicable dès la prochaine version du pilote — trois
nombres au lieu d'un :

```text
V(k)   variation cumulée à une granularité k DÉCLARÉE
p      exposant d'agrégation, mesuré sur au moins trois granularités
net    variation nette début-fin
```

`p` est le diagnostic : proche de 0, `V(k)` est une grandeur ; proche de 1.5,
c'est une mesure de la fréquence d'acquisition. Une variation cumulée sans
granularité déclarée n'est comparable à rien — ni à l'autre domaine, ni à
elle-même d'une campagne à l'autre.

## 6. Lien avec Z-TEMPS-PHYS-V1

Le §7 pose comme premier falsificateur : « `τ_Z` dépend du choix de
représentation plutôt que des relations physiques ». Le pas d'échantillonnage
est un choix de représentation. À `p = 1.589`, la variation cumulée brute en
dépend presque entièrement.

**Publiée telle quelle, elle déclenche le falsificateur.** Publiée à granularité
déclarée avec son exposant, elle ne le déclenche pas. La différence entre les
deux situations tient à trois nombres au lieu d'un, et c'est tout ce que cet
essai demande.

## 7. Ce que cet essai n'établit pas

- Il ne réanalyse pas les données du pilote : elles ne sont pas dans ce dépôt.
  G4 opère sur trois nombres agrégés publiés, sous un modèle déclaré. C'est une
  inférence, pas une mesure.
- Il ne dit rien du qubit, dont les figures (0.224 à `θ=2.0`, 3.565 à `θ=0.4`)
  n'ont pas été fournies à plusieurs granularités.
- Il ne dit rien de la jauge normative `S = (β·ΔΦ)/(1+T+σ)`, que le pilote
  déclare non calculable et que nous n'avons pas tenté de calculer.

---

*Essai GRANULARITE-002 — estimateur validé, application au pilote publiée telle quelle.*
