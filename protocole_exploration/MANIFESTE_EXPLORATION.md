# MANIFESTE D'EXPLORATION MULTI-AGENT

**Version 1.1** — amendée par les six failles que le contre-audit adverse a trouvées dans la
version 1.0 en la testant. Les amendements sont en §10 ; ils sont normatifs.

Protocole standard d'exploration de dépôt par sous-agents, cadré et traçable.

Ce document est un artefact de **protocole**. Il ne décrit ni ne modifie le produit.
Il définit comment une exploration est verrouillée, découpée, prouvée et rejouée.

---

## 1. PRÉFLIGHT — VERROU D'EXÉCUTION

Aucune exploration ne démarre avant que les 10 champs ci-dessous soient renseignés
par une **commande observée**, jamais par mémoire ni par déduction.

| # | Champ | Valeur relevée pour cette exécution | Commande d'observation |
|---|---|---|---|
| 1 | Dépôt | `Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence` | `git remote -v` |
| 2 | Remote | `origin` → `http://local_proxy@127.0.0.1:41729/git/Zoran-IA-Mimetique/Zoran-2040-aSiM-...` (proxy d'agent local) | `git remote -v` |
| 3 | Branche | `claude/multi-agent-exploration-protocol-26l1c5` | `git branch --show-current` |
| 4 | SHA exact | `cdf9039777b4f71f62153a06d96ecf949ed94cc5` | `git rev-parse HEAD` |
| 5 | État du worktree | **propre** — sortie vide, y compris ignorés | `git status --porcelain --ignored` |
| 6 | Runtime réel | Python 3.11.15 · Node v22.22.2 · git 2.43.0 · Linux 6.18.5 x86_64 | `python3 -V; node -v; git --version; uname -a` |
| 7 | Mission active | Exploration multi-agent cadrée et traçable — **aucun ticket de suivi présent dans le dépôt** (voir NON_MESURÉ, §7) | `ls .github` → absent |
| 8 | Périmètre de fichiers | 6 fichiers suivis, 0 sous-répertoire (voir §2) | `git ls-tree -r HEAD` |
| 9 | Droits d'écriture | écriture possible sur le worktree (sonde `touch` puis retrait) ; **volontairement non exercée pendant l'exploration** | sonde `touch` / `rm` |
| 10 | Condition terminale | définie en §8 | — |

### Outillage — limite déclarée en préflight

`pdftotext`, `pdfinfo`, `qpdf`, `pypdf`, `PyPDF2` sont **absents** du runtime, et
l'installation de paquets est interdite pendant l'exploration. Toute inspection de PDF
passe donc par la **stdlib Python seule** (`open` binaire, `re`, `zlib`, `base64`).
Cette contrainte est déclarée **avant** l'exploration parce qu'elle plafonne la
qualité de preuve atteignable sur les PDF — elle doit apparaître dans la matrice de
couverture, pas être découverte après coup.

### Budget verrouillé en préflight

| Ressource | Plafond | Consommé |
|---|---|---|
| Sous-agents d'exploration | 5 | 5 |
| Sous-agent de contre-audit | 1 | 1 |
| Sous-agents écrivains | **0** (aucun autorisé à ce stade) | 0 |
| Constats par sous-agent | 8 à 12 selon périmètre | voir `MATRICE_COUVERTURE.md` |
| Preuve par constat | 5 lignes littérales maximum | — |

Le plafond de constats et la limite de 5 lignes de preuve existent pour une raison
précise : ils empêchent un sous-agent de renvoyer un vidage de fichiers dans le
contexte du coordinateur. Le coordinateur ne reçoit que des **constats structurés**.

---

## 2. PÉRIMÈTRE DE FICHIERS AU SHA `cdf9039`

6 fichiers suivis, tous à la racine, aucun sous-répertoire.

| Fichier | Octets | Blob git |
|---|---|---|
| `LICENSE` | 1094 | `0a8e66697247358ba9ef94d333ec1c9adf8e1fdc` |
| `README.md` | 1142 | `92d1cdc0c81bf9d478d3bd5c90f15b3bf37f1ad5` |
| `Zoran_2040_aSiM_WhitePaper.pdf` | 6701 | `068031541e02332af7bd1bd5198c21174f0b6449` |
| `Zoran_2040_aSiM_WhitePaper_FULL.pdf` | 13556 | `cc048f6df78237a510929f504d394fa2a14dab81` |
| `Zoran_2040_aSiM_WhitePaper_FULL (1).pdf` | 13556 | `cc048f6df78237a510929f504d394fa2a14dab81` |
| `Zoran_2040_aSiM_WhitePaper_FULL (2).pdf` | 13556 | `cc048f6df78237a510929f504d394fa2a14dab81` |

**Conséquence de cadrage, relevée en préflight :** le dépôt ne contient aucun fichier
de code. Les six axes d'exploration prévus par le protocole restent tous instanciés,
mais trois d'entre eux (tests, dépendances, sécurité) portent sur un dépôt où l'objet
attendu est absent. Le protocole exige alors le verdict `NON_MESURÉ`, **pas** un
verdict favorable par défaut. Un dépôt sans tests n'est pas un dépôt qui passe ses
tests.

---

## 3. ARCHITECTURE D'AGENTS

### Coordinateur

L'agent principal **coordonne et reste en lecture seule pendant toute la durée de
l'exploration**. Il ne rédige les artefacts qu'en phase 4, après que tous les
sous-agents ont rendu leur contrôle d'intégrité.

Cette règle n'est pas cosmétique. Chaque sous-agent doit rapporter
`git status --porcelain` vide en fin de mission. Si le coordinateur écrivait un
artefact dans le dépôt pendant l'exploration, tous les sous-agents encore en vol
rapporteraient un worktree sale et **le contrôle d'intégrité produirait un faux
positif**. Le coordinateur travaille donc dans un espace hors dépôt jusqu'à la
synthèse.

### Sous-agents — périmètres et axes exclusifs

Chaque sous-agent reçoit un périmètre **fermé** et une question **falsifiable**.

| Agent | Axe exclusif | Question falsifiable assignée |
|---|---|---|
| **A1** Architecture et flux | Structure du dépôt, points d'entrée, flux d'exécution | Le dépôt contient-il un artefact exécutable, un point d'entrée, ou un flux instanciable ? |
| **A2** Contrats et invariants | Affirmations du README/LICENSE et prose du white paper, adossement aux artefacts | Chaque affirmation vérifiable du README est-elle adossée à un artefact présent au SHA ? |
| **A3** Tests et couverture | Existence et exécutabilité d'une vérification | Existe-t-il une seule commande de vérification exécutable, et la couverture est-elle définissable ? |
| **A4** Persistance et dépendances | Conteneurs PDF (identité binaire, duplication, métadonnées), déclarations de dépendances | Les 4 PDF sont-ils 4 artefacts distincts ? Le dépôt déclare-t-il une dépendance externe ? |
| **A5** Sécurité et confidentialité | Secrets, données personnelles, endpoints réseau, cohérence de licence | Le dépôt expose-t-il un secret/PII/endpoint ? La licence correspond-elle à ce qui est annoncé ? |
| **A6** Audit adverse | Réfutation des constats d'A1–A5 | Quel constat majeur ne survit pas à une tentative de réfutation ? |

### Séparation par AXE, et non par fichier

`README.md` et les PDF sont **lus** par plusieurs agents. C'est assumé et déclaré.
Ce qui est exclusif, c'est l'**axe d'analyse** — donc le droit de conclure :

- sur la **prose** du white paper → A2 seul conclut ;
- sur le **conteneur binaire** et la duplication → A4 seul conclut ;
- sur les **motifs de secret / PII / endpoint** → A5 seul conclut ;
- sur la **structure** du dépôt → A1 seul conclut.

Un agent qui croise un fait hors de son axe le **relève factuellement et le délègue**
sans conclure. Le chevauchement de lecture est autorisé ; le chevauchement de
conclusion est interdit, parce que c'est lui qui produit les doublons et les
contradictions silencieuses.

### Agent écrivain

**Aucun agent écrivain n'est désigné par ce protocole.** Voir §6 pour la procédure
de désignation.

---

## 4. CONTRAT DE RETOUR OBLIGATOIRE

Chaque sous-agent renvoie **uniquement** des constats à ce format. Un résumé narratif
seul est un retour non conforme et doit être rejeté par le coordinateur.

```
### CONSTAT <AGENT>-<NN>
depot: <organisation/dépôt>
branche: <branche>
sha: <SHA complet, 40 caractères>
fichier: <chemin relatif exact | (dépôt entier) | (historique git)>
lignes_symbole: <lignes, symbole, offset | N/A — constat d'absence>
commande: <UNE commande shell exacte, rejouable depuis la racine>
fait_verifie: <ce que la sortie montre, sans interprétation>
deduction: <inférence logique | AUCUNE>
hypothese: <supposition non prouvée | AUCUNE>
preuve: <extrait LITTÉRAL de la sortie, 5 lignes max>
incertitude: BASSE | MOYENNE | HAUTE
contre_exemple_recherche: <ce qui a été cherché pour se contredire, et le résultat>
action_proposee: <action concrète, non exécutée>
verdict: CONFIRMÉ | RÉFUTÉ | NON_VÉRIFIÉ | NON_MESURÉ
```

Puis, obligatoirement, un bloc de clôture :

```
### CONTRÔLE INTÉGRITÉ <AGENT>
sortie de `git status --porcelain` : <doit être vide>
sortie de `git rev-parse HEAD` : <doit valoir le SHA verrouillé>
zones que je n'ai PAS couvertes dans mon périmètre : <liste honnête>
```

### Sémantique des verdicts — non négociable

| Verdict | Signification | Piège écarté |
|---|---|---|
| `CONFIRMÉ` | L'énoncé est établi par une commande rejouée et sa sortie | — |
| `RÉFUTÉ` | L'énoncé est contredit par une observation du dépôt | Ne pas confondre avec « non trouvé » |
| `NON_VÉRIFIÉ` | Vérifiable en principe, non vérifié ici | Ne pas promouvoir en CONFIRMÉ par plausibilité |
| `NON_MESURÉ` | L'instrument de mesure est absent du runtime, ou l'objet à mesurer est absent du dépôt | **Ne jamais convertir une absence de mesure en résultat favorable** |

Distinction structurante : une affirmation **quantitative sans mesure rejouable** est
`NON_MESURÉ`. Une affirmation **contredite par un fichier du dépôt** est `RÉFUTÉ`.
Les deux sont des constats à valeur égale ; les confondre détruit la traçabilité.

### Le champ `contre_exemple_recherche` est obligatoire

Un constat sans tentative de réfutation documentée est un constat de confort.
Le champ doit nommer **ce qui a été cherché** et **ce qui a été trouvé ou non**.
C'est ce champ, et non le nombre de fichiers lus, qui fonde la couverture d'un axe.

---

## 5. INTERDITS DU PROTOCOLE

1. **Interdit** de remonter uniquement un résumé narratif.
2. **Interdit** de fusionner silencieusement deux conclusions contradictoires — toute
   contradiction est consignée dans `REGISTRE_CONTRADICTIONS.md` et **survit** à la
   synthèse, résolue ou non.
3. **Interdit** de déclarer un dépôt complet, sain, prêt, sûr ou certifié sans preuve
   au SHA exact. Les mots « sain », « propre », « prêt », « certifié » sont bannis des
   constats.
4. **Interdit** d'utiliser le nombre de fichiers lus comme preuve de couverture. La
   couverture se démontre par les **motifs et commandes réellement exécutés**.
5. **Interdit** de réutiliser une conclusion issue d'un autre SHA. Le SHA est un champ
   obligatoire de chaque ligne du registre, précisément pour rendre cette réutilisation
   détectable.
6. **Interdit** de laisser plusieurs agents modifier le même périmètre — ici renforcé :
   pendant l'exploration, **aucun** agent ne modifie **aucun** périmètre.
7. **Interdit** de contacter une URL découverte dans le dépôt. On la relève, on ne la
   sollicite pas.
8. **Interdit** de reproduire en clair un secret d'apparence réelle : emplacement,
   type, et masque uniquement.

---

## 6. DÉSIGNATION D'UN FUTUR AGENT ÉCRIVAIN

Aucune écriture produit n'est autorisée par le présent protocole. Un agent écrivain ne
peut être désigné qu'en franchissant, dans l'ordre, les six conditions suivantes.

**Condition 1 — GO_CODE explicite.** Le propriétaire du dépôt émet un `GO_CODE`
nommant l'objet du changement. Le présent diagnostic ne vaut pas autorisation : il
n'établit que des constats.

**Condition 2 — Constat de rattachement.** Le `GO_CODE` cite les identifiants de
constats (`A1-08`, `A4-03`, …) qu'il entend traiter. Un changement qui ne se rattache
à aucun constat du registre est refusé — c'est ce qui empêche l'élargissement
silencieux du périmètre.

**Condition 3 — Re-préflight au SHA courant.** Le préflight §1 est **rejoué**. Si le
SHA a bougé depuis `cdf9039`, les constats invoqués sont marqués `NON_VÉRIFIÉ` et
doivent être re-prouvés au nouveau SHA avant toute écriture. Interdit n°5.

**Condition 4 — Unicité de l'écrivain.** **Un seul** agent écrivain actif à la fois,
avec un périmètre de fichiers **énuméré nommément** et disjoint de tout autre
écrivain. Le coordinateur retient la liste et refuse tout fichier hors liste.

**Condition 5 — Réversibilité et critère de vérification.** Le `GO_CODE` nomme, avant
l'écriture, la branche de travail et la commande qui vérifiera le changement. Si
aucune commande de vérification n'existe pour l'objet visé — cas de ce dépôt, voir les
constats A3 — l'écrivain doit **d'abord** livrer cette commande, comme changement
propre et séparé.

**Condition 6 — Séparation des rôles.** L'agent écrivain n'est ni le coordinateur, ni
l'auteur des constats qu'il traite, ni l'agent adverse A6. Celui qui a produit un
constat ne se juge pas lui-même en écrivant le correctif.

Tant que ces six conditions ne sont pas réunies, l'état du protocole reste
**diagnostic seul**.

---

## 7. PHASES

| Phase | Objet | Sortie |
|---|---|---|
| **0. Préflight** | Verrouiller dépôt, SHA, runtime, périmètre, budget, condition terminale | §1 de ce manifeste |
| **1. Cartographie** | Inventaire composants, contrats, entrées/sorties, tests, dépendances, **zones inconnues** | §2 + `MATRICE_COUVERTURE.md` |
| **2. Exploration ciblée** | Une question falsifiable et un périmètre fermé par sous-agent | `REGISTRE_CONSTATS.jsonl` |
| **3. Contre-audit** | Réfutation des constats majeurs par un agent adverse indépendant, en lecture seule | `REGISTRE_CONTRADICTIONS.md` |
| **4. Synthèse probante** | Registre consolidé, contradictions et inconnues **conservées** | `RAPPORT_TERMINAL.md` |

La phase 1 doit produire les **zones inconnues** au même titre que les composants
connus. Une cartographie qui n'énumère pas ce qu'elle n'a pas vu est une cartographie
qui se déclare complète sans preuve — interdit n°3.

---

## 8. CONDITION TERMINALE

`DONE` **uniquement si** les cinq conditions sont réunies :

1. les six artefacts existent ;
2. le pilote est rejouable — chaque constat porte une commande exécutable telle quelle ;
3. chaque constat majeur est prouvé, ou explicitement marqué `NON_VÉRIFIÉ` / `NON_MESURÉ` ;
4. aucune modification produit n'a été effectuée ;
5. le protocole précise comment un futur agent écrivain sera désigné (§6).

Sinon, un et un seul état de sortie :

| État | Déclencheur |
|---|---|
| `BLOCKED_PRECONDITION` | dépôt, SHA, autorité ou runtime manquant ou non verrouillable |
| `FIX_REQUIRED` | le protocole existe mais n'est pas traçable ou rejouable |
| `BLOCKED_MAJOR` | l'architecture courante empêche l'isolation des agents |

---

## 9. CHAÎNE DE TRAÇABILITÉ

Chaque ligne de `REGISTRE_CONSTATS.jsonl` permet de remonter une preuve dans cet ordre,
sans étape manquante :

```
dépôt → branche → SHA → fichier → ligne/symbole → commande/test → résultat
```

Pour rejouer une preuve :

```sh
git rev-parse HEAD                 # doit valoir le champ sha du constat
git status --porcelain             # doit être vide
# puis exécuter le champ commande du constat, tel quel, depuis la racine
```

Si `git rev-parse HEAD` ne correspond pas au champ `sha`, **la preuve n'est pas
rejouée** : elle est réexécutée dans un autre état, ce qui est un résultat différent.
Interdit n°5.

---

## 10. AMENDEMENTS v1.1 — ISSUS DU CONTRE-AUDIT

Le pilote a été exécuté sur la version 1.0 de ce protocole. L'agent adverse A6 a fait tomber deux
constats majeurs (`A1-08`, `A3-08`) et a montré que, dans les deux cas, **la faute de l'agent était
rendue possible par une lacune du protocole**. Les six amendements ci-dessous sont la correction.

Ils sont normatifs : une exploration conduite sous v1.1 doit les appliquer.

### A1 — Contrôle positif obligatoire avant tout constat d'impossibilité

**Faille constatée.** Rien n'obligeait un agent à distinguer « ma méthode a échoué » de « l'artefact
a cette propriété ». `A3-08` a publié « 0 caractère lisible » comme fait observé, alors que c'était
l'échec de son propre décodeur.

**Règle.** Avant d'affirmer qu'une extraction, une lecture ou une mesure est **impossible**, l'agent
doit produire un **contrôle positif** : la démonstration que sa méthode réussit sur un cas de
référence connu. À défaut, le verdict est plafonné à `NON_VÉRIFIÉ` et le champ `fait_verifie` doit
être rédigé à la première personne méthodologique — « ma méthode X ne produit aucun résultat » — et
non comme une propriété de l'artefact.

**Corollaire.** Un échec d'outil doit citer le **filtre, format ou encodage réellement déclaré** par
l'artefact, pas seulement le symptôme. Lire `/Filter` sans lire sa composition, c'est ne pas l'avoir
lu.

### A2 — Définition normative du périmètre

**Faille constatée.** « Le dépôt » n'était jamais défini. Les constats mélangent trois périmètres, et
`A6-M2` comme `A6-M4` sont vrais ou faux selon la lecture retenue.

**Règle.** Tout constat porte désormais un périmètre explicite, choisi dans cette liste fermée :

| Périmètre | Signification |
|---|---|
| `ARBRE_SHA` | l'arbre du SHA verrouillé, et rien d'autre |
| `HISTORIQUE_LOCAL` | tous les objets atteignables du clone local |
| `REFS_DISTANTES` | toutes les têtes retournées par `git ls-remote` |
| `PROJET_HEBERGE` | + releases, tags, PR, issues, wiki, Actions |

Un constat dont l'énoncé franchit deux périmètres est **scindé en deux constats**, jamais fusionné.
Le verdict composite `CONFIRMÉ_AU_SHA_RÉFUTÉ_AU_PROJET` d'`A1-08` est l'exemple de référence.

### A3 — Commandes d'établissement de périmètre imposées en préflight

**Faille constatée.** `A1-08` a affirmé « aucune branche alternative ne porte de code » depuis un
clone dont **4 des 6 refs manquaient**. Aucune étape ne pouvait le détecter.

**Règle.** Le préflight exécute et consigne obligatoirement :

```sh
git ls-remote --heads origin                                   # réalité du distant
git for-each-ref refs/remotes --format='%(refname)' | wc -l    # cache local
git rev-parse --is-shallow-repository                          # troncature ?
git config --get remote.origin.fetch                           # refspec complet ?
```

Si le nombre de refs locales **diffère** du nombre de têtes distantes, l'écart est consigné en
préflight et **aucun constat ne peut porter le périmètre `REFS_DISTANTES`** sans une observation
distante explicite. `git branch -a` ne lit qu'un cache : il ne prouve jamais l'état du distant.

### A4 — Arbitrage automatique des contradictions inter-agents

**Faille constatée.** `A3-08` et `A5-05` se contredisaient frontalement sur un fait **binaire,
vérifiable en une commande**, et les deux ont survécu jusqu'à l'agent adverse.

**Règle.** Le coordinateur compare les constats deux à deux sur la clé
`(fichier, lignes_symbole, périmètre)`. Toute paire dont les `fait_verifie` sont incompatibles
déclenche un **arbitrage immédiat par commande**, avant la phase de contre-audit. Le résultat est
inscrit dans `REGISTRE_CONTRADICTIONS.md` avec l'énoncé fautif conservé.

L'agent adverse n'est pas le mécanisme de détection des contradictions : il est le dernier filet.

### A5 — Couplage du niveau de confiance et de la modalité de l'énoncé

**Faille constatée.** Le garde-fou `NON_VÉRIFIÉ` d'`A3-08` a bien empêché la propagation de la
conclusion, mais **le corps du constat affirmait quand même un fait faux au présent de l'indicatif**.
Le niveau de confiance protégeait la conclusion, pas l'énoncé.

**Règle.** La modalité grammaticale de `fait_verifie` suit le verdict :

| Verdict | Modalité imposée |
|---|---|
| `CONFIRMÉ` | présent de l'indicatif — « le dépôt contient… » |
| `RÉFUTÉ` | présent de l'indicatif portant sur la **négation** |
| `NON_VÉRIFIÉ` | conditionnel ou attribution explicite à la méthode |
| `NON_MESURÉ` | **obligation de nommer l'instrument manquant** dans `fait_verifie` |

### A6 — Preuve d'un dénombrement exhaustif

**Faille constatée.** Le plafond de 5 lignes de preuve a tronqué l'inventaire d'`A1-01`, qui omet le
6ᵉ fichier tout en affirmant l'exhaustivité (`C-05`).

**Règle.** Le plafond de 5 lignes est **conservé** — sans lui, un agent noie le contexte du
coordinateur, ce que ce protocole existe précisément pour empêcher. Mais quand la preuve *est* un
dénombrement exhaustif, l'agent fournit le **compte total** (`| wc -l`) **plus** un échantillon, et
jamais un échantillon seul.

### Faille reconnue et NON corrigée

**La déférence de plausibilité n'est pas budgétée.** A6 a relevé que `A4-08` et `A6-M1` étaient
corrects, mais que leur étayage publié ne permettait pas de les distinguer d'affirmations plausibles
non vérifiées : `A4-08` n'avait documenté ni la résolution du graphe d'objets, ni le fait que la
police porte tout le corps de texte. Le protocole récompense la conclusion juste, pas la preuve
suffisante.

Aucune règle mécanique proposée ici ne corrige ce point sans imposer un coût de vérification
disproportionné. **Il reste une faille ouverte**, consignée plutôt que masquée.
