# Décisions de spécification — lot 001

**Statut : décisions prises par l'implémentation, faute d'arbitrage des auteurs.**

L'essai [PROXY-C-001](RESULTATS-PROXY-C-001.md) s'est arrêté sur deux questions
que Z-TEMPS-PHYS-V1 ne tranche pas (F1 et F2). Elles bloquaient tout essai
ultérieur. Elles sont tranchées ici.

Ce document n'a pas l'autorité de la spécification. Il dit ce que
l'implémentation fait et pourquoi, de sorte que les auteurs puissent renverser
chaque décision en sachant exactement ce qu'elle coûte. **Toute décision
renversée invalide les essais qui en dépendent, et ils devront être rejoués.**

---

## D1 — `C` reste incrémentale ; c'est le comptage à seuil qui est abandonné

### La question

Le §2 mesure « la proportion de relations conservées » — conservées par rapport
à quoi ? Deux lectures, aucune tenable en l'état :

- **incrémentale** (par rapport à la configuration précédente) : un système
  entièrement décohéré est mesuré parfaitement cohérent, parce que ses relations
  ne bougent plus. Son temps propre s'arrête alors qu'il se dégrade ;
- **référentielle** (par rapport à une configuration d'origine) : `D` n'est plus
  une propriété de la transformation `e` mais de l'histoire entière, et
  `Σ D(C(e))` compte plusieurs fois la même perte.

### La décision

**La lecture incrémentale est conservée. Le défaut n'était pas là.**

La forme `dτ_Z = τ_* · D(C(e)) · dN` du §3 est écrite comme une différentielle :
`D` doit être une propriété locale de la transformation. La lecture
référentielle casse cela, et le prix est trop élevé — elle ne rend pas la loi
fausse, elle la rend inécrivable sous la forme que la spécification lui donne.

Le vrai coupable est le **comptage à seuil** du proxy 001 : « conservée si
`|r' - r| <= θ` ». Un seuil absolu appliqué à des relations dont la magnitude
décroît finit par tout déclarer conservé — non parce que l'objet persiste, mais
parce qu'il n'a plus assez d'amplitude pour bouger de plus de θ. Le comptage
jette l'information de magnitude, et c'est cette information qui distinguait un
objet stable d'un objet éteint.

Le proxy révisé mesure un **rapport de recouvrement continu** :

```text
C_s = Σ_s min(|r|, |r'|) · compatible(r, r')  /  Σ_s max(|r|, |r'|)
```

Ce que la révision achète :

| | Proxy 001 (seuil) | Proxy révisé (recouvrement) |
| --- | --- | --- |
| État inchangé | `C = 1` | `C = 1` |
| Décroissance exponentielle de facteur `q` | sature vers `C = 1` | `C = q`, **constant** |
| Toutes relations nulles | `C = 1` (absurde) | `C = 0` : dissolution |
| Paramètre libre | `θ` | **aucun** |

Le deuxième point est le plus important : sous décroissance uniforme, `C = q`
constant donne `D` constant par pas, donc **`τ_Z` linéaire dans le temps de
référence**. C'est P5 au sens fort, que le proxy à seuil ne pouvait
structurellement pas produire.

### Ce que cette décision ne résout pas

Rien ne garantit qu'un rapport de recouvrement soit *la* mesure de `C`. C'est
une lecture de plus, meilleure que la précédente sur les critères ci-dessus,
et falsifiable comme elle.

## D2 — seule l'échelle `OBJET` dissout l'objet

### La question

Le §2 dit : « `C_s(e) = 0` : l'identité de l'objet cesse d'être définie **à
l'échelle s** ». Le §4 dit : « `C = 0` : **dissolution de l'objet** ». Les deux
phrases ne disent pas la même chose, et l'essai 001 a montré que la différence
est mesurable : `C_LOCAL = 0` (5 relations) arrêtait tout alors que
`C_OBJET = 0.467` — l'objet était manifestement encore là.

### La décision

**La formulation du §2 l'emporte, et l'échelle porteuse de l'identité est
`OBJET`.**

- `C_OBJET = 0` → l'objet est dissous, `τ_Z` ultérieur indéfini.
- `C_s = 0` à une autre échelle → cette échelle contribue sa perte maximale à
  `D` (soit `w_s · 1`) et l'intégration continue.

Justification : `LOCAL` est une sous-structure de l'objet, `CADRE` et `GLOBAL`
contiennent du contexte qui n'est pas l'objet. Aucune des trois ne porte
l'identité dont le §4 parle. Faire dissoudre l'objet par la perte d'une
sous-structure ou d'un contexte est une confusion de niveau — et le §1 pose
précisément la « séparation stricte des niveaux ».

Effet secondaire recherché : la dissolution cessait d'être robuste à la
cardinalité de l'échelle (une échelle à 5 relations atteint 0 bien plus
facilement qu'une à 15), ce qui réintroduisait une dépendance au découpage,
c'est-à-dire au falsificateur du §7 tiret 1. En liant la dissolution à une seule
échelle déclarée, cette porte dérobée se referme.

### Mise en œuvre

`ztemps.law.tau_z` prend un paramètre `dissolving_scales`. **Sa valeur par
défaut reste « toutes les échelles »**, c'est-à-dire le comportement de l'essai
001, afin que les résultats publiés de 001 restent reproductibles à l'identique.
D2 doit être passée explicitement par les essais qui l'adoptent. Une décision de
spécification ne doit jamais changer rétroactivement un résultat publié.

---

## Portée

| Essai | Proxy | Règle de dissolution |
| --- | --- | --- |
| [PROXY-C-001](RESULTATS-PROXY-C-001.md) | seuil `θ = 0.05` | toutes échelles |
| [GRANULARITE-002](RESULTATS-GRANULARITE-002.md) | sans objet | sans objet |
| PROXY-C-003 et suivants | recouvrement continu | `{OBJET}` (D1 + D2) |

---

*Décisions 001 — prises par l'implémentation, renversables par les auteurs, au
prix du rejeu des essais concernés.*
