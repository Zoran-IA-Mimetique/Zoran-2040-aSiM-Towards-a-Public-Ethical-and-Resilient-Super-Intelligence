# Pré-enregistrement — Essai FORME-006

**Protocole fixé avant l'essai.** Le commit qui introduit ce document ne contient
aucun résultat.

## 1. Pourquoi les essais précédents ne pouvaient pas trancher

Il faut le dire nettement, parce que c'est la raison d'être de celui-ci.

**Sur un système à taux unique, `τ_Z` est un temps d'horloge rééchelonné.** Si
la décroissance relationnelle est exponentielle de taux `γ`, alors `C = e^{-γΔt}`
est constant, `D` est constant par pas, et `τ_Z = τ_* · N · D ∝ t`. La loi ne
prédit alors rien qu'un changement d'unité ne prédise déjà — c'est exactement le
falsificateur du §7 tiret 5.

Et TAU-004 a fermé l'autre porte : toute prédiction portant sur l'**amplitude**
de `τ_Z` passe par `τ_* = 1/(D'(0)·γ)`, donc par une calibration propre au
système. Elle ne peut rien réfuter seule.

Il reste une chose que ni `τ_*` ni les poids `w_s` ne touchent : **la forme.**
Une constante multiplicative ne change pas une pente log-log.

## 2. La prédiction testée

Pour une enveloppe de décroissance `exp(-(t/T)^β)` :

```text
D(e_k)  ≈ ((t_k)^β - (t_{k-1})^β) / T^β
τ_Z(t)  = τ_* Σ D  →  télescopage  →  τ_Z ∝ t^β
```

> **La pente log-log de `τ_Z(t)` doit égaler l'exposant d'étirement `β` de la
> décroissance sous-jacente, ajusté indépendamment sur l'enveloppe.**

Sans `τ_*`. Sans poids. Sans temps de référence externe. Sur un seul système.

C'est le premier énoncé de tout le cadre qui soit réfutable par une seule
expérience, sur un seul dispositif, sans comparaison entre systèmes — donc le
premier que le résultat de TAU-004 n'affaiblit pas.

## 3. Ce que cet essai fait, et ne fait pas

Il **valide l'instrument** sur des enveloppes synthétiques dont `β` est connu.
Il ne mesure aucune donnée physique : cela reste la marche suivante, et elle
demande un jeu de données réel que ce dépôt n'a pas.

La distinction est la même qu'en [GRANULARITE-002](RESULTATS-GRANULARITE-002.md) :
on établit d'abord que l'estimateur retrouve ce qu'il doit retrouver, ensuite
seulement on le pointe vers du réel.

## 4. Critères, fixés d'avance

Enveloppes synthétiques, `T = 3.0`, 200 pas de `Δt = 0.02`, ajustement sur la
moitié finale de la série (déclaré ici, non ajusté après coup).

| Test | Énoncé | Seuil |
| --- | --- | --- |
| **F1** | Décroissance exponentielle (`β = 1`) : pente de `τ_Z` | `\|pente − 1\| <= 0.05` |
| **F2** | Décroissance gaussienne (`β = 2`) : pente de `τ_Z` | `\|pente − 2\| <= 0.05` |
| **F3** | Étirées `β ∈ {0.5, 1.5}` : pente de `τ_Z` | `\|pente − β\| <= 0.05` |
| **F4** | **Indépendance à `τ_*`** : multiplier `τ_*` par 1000 ne change pas la pente | écart `<= 1e-9` |
| **F5** | **Indépendance aux poids** : trois jeux de poids positifs différents donnent la même pente | écart `<= 1e-9` |
| **F6** | L'exposant ajusté sur l'enveloppe seule retrouve `β` | `\|β̂ − β\| <= 0.05` |

F4 et F5 sont le cœur : ils vérifient que la prédiction est bien **sans
paramètre libre**. Si la pente dépendait de `τ_*` ou des poids, l'essai n'aurait
aucune valeur de test et serait publié comme tel.

## 5. Le jeu de données réel visé — déclaré maintenant

Pour que la marche suivante ne soit pas choisie après avoir vu ces résultats, la
cible est fixée ici.

**Processeur supraconducteur, deux canaux dans le même dispositif :**

| Canal | Physique | `β` attendu |
| --- | --- | --- |
| Relaxation énergétique `T1` | décroissance exponentielle | **1** |
| Déphasage Ramsey `T2*` | bruit de flux en `1/f`, enveloppe gaussienne | **2** |

C'est un test **intra-dispositif** : les deux canaux partagent le matériel, la
température, l'électronique de lecture. Aucune calibration croisée entre systèmes
n'intervient, donc le résultat de TAU-004 ne s'y applique pas.

**Falsificateur explicite** : si, sur données réelles, la pente de `τ_Z` ne suit
pas le `β` ajusté indépendamment sur l'enveloppe, à la tolérance déclarée, la loi
candidate est réfutée sur son seul énoncé sans paramètre libre.

Sources publiques accessibles sans coût : les processeurs quantiques accessibles
en ligne fournissent `T1` et `T2` par qubit, et permettent de mesurer les courbes
de décroissance elles-mêmes. La campagne de 1 728 circuits déjà mentionnée dans
le [pilote V1.5](Z-TEMPS-CROSS-DOMAIN-PILOT-V1.5.md) est du même type : si ses
séries temporelles brutes existent, elles suffisent.

**Format attendu** : deux colonnes par canal, `t` et amplitude normalisée dans
`]0, 1[`. Rien d'autre. Le lecteur est dans `experiments/run_shape_006.py`.

## 6. Engagements

1. Aucun seuil, aucune enveloppe, aucune valeur de `tail` ci-dessus ne sera
   modifié après consultation des résultats.
2. Si F4 ou F5 échoue, l'essai est publié comme **sans valeur de test**, et la
   prédiction du §2 est retirée.
3. La cible du §5 est fixée maintenant : elle ne sera pas remplacée par un jeu
   de données choisi pour convenir.

---

*Pré-enregistrement FORME-006 — figé. Résultats dans un commit ultérieur.*
