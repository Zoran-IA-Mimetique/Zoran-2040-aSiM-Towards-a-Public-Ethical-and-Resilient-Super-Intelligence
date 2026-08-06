# Z-TEMPS — statut canonique et branche expérimentale

**Décision de l'auteur, appliquée le 6 août 2026 : B canonique + A isolé. C refusé.**

---

## 1. Statut canonique — B

> **Z-TEMPS redescend en cadre d'audit conditionnel. Il n'est plus présenté
> comme une loi physique.**

Ce que cela change, concrètement :

| | Avant | Maintenant |
| --- | --- | --- |
| Statut affiché | loi physique candidate | **cadre d'audit conditionnel** |
| `dτ_Z = τ_* · D(C(e)) · dN` | prétention physique | comptabilité de perte de lisibilité, sous axiomes déclarés |
| Prétention à `Δτ` | implicite | **retirée** — la relativité la donne, Z-TEMPS n'y ajoute rien |
| Statut de loi physique | `NON ACQUIS` | **hors périmètre** |

Ce n'est pas une capitulation ; c'est ce que les sept essais ont établi. La
[borne structurale](RETRACTATION-FORME-006.md) tient :

> Sans fixation indépendante des poids, les données ne peuvent pas distinguer
> une loi physique d'une métrique ajustable.

Cette borne est un **résultat**, pas un échec. Elle rejoint la non-unicité déjà
acquise : les axiomes actuels ne déterminent pas une mesure unique.

### Ce qui reste valide sous B

- Le [manifeste](MANIFESTE_Z-TEMPS_v1.md) — il n'a jamais prétendu au registre
  physique, et ses engagements d'auditabilité tiennent sans la loi.
- L'implémentation de référence comme **outil de comptabilité** : traçabilité par
  `Record`, séparation calibration / évaluation imposée par le code, invariants
  de représentation vérifiables.
- Les sept essais et leurs résultats négatifs, y compris la rétractation.

### Ce qui est retiré sous B

- Toute affirmation que `τ_Z` mesure un temps propre.
- P5b, déjà réfutée par [TAU-004](RESULTATS-TAU-004.md).
- La cible qubit `T1`/`T2*` comme test décisif : la rétractation a montré
  qu'elle n'aurait rien tranché.

## 2. Branche expérimentale isolée — A

**Isolée** signifie : elle ne remonte dans le statut canonique que si sa
condition de falsification, écrite ci-dessous **avant** tout calcul, est
franchie.

### Hypothèse

Les poids `w_s` peuvent être fixés par la **structure déclarée de l'objet**,
indépendamment des trajectoires à expliquer — donc sans être ajustés sur les
données qu'ils servent à décrire.

Règle candidate, issue de l'emboîtement `LOCAL ⊆ OBJET ⊆ CADRE ⊆ GLOBAL` :

```text
w_s ∝ |R_s \ R_{s-1}|      poids proportionnel aux relations que l'échelle
                            AJOUTE à celle du dessous
```

Aucune trajectoire n'y entre. Seule la déclaration de l'objet la détermine.

### Condition de falsification — pré-enregistrée

Sur un système à décroissances **différenciées par échelle**, dont les `β_s`
sont ajustés indépendamment sur chaque enveloppe :

> **A est réfutée si la pente de `τ_Z` sous poids structurels s'écarte de plus
> de `0.10` de la valeur prédite par la règle, ou si deux déclarations
> légitimes du même objet donnent des pentes différant de plus de `0.10`.**

Le second membre est le plus exigeant : si la pente dépend de la *manière de
déclarer* l'objet, la règle n'a fait que déplacer le paramètre libre de `w_s`
vers la déclaration. Ce serait le même défaut sous un autre nom.

### Ce qui interdit à A de remonter

- Un accord obtenu en ajustant la règle après avoir vu les pentes.
- Un accord sur enveloppe **uniforme** — la [rétractation 006](RETRACTATION-FORME-006.md)
  a montré que ce cas est une identité algébrique et ne teste rien.
- Un accord sans que les `β_s` aient été ajustés **indépendamment** sur chaque
  enveloppe.

## 3. Pourquoi C est refusé

[ROLES-007](RESULTATS-ROLES-007.md) et la non-unicité fournissent une piste
identifiable. Arrêter maintenant détruirait une direction de recherche qui a un
énoncé précis :

> La cohérence n'est pas ce qui change, c'est ce qui rend le changement lisible.

L'accumulateur `φ` et la lisibilité `C` sont deux grandeurs, et la loi n'en
assignait qu'une. C'est réparable en principe. Ce n'est pas encore réparé.

## 4. Ce qui est mesuré, et ce qui ne l'est pas

| Élément | Statut |
| --- | --- |
| Borne de non-identifiabilité des poids | **établie** — [rétractation 006](RETRACTATION-FORME-006.md) |
| Dissociation accumulateur / lisibilité | **établie** — [ROLES-007](RESULTATS-ROLES-007.md), exacte |
| `τ_* = 1/(D'(0)·γ)` | **établie** — [TAU-004](RESULTATS-TAU-004.md), analytique |
| Règle structurelle de fixation des poids | **NON_MESURÉE** — hypothèse de la branche A |
| Validation physique de quoi que ce soit | **NON_MESURÉE** — aucune ligne de ce dépôt ne mesure le monde |

---

*Statut canonique : cadre d'audit conditionnel. Branche A : isolée, condition de
falsification pré-enregistrée. `S = NON_MESURÉ`.*
