# REGISTRE DES CONTRADICTIONS

Dépôt : `Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence`
Branche : `claude/multi-agent-exploration-protocol-26l1c5`
SHA : `cdf9039777b4f71f62153a06d96ecf949ed94cc5`

**Interdit n°2 du protocole : ne pas fusionner silencieusement des conclusions contradictoires.**
Chaque contradiction ci-dessous est conservée avec sa trace, y compris quand elle a été tranchée.
Une contradiction résolue n'est pas une contradiction effacée : l'énoncé fautif reste consigné, avec
la commande qui l'a fait tomber.

Cinq contradictions ont été relevées. Trois étaient de vrais désaccords entre agents, une était une
contradiction apparente, une est un coût du protocole lui-même.

---

## C-01 — MÉTHODE D'EXTRACTION DES PDF · désaccord frontal · **TRANCHÉE CONTRE A3**

**Gravité : majeure.** C'est la contradiction la plus instructive du pilote.

| Partie | Énoncé | Verdict initial |
|---|---|---|
| `A3-08` | « Sur les 10 flux du PDF FULL, **0 se décompressent** en zlib et 10 échouent ; l'extraction de texte rend **0 caractère lisible**. » | `NON_VÉRIFIÉ`, incertitude `HAUTE` |
| `A5-05` | « Le texte est **intégralement lisible** », 4514 caractères de français pour le PDF FULL. | `CONFIRMÉ`, incertitude `BASSE` |
| `A2`, `A4-09` | Ont extrait du texte lisible et bâti des constats dessus. | `CONFIRMÉ` |

**Fait qui tranche.** Les flux déclarent `/Filter [ /ASCII85Decode /FlateDecode ]` — une **chaîne de
deux filtres**. A3 a appliqué `zlib` directement aux octets bruts, en sautant l'étage ASCII85.

Vérification indépendante par le coordinateur, puis par A6 :

```
zlib SEUL   -> succès : 0 / 10
a85 + zlib  -> succès : 10 / 10
filtres déclarés : [b' /ASCII85Decode /FlateDecode ']
```

Le décompte de caractères d'A5-05 se reproduit **au caractère près** (A6 : 4514 pour le FULL, 2788
pour le court ; coordinateur avec la méthode canonique : 4720 et 2895, l'écart provenant des seuls
séparateurs de lignes ajoutés à l'assemblage).

**Résolution : A3-08 est la partie fautive. A5-05 est correct.**

A3 a lu l'*existence* du `/Filter` sans lire sa *composition*, puis a converti l'échec de sa propre
méthode en propriété de l'artefact. Reclassement d'`A3-08` : `NON_VÉRIFIÉ` → **`RÉFUTÉ`** (sa
prémisse « flux illisibles » est fausse).

**Ce que cela dit du protocole — les deux lectures sont vraies simultanément :**

- *Le garde-fou a fonctionné.* A3 a tenté deux voies, a échoué, et a **refusé de conclure** :
  `NON_VÉRIFIÉ` + `HAUTE` + outil manquant nommé. Rien de faux ne s'est propagé vers la synthèse.
- *Le garde-fou est insuffisant.* Le corps du constat affirmait quand même « 0 caractère lisible »
  au présent de l'indicatif, comme un fait observé. **Le niveau de confiance protégeait la
  conclusion, pas l'énoncé.** → amendement `A5` du manifeste.

À l'inverse, `A5-05` illustre la méthode correcte : A5 a obtenu du charabia, **a refusé** de conclure
« illisible donc rien à voir », et a itéré trois fois jusqu'à obtenir du français. Cette différence
de posture face à un échec d'outil est ce qui sépare les deux constats.

---

## C-02 — CLONE SUPPOSÉ SUPERFICIEL · désaccord · **TRANCHÉE CONTRE A1**

| Partie | Énoncé |
|---|---|
| `A1-02` | Réserve : « le clone local est un fetch `--depth 50` (visible au reflog) : un historique plus ancien tronqué côté serveur ne serait pas observable ici » → incertitude `MOYENNE` |
| `A3-04` | « vérifié l'absence de `.git/shallow`. Le clone n'est pas tronqué sur ces refs. » |

**Fait qui tranche** (commande du coordinateur) :

```
git rev-parse --is-shallow-repository   -> false
ls .git/shallow                         -> No such file or directory
```

**Résolution : la réserve d'A1-02 est falsifiée.** A3-04 avait raison. L'incertitude d'`A1-02` passe
de `MOYENNE` à `BASSE`, et son action proposée (« confirmer avec un clone complet ») devient sans
objet.

Enseignement : A1 a inféré une propriété du dépôt depuis une trace de reflog, sans exécuter la
commande qui répond directement à la question. Une réserve *plausible* mais non vérifiée a failli
affaiblir un constat par ailleurs juste.

---

## C-03 — PÉRIMÈTRE DU MOT « BRANCHE » · désaccord de portée · **TRANCHÉE CONTRE A1**

**Gravité : majeure.** C'est la contradiction la plus coûteuse en couverture.

| Partie | Énoncé |
|---|---|
| `A1-08` | « Les 3 branches locales/distantes pointent toutes sur le même commit cdf9039, donc **aucune branche alternative ne porte de code**. » |
| `A3-05` | A trouvé, via l'API GitHub, du code **et** un CI actif sur une branche distante qu'A1 n'avait pas vue. |
| `A5` (contrôle) | A déclaré honnêtement : « je n'ai pas exécuté `git fetch --all` et je n'ai donc pas vu d'éventuelles branches distantes ». |

**Fait qui tranche** (coordinateur, puis A6) :

```
git ls-remote --heads origin | wc -l          -> 6
git for-each-ref refs/remotes | wc -l         -> 2
remote.origin.fetch = +refs/heads/*:refs/remotes/origin/*
.git/shallow : not shallow
```

Le remote porte **6 branches**, dont 5 hors `main`, **toutes porteuses de code** : PWA React/TS avec
CI et 51 tests (`…BQ9nA`), moteur Python avec 42 tests (`…eSEZG`), application 3D avec
`tools/validate_laws.py` (`…pPfzR`), application web (`…fulkfa`), application Android Flutter
(`…ux3zup`).

**Résolution : `A1-08` est RÉFUTÉ dans sa généralisation, CONFIRMÉ dans sa portée SHA.**
Verdict conservé au registre sous la forme composite `CONFIRME_AU_SHA_REFUTE_AU_PROJET` — les deux
portées sont conservées, non fusionnées.

**Diagnostic de la faute, établi par A6 :** `git branch -a` ne lit que le **cache de refs local**,
qui ne contenait que 2 des 6 refs — non par clone superficiel (il ne l'est pas) ni par refspec
restreint (il est complet), mais parce que les refs n'avaient jamais été récupérées. A1 est parti
d'une observation locale valide et a généralisé vers une affirmation d'exhaustivité sur le distant.

**Faille de protocole, pas seulement faute d'agent :** rien n'imposait `git ls-remote` avant une
affirmation portant sur « toutes les branches ». → amendement `A3` du manifeste.

---

## C-04 — OCCURRENCES D'`http` DANS LES PDF · contradiction **APPARENTE**, non fusionnée

| Partie | Énoncé |
|---|---|
| `A1-06` | « comptage : **0 occurrence** de `http` » dans les PDF |
| `A4-07` | « les seules chaînes `http://` présentes sont dans **deux commentaires** de production ReportLab (offsets 48 et 13469) » |

**Résolution : aucune contradiction réelle — les deux mesures portent sur des surfaces différentes.**
A1 comptait dans le **texte décodé** des flux ; A4 comptait dans le **conteneur brut**, où les
commentaires PDF vivent hors des dictionnaires d'objets. Les deux énoncés sont exacts.

Cette entrée est conservée délibérément. C'est exactement le type d'écart qu'une synthèse pressée
aurait fusionné en « il y a / il n'y a pas d'URL », en perdant l'information utile : **le document
ne contient aucune URL rédigée par ses auteurs**, et les deux seules URL présentes sont injectées
par l'outil de génération. `A5-07` confirme indépendamment ce résultat par un quatrième angle.

---

## C-05 — TRONCATURE DE PREUVE · coût du protocole lui-même

Ce n'est pas un désaccord entre agents, mais une limite induite par une règle du protocole.

**Fait.** Le champ `preuve` est plafonné à 5 lignes pour protéger le contexte du coordinateur. Or
`A1-01` devait prouver l'inventaire exhaustif de 6 fichiers : sa preuve n'en montre que 5, et **omet
`Zoran_2040_aSiM_WhitePaper_FULL (2).pdf`**.

**Conséquence.** Le constat est juste, mais sa preuve publiée ne démontre pas l'exhaustivité qu'il
affirme. Un relecteur strict devrait le marquer `NON_VÉRIFIÉ` sur la seule base de l'artefact.

**Arbitrage.** Le plafond est conservé — sans lui, un agent peut noyer le coordinateur sous des
vidages de fichiers, ce qui est précisément le problème que ce protocole existe pour résoudre. Mais
la règle est amendée : quand la preuve *est* un dénombrement exhaustif, l'agent doit fournir le
**compte** plus un échantillon, et non un échantillon seul. → amendement `A6` du manifeste.

---

## CONTRADICTIONS NON RÉSOLUES

Aucune contradiction ne reste ouverte entre agents. Les cinq entrées ci-dessus sont tranchées ou
qualifiées.

En revanche, **cinq questions restent `NON_TRANCHABLES`** faute d'accès, et ne doivent pas être
confondues avec des contradictions résolues (source : synthèse adverse A6) :

| Question | Ce qui manque pour trancher |
|---|---|
| Contenu du wiki GitHub (`has_wiki: true`) — pourrait contenir un chemin de reproduction ou un `.zgs` | `git ls-remote https://github.com/…/….wiki.git` — l'API directe est bloquée et le proxy ne sert pas `*.wiki.git` |
| Liste réelle des assets des 2 releases — un `.zgs` attaché resterait invisible | `get_release_by_tag` puis inspection des noms d'assets |
| Présence de l'adresse e-mail dans un blob d'une branche non récupérée | Récupérer les 5 têtes distantes (interdit sous mandat lecture seule) ou `run_secret_scanning` |
| Existence d'un `.zgs` hors GitHub (gist, Zenodo, podcast cité en description) | Hors périmètre ; toute requête vers une URL du dépôt est interdite |
| Le « +20% » a-t-il jamais été mesuré hors dépôt ? | **Indécidable depuis le dépôt.** Le constat `A2-06` porte sur l'absence d'adossement, jamais sur l'inexistence de la mesure — la distinction doit être maintenue |
