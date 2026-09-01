# ZORAN Biz Mobile

Application web **mobile-first** transformant le moteur ZORAN Business en véritable
outil commercial utilisable par Xavier en rendez-vous client. Aucun framework,
aucune dépendance : trois fichiers (`index.html`, `style.css`, `app.js`) pilotés
par un **JSON central unique**.

## Lancer l'application

Ouvrez simplement `index.html` dans un navigateur (smartphone, Android/iPhone, ou
desktop). Aucune installation, aucun serveur requis. L'état est sauvegardé
automatiquement dans le `localStorage` du téléphone.

> Astuce : sur mobile, « Ajouter à l'écran d'accueil » pour un usage type application.

## Les 9 écrans

| # | Écran | Rôle |
|---|-------|------|
| 1 | **Accueil** | Saisie du prospect + **import multi-format** (fichiers, URL, texte collé) |
| 2 | **Analyse** | Résumé exécutif, compréhension, enjeux, risques, opportunités (modifiable, régénérable, approfondissable) |
| 3 | **ZORAN** | Activation des modules (Mémoire, Audit, PDF, Agents, Skills, Cohérence, Cinématique, Futur) |
| 4 | **Dimensionnement** | Employés, services, utilisateurs, managers, experts, documents → calcul auto |
| 5 | **Licences** | Starter / Business / Enterprise / Corporate avec palier recommandé |
| 6 | **ROI** | Hypothèses dynamiques + graphique coûts/gains sur 3 ans |
| 7 | **Devis** | Détail chiffré + **export PDF / Word / Email / JSON** |
| 8 | **Versions** | Discours adapté : DG, DSI, Technique, Investisseur, BTP, Industrie, Santé, Collectivité, Banque, Assurance |
| 9 | **Audit** | Pipeline de calcul, historique horodaté, JSON source |

## Entrées (tous formats)

Sur l'écran Accueil, section **Sources d'entrée** :

- **Fichiers** : PDF, Word (`.doc`/`.docx`), email (`.eml`/`.msg`), texte, Markdown,
  HTML, JSON, CSV, images, etc. Le texte est extrait au mieux côté navigateur
  (extraction PDF/`.docx` *best effort*, sans dépendance externe).
- **URL** du site cible : le contenu est récupéré si le site l'autorise (CORS),
  sinon l'URL est tracée comme source.
- **Texte / email collé** : champ de collage direct.

Le bouton **« Extraire & pré-remplir »** détecte automatiquement entreprise,
interlocuteur, email/site et objectif depuis les sources.

## Sorties (PDF / Word / Email)

Sur l'écran Devis :

- **PDF** : impression native du navigateur (« Enregistrer en PDF »).
- **Word** : fichier `.doc` ouvrable dans Microsoft Word / LibreOffice.
- **Email** : génère un fichier `.eml` téléchargeable **et** ouvre le client mail
  (`mailto:`) avec objet + synthèse pré-remplis.
- **JSON** : export du dossier complet.

## JSON central

Toute l'application est pilotée par un objet d'état unique (`STATE`). Modifier
n'importe quel champ recalcule automatiquement **dimensionnement → licences →
ROI → devis**. Le schéma de référence est fourni dans `sample_data.json`.

## Couche logique « Python virtuel »

Le pipeline `computeAll()` simule la chaîne :

```
JSON  →  Validation  →  Calcul  →  ROI  →  Devis
```

Chaque étape est tracée et visible sur l'écran Audit.

## Validation

Chaque champ possède un schéma (`SCHEMA`) : type, valeurs min/max, obligation et
message d'erreur. Les contrôles s'affichent en temps réel sous les champs.

## Audit

Chaque action (qui / quoi / quand / avant / après) est journalisée et horodatée,
consultable sur l'écran Audit avec le JSON source complet.

## Traçabilité (IDs systématiques)

Tous les entrants et sortants portent un identifiant unique, pour retrouver
n'importe quel élément en cas d'erreur :

| Préfixe | Objet |
|---------|-------|
| `SES-`  | Session de travail |
| `CAS-`  | Dossier client |
| `SRC-`  | Entrant : fichier, URL ou texte importé |
| `ANA-`  | Analyse générée |
| `EXP-`  | Sortant : export PDF / Word / Email / JSON |
| `LOG-`  | Entrée du journal d'audit |

Chaque entrée d'audit est rattachée à sa session et à son dossier, et porte des
tags (`entrant`, `sortant`, `pdf`, `email`…). Les références `EXP / CAS / SES`
sont imprimées en pied de page des devis PDF/Word et dans les emails générés.
Le harnais `tests/run-cases.js` vérifie l'unicité et le format des IDs ainsi que
la cohérence complète des calculs sur 10 dossiers réels.

## Moteur de connaissance V3 (écran « Moteur »)

À partir d'**un seul dossier client**, l'application compose des livrables prêts à
l'emploi, adaptés à l'audience, à la complexité, au format et à l'objectif. La
génération est faite par un **moteur de composition embarqué** (`engine.js`) :
déterministe, sans backend ni clé API. Les textes produits sont des **brouillons
réels, éditables et exportables** (PDF / Word / Email / copie) — ce n'est pas un
appel à un LLM en direct, mais une assemblage intelligent de la base de
connaissance ZORAN et des données du dossier.

Capacités :
- **Profil prospect** : taille, secteur, maturité IA (0–6), budget, niveau
  technique, urgence, objections connues.
- **Recommandation automatique** : meilleur angle, argument, format, objectif,
  POC et stratégie d'adoption selon le profil.
- **Générateur adaptatif** : 17 audiences × 8 niveaux de complexité × 15 formats
  × 14 objectifs métier.
- **Moteurs rapides** : « Pourquoi l'IA maintenant », risque de ne rien faire
  (chiffré, projections 12/24/36/60 mois), plan de POC, feuille de route,
  cas d'usage, FAQ, dossier de financement, comparatifs (vs ChatGPT, Claude,
  Copilot, Gemini, GED, moteur documentaire), pitchs (15 s → 30 min) et
  réponses à objections (versions DG / DSI / Investisseur).

> Les contenus sont des points de départ professionnels à relire et personnaliser,
> pas des affirmations à publier telles quelles. Les chiffres (ROI, coût de
> l'inaction) dépendent des hypothèses saisies dans l'app.

## Design

Interface contemporaine et sobre aux couleurs de l'institut IA / ZORAN :
encre profonde, accent doré discret, fonds ivoire, titres en serif. Navigation
par cartes, lisibilité optimisée pour un usage en rendez-vous sur smartphone.

## Données de démonstration

`sample_data.json` contient un dossier complet (Bâtir Atlantique SAS) :
copiez son contenu et collez-le via l'écran Audit, ou utilisez-le comme
référence du modèle de données.
