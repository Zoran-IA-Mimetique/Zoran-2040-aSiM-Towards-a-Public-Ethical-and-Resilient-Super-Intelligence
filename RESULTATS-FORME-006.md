# Résultats — Essai FORME-006

> ⚠ **RÉTRACTÉ EN PARTIE — voir [`RETRACTATION-FORME-006.md`](RETRACTATION-FORME-006.md).**
>
> L'interprétation ci-dessous est fausse. Sur enveloppe uniforme, `τ_Z` se
> réduit à `-ln A(t)` : la « prédiction » pente = `β` est une identité
> algébrique, pas un énoncé sur le monde. F4 et F5 ne testaient rien, les quatre
> échelles étant identiques. Le code et les chiffres sont exacts ; ce qu'on leur
> a fait dire ne l'est pas.

**Verdict : INSTRUMENT VALIDÉ.** Les six critères passent.

~~Le cadre Z-TEMPS dispose désormais d'un énoncé réfutable sans paramètre
libre, testable sur un seul dispositif. C'est le premier.~~ **Faux — voir la
rétractation.**

Protocole : [`PRE-ENREGISTREMENT-FORME-006.md`](PRE-ENREGISTREMENT-FORME-006.md).
Données : [`experiments/resultats_006.json`](experiments/resultats_006.json).
Reproduction : `python -m experiments.run_shape_006`.

---

## 1. Résultats

| Test | Mesure | Seuil | |
| --- | --- | --- | --- |
| **F1-F3** pente de `τ_Z` = `β` | écart max `0.0043` | `<= 0.05` | **PASSE** |
| **F6** `β` ajusté sur l'enveloppe | écart max `~10⁻¹⁵` | `<= 0.05` | **PASSE** |
| **F4** indépendance à `τ_*` | `8.9 · 10⁻¹⁶` | `<= 1e-9` | **PASSE** |
| **F5** indépendance aux poids | `1.3 · 10⁻¹⁵` | `<= 1e-9` | **PASSE** |

### Par enveloppe

| `β` réel | pente de `τ_Z` | `r²` | écart |
| --- | --- | --- | --- |
| 0.5 | 0.5029 | 0.9999999 | 0.0029 |
| 1.0 | **1.0000** | **1.0000000** | **0.0000** |
| 1.5 | 1.4982 | 0.9999999 | 0.0018 |
| 2.0 | 1.9957 | 0.9999999 | 0.0043 |

`r² > 0.99999996` partout : `τ_Z(t)` **est** une loi de puissance, ce n'est pas
une tendance approchée.

## 2. Ce que F4 et F5 établissent

Ce sont les deux critères qui donnent sa valeur à l'essai, et il faut lire ce
qu'ils disent exactement.

**F4** : multiplier `τ_*` par mille laisse la pente inchangée à `8.9 · 10⁻¹⁶`.

**F5** : trois jeux de poids radicalement différents —
`(0.25, 0.25, 0.25, 0.25)`, `(0.7, 0.1, 0.1, 0.1)`, `(0.05, 0.05, 0.4, 0.5)` —
donnent la **même** pente à `1.3 · 10⁻¹⁵`.

Autrement dit : la prédiction ne contient **aucun paramètre que l'on puisse
ajuster pour la faire réussir**. C'est précisément ce qui manquait aux essais
précédents, et c'est ce qui rend celui-ci utilisable comme test.

## 3. Pourquoi cela survit à TAU-004

TAU-004 a établi que `τ_* = 1/(D'(0)·γ)` : toute prédiction sur l'**amplitude**
de `τ_Z` exige une calibration propre au système, et ne peut donc rien réfuter
seule.

La pente log-log est immunisée contre ce résultat, pour une raison élémentaire :
une constante multiplicative se traduit par un décalage vertical en log-log, pas
par une rotation. `τ_*` déplace la droite, il ne la penche pas.

**La forme est ce qui reste de la loi une fois `τ_*` neutralisé.** Et il en reste
quelque chose de non trivial.

## 4. Ce que la loi prédit maintenant, et qui n'est pas une redéfinition d'horloge

Le §7 tiret 5 pose comme falsificateur : « la formule ne produit aucune
prédiction nouvelle par rapport à une simple redéfinition de l'horloge ». Sur un
système à décroissance exponentielle, ce falsificateur **s'applique** :
`τ_Z ∝ t`, et rien n'a été gagné.

Sur une décroissance **non exponentielle**, il ne s'applique plus :

| Enveloppe | Physique typique | `τ_Z(t)` |
| --- | --- | --- |
| `e^{-t/T}` | relaxation énergétique | `∝ t` — rééchelonnement, sans contenu |
| `e^{-(t/T)²}` | déphasage sous bruit en `1/f` | **`∝ t²`** |
| `e^{-(t/T)^0.5}` | relaxation étirée, milieux désordonnés | **`∝ t^0.5`** |

Une redéfinition d'horloge ne peut pas produire un exposant qui suit
l'enveloppe : elle ne connaît pas l'enveloppe. **C'est le premier endroit où
Z-TEMPS dit quelque chose qu'un changement d'unité ne dit pas.**

## 5. La mesure réelle à faire — et pourquoi elle est décisive

Cible déclarée **avant** cet essai, au §5 du pré-enregistrement, pour ne pas être
choisie après coup.

**Un seul processeur supraconducteur, deux canaux :**

| Canal | Mesure | `β` attendu | Prédiction sur `τ_Z` |
| --- | --- | --- | --- |
| `T1` | relaxation énergétique | 1 | pente **1** |
| `T2*` | Ramsey, bruit de flux `1/f` | 2 | pente **2** |

Ce qui rend ce test décisif :

1. **Il est intra-dispositif.** Même puce, même température, même chaîne de
   lecture. Aucune calibration croisée entre systèmes — le résultat de TAU-004
   ne s'y applique pas.
2. **Il est doublement contraint.** La loi ne doit pas seulement produire une loi
   de puissance : elle doit produire **1 sur un canal et 2 sur l'autre**, avec
   les `β` ajustés indépendamment sur les enveloppes. Un accord par hasard
   demanderait deux coïncidences simultanées.
3. **Il n'a aucun degré de liberté.** F4 et F5 le démontrent : rien à régler.

**Falsificateur, énoncé sans échappatoire** : si la pente de `τ_Z` ne suit pas le
`β` ajusté sur l'enveloppe, à `0.05` près, sur données réelles — **la loi
candidate est réfutée sur son seul énoncé sans paramètre libre.** Il ne restera
alors rien à sauver par recalibration.

### Ce dont j'ai besoin pour le faire tourner

Un fichier CSV, deux colonnes, une courbe par fichier :

```text
t,amplitude
0.0,0.998
1.0e-6,0.951
2.0e-6,0.887
...
```

`amplitude` normalisée dans `]0, 1[`. Rien d'autre — pas de métadonnées, pas de
calibration, pas d'incertitudes. Puis :

```bash
python -m experiments.run_shape_006 mesures_T1.csv
python -m experiments.run_shape_006 mesures_T2.csv
```

Le script sort `ACCORD` ou `DESACCORD_LOI_REFUTEE`.

Les séries brutes de la campagne de 1 728 circuits mentionnée dans le
[pilote V1.5](Z-TEMPS-CROSS-DOMAIN-PILOT-V1.5.md) conviendraient telles quelles,
si elles existent encore.

**Si le fichier n'existe pas, il se fabrique.** Une recherche de jeux publics
contenant les *courbes brutes* (et non les seuls `T1`/`T2` ajustés) n'a rien
donné : la littérature publie les temps caractéristiques, presque jamais les
séries. `experiments/acquire_qubit_006.py` mesure donc les deux courbes
directement sur un processeur supraconducteur, via un compte gratuit :

```bash
pip install qiskit qiskit-ibm-runtime
export IBM_QUANTUM_TOKEN="…"
python -m experiments.acquire_qubit_006          # écrit les deux CSV
python -m experiments.run_shape_006 experiments/mesures_T1.csv
python -m experiments.run_shape_006 experiments/mesures_T2.csv
```

### Pourquoi il n'y a pas de mode simulateur

C'est une décision, pas un oubli. Un simulateur alimenté par un modèle de bruit
en `1/f` restituerait l'exposant qu'on y aurait mis : il confirmerait la loi par
construction. Le script n'offre donc **aucun repli** — FORME-006 ne peut être
tranché que par un dispositif physique, et lui offrir une porte de sortie
synthétique reviendrait à saboter le seul test sans paramètre libre dont le
cadre dispose.

Le script n'a pas pu être exécuté ici : aucun jeton n'était disponible. Il
échoue proprement et bruyamment en son absence, plutôt que de basculer sur autre
chose.

## 6. Ce que cet essai n'établit pas

- **Rien du monde.** Les enveloppes sont synthétiques. Cet essai valide un
  instrument, il ne mesure pas un système physique. La distinction est la même
  qu'en [GRANULARITE-002](RESULTATS-GRANULARITE-002.md).
- Rien sur `C` comme grandeur physique : le `NON_MESURÉ` du §10 tient.
- Rien sur P4, dont la forme reste à établir expérimentalement.
- Le télescopage `Σ Δ(t^β) = t^β` suppose que toutes les relations partagent la
  même enveloppe. Un système à plusieurs `β` simultanés donnerait une pente
  intermédiaire, non prédite par cet essai. C'est une limite du protocole, pas
  un résultat.

---

*Essai FORME-006 — instrument validé. Le cadre a maintenant un énoncé qui peut
perdre.*
