# Pré-enregistrement — Essai ROLES-007

**Protocole fixé avant l'essai.** Le commit qui introduit ce document ne contient
aucun résultat.

## 1. La question posée

> Qu'est-ce qui, dans le pendule et dans la particule, joue exactement le rôle
> de la cohérence, de la transformation et de la mémoire ?

C'est la bonne question, et elle est décidable — pas par une mesure nouvelle,
mais en confrontant le formalisme actuel au cas canonique qu'il prétend décrire.

## 2. Ce que les deux exemples n'établissent pas

À poser d'emblée, sinon l'essai part faussé.

- **Le pendule** : `f_1 = f_2` sans `X_1 = X_2` dit qu'une projection
  non injective perd de l'information. C'est vrai et c'est banal — c'est la
  définition d'une projection non injective.
- **La particule** : `Δφ = ω_0(τ_L − τ_R)` est de la physique établie, vérifiée
  en interférométrie atomique. La relativité prédit `Δτ`, la mécanique quantique
  prédit `Δφ`.

**Aucun des deux n'est une preuve de Z-TEMPS.** Ils délimitent ce que Z-TEMPS
doit *ajouter*, et c'est ainsi qu'ils sont utilisés ici.

## 3. Hypothèse testée

L'interféromètre à deux branches sépare deux grandeurs :

| | Grandeur | Comportement |
| --- | --- | --- |
| **Accumulateur** | phase `Δφ = ω_0(τ_L − τ_R)` | **croît** |
| **Lisibilité** | visibilité `V = \|⟨Ψ_L\|Ψ_R⟩\|` | **décroît** |

Le profil `C` de Z-TEMPS mesure la seconde. `τ_Z = Σ(1 − C)` accumule donc la
décroissance de la **lisibilité**.

> **Hypothèse : `τ_Z` et l'accumulateur sont dissociés. Sur un interféromètre
> fermé — aucune décohérence, `V = 1` partout — la phase accumule `Δφ ≠ 0`
> tandis que `τ_Z` vaut exactement zéro.**

Si elle se vérifie, la loi assigne à la cohérence le rôle que la physique
assigne à deux choses distinctes, et `τ_Z` lit zéro sur le cas même qui motive
tout le cadre.

## 4. Critères, fixés d'avance

Deux branches, `ω_L = 1.00`, `ω_R = 1.03`, 200 pas de `Δt = 0.02`.

| Test | Énoncé | Seuil |
| --- | --- | --- |
| **R1** | Interféromètre **fermé** (`V = 1`) : la phase accumule | `\|Δφ\| > 0.1` |
| **R2** | Interféromètre **fermé** : `τ_Z` reste nul | `τ_Z < 1e-12` |
| **R3** | Avec décohérence : `τ_Z` devient non nul | `τ_Z > 0.5` |
| **R4** | Avec décohérence : `\|Δφ\|` est **inchangé** par rapport au cas fermé | écart `< 1e-12` |
| **R5** | `τ_Z` suit la lisibilité et non l'accumulateur : corrélation de rang de `τ_Z` avec `−ln V` supérieure à celle avec `\|Δφ\|` | strict |

**R2 est le critère décisif, et son succès est une mauvaise nouvelle pour la
loi.** Comme H2 de TAU-004, il est écrit dans ce sens délibérément : le
protocole doit pouvoir enregistrer que la théorie perd.

## 5. Ce que l'essai ne pourra pas dire

- Rien du monde : le modèle à deux branches est analytique. Mais R1-R4 portent
  sur une **conséquence interne** du formalisme, et ne dépendent d'aucune
  donnée.
- Rien sur la valeur de `Δφ` en physique réelle : `ω_L` et `ω_R` sont posés.
- Rien sur la conscience, la mémoire au sens biologique, ou l'interprétation de
  la mécanique quantique.

## 6. Ce qui sera proposé si l'hypothèse se vérifie

Une reformulation, **et rien de plus** — pas une mesure, pas une validation :
séparer dans la loi ce que l'interféromètre sépare. Le contenu exact de la
proposition sera écrit **après** les résultats, à partir d'eux, et signalé comme
proposition sans autorité, comme l'a été V1.1.

## 7. Engagements

1. Aucun seuil ni paramètre ci-dessus ne sera modifié après consultation des
   résultats.
2. Si R2 échoue — si `τ_Z` est non nul sur l'interféromètre fermé — l'hypothèse
   est fausse et sera publiée comme telle.

---

*Pré-enregistrement ROLES-007 — figé. Résultats dans un commit ultérieur.*
