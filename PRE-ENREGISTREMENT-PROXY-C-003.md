# Pré-enregistrement — Essai PROXY-C-003

**Protocole fixé avant l'essai.** Le commit qui introduit ce document ne contient
aucun résultat.

## 1. Objet

Rejouer PROXY-C-001 à l'identique, avec les deux seules modifications décidées
dans [`DECISIONS-SPEC-001.md`](DECISIONS-SPEC-001.md) :

- **D1** — proxy à recouvrement continu au lieu du comptage à seuil ;
- **D2** — seule l'échelle `OBJET` dissout l'objet.

**Tout le reste est inchangé** : mêmes familles, mêmes graines, mêmes poids
uniformes, mêmes critères, mêmes seuils. C'est la condition pour que la
comparaison 001 ↔ 003 mesure l'effet des deux décisions et rien d'autre.

## 2. Ce qui reste identique à 001

| | |
| --- | --- |
| Calibration | décohérence contrôlée, graine 20400 |
| Évaluation intra-famille | décohérence contrôlée, graine 20402 |
| Évaluation inter-familles | mémoire perturbée, graine 20401 |
| Poids `w_s` | uniformes 1/4, non ajustés |
| Paramètre estimé | `τ_*` seul, moindres carrés par l'origine |
| Séparation calibration / évaluation | imposée par le code |
| T1 monotonie | strict |
| T2 transfert intra-famille | `e_rel <= 0.15` |
| T3 transfert inter-familles | `e_rel <= 0.30` |
| T4 invariance de représentation | écart `<= 1e-9` |
| T5 conservation des cadres | exact |

Le proxy révisé n'a **pas** de tolérance : le paramètre `θ` disparaît, ce qui
retire un degré de liberté au lieu d'en ajouter.

## 3. Faiblesse maintenue, redéclarée

La famille mémoire n'a toujours pas de temps propre indépendant : son « temps de
référence » est l'exposition cumulée à la perturbation, une convention de notre
part. **Un échec de T3 restera imputable au protocole autant qu'au proxy**, et
devra être rapporté comme tel. Cette faiblesse n'est pas corrigée ici parce que
la corriger demanderait la famille 1 du §8 — une horloge physique — dont ce
dépôt ne dispose pas.

## 4. Ce que l'essai cherche à réfuter

L'hypothèse de D1 est vérifiable et donc réfutable : sous décroissance uniforme
de facteur `q`, le proxy à recouvrement doit donner `C = q` constant, donc `D`
constant par pas, donc **`τ_Z` linéaire dans le temps de référence**.

Si T1 et T2 échouent encore, D1 est réfutée et le problème n'était pas le
comptage à seuil. Ce serait le résultat le plus informatif de l'essai, et il
sera publié comme tel.

## 5. Engagements

1. Aucun seuil, graine ou paramètre ci-dessus ne sera modifié après consultation
   des résultats.
2. Les résultats de 001 ne seront pas retouchés : 003 est un essai distinct,
   pas une correction de 001. Les deux restent publiés côte à côte.
3. Si D1 ou D2 est renversée plus tard par les auteurs, cet essai devra être
   rejoué et son résultat marqué caduc.

---

*Pré-enregistrement PROXY-C-003 — figé. Résultats dans un commit ultérieur.*
