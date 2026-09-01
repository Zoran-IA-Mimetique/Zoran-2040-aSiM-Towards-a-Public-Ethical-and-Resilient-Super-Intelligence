# Résultats — Essai TAU-004

**Verdict : PRÉDICTION CONFIRMÉE.** H1, H2 et H3 passent.

`τ_*` n'est pas une constante de conversion universelle. C'est un paramètre du
système mesuré, et il vaut l'inverse de son taux de transformation.

Protocole : [`PRE-ENREGISTREMENT-TAU-004.md`](PRE-ENREGISTREMENT-TAU-004.md).
Données : [`experiments/resultats_004.json`](experiments/resultats_004.json).
Reproduction : `python -m experiments.run_tau_004`.

---

## 1. Résultats

| Test | Mesure | Seuil | |
| --- | --- | --- | --- |
| **H1** `τ_*` ajusté = prédiction analytique | écart relatif max `2.6 · 10⁻¹⁵` | `<= 1e-9` | **PASSE** |
| **H2** `τ_*` non transférable entre taux | `e_rel = 2.935` | `> 0.15` | **PASSE** |
| **H3** dépendance en `1/γ` | dispersion `1.87 %` | `<= 10 %` | **PASSE** |

### `τ_*` en fonction du taux

| `γ` | `τ_*` ajusté | `τ_*` prédit | `γ · τ_*` | `e_rel` avec le `τ_*` de `γ = 0.35` |
| --- | --- | --- | --- | --- |
| 0.05 | 20.1253 | 20.1253 | 1.0063 | 0.852 |
| 0.10 | 10.1255 | 10.1255 | 1.0126 | 0.705 |
| 0.20 | 5.1260 | 5.1260 | 1.0252 | 0.418 |
| 0.35 | 2.9840 | 2.9840 | — | `1.5 · 10⁻¹⁶` |
| 0.80 | 1.3792 | 1.3792 | — | 1.164 |
| 1.60 | 0.7583 | 0.7583 | — | **2.935** |

Un facteur 32 sur `γ` produit un facteur 26.5 sur `τ_*`. Le `τ_*` calibré à
`γ = 0.35` appliqué à `γ = 1.6` se trompe de **293 %**.

## 2. Ce que cela réfute

Le §3 présente `τ_*` comme une « constante de conversion **éventuellement
universelle**, à mesurer ». Cet essai mesure qu'elle n'est pas universelle, et
avec quelle loi elle varie.

Le falsificateur du §7 tiret 3 — « aucun paramètre stable `τ_*` n'est
transférable entre expériences » — **est déclenché**. Pas par bruit de mesure,
pas par un défaut de proxy : par la structure de la loi.

## 3. Le point important : ce n'est pas un défaut du proxy

Il serait tentant de conclure que le rapport de recouvrement est mal choisi et
qu'un meilleur proxy rétablirait l'universalité. **C'est faux, et la
démonstration tient en trois lignes.**

Soit `D` n'importe quelle mesure de transformation continue s'annulant pour la
transformation identité — ce que P1 impose : « à transformation nulle,
`D(C) = 0` ». Pour un système de taux `γ` échantillonné au pas `Δt` :

```text
C(e)  dépend de γΔt
D     ≈ D'(0) · γΔt                    quand γΔt << 1
τ_Z   = τ_* · N · D = τ_* · D'(0) · γ · t
```

Pour que la calibration donne `τ_Z = t`, il faut `τ_* = 1/(D'(0)·γ)`.

**`τ_* ∝ 1/γ` pour toute mesure `D` satisfaisant P1.** Changer de proxy ne
change que la constante `D'(0)`. La dépendance au taux est une propriété de la
forme `dτ_Z = τ_* · D · dN`, pas du choix de `C`.

C'est le résultat de cet essai, et il ne dépend d'aucune simulation.

## 4. Les issues, et celle qui reste

L'essai 003 en listait trois. Avec la mesure, deux se referment.

1. **Normaliser `D` pour évacuer le taux** — *fermée*. Toute normalisation qui
   supprime `γ` du produit `D · N` rend `τ_Z` proportionnel à `N` seul, c'est-à-dire
   au compteur de transformations. `τ_Z` cesserait alors de mesurer quoi que ce
   soit que `N` ne mesure déjà, et le §7 tiret 5 s'applique : « la formule ne
   produit aucune prédiction nouvelle par rapport à une simple redéfinition de
   l'horloge ».
2. **`τ_*` per-système** — *ouverte mais coûteuse*. Le §3 doit alors être
   réécrit, et « éventuellement universelle » retiré. Surtout, une loi dont la
   constante se recalibre à chaque système perd l'essentiel de son pouvoir
   prédictif : elle décrit chaque expérience, elle n'en relie aucune.
3. **Assumer `τ_Z ∝ γ·t`** — *ouverte, et c'est la seule qui gagne quelque
   chose*. Le §4 le dit déjà : le temps propre est « la quantité cumulée de
   transformation que l'objet peut subir tout en restant identifiable ». Un
   objet qui se transforme deux fois plus vite **doit** accumuler deux fois plus
   de temps propre. Ce n'est pas une anomalie, c'est la thèse.

### Ce que coûte l'issue 3

Elle est incompatible avec P5 telle qu'écrite : « sur une horloge physique bien
définie, `τ_Z` doit être monotone avec le temps propre relativiste **et
présenter une relation stable après calibration** ». La relation est stable
*par système*, jamais entre systèmes de taux différents. P5 doit être scindée :

- **P5a — monotonie**, par système. Confirmée par l'essai 003 (T1), conservée.
- **P5b — relation stable entre systèmes**. **Réfutée par cet essai.** À retirer.

`τ_Z` n'est alors pas un temps d'horloge rééchelonné. C'est une grandeur
transformationnelle, sans commune mesure entre objets de taux différents — ce
qui est cohérent avec le §1 (« le compteur `N` n'est pas le temps ») et avec le
refus, au §9, de faire de Z-TEMPS un moteur de plus.

## 5. Recommandation

Retirer P5b et réécrire le §3 : `τ_*` n'est pas universelle, elle est la
constante de temps propre du système. C'est une perte apparente — une constante
universelle en moins — et un gain réel : la loi cesse de promettre ce qu'elle ne
peut pas tenir, et le §10 pourra faire passer « Correspondance relativiste » de
`NON_MESURÉ` à `NON APPLICABLE PAR CONSTRUCTION`, ce qui est une information et
non un aveu.

## 6. Ce que cet essai n'établit pas

- La famille reste synthétique. Mais H1 et H3 portent sur une conséquence
  interne de la loi et du proxy, indépendante de la réalité du système simulé ;
  et la démonstration du §3 ci-dessus n'utilise aucune simulation.
- Rien sur les systèmes dont le taux n'est pas constant. La dérivation suppose
  `γΔt << 1` et un taux stationnaire.
- Le choix entre les issues 2 et 3 appartient aux auteurs. Cet essai ferme la
  première, il ne tranche pas entre les deux autres.

---

*Essai TAU-004 — prédiction confirmée à la précision machine. `τ_*` est un
paramètre de système ; P5b tombe.*
