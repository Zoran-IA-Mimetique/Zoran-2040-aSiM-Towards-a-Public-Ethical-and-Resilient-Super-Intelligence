# ZORAN — rapport E75Y4V

Date : 2026-08-29 18:42 Europe/Paris  
Mode : `BUILD` expérimental, isolé et réversible  
Verdict borné : `PASS_E75Y4V_BOOTSTRAP_CHRONOLOGY_VALIDATOR_250_OF_250_VETO_50_OF_50_CONTROL`  
Verdict sur R12 : `NON_MESURÉ_E75Y4V_PRE_R12_BOOTSTRAP_0_OF_4_EVIDENCE`  
Statut scientifique : `NON_MESURÉ`

## Acquis relus

- Rapport E75Y4U, résultats, certificat, contre-audit, paquet et `HANDOFF_275`.
- Ancre R12 exacte, archive et manifestes R12, résultat final du contre-audit R12, puis contre-audit R23.
- Lettre `ZORAN_LETTRE_MISSION_REPRISE_360_2026-08-08-v23` relue intégralement : le nom v23 contient toujours une première page `VERSION 22`; sa désignation historique de `S_ADD` ne remplace pas le contrat Max Harness v2 plus récent.
- `ZORAN_ORACLE_INDEX`, `PROTOCOLE_HEARTBEAT_5MIN` et `HANDOFF.json` historique.
- Derniers rapports et paquets Gate : résumé Opposed Pair Gate V1, paquet/candidat R4 et rapport E75X. Le million de cas synthétiques du Gate reste un PASS d’invariants logiciels, pas une validation causale universelle.
- Nouveau `SEMANTIC_FRONTEND_WORK_PACKET.md` : candidat de travail non certifié; 282 tests ciblés annoncés, mais CI exact-head, ONNX réel, extraction sémantique générale, K3 unique, intégration et effets restent `NON_MESURÉ`.
- Corpus Zenodo 18526755, 18516353 et 18497598 : ouverture directe retentée; trois erreurs d’accès. Lecture fraîche intégrale `NON_VÉRIFIÉE`.

## Question testée

Existe-t-il, dans l’index de la Bibliothèque avant la création de l’ancre R12, une preuve exacte qui épingle l’empreinte publique R12 par une autorité indépendante et établit un plancher monotone non restaurable ?

L’hypothèse à falsifier est précise : une vérification d’intégrité effectuée après publication ne suffit pas à amorcer la confiance avant la décision.

## Méthode

1. Gel du seuil chronologique à `2026-08-12T07:31:13.064887Z`, date de création de l’ancre R12 dans la Bibliothèque.
2. Quatre requêtes exactes avant ce seuil : empreinte publique R12, variable `ZORAN_TRUSTED_AUTHORITY_SHA256`, titre d’ancre R12 et plancher monotone non restaurable.
3. Inspection de 41 résultats de récupération : zéro occurrence exacte dans les extraits retournés.
4. Ordonnancement avec le contre-audit final R12 créé à `2026-08-12T07:34:44.550822Z`, soit 211,485935 secondes après l’ancre.
5. Contrat à quatre conditions : épingle antérieure, épingle indépendante, plancher antérieur, plancher non restaurable.
6. Falsification : 50 contrôles valides et cinq familles de 50 attaques — épingle postérieure, temps non ordonné, auto-déclaration, plancher absent et plancher restaurable.
7. Comparateur équitable contenu-seul contre validateur chronologique strict.
8. Certificats structurés et événements chaînés par SHA-256; contre-audit indépendant; PRE/POST K3 et auto-test Max Harness.

## Résultat

- Contrôles : **50/50 PASS**.
- Attaques chronologiques : **250/250 bloquées** par le validateur strict.
- Comparateur contenu-seul : **250/250 faux positifs**.
- Détail strict : 150 `FAIL`, 100 `NON_MESURÉ`.
- Candidat R12 réel : **0/4 conditions démontrées**, quatre `NON_MESURÉ`; **50/50 observations `NON_MESURÉ`**.
- Recherche antérieure au seuil : **0 hit exact sur quatre requêtes**, après examen de 41 résultats récupérés.
- Contre-audit final R12 : `PASS_BORNÉ_LIBRARY_ANCHORED_R12`, créé **211,485935 s après** l’ancre; son `xattrs_verified=true` prouve une vérification post-publication, pas une racine préétablie.
- **350 certificats structurés** et 350 événements chaînés.
- Contre-audit : **33/33 PASS**.
- Max Harness : **32/32 PASS**, auto-test du moteur uniquement.
- POST K3 : **5/5 PASS**.
- Premier empaquetage : `FAIL` avant création du paquet, car le script exigeait à tort un journal de dette optionnel absent. L’incident est conservé; la correction bornée de l’inventaire donne ensuite **11/11 PASS**.

La limite est essentielle : zéro hit exact dans un index de recherche est une absence d’évidence récupérée, pas une preuve que l’objet n’existe nulle part. Le verdict R12 est donc `NON_MESURÉ`, jamais `FAIL` par simple silence documentaire.

## Comparaison avec l’état de l’art

La spécification TUF 1.0.36 exige qu’un client soit livré avec des clés racines déjà fiables, charge une racine obtenue hors bande, conserve les métadonnées racines sur stockage non volatil et établisse la continuité N→N+1 avec les seuils ancien et nouveau. L’ancre R12 et son contre-audit postérieur ne démontrent pas ces propriétés. Source primaire : https://theupdateframework.github.io/specification/latest/

`in-toto Statement v1` lie des sujets à une déclaration, mais cette structure n’amorce pas par elle-même l’autorité qui doit être déjà vérifiable. Source primaire : https://in-toto.io/Statement/v1

Aucune implémentation TUF ou in-toto productive n’est revendiquée.

## Équation canonique courante

- Méta-opérateur : `M_ZORAN(test, cadre) -> CERTIFICAT_STRUCTURE`.
- Jauge scalaire : `S = (β × ΔΦ_coh)/(1 + T + σ)`.
- Cinématique séparée : `ΔS = S_après − S_avant`.
- `S_ADD_V2 = HISTORIQUE_NON_CANONIQUE`.
- `S_PRODUCT/T002 = FAIL_BLOQUANT`.
- `S_TECP = NON_MESURÉ`.

Aucune valeur scalaire de `S` n’est calculée dans cette session : les proxys réels et leur calibration sont absents.

## Progrès réel

La distinction temporelle est désormais exécutable : une preuve postérieure ou auto-déclarée ne peut plus être confondue avec une racine préétablie. Le contrat conserve les contrôles et bloque toutes les cinq familles adversariales. En revanche, aucune preuve productive A2 n’a été trouvée pour R12.

## Échecs conservés

- E75Y4U : 0/6 liaisons A2, dont deux `FAIL` et quatre `NON_MESURÉ`.
- E75Y4V : premier empaquetage `FAIL` sur précondition erronée `dette_coh.jsonl`; aucun résultat scientifique n’a été modifié.
- E75Y4T hors A2 : 50/50 co-rollbacks acceptés; son contre-audit initial 27/28 `FAIL` reste conservé.
- E75Y4S, E75Y4M–R, E75Y4Q et tous les FAIL de rollback, fork, compromission commune et admission précédents.
- ZCE R2 C26/C31, R29 `377/573 PASS` avec 196 OPEN, R4/R4.1, BGE R2 et tous les FAIL antérieurs.
- R12 historique : faiblesse de substitution conjointe R11, archive non autoreconstructible, CORE-017 ouvert, PROOF-012 global `FAIL`, PROOF-013 bloqué par l’environnement.
- Contradiction documentaire v23/`VERSION 22` et toute divergence de forme canonique antérieure.

## Éléments NON_MESURÉS

- Exhaustivité byte-à-byte de l’index historique de la Bibliothèque.
- Épingle indépendante antérieure à R12 et identité productive du publieur.
- Plancher client non restaurable antérieur à R12.
- Continuité R12→R23 et récupération indépendante après compromission.
- Intégration productive, appelants externes, CI exact-head et runtime réel.
- Calibration de `β`, `ΔΦ_coh`, `T`, `σ`, valeur de `S` et effets scientifiques.
- Lecture fraîche intégrale des trois corpus Zenodo.

## Dette restante et prochaine question prioritaire

Matérialiser et scanner byte-à-byte, dans un corpus historique explicitement fini créé avant `2026-08-12T07:31:13.064887Z`, toutes les pièces candidates d’autorité et de plancher. Falsifier ensuite la provenance indépendante, l’antériorité, la restauration complète et la continuité N→N+1. Sans corpus fini ni preuve hors rollback, le verdict restera `NON_MESURÉ`.

## Résumé simple

**POSITIF — 50/50 contrôles conservés et 250/250 inversions d’amorçage bloquées; R12 reste 0/4 et `NON_MESURÉ`, sans promotion scientifique.**
