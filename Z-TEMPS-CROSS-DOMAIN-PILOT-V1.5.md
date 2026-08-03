# Z-TEMPS — comparaison expérimentale multi-domaine V1

Deux jeux de données publics ont été analysés avec des proxies distincts mais une structure de calcul commune.

## Oscillateur nanomécanique lévité

Pour la population phononique : \(R=\ln N\).

- variation cumulée brute : \(28,717\) ;
- variation nette début-fin : \(0,349\) ;
- agrégation par blocs de 16 : \(0,695\).

La trajectoire contient donc beaucoup plus d'information transformationnelle que ses seuls états initial et final. La valeur dépend cependant de la granularité, ce qui maintient le verrou du bruit et de la résolution.

## Qubit supraconducteur

Pour chaque base de mesure : \(R=(N_0-N_1)/(N_0+N_1)\), avec correction par variance binomiale.

- 1 728 circuits expérimentaux ;
- minimum moyen corrigé : \(0,224\) à \(\theta=2,0\) ;
- maximum moyen corrigé : \(3,565\) à \(\theta=0,4\) ;
- correction moyenne : 10,9 % sous la mesure brute.

La longueur relationnelle varie avec la transformation appliquée au qubit.

## Invariants communs observés

- positivité ;
- dépendance au chemin ;
- sensibilité à la transformation ;
- correction du bruit réduisant la mesure brute.

## Ce qui ne peut pas encore être conclu

Les valeurs absolues des deux expériences ne sont pas comparables : les espaces relationnels, métriques, unités et proxies diffèrent. La comparaison valide uniquement une architecture de calcul commune, pas une constante universelle.

## Verdict

**PASS multi-domaine pour la calculabilité et la structure qualitative.**

**NON MESURÉ pour l'universalité de la métrique, de l'échelle et du bruit.**

**NON ÉTABLI pour le statut de loi physique fondamentale.**

Jauge normative :

\[
S=\frac{\beta\times\Delta\Phi}{1+T+\sigma}
\]

Non calculable tant que les proxies ne sont pas définis.
