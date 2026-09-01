# Pré-enregistrement — Essai GRANULARITE-002

**Protocole fixé avant l'essai.** Comme pour PROXY-C-001, le commit qui introduit
ce document ne contient aucun résultat.

## 1. Origine

Le [pilote multi-domaine V1.5](Z-TEMPS-CROSS-DOMAIN-PILOT-V1.5.md) rapporte,
pour l'oscillateur nanomécanique lévité :

| Grandeur | Valeur |
| --- | --- |
| Variation cumulée brute | 28.717 |
| Agrégation par blocs de 16 | 0.695 |
| Variation nette début-fin | 0.349 |

et conclut : « La trajectoire contient donc beaucoup plus d'information
transformationnelle que ses seuls états initial et final. La valeur dépend
cependant de la granularité, ce qui maintient le verrou du bruit et de la
résolution. »

Le verrou est nommé. Il n'est pas quantifié. **Cet essai le quantifie.**

L'enjeu n'est pas cosmétique : la variation totale d'une trajectoire bruitée
diverge quand le pas d'échantillonnage tend vers zéro. Si la variation cumulée
brute est majoritairement du bruit, alors « 28.717 » n'est pas une mesure de la
transformation de l'objet mais une mesure de la fréquence d'acquisition — et une
grandeur qui dépend du choix de représentation est **le premier falsificateur du
§7** de Z-TEMPS-PHYS-V1.

## 2. Ce que cet essai teste — et ce qu'il ne teste pas

Il teste **l'estimateur**, sur des signaux synthétiques dont la composition est
connue. Il ne réanalyse pas les données du pilote : elles ne sont pas dans ce
dépôt, seuls trois nombres agrégés le sont.

L'application aux trois nombres du pilote (G4) est donc **descriptive et
conditionnelle**, pas un verdict sur l'expérience.

## 3. Modèle et hypothèse de fermeture, déclarés

```text
V(k) = S + Nz · k^(-p)
```

`S` = part de la variation due à la transformation, supposée indépendante de la
granularité. `Nz` = part due au bruit à la granularité la plus fine. `p` =
exposant d'agrégation.

- `p ≈ 0` : la valeur ne dépend pas de la granularité — grandeur robuste.
- `p ≈ 1.5` : bruit stationnaire additif — la valeur mesure l'échantillonnage.

Trois inconnues, deux équations. **Hypothèse de fermeture déclarée :
`S = net`**, c'est-à-dire signal monotone. C'est l'hypothèse la plus favorable
au signal : toute non-monotonie augmenterait `S` et diminuerait la part de
bruit. La fraction de bruit obtenue est donc un **minorant**, et cela doit être
répété partout où elle est citée.

## 4. Critères, fixés d'avance

| Test | Énoncé | Seuil |
| --- | --- | --- |
| **G1** | Signal lisse monotone : l'exposant estimé est nul | `p <= 0.15` |
| **G2** | Bruit stationnaire pur : l'exposant retrouve la théorie | `1.35 <= p <= 1.65` |
| **G3** | Mélange de composition connue : la fraction de bruit estimée à la granularité la plus fine retrouve la vraie | écart `<= 0.10` |
| **G4** | Application aux trois nombres du pilote | **descriptif, sans seuil** |

Graines : 30001 (bruit), 30002 (mélange). Granularités : 1, 2, 4, 8, 16, 32.
Longueur des séries : 4096 points.

G1, G2 et G3 valident l'estimateur. **Si l'un des trois échoue, G4 n'est pas
interprétable** et sera publié comme non concluant.

## 5. Engagements

1. Aucun seuil, graine ou paramètre ci-dessus ne sera modifié après consultation
   des résultats.
2. G4 sera publié quelle que soit sa valeur, y compris si elle contredit la
   lecture que nous anticipons.
3. Toute citation de la fraction de bruit rappellera qu'il s'agit d'un minorant
   sous l'hypothèse `S = net`.

---

*Pré-enregistrement GRANULARITE-002 — figé. Résultats dans un commit ultérieur.*
