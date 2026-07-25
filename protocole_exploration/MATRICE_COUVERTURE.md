# MATRICE DE COUVERTURE

Dépôt : `Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence`
Branche : `claude/multi-agent-exploration-protocol-26l1c5`
SHA : `cdf9039777b4f71f62153a06d96ecf949ed94cc5`

---

## AVERTISSEMENT MÉTHODOLOGIQUE — CE QUE CETTE MATRICE NE MESURE PAS

**Le nombre de fichiers lus n'est pas une couverture.** Les 6 fichiers suivis ont tous été lus par
au moins un agent, et cela n'établit **aucune** propriété du dépôt. C'est un interdit explicite du
protocole (interdit n°4).

Ce qui est mesuré ici, c'est **quels axes ont été interrogés, par quelle commande, avec quel
instrument, et où l'instrument manquait**.

Corollaire établi par le constat `A3-02` : sur ce dépôt, la **couverture de code n'est pas
définissable**. Elle est un rapport dont le dénominateur est l'ensemble des unités exécutables ;
ce dénominateur vaut 0. La couverture n'est donc pas « de 0 % », elle est **indéfinie**. Aucun
pourcentage ne doit être produit pour ce SHA.

---

## 1. COUVERTURE PAR AXE

| Axe | Agent | Constats | Question falsifiable tranchée ? | Instrument suffisant ? |
|---|---|---|---|---|
| Architecture et flux | A1 | 8 | Oui — aucun artefact exécutable au SHA | Oui (git plumbing) |
| Contrats et invariants | A2 | 12 | Oui — 9 affirmations traitées une par une | Oui après correction de méthode PDF |
| Tests et couverture | A3 | 8 | Oui — aucune vérification au SHA ; CI trouvé hors SHA | **Non** sur les PDF (méthode fautive, voir `C-01`) |
| Persistance et dépendances | A4 | 10 | Oui — 2 artefacts uniques sur 4 chemins | Partiel — aucun moteur de rendu PDF |
| Sécurité et confidentialité | A5 | 10 | Oui — 26 familles de motifs testées | Oui pour le texte ; partiel pour la stéganographie |
| Audit adverse | A6 | 9 contre-audits | Oui — 2 constats majeurs abattus, 1 partiellement | Oui, + accès API GitHub en lecture |

**Total : 48 constats d'exploration + 9 contre-audits = 57 lignes de registre.**

### Résultat du contre-audit adverse

| Résultat | Constats |
|---|---|
| `CONFIRMÉ_MALGRÉ_ATTAQUE` | `A4-01`, `A2-12`/`A5-08`, `A2-06`, `A3-05`, `A5-01`, `A4-08` (6) |
| `RÉFUTÉ_PAR_A6` | `A3-08` (méthode d'extraction), `A1-08` (portée des branches) (2) |
| `PARTIELLEMENT_RÉFUTÉ` | `A2-10` (vrai au SHA, faux au projet) (1) |

A6 s'est vu interdire de confirmer un constat sans documenter **au moins 2 angles d'attaque
distincts**. Les 9 contre-audits en documentent de 5 à 9 chacun. Deux constats sur neuf sont tombés :
c'est le taux qui rend le contre-audit crédible — un contre-audit qui confirme tout ne mesure rien.

---

## 2. COUVERTURE PAR FICHIER × AXE

Lecture : ✅ axe instruit et conclu · ➖ lu mais hors axe (délégué) · ⬜ non instruit

| Fichier | A1 struct. | A2 contrats | A3 vérif. | A4 conteneur | A5 sécu. |
|---|---|---|---|---|---|
| `LICENSE` | ✅ | ✅ `A2-09` | ⬜ | ➖ | ✅ `A5-02`, `A5-03` |
| `README.md` | ✅ `A1-04`, `A1-05` | ✅ `A2-01`, `A2-10` | ✅ `A3-03` | ➖ | ✅ `A5-10` |
| `Zoran_2040_aSiM_WhitePaper.pdf` | ➖ | ✅ (prose, secondaire) | ✅ `A3-08` (méthode fautive) | ✅ `A4-02`,`A4-03`,`A4-05` | ✅ `A5-05`,`A5-06` |
| `..._FULL.pdf` | ✅ `A1-06` | ✅ `A2-03`→`A2-11` | ✅ `A3-08` (méthode fautive) | ✅ `A4-01`→`A4-09` | ✅ `A5-05`,`A5-06` |
| `..._FULL (1).pdf` | ➖ | ➖ (vérifié sans mesure add.) | ⬜ | ✅ `A4-01` | ✅ `A5-05` (via blob) |
| `..._FULL (2).pdf` | ➖ | ➖ (vérifié sans mesure add.) | ⬜ | ✅ `A4-01` | ✅ `A5-05` (via blob) |
| Historique git (3 commits, 11 objets) | ✅ `A1-02` | ✅ `A2-02` | ✅ `A3-04` | ✅ `A4-10` | ✅ `A5-01`,`A5-04`,`A5-08` |

Les 3 fichiers `_FULL` partageant le blob `cc048f6`, une analyse de contenu sur l'un couvre les
trois — c'est un fait établi (`A4-01`), pas une économie de moyens.

---

## 3. ZONES NON COUVERTES — DÉCLARÉES PAR LES AGENTS EUX-MÊMES

Cette section est le cœur de la matrice. Chaque agent devait énumérer ce qu'il n'avait **pas**
couvert. Une cartographie qui n'énumère pas ses trous se déclare complète sans preuve.

### Instruments absents du runtime (limite structurelle, déclarée en préflight)

| Instrument manquant | Conséquence | Constats affectés |
|---|---|---|
| `pdftotext`, `pdfinfo`, `qpdf`, `pypdf` | Aucun extracteur de référence pour croiser les résultats | `A3-08`, `A5-05` |
| `pdftoppm`, `mutool`, `ghostscript` | **Aucune page n'a été rendue visuellement.** Impossible d'affirmer que les 10 pages contiennent du texte lisible plutôt que des glyphes manquants | `A4-08` (`NON_MESURÉ` sur l'effet visuel) |
| `coverage`, `pytest` | Aucune mesure de couverture possible — mais rien à mesurer | `A3-02`, `A3-07` |
| Installation de paquets interdite | Les trois limites ci-dessus ne pouvaient pas être levées pendant l'exploration | — |

### Zones hors de portée d'une inspection locale

| Zone | Statut | Qui l'a déclarée |
|---|---|---|
| Métadonnées GitHub hors git : issues, PR, discussions, releases, wiki, tags | **NON_MESURÉ** | A1, A5 |
| Logs des 16 exécutions CI : les tests sont-ils réels ou une suite vide ? | **NON_MESURÉ** → confié à A6 (M5) | A3 |
| Fichiers `*.test.*` de la branche `claude/routine-cognitive-mvp-BQ9nA` | **NON_MESURÉ** | A3 |
| Protections de branche, required status checks, rulesets | **NON_MESURÉ** | A3 |
| 3 des 4 workflows distants (`build-apk.yml`, `deploy-pages.yml`, `pages.yml`) | **NON_MESURÉ** — seul `ci.yml` a été lu | A3 |
| Les 5 branches distantes hors `main` | **NON_MESURÉ au moment de A1/A4** — révélé par `C-03` | A5 (honnêtement déclaré), A1 (non vu) |

### Zones techniques non instruites

| Zone | Statut | Qui l'a déclarée |
|---|---|---|
| Table xref des PDF, validée offset par offset | NON_VÉRIFIÉ (cohérence `/Size` et `/Count` vérifiée, pas les offsets) | A4 |
| Stéganographie dans les opérandes numériques (`/Widths`, matrices de position, flux d'image) | **NON_MESURÉ** — l'extraction ne récupère que les chaînes de texte | A5 |
| Entropie statistique des flux PDF (charge chiffrée) | **NON_MESURÉ** — faute d'outillage ; taille des fichiers (6,7 et 13,5 Ko) laisse peu de marge | A5 |
| Police `HeiseiMin-W3` réellement invoquée par un flux de page ? | NON_VÉRIFIÉ → confié à A6 (M7) | A4 |
| Opérateurs de texte PDF `TJ`, `'`, `"` (A1 n'a traité que `Tj`) | Corrigé par la méthode canonique d'`outils/pdftext.py` | A1 |
| Validité juridique de MIT et titularité réelle des droits sur les PDF | Hors compétence — aucun avis de droit rendu | A5 |
| Affirmations comparatives GPT-4o / Claude 3 / Gemini Ultra / Mistral du white paper | Hors des 9 affirmations assignées | A2 |

---

## 4. CONTRÔLE D'INTÉGRITÉ — AUCUNE ÉCRITURE PRODUIT

Chaque agent devait clore sa mission en rapportant l'état du dépôt.

| Agent | `git status --porcelain` | `git rev-parse HEAD` | Conforme |
|---|---|---|---|
| A1 | vide | `cdf9039…4cc5` | ✅ |
| A2 | vide (`wc -l` = 0) | `cdf9039…4cc5` | ✅ |
| A3 | vide (code retour 0) | `cdf9039…4cc5` | ✅ |
| A4 | vide (code retour 0) | `cdf9039…4cc5` | ✅ |
| A5 | vide (code retour 0) | `cdf9039…4cc5` | ✅ |
| A6 | voir `RAPPORT_TERMINAL.md` | voir `RAPPORT_TERMINAL.md` | ✅ |
| Coordinateur | vide, vérifié après chaque étape | `cdf9039…4cc5` | ✅ |

Les 6 sous-agents ont été instanciés avec un profil dépourvu des outils `Write`, `Edit` et
`NotebookEdit` : la lecture seule est **structurelle**, pas seulement contractuelle. Les artefacts
du protocole ont été rédigés hors dépôt puis versés en une seule fois après le contrôle d'intégrité
d'A6, afin de ne pas salir le worktree que les agents devaient observer propre.

---

## 5. NON-CHEVAUCHEMENT DES PÉRIMÈTRES

Le protocole sépare par **axe d'analyse**, pas par fichier. Le chevauchement de *lecture* est
autorisé et déclaré ; le chevauchement de *conclusion* est interdit.

| Surface partagée | Agents qui la lisent | Qui a le droit de conclure | Respecté |
|---|---|---|---|
| Prose du white paper | A1, A2, A3, A5 | **A2 seul** | ✅ A1 délègue à A2 (`A1-05`), A4 délègue à A2 (`A4-09`) |
| Conteneur binaire des PDF | A1, A3, A4, A5 | **A4 seul** | ✅ A1 délègue explicitement à A4 (`A1-07`) |
| Motifs de secret / PII / endpoint | A4, A5 | **A5 seul** | ✅ A4 relève `/Info` factuellement et laisse A5 qualifier (`A4-04`) |
| Structure du dépôt | tous | **A1 seul** | ✅ A4 s'arrête sur la qualification « vitrine documentaire » (`A4-10`) |
| Duplication des PDF | A4, A5 | **A4 seul** | ✅ A5 relève le blob partagé « en passant » et ne l'instruit pas |

**Aucune écriture concurrente n'était possible** : aucun agent ne disposait d'outil d'écriture.
Trois délégations explicites ont été observées dans les retours (`A1-07` → A4, `A4-09` → A2,
`A5` → A4), ce qui indique que la règle a été comprise et appliquée, et non seulement énoncée.

---

## 6. REJOUABILITÉ

| Critère | État | Preuve |
|---|---|---|
| Chaque constat porte une commande exécutable | ✅ 48/48 | champ `commande` de `REGISTRE_CONSTATS.jsonl`, non vide sur les 48 lignes |
| Chaque constat porte le SHA | ✅ 48/48 | `SHA distincts: {cdf9039…}` — un seul SHA sur tout le registre |
| Chaque constat porte un niveau d'incertitude | ✅ 48/48 | champ `incertitude` |
| Chaque constat documente une tentative de réfutation | ✅ 48/48 | champ `contre_exemple_recherche` |
| Les commandes PDF longues sont factorisées et vérifiées | ✅ | `outils/pdftext.py`, sortie contrôlée par le coordinateur : 4720 car. (FULL), 2895 car. (court) |
| Un constat au moins a été invalidé par la rejouabilité | ✅ | `A3-08` — voir `REGISTRE_CONTRADICTIONS.md`, `C-01` |
