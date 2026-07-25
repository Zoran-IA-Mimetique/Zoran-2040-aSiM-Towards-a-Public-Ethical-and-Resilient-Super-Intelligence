# RAPPORT TERMINAL

Dépôt : `Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence`
Remote : `origin` → proxy d'agent local `127.0.0.1:41729`
Branche : `claude/multi-agent-exploration-protocol-26l1c5`
SHA : **`cdf9039777b4f71f62153a06d96ecf949ed94cc5`**
Worktree au départ : propre (`git status --porcelain --ignored` vide)
Runtime : Python 3.11.15 · Node v22.22.2 · git 2.43.0 · Linux 6.18.5 x86_64
Budget consommé : 6 sous-agents sur 6 autorisés · **0 agent écrivain**

---

## QUESTION

Mettre en place un protocole standard d'exploration de dépôt par sous-agents, afin d'éviter la
saturation du contexte principal, de réduire le bruit et de produire des constats rejouables — puis
le **tester sur un périmètre pilote**, sans aucune modification du code produit.

Le livrable est donc **le protocole**, et le dépôt n'est que le banc d'essai. Les constats sur le
dépôt sont le produit du test, pas son objectif.

---

## FAITS VÉRIFIÉS

### Sur le protocole (livrable principal)

1. **La lecture seule a été structurelle, pas seulement contractuelle.** Les 6 sous-agents ont été
   instanciés avec un profil dépourvu des outils `Write`, `Edit`, `NotebookEdit`. Les 6 ont rapporté
   `git status --porcelain` vide et `git rev-parse HEAD` = `cdf9039…4cc5` en fin de mission.
2. **L'isolation des périmètres a tenu.** Trois délégations explicites ont été observées dans les
   retours (`A1-07` → A4, `A4-09` → A2, A5 → A4) : la règle « axe exclusif de conclusion » a été
   appliquée, pas seulement énoncée.
3. **Le contre-audit adverse a réellement mordu.** Sur 9 constats majeurs attaqués, **2 sont tombés**
   (`A3-08`, `A1-08`) et 1 a été partiellement réfuté (`A2-10`).
4. **Le registre est mécaniquement traçable.** 57 lignes JSON, ids uniques, **un seul SHA**, aucun
   champ obligatoire manquant sur les 12 contrôlés.
5. **Le pilote est rejouable.** L'outil canonique `outils/pdftext.py` reproduit 4720 caractères
   (PDF FULL) et 2895 (PDF court) à partir de la stdlib seule.

### Sur le dépôt (résultat du test)

6. **Le dépôt ne contient aucun code.** 6 fichiers suivis, 0 sous-répertoire, 0 fichier de code, de
   test, de build ou de CI. La base d'objets git complète compte 11 objets et 3 commits.
7. **Il contient 2 artefacts PDF, pas 4.** Les trois `..._FULL*.pdf` partagent le blob
   `cc048f6d…` — identiques octet à octet, même mode, sur les 6 branches distantes (`A4-01`,
   confirmé sous 7 angles d'attaque par `A6-M1`).
8. **Le texte des PDF est intégralement lisible** après `ASCII85Decode` puis `FlateDecode` : 10 flux
   sur 10 se décodent.
9. **Sur les 9 affirmations du README, une seule est adossée à un artefact du dépôt** : la licence
   MIT (`A2-09`), dont le texte est canonique et complet.
10. **Le remote porte 6 branches, dont 5 hors `main`, toutes porteuses de code**, avec un CI réel :
    16 exécutions `success`, et **51 tests effectivement exécutés** (logs lus par `A6-M5`, hypothèse
    de la suite vide explicitement réfutée). **Aucune n'a jamais tourné sur `cdf9039`.**
11. **Aucun secret détecté sur 26 familles de motifs testées** (`A5-04`), motifs énumérés.
12. **Une adresse e-mail nominative est exposée** dans le champ auteur des 3 commits, sur un domaine
    propre — **et non** une redirection `users.noreply.github.com` (point décisif tranché par
    `A6-M6`). Elle n'est dans aucun blob : non corrigeable sans réécriture d'historique.
13. **Une seule URL existe dans tout le dépôt et son historique** : `http://www.reportlab.com`,
    injectée par l'outil de génération (`A5-07`).
14. **La police `HeiseiMin-W3` (CID Adobe-Japan1) n'est pas embarquée et porte tout le corps de
    texte** — établi par résolution du graphe d'objets et inventaire des opérateurs `Tf` (`A6-M7`).
    C'est la seule dépendance externe effective du dépôt, déclarée nulle part.

---

## DÉDUCTIONS

1. **Le protocole atteint son objectif de non-saturation.** Le coordinateur n'a jamais reçu de
   contenu de fichier brut : uniquement 57 constats structurés, plafonnés à 5 lignes de preuve. Les
   6 sous-agents ont consommé ~446 000 jetons dont aucun n'a transité par le contexte principal.
2. **Le dépôt est une publication documentaire, pas une distribution logicielle** — vrai au SHA, et
   à distinguer du projet GitHub, qui porte du code réel sur 5 branches non fusionnées.
3. **L'écart entre le README et le dépôt est un écart de périmètre, pas nécessairement une
   inexactitude.** Le README décrit vraisemblablement l'écosystème Zoran entier ; le texte, lui, ne
   fait pas cette distinction, et un lecteur attribue naturellement ses affirmations à ce dépôt-ci.
4. **La revendication « reproductible » n'a pas de chemin, même en portée projet.** `A6-M2` a bien
   trouvé des commandes rejouables (PR #1/#2/#3, `LANCER.md`) — mais elles reproduisent des
   applications satellites (PWA, moteur BTP, arbre 3D), **aucune affirmation du white paper**.
5. **Le document d'audit interne du projet acte lui-même l'écart.** `P0_5_SPEC.md` (branche `…pPfzR`)
   relève « un écart entre le vocabulaire utilisé (fractal, cohérence globale, attracteur) et les
   propriétés réellement démontrées ». La critique la plus forte du corpus vient du corpus.
6. **La tension RGPD est interne et mesurable** : le dépôt revendique la « minimisation RGPD » tout
   en publiant une adresse nominative non nécessaire sur 100 % de son historique (`A5-10`).

---

## HYPOTHÈSES

Énoncées comme telles, non prouvées, et non promues en faits.

1. Les composants nommés (Glyphnet, PolyResonator, EthicChain, ΔM11.3) existent hors de ce dépôt ;
   il ne permet ni de le confirmer ni de l'infirmer.
2. Un script générateur ReportLab existe hors dépôt : les PDF ne sont pas reproductibles depuis ici.
3. `HeiseiMin-W3` est un résidu de la configuration CID par défaut de ReportLab plutôt qu'un choix
   typographique.
4. Les suffixes `(1)` et `(2)` proviennent de renommages automatiques de navigateur, versés tels
   quels via l'upload GitHub.
5. La mesure « +20% » a été effectuée dans un environnement privé dont les JSON n'ont pas été
   versés. **Le constat `A2-06` porte sur l'absence d'adossement, jamais sur l'inexistence de la
   mesure** — cette distinction doit être maintenue.
6. La branche `…BQ9nA` n'a jamais été fusionnée dans `main` (déduit de `main == cdf9039`, pas d'un
   `git merge-base` exécuté).

---

## INCONNUS / NON_MESURÉ

**La couverture de code n'est pas définissable sur ce dépôt.** Elle est un rapport dont le
dénominateur est l'ensemble des unités exécutables ; ce dénominateur vaut 0. La couverture n'est donc
pas « de 0 % », elle est **indéfinie**. Aucun pourcentage n'a été produit, et aucun ne doit l'être
pour ce SHA.

| Inconnu | Pourquoi | Ce qu'il faudrait |
|---|---|---|
| Rendu visuel des PDF | Aucun moteur (`pdftoppm`, `mutool`, `ghostscript` absents) | Impossible d'affirmer que les 10 pages s'affichent lisiblement plutôt qu'avec des glyphes manquants |
| Contenu du wiki GitHub (`has_wiki: true`) | API directe bloquée, proxy ne sert pas `*.wiki.git` | `git ls-remote …/….wiki.git` |
| Assets réels des 2 releases | Seuls les corps de texte ont été lus | `get_release_by_tag` + inspection des assets |
| Stéganographie dans les opérandes numériques (`/Widths`, matrices, flux d'image) | L'extraction ne récupère que les chaînes de texte | Analyse des opérandes, entropie des flux |
| Table xref validée offset par offset | Seules les cohérences `/Size` et `/Count` ont été vérifiées | Parseur xref complet |
| Protections de branche, required status checks, rulesets | Non interrogés | API GitHub |
| 3 des 4 workflows distants (`build-apk`, `deploy-pages`, `pages`) | Seul `ci.yml` a été lu | Lecture des 3 restants |
| Le « +20% » a-t-il jamais été mesuré hors dépôt ? | **Indécidable depuis le dépôt** | Hors périmètre par construction |

---

## ARTEFACTS

Tous dans `protocole_exploration/`, **hors de tout chemin produit**.

| Artefact | Contenu |
|---|---|
| `MANIFESTE_EXPLORATION.md` | Protocole v1.1 : préflight, architecture d'agents, contrat de retour, interdits, désignation de l'écrivain, **6 amendements** issus du contre-audit |
| `REGISTRE_CONSTATS.jsonl` | 57 constats, chaîne `dépôt → branche → SHA → fichier → ligne/symbole → commande → résultat` |
| `MATRICE_COUVERTURE.md` | Couverture par axe et par fichier, **zones non couvertes déclarées par les agents eux-mêmes**, contrôle de non-chevauchement |
| `REGISTRE_CONTRADICTIONS.md` | 5 contradictions, énoncés fautifs conservés, 5 questions `NON_TRANCHABLES` |
| `INDEX_PREUVES.md` | Rejouabilité : empreintes, outil canonique, 3 pièges PDF documentés, commandes par thème |
| `RAPPORT_TERMINAL.md` | Ce document |
| `outils/pdftext.py` | Extracteur stdlib seule, sortie vérifiée (4720 / 2895 caractères) |

---

## TESTS DU PROTOCOLE

| Critère exigé | Résultat | Preuve |
|---|---|---|
| Absence de chevauchement non autorisé | ✅ | Aucun agent ne disposait d'outil d'écriture. 3 délégations explicites observées (`A1-07`, `A4-09`, A5) |
| Présence des références SHA et fichiers | ✅ | 57/57 lignes portent `sha` ; **un seul SHA distinct** sur tout le registre |
| Au moins un contre-audit réel | ✅ | A6 : 9 contre-audits, 5 à 9 angles d'attaque chacun, **2 constats abattus** |
| Conservation des contradictions | ✅ | `REGISTRE_CONTRADICTIONS.md` : énoncés fautifs conservés, pas effacés |
| Distinction faits / déductions / hypothèses | ✅ | Champs séparés `fait_verifie` / `deduction` / `hypothese` sur les 57 lignes |
| Absence d'écriture produit | ✅ | `git diff --stat HEAD -- LICENSE README.md '*.pdf'` → vide |
| Possibilité de rejouer les preuves | ✅ | `outils/pdftext.py` vérifié ; le rejeu a **invalidé** `A3-08` |

### Ce que le test a réellement démontré

Le protocole a **produit** la contradiction `C-01` mais ne l'a **pas résolue de lui-même** : deux
agents se contredisaient sur un fait binaire vérifiable en une commande, et les deux énoncés ont
survécu jusqu'à l'agent adverse. C'est le résultat le plus utile du pilote, et il est double :

- **Le garde-fou a fonctionné** : A3 a refusé de conclure (`NON_VÉRIFIÉ` + `HAUTE` + outil manquant
  nommé). Rien de faux ne s'est propagé vers la synthèse.
- **Le garde-fou était insuffisant** : le corps du constat affirmait quand même « 0 caractère
  lisible » au présent de l'indicatif. Le niveau de confiance protégeait la conclusion, pas
  l'énoncé.

Les six amendements v1.1 (§10 du manifeste) corrigent cela, plus la lacune de préflight qui a rendu
`A1-08` possible. **Une septième faille est reconnue et non corrigée** : la déférence de plausibilité
n'est pas budgétée — le protocole récompense la conclusion juste, pas la preuve suffisante
(`A4-08` était correct mais sous-étayé, indistinguable d'une affirmation plausible non vérifiée).

---

## CONTRADICTIONS

| # | Objet | Résolution |
|---|---|---|
| `C-01` | Méthode d'extraction PDF : `A3-08` contre `A2`/`A4`/`A5-05` | **Tranchée contre A3.** `/Filter` est une chaîne de 2 filtres ; zlib seul → 0/10, a85+zlib → 10/10. `A3-08` reclassé `NON_VÉRIFIÉ` → `RÉFUTÉ` |
| `C-02` | Clone supposé superficiel : `A1-02` contre `A3-04` | **Tranchée contre A1.** `is-shallow-repository` → `false`. Réserve falsifiée, incertitude `MOYENNE` → `BASSE` |
| `C-03` | Portée du mot « branche » : `A1-08` contre `A3-05` | **Tranchée contre A1.** 6 branches distantes contre 2 refs en cache local. Verdict composite conservé |
| `C-04` | Occurrences d'`http` : `A1-06` contre `A4-07` | **Contradiction apparente.** Surfaces différentes (texte décodé contre conteneur brut) ; les deux exacts. Conservée pour ne pas fusionner |
| `C-05` | Troncature de preuve à 5 lignes (`A1-01`) | **Coût du protocole.** Plafond conservé, règle amendée : compte total + échantillon |

Aucune contradiction ne reste ouverte entre agents. Cinq questions restent `NON_TRANCHABLES` faute
d'accès — elles ne doivent pas être confondues avec des contradictions résolues.

---

## ÉTAT FINAL

# DONE

Les cinq conditions terminales sont réunies :

| Condition | État |
|---|---|
| Tous les artefacts existent | ✅ 6 documents + 1 outil |
| Le pilote est rejouable | ✅ chaque constat porte une commande ; outil canonique vérifié |
| Chaque constat majeur est prouvé, ou marqué `NON_VÉRIFIÉ` / `NON_MESURÉ` | ✅ 30 `CONFIRMÉ`, 7 `RÉFUTÉ`, 6 `CONFIRMÉ_MALGRÉ_ATTAQUE`, 5 `NON_VÉRIFIÉ`, 4 `NON_MESURÉ`, 2 `RÉFUTÉ_PAR_A6`, 3 verdicts composites |
| Aucune modification produit | ✅ `git diff HEAD -- LICENSE README.md '*.pdf'` vide |
| La désignation d'un futur agent écrivain est spécifiée | ✅ manifeste §6, 6 conditions cumulatives |

**Ce qui n'est pas déclaré.** Le dépôt n'est déclaré ni complet, ni sain, ni prêt, ni certifié
(interdit n°3). Aucun pourcentage de couverture n'est produit (interdit n°4). Le protocole lui-même
n'est pas déclaré exempt de failles : six ont été corrigées, une reste ouverte et consignée.

---

## PROCHAINE DÉCISION REQUISE

**Aucune écriture produit n'est autorisée à ce stade.** Le diagnostic ne vaut pas autorisation.

Un `GO_CODE` distinct est requis, citant les identifiants de constats à traiter. Quatre chantiers
sont candidats, par ordre de coût croissant :

| Priorité | Objet | Constats | Coût |
|---|---|---|---|
| 1 | **Exposition de l'adresse e-mail nominative** — activer « Keep my email addresses private » ; toute anonymisation de l'historique exige `git filter-repo` (3 commits, coût faible) | `A5-01`, `A6-M6`, `A5-10` | Faible, mais réécriture d'historique |
| 2 | **Supprimer les 2 copies redondantes** `..._FULL (1).pdf` et `..._FULL (2).pdf` — 0 perte d'information, prouvée octet à octet sous 7 angles | `A4-01`, `A6-M1` | Trivial |
| 3 | **Cadrer le périmètre du README** — distinguer ce que ce dépôt livre de ce que l'écosystème Zoran revendique ; retirer ou étayer « reproductible », « vérifiable », « +20% mesurée », « double version .zgs » | `A2-06`, `A2-10`, `A2-12`, `A6-M2`, `A6-M3` | Éditorial, arbitrage du propriétaire |
| 4 | **Embarquer les polices PDF** ou basculer le corps de texte sur une police standard — 4720 caractères de français rendus via une police CID Adobe-Japan1 non embarquée | `A4-08`, `A6-M7` | Régénération des PDF |

Le chantier 3 relève d'un arbitrage éditorial qui appartient au propriétaire, non d'une correction
technique : le protocole a établi l'écart, il ne tranche pas ce qu'il faut en faire.

**Conditions de désignation de l'agent écrivain** (manifeste §6) : `GO_CODE` explicite · constats de
rattachement cités · **re-préflight au SHA courant** (si le SHA a bougé, les constats invoqués
repassent `NON_VÉRIFIÉ`) · un seul écrivain, périmètre de fichiers énuméré nommément · réversibilité
et commande de vérification nommées avant l'écriture · séparation des rôles (l'écrivain n'est ni le
coordinateur, ni l'auteur du constat, ni l'agent adverse).

Point d'attention pour le chantier 3 : **aucune commande de vérification n'existe pour ce dépôt**
(`A3-01`, `A3-02`). La condition 5 impose alors que l'écrivain **livre d'abord cette commande**,
comme changement propre et séparé.
