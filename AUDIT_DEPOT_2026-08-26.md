# Audit complet du dépôt `Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence`

**Date** : 2026-08-26
**Périmètre** : la branche `main` (HEAD `cdf9039`), les métadonnées GitHub (description, releases, tags, PR), et **les 8 branches de PR ouvertes**, chacune explorée jusqu'au bout (worktree dédié, lecture des fichiers, exécution réelle des tests quand c'était possible).
**Méthode** : audit direct de `main` et des deux branches documentaires ; 6 agents d'audit parallèles sur les 6 branches applicatives, avec exécution des suites de tests, vérification des affirmations des PR et recherche de secrets/données personnelles. Aucun fichier existant n'a été modifié : ce rapport est le seul ajout.

---

## 0. Synthèse exécutive

_(sera complétée en fin d'audit)_

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

_(section complétée par l'audit agent — voir ci-dessous)_

### 3.4 PR #3 — `claude/routine-cognitive-mvp-BQ9nA` (PWA Routine Cognitive)

_(section complétée par l'audit agent — voir ci-dessous)_

### 3.5 PR #4 — `claude/zoran-business-mobile-app-fulkfa` (ZORAN Biz Mobile)

_(section complétée par l'audit agent — voir ci-dessous)_

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

_(section complétée par l'audit agent — voir ci-dessous)_

### 3.8 PR #1 — `claude/zoran-fractal-law-tree-pPfzR` (arbre fractal + dérive massive)

_(section complétée par l'audit agent — voir ci-dessous)_

---

## 4. Recommandations priorisées

_(sera complétée en fin d'audit)_
