# Pré-enregistrement — Essai TAU-004

**Protocole fixé avant l'essai.** Le commit qui introduit ce document ne contient
aucun résultat.

## 1. Objet

L'essai [PROXY-C-003](RESULTATS-PROXY-C-003.md) a produit, par voie analytique,
une prédiction quantitative que personne n'a encore mesurée :

```text
C_s = e^(-γΔt)   ⟹   τ_* = Δt / (1 - e^(-γΔt))   ≈ 1/γ  quand γΔt << 1
```

Si elle se vérifie, `τ_*` n'est pas une constante de conversion « éventuellement
universelle » comme le dit le §3, mais **un paramètre du système mesuré**. Le
falsificateur du §7 tiret 3 serait alors déclenché par construction.

Cet essai corrige au passage le défaut de protocole reconnu en §2 des résultats
de 003 : **le test intra-famille fait varier `γ`, pas la graine.** Le rapport de
recouvrement étant invariant d'échelle, faire varier la graine ne testait rien.

## 2. Ce qui est fixé

| | |
| --- | --- |
| Proxy | `OverlapRatioProxy` (D1), sans tolérance |
| Dissolution | `{OBJET}` (D2) |
| Poids `w_s` | uniformes 1/4, non ajustés |
| Famille | décohérence contrôlée, `Δt = 0.25`, 24 pas, graine 20400 |
| Taux `γ` balayés | 0.05, 0.1, 0.2, 0.35, 0.8, 1.6 |
| Calibration | `τ_*` ajusté indépendamment à chaque `γ`, moindres carrés par l'origine |
| Transfert | `τ_*` calibré à `γ = 0.35` puis évalué à tous les autres `γ` |

## 3. Critères, fixés d'avance

| Test | Énoncé | Seuil |
| --- | --- | --- |
| **H1** | À chaque `γ`, le `τ_*` ajusté égale la prédiction analytique `Δt/(1-e^(-γΔt))` | écart relatif `<= 1e-9` |
| **H2** | `τ_*` **n'est pas** transférable entre taux : l'erreur relative médiane du `τ_*` de `γ=0.35` appliqué à `γ=1.6` dépasse le seuil de transfert de l'essai 003 | `e_rel > 0.15` |
| **H3** | La dépendance est bien en `1/γ` dans le régime `γΔt << 1` : le produit `γ · τ_*` est constant sur `γ ∈ {0.05, 0.1, 0.2}` | dispersion relative `<= 0.10` |

**H2 est un critère dont le succès est une mauvaise nouvelle pour la loi.** Il
est écrit dans ce sens délibérément : le protocole doit pouvoir enregistrer que
la théorie perd, sans que cela ressemble à un dysfonctionnement du code.

## 4. Ce que l'essai ne pourra pas dire

- Rien du monde : la famille est synthétique et sa dynamique est posée par nous.
  Mais H1 et H3 portent sur une **conséquence interne** de la loi et du proxy,
  qui ne dépend pas de la réalité du système simulé.
- Rien sur le choix entre les trois issues discutées en §4 des résultats de 003
  (`τ_*` per-système, normalisation de `D`, ou acceptation de `τ_Z ∝ γt`) :
  c'est une décision de spécification, pas une mesure.

## 5. Engagements

1. Aucun seuil, taux ou paramètre ci-dessus ne sera modifié après consultation
   des résultats.
2. Si H1 échoue, la dérivation de 003 est fausse et le sera dit sans détour.
3. Si H2 échoue — c'est-à-dire si `τ_*` transfère — la conclusion de 003 est à
   retirer, et elle le sera.

---

*Pré-enregistrement TAU-004 — figé. Résultats dans un commit ultérieur.*
