# Audit complet du dépôt `Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence`

**Date** : 2026-08-26
**Périmètre** : la branche `main` (HEAD `cdf9039`), les métadonnées GitHub (description, releases, tags, PR), et **les 8 branches de PR ouvertes**, chacune explorée jusqu'au bout (worktree dédié, lecture des fichiers, exécution réelle des tests quand c'était possible).
**Méthode** : audit direct de `main` et des deux branches documentaires ; 6 agents d'audit parallèles sur les 6 branches applicatives, avec exécution des suites de tests, vérification des affirmations des PR et recherche de secrets/données personnelles. Aucun fichier existant n'a été modifié : ce rapport est le seul ajout.

---

## 0. Synthèse exécutive

**Le verdict en une phrase** : `main` est un dépôt-vitrine de 6 fichiers dont aucune revendication n'est étayée par son contenu, et les 8 PR ouvertes en font un fourre-tout de projets sans rapport entre eux — dont plusieurs contiennent des problèmes graves (données de personnes réelles associées à des faits inventés, XSS, APK debug distribués au public, métriques auto-attribuées présentées comme des mesures).

**Bilan chiffré consolidé** (constats propres à chaque périmètre) :

| Périmètre | Critiques | Majeurs | Mineurs |
|---|---|---|---|
| `main` + métadonnées GitHub (§1–2) | 2 | 5 | 4 |
| PR #1 fractal-law-tree | 6 | 8 | 9 |
| PR #2 frames-cursors-engine | 2 | 8 | 15 |
| PR #3 routine-cognitive | 3 | 7 | 15 |
| PR #4 zoran-business-mobile | 4 | 10 | 14 |
| PR #5 plate-scan | 5 | 14 | 13 |
| PR #6 protocole exploration | 0 | 2 | 0 |
| PR #7 z-temps | 3 | 8 | 11 |
| PR #8 audit externe | 0 | 1 | 2 |
| **Total** | **25** | **63** | **83** |

**Les cinq constats les plus graves, tous périmètres confondus :**

1. **Des personnes réelles associées à des faits inventés, publiés** (PR #4) : 10 dirigeants d'entreprises réelles (Pomerleau, CAE, Bombardier, BNC, STM, CGI…) nommés et titrés, chacun affublé d'un « intérêt » commercial fabriqué pour ZORAN et de devis fictifs, qualifiés de « dossiers réels » par le README — exposition juridique directe, et contradiction frontale avec la « Loi 1 : jamais halluciner » du projet.
2. **Des APK Android signés en clé debug distribués au public** (PR #5) depuis une PR draft jamais revue, avec instruction de contourner Play Protect, sur la page Releases du dépôt white paper — et une app ANPR (plaques + GPS + photos) sans le moindre dispositif RGPD, dans un projet qui revendique la « conformité RGPD/AI Act ».
3. **L'écart systémique entre le discours et le contenu** : README de `main` sans un seul artefact à l'appui ; « conformité RE2020 » sur seuils inventés (PR #2) ; « pré-enregistrements » figés 18 secondes avant leurs résultats (PR #7) ; scores d'« honnêteté » auto-attribués à 1.000 et « validation réelle ≈ 0 % » admise (PR #1) ; rapports de tests cités comme preuves alors qu'aucune CI ne les exécute (PR #5, #2). C'est le motif récurrent de tout le dépôt : l'apparence de rigueur excède partout la rigueur réelle.
4. **Sécurité** : XSS stockée dans la version standalone de la PR #3 ; `npm audit` neutralisé par `|| true` avec 2 vulnérabilités critiques ; clé API Anthropic en localStorage navigateur (PR #1) ; serveurs de dev exposés `0.0.0.0` + CORS `*` sans auth (PR #2).
5. **Gouvernance à l'abandon** : `main` figé depuis un an, 8 PR ouvertes jamais fusionnées ni fermées (dont une de 202 675 lignes qui a servi de branche de développement permanente), descriptions de PR fausses sur les chiffres dans 4 cas sur 8 (PR #1, #2, #4, #7), releases et tags issus de branches non fusionnées.

---

---

## 1. La branche `main` — le dépôt « officiel »

`main` contient 6 fichiers : `README.md`, `LICENSE`, et 4 PDF. C'est tout. Constats :

### 1.1 Fichiers dupliqués commis par accident — MAJEUR
`Zoran_2040_aSiM_WhitePaper_FULL.pdf`, `…FULL (1).pdf` et `…FULL (2).pdf` sont **identiques octet par octet** (même md5 `6d6f55af…`). Les suffixes ` (1)`/` (2)` sont des renommages automatiques de navigateur au téléchargement, versés tels quels via l'upload GitHub. Deux des trois fichiers sont à supprimer ; les noms de fichiers contenant espaces et parenthèses sont en outre hostiles aux shells et aux URL.

### 1.2 Les affirmations du README ne sont adossées à rien dans le dépôt — CRITIQUE
Le README revendique : « +20% cohérence mesurée », « preuves techniques (100 POC, PolyResonator, mémoire fractale) », « chaque décision auditable via EthicChain », « conformité RGPD/AI Act », « reproductible, vérifiable et open source ». **Le dépôt ne contient ni code, ni données, ni métriques, ni lien vers quoi que ce soit qui étaye une seule de ces affirmations** — la seule affirmation vérifiable est la licence MIT. Un lecteur attribue naturellement ces revendications à ce dépôt-ci ; en l'état c'est de la sur-promesse invérifiable.

### 1.3 Le white paper contredit ses propres annexes — MAJEUR
Les annexes des deux PDF annoncent « Métriques brutes auditées exportées en JSON », « Format .zgs standard inclus », « Références : GitHub Zoran ». **Aucun JSON, aucun fichier .zgs, aucune référence résolvable n'est présent.** La bibliographie (« MMLU, GAIA, BigBench, RGPD, AI Act, UNESCO ») est une liste de noms sans une seule citation réelle (auteur, année, URL, DOI).

### 1.4 PDF : typographie cassée et police non embarquée — MAJEUR
Les deux PDF utilisent la police CID **HeiseiMin-W3** (Adobe-Japan1, police japonaise) **non embarquée** pour tout le corps de texte français — configuration par défaut de ReportLab. Conséquences visibles : les glyphes `Δ` et `↔` **ne se rendent pas** (« ΔM11.3 » s'affiche «  M11.3 », « IA↔IA » s'affiche « IA IA ») et le rendu dépend de la présence d'une police japonaise sur la machine du lecteur. Les apostrophes typographiques rendent aussi avec des espaces parasites (« l' intelligence »). Un white paper « stealth .zgs » annoncé en « double version » n'existe nulle part.

### 1.5 Comparatif obsolète et invérifiable — MINEUR
Le « Comparatif État de l'Art » (GPT-4o, Claude 3, Gemini Ultra, Mistral « mono-modèle ») était déjà daté à la publication (août 2025) et l'est encore plus aujourd'hui ; aucune source, aucun benchmark chiffré, uniquement des qualificatifs (« puissant mais fermé », « hallucinations massives »).

### 1.6 Hygiène de dépôt absente — MAJEUR
Manquent : `.gitignore`, `CONTRIBUTING.md` (alors que le README appelle à la « contribution ouverte via GitHub »), `CITATION.cff` (pour un white paper c'est le standard), `SECURITY.md`, code de conduite, topics GitHub, et **toute CI sur `main`**. Aucune release ne correspond au white paper lui-même.

### 1.7 Adresse e-mail nominative exposée — MINEUR (RGPD)
Les 3 commits de `main` portent `frederictabary@aiformpro.com` (domaine propre, pas une adresse `users.noreply.github.com`). Pour un projet qui met la « minimisation RGPD » au cœur de son discours, c'est une tension interne : l'adresse est dans 100 % de l'historique et n'est pas retirable sans réécriture (`git filter-repo`).

### 1.8 Licence MIT appliquée à un document — MINEUR
La licence MIT est une licence de **logiciel** (« the Software »). Pour un white paper, une licence de contenu (CC BY 4.0 par ex.) serait appropriée ; en l'état la MIT est juridiquement bancale pour un PDF.

### 1.9 Incohérence de nommage — MINEUR
Le sigle est écrit `aSiM` (README, nom du dépôt) pour « Artificial **S**uper **I**ntelligence **M**imétique » — l'ordre des majuscules/minuscules ne correspond pas au développé (on attendrait ASIM ou aSIM) ; « Super Intelligence » du titre du dépôt est en deux mots, « SuperIntelligence » ailleurs dans l'écosystème. La description GitHub mélange le pitch du white paper et la promotion d'un podcast Spotify avec un lien tracké (`?si=…`).

---

## 2. État GitHub : 8 PR ouvertes, toutes en dérive de périmètre — CRITIQUE (gouvernance)

Le dépôt affiche « 8 open issues » qui sont en réalité **8 pull requests ouvertes, dont 6 en draft, aucune fusionnée, la plus ancienne depuis mai 2026**. Toutes partent du même SHA `cdf9039` (main n'a pas bougé depuis le 17 août 2025) et **aucune n'a de rapport avec le white paper** :

| PR | Branche | Contenu réel | Ampleur |
|---|---|---|---|
| #1 | `claude/zoran-fractal-law-tree-pPfzR` | app 3D « arbre des lois » **puis dérive massive** | **450 fichiers, ~202 700 lignes** |
| #2 | `claude/frames-cursors-engine-eSEZG` | moteur de décision Python + UI | 32 fichiers, ~4 800 lignes |
| #3 | `claude/routine-cognitive-mvp-BQ9nA` | PWA React « Routine Cognitive » | 55 fichiers, ~14 100 lignes |
| #4 | `claude/zoran-business-mobile-app-fulkfa` | app commerciale HTML/JS | 9 fichiers, ~6 300 lignes |
| #5 | `claude/zoran-plate-scan-android-ux3zup` | app Android ANPR (plaques d'immatriculation) | 25 fichiers, ~2 200 lignes |
| #6 | `claude/multi-agent-exploration-protocol-26l1c5` | protocole d'exploration + audit du dépôt | 7 fichiers, ~1 300 lignes |
| #7 | `claude/z-temps-manifeste-v1-r57pby` | « Z-temps » : essais pseudo-scientifiques + code | 72 fichiers, ~10 000 lignes |
| #8 | `claude/zoran-ia-2025-audit-iqduyg` | audit d'un **autre** dépôt (`zorania2025/Zoran-IA-deteriniste`) | 1 fichier, 312 lignes |

Problèmes de gouvernance :
- **Le dépôt sert de fourre-tout** : cinq applications sans aucun lien entre elles ni avec le white paper vivent dans des PR jamais fusionnées ni fermées. Chacune mériterait son propre dépôt.
- **Des releases publiques sortent d'une branche de PR draft jamais fusionnée** : les releases `plate-scan-v1.0-6` et `v1.0-7` (APK Android signés **en clé debug**, publiés par github-actions) sont ce qu'un visiteur télécharge depuis la page Releases d'un dépôt qui se présente comme un white paper. APK en clé debug distribués au public = aucune chaîne de confiance, mises à jour impossibles (signature non stable), avertissements Play Protect assumés dans le texte de release (« Installer quand même ») — c'est une mauvaise pratique de distribution caractérisée.
- **Aucune PR n'est actionnée** : ni revue, ni merge, ni fermeture ; les branches divergent depuis 3 à 15 mois d'un `main` figé.
- Les deux tags `plate-scan-*` polluent l'espace de noms du dépôt white paper.

---

## 3. Audit par branche

### 3.1 PR #8 — `claude/zoran-ia-2025-audit-iqduyg` (audit d'un autre dépôt)

Un seul fichier ajouté, `AUDIT_ZORAN_IA_DETERINISTE_2026-08-25.md` (312 lignes) : audit détaillé et bien construit… **d'un dépôt tiers** (`zorania2025/Zoran-IA-deteriniste`).

- **[MAJEUR] Hors sujet par construction** : ce document concerne un autre dépôt d'un autre compte ; le fusionner ici mettrait à la racine du white paper l'audit d'un projet externe. Sa place est dans le dépôt audité (issue, ou fichier chez lui).
- **[MINEUR]** Le rapport référence des chemins personnels du dépôt audité (« MEMOIRE_PRIVEE_FREDERIC_TABARY », `C:\Users\frede…`) — republication de fuites de données personnelles déjà présentes ailleurs.
- **[MINEUR]** Aucun lien depuis le README ; s'il est fusionné tel quel, il flotte à la racine sans contexte.

### 3.2 PR #6 — `claude/multi-agent-exploration-protocol-26l1c5` (protocole d'exploration)

7 fichiers sous `protocole_exploration/` : manifeste de protocole, registre de 57 constats JSONL, matrices, rapport, extracteur PDF stdlib. Travail méthodologiquement soigné (contre-audit, contradictions conservées, hypothèses séparées des faits). Mais :

- **[MAJEUR] Artefacts de processus versionnés comme livrable** : c'est le journal d'une session d'exploration (budgets d'agents, jetons consommés, runtime de la machine) commité dans le dépôt. Ces métadonnées de session n'ont pas leur place dans l'arbre d'un projet public ; le protocole générique, lui, aurait sa place dans un dépôt d'outillage.
- **[MAJEUR] La PR attend une décision depuis juillet 2026** (« GO_CODE requis ») qui n'est jamais venue — le mécanisme de décision qu'elle instaure ne fonctionne que si le propriétaire répond ; en l'état, c'est une PR de plus qui s'empile.
- **[À NOTER]** Ses constats sur `main` (e-mail exposé, PDF triplé, README non adossé, police non embarquée) recoupent indépendamment les sections 1.1–1.7 du présent rapport — quatre chantiers correctifs y étaient déjà priorisés **et aucun n'a été exécuté depuis**.

### 3.3 PR #2 — `claude/frames-cursors-engine-eSEZG` (moteur de décision)

Moteur de décision Python « cadres & curseurs » + couche BTP/RE2020 + UI, 32 fichiers, ~4 800 lignes. Tests exécutés réellement : **84 passed** — la PR et `ENGINE.md` annoncent « 42 tests » (chiffre faux, resté figé) et **aucune CI ne les exécute**. **Décompte : 2 critiques, 8 majeurs, 15 mineurs.**

**Critiques :**
- **Fausse « conformité RE2020 » sur seuils inventés** : les seuils (`carbone: 0.6`, `energie: 0.45`… valeurs normalisées [0,1] arbitraires) n'ont aucun lien avec les indicateurs réglementaires réels (Ic construction/Ic énergie en kgCO2eq/m², Cep,nr, Bbio, DH). L'UI publiée affiche pourtant un verdict « Conformité RE2020 : Conforme » (`ui/standalone.html:704-719`) — affirmation réglementaire trompeuse pour un outil destiné au BTP.
- **Bug de propagation au cœur des 4 implémentations du moteur** : le delta brut est propagé même quand la source sature (clamp) — vérifié : `A=0.9`, delta `+0.5` → A ne monte que de 0.1 mais B reçoit l'effet de 0.5 (`btp_engine.py:143-148`, `decision_engine/engine.py:72-81`, moteur min, port JS). Résultats incohérents et silencieux.

**Majeurs (sélection)** : la suggestion « Améliorer le score global » **dégrade** le score (vérifié : 0.5746 → 0.5414) car `compute_score` moyenne les valeurs brutes sans direction min/max ; apprentissage statistique faux sur données incomplètes (covariance calculée sur des paires désalignées, vérifié) ; port JS du traducteur incomplet malgré la promesse « moteur identique » — 3 des 4 exemples cliquables de la démo publiée reposent sur des règles absentes du JS ; `decide()` renvoie un champ `impacts` qui est un alias de `decision` (contrat du docstring non rempli) ; `serve.py` écoute sur `0.0.0.0` avec CORS `*`, sans auth, et renvoie les exceptions brutes au client ; description de PR désynchronisée (couches omises, chiffres faux).

**Mineurs (sélection)** : quadruple implémentation du moteur avec dérive ; « exactement l'amortissement RE2020 » faux (la RE2020 utilise une ACV dynamique sur 50 ans) ; dataset « d'apprentissage » circulaire verrouillé par un test qui valide la circularité ; énumération de chemins exponentielle sans limite ; imports morts ; franglais systémique ; pas de packaging ni `conftest.py`.

**Jugement** : code propre et exécutable, mais un bug de fond dans le moteur et une prétention réglementaire RE2020 non fondée — maquette pédagogique honorable présentée comme un outil métier fiable.

### 3.4 PR #3 — `claude/routine-cognitive-mvp-BQ9nA` (PWA Routine Cognitive)

PWA React+TypeScript de « micro-actions cognitives », 55 fichiers, +14 107 lignes. Vérification par exécution réelle : `npm test` **51/51 OK**, lint **0/0**, build **OK** — les chiffres de la PR sont exacts. Mais `npm audit` révèle **13 vulnérabilités (2 critiques, 7 high)**, jamais mentionnées. **Décompte : 3 critiques, 7 majeurs, 15 mineurs.**

**Critiques :**
- **Dérive de périmètre totale** : une app de bien-être à la racine d'un dépôt de white paper, et `.github/workflows/deploy-pages.yml` **s'approprie le GitHub Pages du dépôt** pour servir l'app à l'URL du white paper dès merge sur main.
- **XSS stockée dans la version standalone** : `standalone/routine-cognitive.html` injecte `suggestedTime`/`id` importés depuis un JSON dans du `innerHTML` sans échappement (`doImport()` ~l.395 → `editor()` ~l.280) — un fichier importé malveillant exécute du script. La version Vite assainit, la standalone non, en contradiction avec la « REGLE 9 » que la PR coche « OK ».
- **Audit de sécurité neutralisé** : `ci.yml:36` `npm audit --audit-level=high || true` — l'étape ne peut jamais échouer, même avec 2 vulnérabilités critiques sur dépendances directes.

**Majeurs (sélection)** : application intégralement dupliquée en deux implémentations déjà divergentes (validation, cadence des notifications, quotas — double maintenance garantie de casser) ; statut « Ignorées » affiché partout mais **inatteignable** (aucun chemin de code ne le définit) ; bouton « PLUS TARD » **sans effet** (l'anti-doublon empêche toute re-notification) ; notifications perdues pour la journée si la permission est accordée en cours de journée ; action de notification perdue si l'app est fermée (rejeu promis en commentaire, jamais implémenté) ; réglages horaires non validés côté React (champ vidé → plus aucune notification, silencieusement) ; promesse d'installation PWA standalone irréalisable en `file://`.

**À noter** : la PR revendique la conformité à `BEST_PRACTICES_CODING.md`… qu'elle crée elle-même dans le même commit — auto-certification. Mineurs : index IndexedDB déclaré jamais créé, code mort, CSS mort, tri cassé pour les routines à 00:00, accessibilité lacunaire, manifest `lang:"en"` pour une app française, ESLint EOL.

**Jugement** : les preuves chiffrées sont exactes et le code React correct, mais deux fonctionnalités annoncées n'existent pas, la sécurité est neutralisée en CI, et l'ensemble est hors périmètre.

### 3.5 PR #4 — `claude/zoran-business-mobile-app-fulkfa` (ZORAN Biz Mobile)

App commerciale HTML/CSS/JS sans dépendance, 9 fichiers, ~6 300 lignes. `node --check` OK, `node tests/run-cases.js` passe (« 10/10 ») — mais le test **réécrit un fichier versionné** à chaque exécution (arbre git sale). **Décompte : 4 critiques, 10 majeurs, 14 mineurs.**

**Critiques :**
- **Données personnelles de personnes réelles + faits fabriqués, commités et publiés** : `tests/run-cases.js:33-72` contient 10 entreprises réelles (Pomerleau, AtkinsRéalis, CAE, Bombardier, Banque Nationale, BFL, STM, Dialogue, CGI, Metro) avec **dirigeants réels nommés et titrés**, chacun associé à un « intérêt » commercial **inventé** pour ZORAN et à des devis/ROI fictifs — le README les qualifie de « 10 dossiers réels ». Plusieurs titres sont inexacts ou périmés. Contradiction frontale avec la « Loi 1 : jamais halluciner » revendiquée par le projet, et exposition juridique (données personnelles + affirmations commerciales fausses attribuées à des personnes réelles, sous licence MIT publique).
- **Extraction PDF/Word largement factice** : `extractPdfText` ne fonctionne que sur des PDF non compressés (quasi inexistants) ; le repli regex sur du binaire injecte du **pseudo-texte aléatoire** dans l'analyse ; `.doc`/`.rtf`/`.msg`/images lus comme binaire brut sans filtre. La PR vend un « import tous formats » fonctionnel ; seuls les formats texte marchent.
- **Chiffres commerciaux inventés présentés comme des calculs** : tarifs 130–240 €/user/an, « dette documentaire 0,15 €/document/an », « 1 à 2 h par jour » sous la rubrique « Preuves » — sans source ; et le test **échoue si le ROI n'est pas vendeur** (ROI ≤ 0 ou payback > 12 mois = échec), assertion marketing garantissant des ROI affichés de 600 à 1 741 %.
- **Octet NUL brut (0x00) dans les sources** (`app.js:358`, standalone:1750) : git et grep traitent ces fichiers comme binaires, diffs illisibles.

**Majeurs (sélection)** : standalone de 2 691 lignes = duplication byte-à-byte des 4 fichiers sans script de build (divergence garantie) ; fonctionnalité d'import JSON documentée dans le README **inexistante** dans l'app ; bug du reset (formulaire garde les anciennes valeurs + listeners empilés en double) ; export JSON invalide (BOM `﻿` — `JSON.parse` échoue, vérifié) ; champ `state.client.secteur` inexistant → le secteur n'apparaît jamais dans les livrables ; formules ROI dupliquées avec défauts divergents (deux sources de vérité) ; devise `€` codée en dur pour des prospects montréalais (CAD) ; corps de PR omettant 42 % du diff ; API `readAsBinaryString` dépréciée.

**Point positif** : pas de XSS — `escapeHtml` appliqué systématiquement avant chaque `innerHTML` (vérifié ligne à ligne).

**Jugement** : démonstration commerciale maquillée en produit ; point bloquant absolu avant tout merge : la publication de dossiers commerciaux fabriqués attribués à dix dirigeants réels nommément cités.

### 3.6 PR #5 — `claude/zoran-plate-scan-android-ux3zup` (Plate Scan Pro)

App Android Flutter de lecture de plaques (ANPR) pour agents de stationnement. 25 fichiers, +2 203 lignes ; 1 commit de création + 6 commits de rafistolage CI. **Décompte : 5 critiques, 14 majeurs, 13 mineurs.**

**Critiques :**
- **RGPD totalement absent** : l'app collecte plaques + GPS + adresse + photos de voie publique + identifiant agent, pour un usage de contrôle du stationnement (traitement type LAPI), sans base légale documentée, sans information des personnes, sans durée de conservation, sans chiffrement au repos (SQLite et photos en clair), sans contrôle d'accès, avec exports non chiffrés partageables (`export_service.dart:20-23`). Le dépôt hôte revendique pourtant « conformité RGPD/AI Act ».
- **GPS falsifié silencieusement** : en cas de timeout, `location_service.dart:39,67-78` enregistre `Position(0,0)` (golfe de Guinée) comme vraie position, affichée « GPS : Oui » dans les exports — falsification d'une donnée à vocation probatoire.
- **La « purge irréversible » n'efface pas les photos** : `event_repository.dart:81-89` supprime les lignes SQLite mais laisse les images sur disque à jamais — droit à l'effacement impossible.
- **APK signé en clé debug publié en Release publique** depuis une PR draft non revue, avec instruction de contourner Play Protect (« Installer quand même ») ; la clé debug est régénérée à chaque run CI → chaque mise à jour exige une désinstallation, donc **perte de toutes les données**.
- **Chaîne de preuve fictive** : `TEST_REPORT.md` et `TRACEABILITY.json` citent comme preuve des « tests en CI » — le workflow n'exécute **aucun** test et `flutter analyze` est neutralisé par `|| true`.

**Majeurs (sélection)** : workflow déclenché uniquement sur la branche de PR (mort après merge) ; `pubspec.lock` exclu du versionnage (builds non reproductibles — cause directe des 6 commits de rafistolage) ; `android/` non versionné et régénéré puis rustiné par regex sans vérification (`tool/patch_android.py:70-150`) ; R8 désactivé au lieu de règles ProGuard (APK 91 Mo non obfusqué) ; permission caméra jamais gérée (`permission_handler` déclaré mais jamais importé ; refus → spinner infini) ; fuite de stockage (les JPEG de capture en boucle ne sont jamais supprimés — saturation en quelques heures d'usage) ; validation SIV fausse (lettres interdites I/O/U non vérifiées sur le groupe final, corrections OCR produisant des plaques impossibles marquées valides) ; aucun support FNI/plaques étrangères (cas quotidien du métier, non documenté comme limite) ; score de confiance « 92 % » en grande partie une constante forgée (0.85 par défaut, `plate_detector.dart:94-102`) ; crop de preuve potentiellement faux (rotation EXIF non appliquée au décodage) ; copie automatique de la plaque dans le presse-papiers global (canal de fuite par conception) ; fichier APK annoncé dans le README inexistant sous ce nom ; contrôleurs Flutter non `dispose()`.

**Jugement** : code superficiellement propre, plausible en démo, mais inéligible à tout déploiement réel ; la documentation qualité affirme des preuves qui n'existent pas — l'apparence de rigueur excède largement la rigueur réelle.

### 3.7 PR #7 — `claude/z-temps-manifeste-v1-r57pby` (Z-temps)

« Essais » à prétention scientifique + code Python (ztemps/, zoran/), 72 fichiers, ~10 030 lignes. Tests exécutés réellement : **124 tests, 123 passés, 1 ignoré** — la PR annonce « 117 tests » : chiffre faux, et c'est précisément le « défaut d'audit n°1 » (description périmée) que cette PR prétendait corriger, reproduit à l'identique. Les 8 scripts d'essais régénèrent des JSON strictement identiques aux fichiers commis (reproductibilité déterministe vérifiée). **Décompte : 3 critiques, 8 majeurs, 11 mineurs.**

**Critiques :**
- **Le « pré-enregistrement » est un théâtre de pré-enregistrement** : horodatages git vérifiés — protocole « figé » 18 secondes à 2 minutes 24 avant la publication des résultats, avec le script d'analyse et ses seuils déjà commis dans le commit de « gel » ; pour deux essais, **les données analysées sont dans le même commit que le protocole**. La phrase de la PR (« l'antériorité du protocole est vérifiable dans l'historique ») est littéralement vraie mais matériellement trompeuse : même auteur, même session, aucun registre externe.
- **La seule pièce quasi empirique du corpus est invérifiable** : le « pilote V1.5 » cite « deux jeux de données publics » sans DOI, citation, ni code source des valeurs ; le « 98.8 % » et le « facteur 41 » mis en avant dans PR et README sont bâtis sur trois nombres non traçables.
- **Chiffre de tests faux dans la PR** (117 vs 124 réels), cf. ci-dessus.

**Majeurs (sélection)** : le verrou anti-fuite calibration/évaluation, vendu comme « rendu exécutable », est **contourné par les essais eux-mêmes** (le jeu de calibration déclaré = exactement les événements évalués ; provenance satisfaite par des chaînes bidon) ; TAU-004 « PRÉDICTION CONFIRMÉE à 2.6·10⁻¹⁵ » est une identité algébrique du propre simulateur du dépôt — le critère énoncé dans la rétractation de FORME-006 (« une précision de 10⁻⁷ aurait dû m'alerter ») condamne TAU-004, qui garde pourtant son label ; tous les seuils des essais 001→007 sont des nombres posés sans dérivation, alors que le dépôt refuse ailleurs tout `SEUIL_NON_CALIBRÉ` ; script Qiskit revendiqué « il fonctionne » alors qu'il déclare lui-même n'avoir jamais été exécuté ; la source normative du volet `zoran/` est un **.docx binaire de 108 Ko** invérifiable en revue ; la « promotion sur sept critères » est déclarative (toute chaîne non vide satisfait le critère) ; codage documentaire de **jumelles conjointes réelles nommées** à partir de sources de seconde main ; dérive de périmètre complète (pronostic de roulements à billes et de packs batterie dans un dépôt de white paper IA).

**Points au crédit** : suite verte et déterministe, rétractation et verdicts négatifs réellement publiés, formule S effectivement bloquée sans contrat.

**Jugement** : exercice d'auto-falsification simulée soigné mais autoréférentiel — aucune mesure du monde, des « confirmations » qui sont des identités algébriques de son propre simulateur, sous un appareil de rigueur en grande partie décoratif.

### 3.8 PR #1 — `claude/zoran-fractal-law-tree-pPfzR` (arbre fractal + dérive massive)

La plus grosse branche : **125 commits, 450 fichiers, 202 675 lignes ajoutées**. La PR décrit une app 3D « 50 lois » ; la branche a servi de branche de développement permanente (imposé par son propre `CLAUDE.md` : « toute modification doit se faire sur `claude/zoran-fractal-law-tree-pPfzR` »). **Décompte : 6 critiques, 8 majeurs, 9 mineurs.**

**Critiques :**
- **Description de PR intégralement périmée/fausse** : la PR annonce « 50 lois, 106 liens, 10 familles, DOI » et colle une sortie de tests — réel exécuté : **242 nœuds, 286 arêtes, 8 familles, 0 DOI** ; les familles VAR et ISO n'existent plus ; la sortie de tests publiée est irreproductible. L'URL d'aperçu de la PR est en outre syntaxiquement cassée (backticks/parenthèses inversés — l'image ne se rend pas).
- **~96 % des fichiers (433/450) ne sont mentionnés nulle part dans la PR**, dont `audit/` : 312 fichiers, 99 649 lignes — **49 % de la diff** est constituée de rapports d'auto-audit.
- **Scores auto-attribués présentés comme des mesures** : « HS (honesty): 1.000 », « S_global 0.896 », rapports de « supériorité ZORAN vs Claude brut » produits par un script qui avoue lui-même « MODE OFFLINE — pas d'appel LLM. Scores heuristiques » ; ~140 champs de pseudo-métriques par nœud (`anti_hallucination_score`, `superior_law_probability`…) sans aucun protocole externe. `audit/TICKETS_PROGRESS.md:11` reconnaît : « **Progression VALIDATION RÉELLE ≈ 0 %** ».
- **Tests commis cassés** (vérifié) : 6 scripts importent des modules supprimés par les commits « REMOVE » → `ERR_MODULE_NOT_FOUND`.

**Majeurs (sélection)** : chemins machine codés en dur (`/opt/node22/...playwright`) dans 3 outils — contredit le ticket « validation clone propre : PASS » ; tag git revendiqué (`frozen-core-reference`) inexistant ; README auto-contradictoire (91 lois vs 45 vs 242 réelles ; « 22 documents Oracle » vs 312 fichiers ; image référencée absente car gitignorée) ; binaires et artefacts générés commités (PNG 308 Ko, JSON 224 Ko, SVG d'aperçu désynchronisé des données) ; code mort livré malgré la campagne « REMOVE » ; outillage personnel commité (`.claude/skills/speckit-*`, `.specify/`) ; **clé API Anthropic gérée côté navigateur** (localStorage en clair + `anthropic-dangerous-direct-browser-access`) pour une app destinée à GitHub Pages ; mode par défaut coûteux (4 appels LLM par question, l'économe étant l'opt-in).

**Mineurs (sélection)** : monolithes front (main.js 66 Ko) ; second corpus « sandbox » de 120 lois embarqué sans mention ; **0 test pytest pour 29 scripts Python** et aucune CI ; `html_description` injecté en innerHTML depuis le fichier de données ; documents de mission proliférant à la racine avec référence nominative (« backend Fred »).

**Jugement** : capsule P0 fossilisée sur laquelle 125 commits ont dérivé ; la moitié du contenu est de l'auto-audit aux métriques auto-attribuées (validation réelle admise ≈ 0 %) ; infusionnable sans réécriture de la description et découpage drastique.

---

## 4. Recommandations priorisées

### Urgent (exposition juridique / sécurité)
1. **Retirer immédiatement les données des dirigeants réels de la PR #4** (`tests/run-cases.js`, `tests/resultats-montreal.json`) : personnes réelles nommées + faits commerciaux inventés publiés sous MIT. C'est le seul point de l'audit qui expose juridiquement, aujourd'hui, sans merge.
2. **Supprimer les releases `plate-scan-v1.0-6`/`-7` et leurs tags** (ou au minimum les passer en pre-release avec avertissement) : APK debug non maintenables distribués au public depuis le dépôt white paper.
3. **Corriger la XSS d'import de la version standalone (PR #3)** et retirer le `|| true` qui neutralise `npm audit` avant tout merge éventuel.

### Structurel (gouvernance)
4. **Décider du destin de chaque PR** : aucune des 8 ne concerne le white paper. Le geste sain est de **déplacer chaque application dans son propre dépôt** (plate-scan, routine-cognitive, biz-mobile, decision-engine, z-temps, fractal-law-tree) et de fermer les PR ici. La PR #8 (audit d'un dépôt tiers) a sa place dans le dépôt audité, pas ici.
5. **Cesser d'utiliser une branche de PR comme branche de développement permanente** (PR #1 : 125 commits, 202 675 lignes, description devenue fausse à ~96 %). Une PR doit décrire ce qu'elle contient.
6. **Mettre à jour ou fermer** : 4 descriptions de PR sur 8 contiennent des chiffres faux (tests, contenus, familles de lois).

### `main` (le livrable affiché)
7. **Supprimer les deux PDF dupliqués** `…FULL (1).pdf` et `…FULL (2).pdf` (identiques octet à octet, zéro perte).
8. **Régénérer les PDF avec une police embarquée** (les glyphes Δ et ↔ ne se rendent pas ; police japonaise HeiseiMin-W3 non embarquée pour du texte français) et publier les artefacts annoncés par les annexes (JSON de métriques, format .zgs) ou retirer leur mention.
9. **Cadrer le README** : distinguer ce que ce dépôt livre (un white paper) de ce que l'écosystème revendique ; retirer ou adosser « +20 % mesuré », « 100 POC », « reproductible, vérifiable », « auditable via EthicChain ». Ajouter les liens réels vers les dépôts censés porter les preuves.
10. **Hygiène** : `.gitignore`, `CONTRIBUTING.md`, `CITATION.cff`, topics GitHub ; envisager CC BY 4.0 pour le document (MIT vise le logiciel) ; activer « Keep my email addresses private » pour les commits futurs (l'historique existant exigerait `git filter-repo`).

### Fond (si le projet veut être pris au sérieux)
11. **Une seule règle réglerait 80 % des constats critiques : ne publier une affirmation chiffrée que si le dépôt contient de quoi la reproduire.** Aujourd'hui, « +20 % de cohérence », « conformité RE2020 », « HS honesty 1.000 », « prédiction confirmée à 10⁻¹⁵ », « tests en CI » et « 10 dossiers réels » sont tous, à des degrés divers, des affirmations sans adossement — et deux audits internes au projet (PR #6 et le propre `P0_5_SPEC.md` de la PR #1) l'avaient déjà écrit avant le présent rapport, sans qu'aucune correction ne suive.

---

*Audit réalisé le 2026-08-26. `main` au SHA `cdf9039` ; branches auditées à leur HEAD respectif (PR #1 `590952a`, #2 `c19a739`, #3 `4794cb9`, #4 `b7bd236`, #5 `b3388d8`, #6 `7825b97`, #7 `f5a9e1d`, #8 `5616fc9`). Toutes les affirmations d'exécution correspondent à des commandes réellement lancées dans des worktrees locaux ; aucun fichier existant n'a été modifié.*
