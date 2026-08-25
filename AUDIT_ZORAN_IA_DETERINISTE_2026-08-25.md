# Audit complet du dépôt `zorania2025/Zoran-IA-deteriniste`

**Date de l'audit** : 2026-08-25
**Objet** : audit en profondeur — fond, forme, qualité, sécurité, valeur probante — du dépôt public `zorania2025/Zoran-IA-deteriniste` (« Zoran-IA deterministe, locale, K3 + Zmos »), HEAD `742fea7` (2026-08-23).
**Méthode** : clone local complet (historique dé-shallowé, 40 commits), lecture exhaustive des 322 fichiers, **exécution réelle** de toutes les suites de tests (Python, Node, harnais de contrats), recalcul indépendant de tous les manifestes SHA-256 et chaînes de hachage, vérification des signatures Ed25519 avec des outils de référence (openssl, `rfc8785`, `jsonschema`, `cryptography`), fuzzing différentiel du canonicalizer (8 000+ cas), tentatives de forge des « bundles de preuve », build TypeScript complet (`tsc --noEmit`, build de production). Quatre axes d'audit menés en parallèle : (I) gouvernance/certification/preuves, (II) composants Python runtime, (III) ZMOS v2 transactionnel, (IV) applications TypeScript et sécurité. Aucun fichier du dépôt audité n'a été modifié.

---

## 0. Synthèse exécutive

### Le verdict en une phrase

Le dépôt contient **un noyau logiciel réellement rigoureux** (canonicalisation JCS conforme RFC 8785, writer SQLite crash-safe, chiffrement AES-256-GCM correct, logique trivalente K3 mathématiquement exacte, tests adversariaux sérieux par endroits) **enrobé dans un appareil de « certification » qui ne certifie rien et ne le peut pas par construction** : le moteur qui délivre les verdicts est absent du dépôt, les preuves-clés sont circulaires ou cassées, le critère de promotion est mathématiquement inatteignable, et le mot « déterministe » du titre ne correspond pas à ce que fait le code.

### Ce qui est vrai et vérifié (au crédit du dépôt)

- **Intégrité des fichiers** : 15/15 entrées des `MANIFEST.sha256.json` exactes ; 4 chaînes de hachage JSONL (`dette_coh`, `k3_audit`) intactes ; hashes croisés PRE/POST/output cohérents ; le zip Amygdala est bit-à-bit identique aux fichiers du dépôt ; le manifeste ZMOS de l'UI correspond aux 158 fichiers réels.
- **Tous les tests exécutables passent** : 96 tests Python des composants + falsificateur K3 12/12 + 174 tests ZMOS + 29 checks du harnais de contrats + E2E bridge complet (avec le dépôt `zoran-v2` public épinglé) + 830/830 tests UI + typecheck strict 0 erreur + build de production UI réussi.
- **Le canonicalizer JSON maison est conforme RFC 8785** : 0 divergence sur 5 000 cas différentiels vs Node `JSON.stringify` et 3 000 structures aléatoires vs la bibliothèque `rfc8785`, y compris les pièges (ordre UTF-16 des clés non-BMP, `-0`, lone surrogates, bornes binary64).
- **Le writer transactionnel SQLite est réellement crash-safe** : kills de sous-processus à trois phases, verrou single-writer inter-processus, chaîne `run_heads` détectant troncature/altération/substitution — vérifiés en exécution.
- **Aucun secret commité** (balayage exhaustif des motifs de clés API, tokens, PEM) ; le coffre de clés API chiffre réellement (AES-256-GCM, IV aléatoire, fail-closed).
- **Le langage interne est massivement auto-limitatif** : `NON_MESURÉ` partout, cases de certification non cochées, « ce fichier ne certifie rien », limites du rate-limiting admises. Le dépôt avoue lui-même, dans presque chaque fichier, qu'il n'a encore rien mesuré.

### Les dix constats critiques

1. **Le moteur K3 qui produit les « verdicts » n'est pas dans le dépôt.** Les scripts générateurs (`generate_k3_pre.py:9-23`) importent `semantic_mission.k3_gate` depuis des chemins durs d'une machine privée (`/workspace/scratch/…`, `/root/.codex/skills/…`, `MEMOIRE_PRIVEE_FREDERIC_TABARY/…`). Les hashes `k3_runtime_sha256` et `law_registry_sha256` ne correspondent à aucun fichier du dépôt. Les reçus de gouvernance `.zoran/` sont donc **irreproductibles par un tiers** : le vérificateur et le vérifié sont la même partie.
2. **Le critère de certification « S > 9 » est inatteignable par construction.** `CERTIFICATION_CATHEDRALE_V1.md` exige S_local, S_interaction et S_global > 9 ; le seul estimateur S exécutable du dépôt (`s_add_v2`) est borné à [0,1] (`calibration_profile.json:16`, `score_range: [0,1]`) et produit 0.133. La « Certification Cathédrale » ne peut, même en principe, rien certifier avec les instruments publiés.
3. **La « preuve opérationnelle » S_ADD_V2 est circulaire.** Les chiffres sources (runs GitHub Actions 8/10 → 10/10) sont des **constantes codées en dur** dans `build_evidence.py:17-56` ; `--verify` compare la fixture au recalcul de ces mêmes constantes ; `--write` permet de tout régénérer à volonté. Le « rejeu ×1000 » réévalue une fonction pure sur une entrée figée. Cela prouve que le script reproduit ses propres constantes, rien de plus.
4. **Le « chat runtime déterministe » attribue PASS par liste blanche et son bundle de preuves est forgeable.** `runtime.py:174-198` : tout cadre `INTENT::*` ou du set `supported_domains` (y compris `MEASUREMENT::REQUIRED`) reçoit PASS inconditionnellement — le contenu des preuves n'influence aucun verdict. Démonstration par l'exécution : une archive forgée dont les « preuves » sont les octets `b"1"`, `b"2"`, `b"3"` avec un manifeste auto-cohérent est **acceptée avec certificat PASS**. Par ailleurs le « chat » n'a que deux sorties possibles : un paragraphe d'auto-promotion codé en dur ou un refus.
5. **Le « déterminisme » du titre ne correspond pas au code.** L'UI appelle GPT-5/Claude/Gemini à `temperature: 0.3` (`app/api/chat/route.ts:160,329`) ; le « cœur K3 » est un service externe absent du dépôt, désactivé par défaut ; le certificat K3 embarque un `datetime.now()` (artefact non rejouable, masqué en aval par filtrage) ; les empreintes vectorielles BGE-M3 ne sont pas stables inter-machines (backend WASM/WebGPU non épinglé). Le seul déterminisme prouvé est trivial : fonctions pures sur entrées figées.
6. **Plusieurs scellements sont cassés ou périmés.** Les hashes « scellés » du rapport et du handoff Amygdala ne correspondent pas aux fichiers publiés (`output.json` scelle `0f73b17c…`/`2d36edf2…`, les fichiers réels donnent `5ba82704…`/`8990c7a9…`) — les documents ont été réécrits après scellement. L'evidence ledger du writer ZMOS grave des hashes d'une version antérieure du code (modifié par le commit `9ec99da` sans re-mesure). Les « frozen inputs » du harnais ont été re-baselinés après coup.
7. **La chaîne de provenance pointe vers des commits qui n'existent pas dans le dépôt public.** Tous les `base_sha`/`rollback_sha` (`645e97b2…`, `21c5e00d…`, `42c6d836…`, `4c218e91…`, etc.) sont introuvables (`git cat-file` négatif) : l'historique a été écrasé lors du « Transfert exact » depuis des dépôts privés. Rollbacks et preuves « attachées au SHA » sont inopérants.
8. **Le composant `semantic_bge_m3_browser_v156` ne compile pas.** Son `page.tsx` (3 206 lignes) importe ~8 modules `@/lib/*` absents ; `tsconfig`, `layout.tsx`, scripts et tests référencés par son `package.json` n'existent pas. C'est un extrait partiel non buildable — la CI le sait et le met en `continue-on-error`.
9. **~83 % des tests UI ne peuvent pas détecter un bug.** 60 des 72 fichiers `.test.mjs` lisent le code source et vérifient par regex que certaines chaînes y figurent (« checklists ») : ce sont des verrous anti-refactoring, pas des tests. La « suite 810/810 » citée en certification est essentiellement de la pseudo-couverture. La documentation Z1 de ZMOS décrit en outre un dépôt « documentation-only, privé » alors que le sous-arbre publié contient ~8 560 lignes de Python — auto-invalidation selon sa propre règle fail-closed.
10. **Sécurité : l'authentification de l'UI repose sur un en-tête HTTP forgeable hors plateforme.** Toute l'identité vient de `oai-authenticated-user-email` (`lib/request-security.ts:20-25`), sûr uniquement derrière le dispatch OpenAI Sites — or le dépôt fournit l'entrée Cloudflare Worker permettant de déployer ailleurs. S'y ajoutent : rate-limit en mémoire d'isolate quasi inopérant, corps de 36 Mo bufferisés (DoS mémoire), `server.py` Python sans auth par défaut et qui coupe la connexion avec traceback sur toute erreur I/O non prévue.

### Bilan chiffré consolidé

| Sévérité | Nombre approx. | Exemples |
|---|---|---|
| **Critique** | 10 | Moteur K3 absent ; S > 9 inatteignable ; preuve S_ADD_V2 circulaire ; frames PASS en liste blanche + bundle forgeable ; composant B non compilable ; déterminisme sur-vendu |
| **Majeur** | ~35 | Scellements cassés ; SHA de provenance inexistants ; 60/72 tests-grep ; auth par en-tête ; machine à états ZMOS jamais codée ; trois vocabulaires d'erreurs incompatibles ; crash sur verdict excédentaire ; RecursionError contre son propre cahier des charges ; double orthographe `NON_MESURE`/`NON_MESURÉ` ; monolithe `page.tsx` 3 165 lignes dupliqué à 98 % ; aucun packaging Python ; CI qui ne couvre ni l'Amygdale ni les reçus ni ZMOS |
| **Mineur** | ~50 | Typo du nom du dépôt (« deteriniste ») ; README de 2 lignes ; **aucune LICENSE** ; fuites de chemins personnels (`C:\Users\frede`, « MEMOIRE_PRIVEE_FREDERIC_TABARY ») ; franglais systémique ; magic numbers ; `assert` en production ; docs figées désynchronisées (802/810/830) ; artefacts de build commités ; CSP `unsafe-inline` |

### Recommandations prioritaires

1. **Publier le moteur K3 (`semantic_mission.k3_gate`) et le registre de lois** dont dépendent tous les reçus, ou cesser de présenter les reçus comme des preuves — sans le moteur, rien n'est vérifiable par un tiers.
2. **Définir l'échelle de S et rendre le critère de promotion atteignable** (ou le reformuler) ; remplacer les constantes codées en dur de `build_evidence.py` par une véritable collecte attestée (API GitHub, artefacts signés).
3. **Remplacer la liste blanche de `evaluate_required_frames`** par une évaluation réelle adossée aux preuves, et ancrer le bundle sur un hash attendu externe (ou une signature) au lieu d'un manifeste auto-référentiel.
4. **Re-sceller ce qui est cassé** : rapport/handoff Amygdala, evidence ledger du writer, frozen inputs — et documenter chaque re-scellement.
5. **Réparer ou retirer** `semantic_bge_m3_browser_v156` (non compilable) et le workflow ZMOS E2E (mal placé, branche et SHA inexistants) ; brancher les tests Python ZMOS sur la CI racine.
6. **Convertir les tests-grep en tests de comportement** (ou les étiqueter comme lint interne, hors du décompte de « contrats »).
7. **Hygiène de base** : ajouter une LICENSE (le dépôt public est aujourd'hui juridiquement « tous droits réservés »), un vrai README, un packaging Python (`pyproject.toml`, `conftest.py` — 2 composants et la racine échouent à un `pytest` naïf), corriger la typo du nom, unifier `NON_MESURE`/`NON_MESURÉ` et la canonicalisation (`\n` final divergent dans `s_add_v2`), purger les chemins personnels et les références aux dépôts privés.
8. **Recontextualiser les documents transplantés** (Z1, GOVERNANCE, manifeste « publication bloquée ») qui décrivent un autre dépôt : les archiver comme historiques ou les réécrire pour l'état public réel.

---

# Partie I — Gouvernance, certification et preuves

Périmètre : documents racine (`CERTIFICATION_CATHEDRALE_V1.md`, `CERTIFICATION_STATUS_2026-08-22.md`, `SEMANTIC_ENGINE_POLICY_V1.md`), `.zoran/`, `components/amygdala_k3_v1_exact/`, volet preuve de `s_add_v2_runtime_v1`, workflow `certification-cathedrale.yml`.

## I.1 Les revendications et leur statut

- **CERTIFICATION_CATHEDRALE_V1.md** : une *règle de promotion* (« S_local > 9, S_interaction > 9, S_global > 9, aucun invariant en FAIL, aucun cadre NON_MESURÉ, tests reproductibles CI, empreinte associée »), un périmètre de 6 composants, un ordre C1→C12, 4 états (PASS_CERTIFIE / FAIL / NON_MESURE / EXPERIMENTAL).
- **CERTIFICATION_STATUS_2026-08-22.md** : état des lieux composant par composant. Point capital : **le statut S de TOUS les composants y est déclaré NON_MESURE ou EXPERIMENTAL**. Aucun composant n'est revendiqué PASS_CERTIFIE.
- **SEMANTIC_ENGINE_POLICY_V1.md** : politique d'architecture (les moteurs d'embedding n'ont aucune autorité, K3 décide) ; tous les moteurs candidats sont NON_MESURE.
- **`.zoran/`** : reçus « K3 PRE/POST » et registres à chaîne de hachage pour deux « transactions » (2026-08-22 et 2026-08-23), toutes deux avec `verdict: NON_MESURÉ` et `execution_authorization: ALLOW_BUILD_WITH_DEBT`.
- **amygdala_k3_v1_exact** : un « étalon de cohérence » (18 cadres pondérés, formule 0–100, self-tests) auto-qualifié `HEURISTIQUE_REPRODUCTIBLE_NON_ETALONNEE_SCIENTIFIQUEMENT`, plus un « handshake obligatoire » que toute IA devrait exécuter en arrivant sur le dépôt.
- **s_add_v2_runtime_v1** : moteur calculant `S = (β×ΔΦ)/(1+T+σ)` = **0.133333333333** sous « profil opérationnel local scellé », avec 1 000 rejeux et 52 tests adversariaux.

**Verdict par catégorie** :
- *Démontré (localement reproductible)* : l'intégrité interne des artefacts (chaînes de hachage, manifestes, rejeux) ; le passage de tous les tests ; le déterminisme des scripts publiés sur leurs propres entrées figées.
- *Invérifiable* : tout ce qui fonde les reçus `.zoran/` (moteur absent, cf. C1) ; les données sources du score S (codées en dur, cf. C3) ; toutes les références à des artefacts privés (« mémoire active V102 », « registre 11 actions », « index fractal 2 071 objets », « V16 30/30 », « cœur 44/44 », « ZMOS 174/174 »).
- *Contredit par le contenu* : la règle « S > 9 » (inatteignable, cf. C2) ; le statut de publication « BLOQUEE_OUTIL_GH_ABSENT » d'un manifeste publié sur GitHub (cf. C7) ; les hashes scellés du rapport/handoff Amygdala (cf. C4).

## I.2 Vérifications techniques effectuées

- **Manifestes SHA-256 : 15/15 conformes.** Recalcul indépendant : `amygdala/benchmark` 6/6 OK, `s_add_v2_runtime_v1` 9/9 OK ; `build_manifest.py --verify` PASS des deux côtés (manifeste étalon `720a4755…` conforme au HANDOFF et au rapport). Aucun écart.
- **Chaînes de hachage `.zoran/` et `governance/` : internes valides.** Formule rétro-ingéniérée (`event_hash = SHA256(JSON canonique {event|payload, previous_hash, sequence})`) ; les 4 chaînes (21 + 4 + 15 + 2 entrées) sont intactes ; `output_hash` des POST = SHA-256 canonique des `*_output.json` (exacts) ; `plan_hash` cohérents PRE/POST/output ; `chain_head` = tête réelle des JSONL ; timestamps dans les fenêtres de validité.
- **Signature d'autorité** : la signature Ed25519 **vérifie** (openssl `pkeyutl -verify -rawin` : « Signature Verified Successfully »). Mais la clé est explicitement `SELF-TEST-NOT-PRODUCTION`, l'`external_anchor` est un placeholder de 64 « b », et le `sha256` interne de l'artefact d'autorité ne correspond à rien de vérifiable. Le dépôt enregistre lui-même cette faiblesse comme dette.
- **Self-tests et rejeux : reproduits à l'identique.** `reference_runner.py --self-test` → 6/6 PASS, sha256 `07d98ba7…` (== replays de référence) ; `amygdala_protocol.py --self-test` → 7/7 PASS, `4bd7fc78…` ; hashes fichier des replays conformes aux valeurs scellées.
- **Séquence S_ADD_V2 exécutée intégralement** : `build_evidence.py --verify` PASS ; `s_add_v2.py` → S = 0.133333333333, PASS, global NON_MESURÉ ; 52 tests pytest ; `run_proof.py --verify` PASS (1 000 rejeux) ; `build_manifest.py --verify` PASS. Calcul exact : β=1, ΔΦ=0.2, T=0.5, σ=0 → 0.2/1.5.
- **Le zip Amygdala** (53 742 o, 23 entrées) : 21/21 fichiers extraits identiques au dépôt — redondance pure, aucune contradiction.
- **Ancrage externe** : les runs GitHub Actions cités (32623999428, 32624236175, 32625043828) n'ont pas pu être interrogés ; les commits cités dans les documents existent bien dans l'historique git — seul ancrage vérifiable, cohérent.

## I.3 Constats

**C1 — CRITIQUE — Le moteur qui produit les « preuves » K3 n'est pas dans le dépôt.** `.zoran/*.json` référencent `k3_runtime_sha256: 8b8839f2…` et `law_registry_sha256: 197e1318…` : aucun fichier du dépôt n'a ces empreintes (scan exhaustif négatif). `generate_k3_pre.py:9-23` et `generate_k3_post.py:8-14` importent `semantic_mission.k3_gate` depuis des chemins durs d'une machine tierce (`/workspace/scratch/cf46630c602c`, `/workspace/sites/zoran-sessions-rc1`, `/root/.codex/skills/remote-skills/…`). Aucun composant du dépôt n'écrit `.zoran/`. Les reçus sont irreproductibles par un tiers : on peut vérifier que la chaîne est intacte, pas que le gate a fonctionné comme décrit.

**C2 — CRITIQUE — Le critère « S > 9 » est indéfini et inatteignable.** `CERTIFICATION_CATHEDRALE_V1.md:11-13` vs `calibration_profile.json:16` (`score_range: [0,1]`) : le seul estimateur S exécutable borne S ≤ 1 par construction ; le score mesuré est 0.133. L'échelle de « S > 9 » n'est définie nulle part (l'étalon Amygdala 0–100 est déclaré « not comparable »). La règle de promotion — cœur de la « Certification Cathédrale » — n'est pas opérationnelle : l'unique issue possible est NON_MESURE, ce qui est de fait le statut de tout.

**C3 — CRITIQUE — La « preuve opérationnelle » S_ADD_V2 est circulaire.** Les chiffres sources (baseline 8/1/1, intervention 10/10, `attempts: 2, failed_attempts: 1`, `replay mismatches: 0`) sont des constantes codées en dur dans `build_evidence.py:17-56`. `--verify` compare la fixture au recalcul de ces constantes ; `--write` régénère fixture, rapport et manifeste à volonté. Aucun code ne consulte l'API GitHub ; aucune attestation signée des runs n'existe. Le « scellement » est de l'auto-cohérence, pas de la preuve.

**C4 — MAJEUR — Hashes scellés ≠ fichiers publiés (rapport et handoff Amygdala).** `governance/output.json:5` scelle `report=0f73b17c…`, `handoff=2d36edf2…` ; les fichiers réels donnent `5ba82704…` et `8990c7a9…`. Le rapport publié cite l'`output_hash` du POST qui hashe un état antérieur du rapport : il a forcément été réécrit après scellement. Écart ni documenté ni détectable sans refaire le calcul — la boucle de scellement est cassée par conception.

**C5 — MAJEUR — Preuves adossées à des artefacts privés d'une machine personnelle.** `generate_k3_pre.py:21` (`…/MEMOIRE_PRIVEE_FREDERIC_TABARY/MISSION_ZORAN_ACTIVE.md`), HANDOFF (« mémoire active V102 », « payload mémoire c694ef33… »), `output.json` (registry `0accd6e0…`, index fractal 2 071 objets, memory `712fc6b5…`, V16 `82742f46…`), `.zoran/runtime_chat_output.json` (« cœur 44/44, ZMOS 174/174, lost_local_commits:2ae5bb59,6b65bbb1, SYNC_box_absent_in_public_repository »). La chaîne de preuve sort du périmètre public à chaque maillon important ; l'aveu « lost_local_commits » confirme que la traçabilité complète n'existe même plus chez l'auteur. Le « handshake obligatoire » exige de lire des documents privés — inexécutable pour un tiers.

**C6 — MAJEUR — La CI ne couvre pas ce que la certification met en avant.** `certification-cathedrale.yml` : aucun job n'exécute le composant Amygdala (pourtant « obligatoire, non négociable ») ; aucun job ne vérifie les reçus `.zoran/` ; le job final `certification-gate` est un simple `echo` déclaratif ; les jalons C7–C12 n'ont aucun support CI. Ce que la CI vérifie réellement (suites unitaires Python, auto-cohérence S_ADD_V2, greps BGE-M3 non bloquants, pipeline UI) est exécutable et passe — reproduit localement. Écart documentaire : le STATUS décrit un gate à 6 dépendances, le workflow réel en a 7 (jamais mis à jour).

**C7 — MAJEUR — Contenus figés contredits par la réalité, cibles de publication incohérentes.** `benchmark/MANIFEST.sha256.json:36-39` affirme `"publication": "BLOQUEE_OUTIL_GH_ABSENT"` — dans un fichier publié sur GitHub. Le rapport désigne comme cibles `institutia2025-ctrl/zoran-v2` et `institutia2025-ctrl/zmos-v2-transactional` — ni l'un ni l'autre n'est ce dépôt. L'« étalon permanent » a été publié ailleurs que là où ses propres documents l'annoncent, sans nouveau scellement.

**C8 — MAJEUR — Autorité auto-signée et autorisation « avec dette » comme régime permanent.** Chaque « transaction » s'auto-autorise avec une clé `SELF-TEST-NOT-PRODUCTION` ; chaque exécution est `ALLOW_BUILD_WITH_DEBT` ; la pondération de la dette est elle-même NON_MESURÉ (`SIGNED_CALIBRATED_BAREME_MISSING`). Le dépôt est honnête sur ce point, mais le gate n'a jamais rien bloqué : c'est un tampon, pas une barrière.

**C9 — MINEUR — Défauts du registre de dette.** La seconde transaction ré-ouvre les mêmes scopes avec de nouveaux `debt_key` (`open_count: 21`, chaque scope compté deux fois) ; aucune fermeture (`type: OPEN` uniquement) ; les entrées d'une transaction partagent le même timestamp à la microseconde (ouverture en bloc). La dette croît mécaniquement sans sémantique de résorption.

**C10 — MINEUR — Forme.** « det**e**riniste » dans le nom même du dépôt ; README de 2 lignes ; aucune LICENSE ; mélange FR/EN sans logique ; jargon jamais défini (« Cathédrale », « coutures », « Amygdale », « cinématique K/H/P/R », « Zoran First », « index fractal ») ; β/ΔΦ/T/σ définis uniquement dans le profil ad hoc ; dossier `ui_zoran_blue_v169` vs `package.json` 0.156.0 ; l'artefact Amygdala (2026-08-20) précède la création du dépôt (2026-08-21) — chaîne de custody commencée hors dépôt ; deux niveaux d'« empreintes » (sha256 interne des self-tests vs hash des fichiers replay) jamais expliqués.

**C11 — Points positifs.** Toute la partie vérifiable est effectivement vraie (15/15 manifestes, 4 chaînes intactes, zip identique, self-tests bit-à-bit, 52 tests adversariaux réels, 830/830 UI, 158/158 ZMOS-manifest, signature Ed25519 valide). Le langage est massivement auto-limitatif — le problème est que l'appareil donne l'*apparence* d'un dispositif de certification là où rien n'est certifiable.

**Synthèse Partie I** : une comptabilité d'auto-cohérence exécutée avec une réelle rigueur formelle, mais sans valeur de certification au sens usuel. Équivalent à des checksums et des tests unitaires soignés, plus un appareil rituel de gouvernance dont le seul verdict effectif, partout et toujours, est NON_MESURÉ, auto-délivré sous une autorité de test auto-signée.

---

# Partie II — Composants Python runtime

Périmètre : `zoran_chat_runtime_v1`, `semantic_decision_05b_v1`, `complex_nl_k3_stitch_v1`, `k3_nl_response_v1`, `nl_k3_boundary_v1`, `complex_nl_intent_v1`, `k3_frame_algebra_v1_1`, `s_add_v2_runtime_v1` (code + tests). Exécution réelle : Python 3.11.15, pytest 9.1.1.

## II.1 Résultats d'exécution

| Composant | Résultat |
|---|---|
| complex_nl_intent_v1 | 4 passed |
| nl_k3_boundary_v1 | 5 passed |
| complex_nl_k3_stitch_v1 | 5 passed |
| k3_nl_response_v1 | 12 passed |
| s_add_v2_runtime_v1 | 52 passed (1 nominal + 50 adversariaux + rejeu ×1000) |
| zoran_chat_runtime_v1 | **ÉCHEC de collecte** (`ModuleNotFoundError: runtime`) ; 6 passed seulement avec `PYTHONPATH=.` |
| semantic_decision_05b_v1 | **ÉCHEC de collecte** (`ModuleNotFoundError: zoran_v2`) ; 12 passed avec `PYTHONPATH=.:tests` |
| k3_frame_algebra_v1_1 | 12/12 verts en exécution directe ; **INTERNALERROR sous pytest** (`SystemExit` à l'import) |
| Racine du dépôt | `pytest` → INTERNALERROR : la suite globale est inexécutable d'un seul geste |

Les échecs de collecte n'apparaissent pas en CI (le workflow injecte `PYTHONPATH` job par job), mais tout développeur qui lance `pytest` naïvement échoue sur 2 composants et sur la racine. Le `CANDIDATE_SHA256.txt` de l'algèbre de cadres est conforme (4/4 empreintes exactes).

## II.2 Par composant

### complex_nl_intent_v1 — le « NL » est un matching de sous-chaînes
Aucune analyse linguistique : casefold puis `phrase in normalized` sur des listes de mots-clés français figées.
- **[MAJEUR]** intent.py:20 — faux positifs sans frontière de mot, vérifiés par exécution : « Parle-moi de la planète Mars » → intent `PLAN` (« plan » dans « planète ») ; « Le plancher est cassé » → `PLAN` ; « controlez la mesure » → `CALCULATE` + `AUDIT`.
- **[MAJEUR]** intent.py:15-21 — accents incohérents : « definis la cinematique de la coherence » (sans accents) rate le DEFINE mais détecte le domaine — asymétrie vérifiée.
- **[MAJEUR]** intent.py:28 — `" ia "` exige des espaces : « Que fait l'IA ici ? » → domaine vide. L'élision française casse la détection.
- **[MINEUR]** `_TOKEN` (regex) jamais utilisée ; `ambiguity` toujours 0.0 (code mort) ; `embedding_fingerprint` trompeur (aucun embedding n'existe) ; « précisément » seul déclenche `EXPLAIN`.
- **Tests** : 4, calés sur la question vitrine ; aucun test négatif, quasi tautologiques.

### nl_k3_boundary_v1 — le meilleur module du lot, deux trous
Validation de schéma stricte (clés d'autorité interdites, clés inconnues rejetées, K3 fermé).
- **[MAJEUR]** boundary.py:96-99 — accepte des verdicts **excédentaires** (seule l'absence est vérifiée) : un cadre non candidat pèse sur la conjonction « required » → crash en aval (cf. stitch).
- **[MINEUR]** `"similarities"` acceptée puis silencieusement jetée.

### complex_nl_k3_stitch_v1
- **[MAJEUR]** stitch.py:39-40 — crash au lieu d'un FAIL propre : ajouter `{"EXTRA::FRAME": "FAIL"}` aux verdicts → `ValueError: K3 algebra and authority boundary disagree` (vérifié). Le garde-fou est atteignable par une entrée légale de l'API et produit une exception non typée.
- **[MINEUR]** double évaluation redondante de la même conjonction K3 (boundary + moteur) — le contrôle ne peut jamais échouer hors du cas ci-dessus ; les verdicts excédentaires changent `semantic_hash` sans changer le résultat.

### k3_nl_response_v1
Renderer fail-closed correct, le mieux testé (12 tests, mutation hostile, non-mutation des entrées).
- **[MAJEUR]** response.py:12-13,148 — deux orthographes coexistent dans le dépôt (`NON_MESURÉ` accentué : K3/boundary/s_add_v2 ; `NON_MESURE` : 05B/runtime). response.py n'accepte que la variante non accentuée pour une décision bloquée : une décision portant `NON_MESURÉ` serait rejetée par exception au lieu d'être rendue BLOCKED. Bombe d'interopérabilité.
- **[MINEUR]** `_join_french` modifie le texte des claims « scellés » (point final ajouté) — contradiction légère avec « no addition » ; chemin « PASS + authorize_06=False » tortueux (trois formes de refus selon combinaisons de champs).

### k3_frame_algebra_v1_1 — la logique K3 est correcte, le reste moins
**La logique trivalente est réellement une K3 forte de Kleene, correctement implémentée** (ordre FAIL<NON_MESURÉ<PASS, ET=min, OU=max, NON involutif, IMPLIQUE=¬a∨b) — tables vérifiées, conformes à la littérature. Rejets propres de NaN/±Inf/bool/str.
- **[MAJEUR]** moteur:149-160,188-205 — récursion non bornée : expression `{"non": {"non": … ×100000}}` → `RecursionError` brut (vérifié). **Contredit le contrôle n°3 de sa propre `MISSION_CLAUDE_CODE_ALGEBRE_CADRES.md` (« zéro exception brute »).**
- **[MAJEUR]** moteur:56-57,265-267 — `datetime.now()` dans `evaluer()` : `empreinte_artefact_sha256` différente à chaque appel (vérifié). Dans un dépôt « déterministe », la sortie brute n'est pas rejouable ; le déterminisme amont ne tient que parce que l'adapter jette silencieusement les champs horodatés.
- **[MINEUR]** `DEFAULT_SEUIL = 6.0` magic number ; `cadres_non_mesures_utilises` sur-promet (liste les référencés, pas les déterminants).
- **[MAJEUR]** le « falsificateur » n'est pas un fichier pytest (script à effets de bord + `raise SystemExit(0)`) : il sabote la collecte pytest de tout le dépôt (vérifié) ; en cas d'échec, aucun diagnostic ; aucun fuzzing réel malgré la mission ; le contrôle K12 (« pas d'attribut autoriser/executer ») est du théâtre de sécurité.

### zoran_chat_runtime_v1 — le point le plus grave de l'audit
Le « chat runtime déterministe » : (1) extrait des mots-clés, (2) attribue PASS à tous les cadres d'une liste blanche, (3) ne peut produire qu'UNE réponse en langage naturel — un paragraphe auto-promotionnel câblé en dur. Preuves exécutées : « Quelle est la capitale de la France ? » → K3 = PASS, réponse BLOCKED ; « calcule le futur probable du climat » → les 7 cadres dont `MEASUREMENT::REQUIRED` et les trois `PROSPECTIVE::*` reçoivent PASS sans aucune mesure ; seule la barrière sémantique bloque ensuite.
- **[CRITIQUE]** runtime.py:174-198 — `evaluate_required_frames` est une liste blanche, pas une évaluation. Le contenu du bundle de preuves n'influence AUCUN verdict. Le « certificat K3 » certifie uniquement que la question contient des mots-clés connus.
- **[CRITIQUE]** runtime.py:68-131 — le « bundle scellé » ne prouve rien : archive forgée en 10 lignes (preuves = `b"1"`, `b"2"`, `b"3"`, manifeste auto-cohérent) → bundle accepté, certificat PASS, réponse PASS. Validation purement auto-référentielle ; le seul contrôle sémantique est la présence d'un slogan dans le README.
- **[MAJEUR]** runtime.py:245-286 — `answerable` exige `DOMAIN::COHERENCE_KINEMATICS` ET `DOMAIN::AI_SYSTEM` ; les « conclusions » sont 6 phrases codées en dur décrivant le système lui-même. Deux sorties possibles : le paragraphe vitrine ou un refus.
- **[MAJEUR]** `_coverage_cycle` : `Fraction` codées en dur (7/9 → 9/9), gain nécessairement 0, présenté comme « cycle réflexif » ; `assert` de production tautologiques.
- **[MINEUR]** `sys.path.insert` inter-composants à l'import ; `__init__.py` casse la collecte pytest.
- Point positif réel : la validation ZIP est sérieuse (doublons, chemins absolus/`..`, backslash, chiffrement, symlinks) — le meilleur morceau du fichier.

**server.py (sécurité)** :
- **[MAJEUR]** server.py:53-70 — archive inexistante → `FileNotFoundError` non capturé, traceback complet sur stderr (chemin absolu), client déconnecté (vérifié). Même sort pour `BadZipFile` et `OSError`.
- **[MAJEUR]** server.py:86 — sans `ZORAN_CORE_TOKEN`, aucune auth (vérifié) ; `--host 0.0.0.0` librement réglable, aucun avertissement.
- **[MINEUR]** comparaison de token par `!=` (non constant-time) ; relit/re-hashe l'archive à chaque requête, aucune limite de taille décompressée (zip-bomb), pas de timeout ni rate-limit ; `detail: str(exc)` renvoyé au client.
- Aucun `eval`/`exec`/`pickle`/`subprocess` dans tout le périmètre (vérifié) — bon point.
- Tests : 6 dont un vrai test HTTP et un rejeu ×1000 ; mais pas de test d'archive corrompue ni d'absence de token.

### semantic_decision_05b_v1
`run_semantic_decision` est un filtre de dictionnaires : intention = `startswith("pourquoi")`/`startswith("quel")` sinon UNKNOWN ; « pertinence » = intersection de tokens ≥ 2 caractères moins 17 stopwords.
- **[MAJEUR]** taxonomie d'intentions divergente de intent.py (`pourquoi` → ASK_CAUSE/refus ici, EXPLAIN/cadre requis là-bas) — deux moteurs d'intention incompatibles sans arbitre.
- **[MAJEUR]** couverture dérisoire : « Est-ce que… », « Comment… », « Où… », « Combien… » → UNKNOWN_INTENT → jamais de réponse ; `startswith("quel")` matche « quelqu'un » (faux positif).
- **[MINEUR]** les faits `superseded` sont copiés sans filtrage de pertinence ; `_digest` plantera en `TypeError` brut sur objet non sérialisable ; gouvernance déclarative morte dans le code (OWNER « FRED », SHA d'un dépôt tiers). `llm_request_build.py` : anonymisation réellement implémentée (bon point) ; trois blocs de refus dupliqués ; `coherence_S` float brut.
- Tests : 12, plutôt bons (immutabilité, verbaliseur hostile, non-fuite via `repr()`). Le rapport de preuve cite « 607 passed » d'un dépôt privé invérifiable — ici il n'y a que 12 tests.

### s_add_v2_runtime_v1 — techniquement le plus rigoureux, conceptuellement circulaire
Calcul en `Decimal` (précision 50, ROUND_HALF_EVEN, 12 décimales), validation d'entrée très dense.
- **[MAJEUR]** le moteur ne peut produire qu'UN nombre : le profil épingle run_id, commit, URLs, cardinalités, et `evaluate` exige `sources == expected_sources`. Toute autre donnée → FAIL. Le « rejeu ×1000 » est trivial : fonction constante sur son unique entrée valide. Cérémonie de re-calcul, pas instrument de mesure.
- **[MINEUR]** ΔΦ=0 traité comme falsification (choix non documenté) ; canonicalisation différente du reste du dépôt (`\n` final ajouté avant hash — deux « JSON canoniques » incompatibles cohabitent) ; `assert` de production ; `len(ADVERSARIAL_CASES) == 50` vérifié 50 fois.
- Tests : les meilleurs du dépôt — 50 cas adversariaux réels (seal falsifié, élargissement de scope, promotion interdite → FAIL).

## II.3 Constats transverses Python

1. **[CRITIQUE] Le « déterminisme » vendu est trivial** : lookup de mots-clés, listes blanches, fonction constante, chaînes codées en dur. La seule source de non-déterminisme réelle (horodatage du certificat K3) est masquée en aval par filtrage.
2. **[CRITIQUE] Écart massif vocabulaire/code** : « système borné de décision en langage naturel », « moteur sémantique », « cycle réflexif », « Ω∞ COHERENCE CORE » — en face, ~1 600 lignes de `substring in string`, `min()` sur trois valeurs et SHA-256 de dicts. La logique K3 est correcte mais combine des verdicts attribués d'office : garbage in, certificat out.
3. **[MAJEUR] Aucun packaging** : ni `pyproject.toml`, ni `setup.py`, ni `conftest.py`, ni requirements racine ; intégration par `sys.path.insert` relatifs ; imports non qualifiés avec noms génériques collisionnables (`response`, `intent`).
4. **[MAJEUR] Duplication** : `_canonical`/`_digest` réimplémentés dans 7 fichiers, avec une variante incompatible ; conjonction K3 en double ; `_STEPS` dupliqués.
5. **[MAJEUR] Double orthographe `NON_MESURE`/`NON_MESURÉ`** à travers la frontière 05B ↔ K3.
6. **[MINEUR] Franglais systémique** ; typage globalement correct et dataclasses gelées bien utilisées (bon point) ; `assert` en production ; magic numbers ; un test-script incompatible pytest qui sabote la collecte racine.
7. **Tests — bilan** : 96 verts au total. `s_add_v2` et `k3_nl_response` testent de vrais invariants falsifiables ; les suites NL sont sur-ajustées sur UNE question vitrine ; les « replay ×1000 » testent des fonctions pures sur entrées figées — ils ne peuvent pratiquement pas échouer.

---

# Partie III — ZMOS v2 transactionnel

Périmètre : `components/zmos_v2_transactional/` en entier (docs de gouvernance, z2 specs/schemas/vecteurs, z3 code/harnais/bridge/writer/reconstruction, tests, workflow CI embarqué).

## III.1 Résultats d'exécution

| Commande | Résultat |
|---|---|
| `pytest tests z3 -q` | **174 passed, 11 skipped** (9 Windows-specific, 1 UNC, 1 ZORAN_SOURCE absent), 42 subtests |
| `python -m z3.contract_harness` | **PASS 29/29** (schemas 7/7, golden 6/6, red 16/16) |
| `unittest discover tests/contract_harness` | 25 tests OK |
| `jcs_differential.py` | PASS, 5 000/5 000 matches vs Node `JSON.stringify` (corpus_sha256 identique à EVIDENCE.md) |
| Bridge avec vrai dépôt `zoran-v2@e7113ad2` cloné | **36 passed** (0 skip) |
| `e2e_proof.py` | **E2E_PASS** : Tour A/Tour B en processus distincts, 4 contrôles négatifs tous BLOCKED |
| Validation indépendante des 6 golden vectors (jsonschema + rfc8785 + cryptography) | 6/6 : octets canoniques identiques, SHA exacts, signature Ed25519 valide |
| Fuzz différentiel canonicalizer maison vs `rfc8785` (cas pièges + 3 000 aléatoires) | **0 divergence** ; rejets corrects (`-0`, lone surrogates, entiers non-binary64) |

Tout ce qui est exécutable passe, y compris sous outils de référence indépendants. Le problème n'est pas la qualité du code : il est dans la cohérence documentaire, la vérifiabilité des « proofs » et la sur-spécification.

## III.2 Constats critiques

**Z-C1 — La documentation de gouvernance décrit un dépôt qui n'existe plus, et s'auto-invalide.** `README.md:14-16` : « *Private repository… deliberately documentation-only. It contains no implementation, persistent data, runtime component…* » — faux ici : ~8 560 lignes de Python, un workflow CI, des fixtures exécutables, dépôt public. `Z1_EXCLUSION_POLICY.md:30` : « *Any denied class appearing in the branch makes Z1 REJECTED* » — toutes les classes interdites sont présentes : selon sa propre règle fail-closed, l'état Z1 affiché est auto-invalidé. `GOVERNANCE.md:40-44` (« merge remains forbidden », « main is an empty administrative baseline ») contredit la réalité. Cause : transplantation verbatim depuis le dépôt privé sans mise à jour d'état.

**Z-C2 — Chaîne de preuve non rejouable : tous les SHA pivots sont introuvables.** Vérifié par `git cat-file -t` : `21c5e00d…` (base « frozen »), `f8d657d5…` (commit de `Z1_ABSENCE_PROOF.md`, déjà auto-déclaré SUPERSEDED), `4f6fa6ea…`, `f09d0141…`, `42c6d836…` (BASE_SHA du gate CI), et surtout `4c218e91…` = `ZMOS_SOURCE_SHA` (`bridge.py:32`), persisté comme `producer_code_sha` dans chaque bundle : la provenance signée pointe vers un commit invérifiable. Seul `e7113ad2…` (dépôt public `zoran-v2`) est résoluble.

**Z-C3 — La CI « runtime of proof » ne peut pas s'exécuter dans ce dépôt.** `zoran_bridge_e2e.yml` est sous `components/…` (GitHub ne lit que `/.github/workflows` racine) → workflow mort ; déclencheur sur une branche inexistante ; fetch d'un SHA absent. La CI racine réelle n'exécute AUCUN test Python de ce sous-arbre. Or `EVIDENCE.md` affirme que « la preuve est les logs CI attachés au SHA exact » : cette preuve n'existe pas et ne peut pas exister ici sans re-câblage.

## III.3 Constats majeurs

- **Z-M1 — Evidence ledger du writer périmé** : hash gravés `0F4903AA…`/`FFCA3380…` vs mesurés `66383DD3…`/`FE02AB00…` — le commit `9ec99da` a modifié `writer.py` (+32 lignes) sans re-mesurer le ledger. Le document de preuve certifie un code qui n'est plus celui livré.
- **Z-M2 — « Frozen inputs » re-baselinés après coup** : le même commit a réécrit les 9 SHA « gelés » de `HARNESS_METADATA.json` (normalisation CRLF→LF, plausible) — mais un gel qui suit les fichiers n'est plus un gel, et le `base_sha` reste invérifiable.
- **Z-M3 — Vecteurs rouges partiellement tautologiques** : ~7 des 16 red vectors « certifient » un harnais qui lit la réponse dans le contexte du fixture même (`provenance_phase`, idempotence, `state_phase`, `recovery_phase`, phases legacy — `contract_harness.py:402-465`). Les phases RAW_PARSE/SCHEMA/CANONICALIZATION/IDENTITY sont, elles, réellement testées. `Z2_SCOPE.md` promet pourtant « *Red status must arise from the missing or violated protection, never from a deliberately broken test harness* ».
- **Z-M4 — La machine à états transactionnelle n'est pas implémentée** : `RUN_STATE_MACHINE.md` définit NEW/OPEN/COMMITTING/COMMITTED/ABORTED ; les schémas figent `status` à des constantes ; NEW/OPEN/ABORTED n'ont aucune représentation possible ; le writer commite tout en une transaction SQLite. La spec décrit un système qui n'existe pas.
- **Z-M5 — Trois vocabulaires d'erreurs incompatibles** contrairement à `ERROR_MODEL.md` (« MUST return the same code ») : writer (ValueError à messages libres), bridge (codes inventés hors modèle), reconstruction (codes supplémentaires non spécifiés). Le modèle normatif n'est respecté que par le harnais de fixtures.
- **Z-M6 — Deux canonicalisations JCS dans le même chemin de commit**, divergence concrète démontrée : `canonical_bytes({'n': 2**53})` accepté par le scellement maison, rejeté (`IntegerDomainError`) par la re-vérification `rfc8785` → enveloppe scellable mais non reconstructible (`CANONICALIZATION_FAILED`). Fail-closed, donc pas de faux-accept, mais l'invariant « une seule séquence d'octets V1 » est structurellement fragile.
- **Z-M7 — ZORAN_WRENCH contradictoires** : le wrench parent de `z3/` déclare `Z3_NO_STORE`, `Z3_NO_WRITER`, `Z3_NO_RUNTIME` sur « all files below z3/ » — qui contient précisément un writer, un store, un bridge et un runtime, chacun gouverné par son propre wrench. Aucune règle de précédence.
- **Z-M8 — Spec des identifiants incomplète** : `IDENTIFIERS.md` ne définit ni `KEY-V1-`, ni `CMP-V1-`, ni `SCH-V1-`, pourtant utilisés par les schémas, les goldens et tout le code ; `transaction_id` « externally allocated ULID » est en réalité dérivé d'un digest ; `receipt.writer_authority_id` contient un id de provenance jamais expliqué.

## III.4 Constats mineurs (sélection)

Fuite de chemin opérationnel (`Worktree: C:\Users\frede\zmos-z3-lot0-integration-v1` — exactement ce que le THREAT_MODEL interdit) ; test référencé inexistant dans `FINDINGS_R1.md` (renommé sans mise à jour) ; « S multicadre » avec scores auto-attribués invérifiables (« S_code: 9.6/10 ») ; docs Windows-first vs runtime Linux déclaré, trois versions Python cibles ; répertoire non importable `ia-a` ; dead code (`try/except: raise`, regex `-0` redondante) ; deux validateurs de schéma, deux canonicalizers, trois scellements d'identité ; imports de fonctions privées inter-modules ; pins de dépendances décoratifs (cryptography <48 épinglé, 50 installé) ; `durable_at` constant fictif dans l'E2E ; timestamps des docs dans un format que leur propre spec interdit ; `store_benchmark.py` ~1 350 lignes dont l'essentiel de durcissement Windows pour un benchmark jetable ; les 7 findings de `Z0_FINDINGS.md` restent OPEN dont un défaut d'auth (`ZMOS-Z0-SEC-001`) ; gouvernance attribuée à un humain unique (« Fred ») avec pour « auditeurs indépendants » d'autres LLM du même opérateur.

## III.5 Ce qui tient la route (contre-vérifié)

Canonicalizer identique aux références sur 8 000+ cas ; golden vectors intégralement re-vérifiés indépendamment ; writer SQLite crash-safe testé par de vrais kills à trois phases, avec contrat honnête sur ses limites ; `reconstruction/model.py` est la pièce la plus sérieuse du lot (jsonschema réel épinglé par SHA, Ed25519 réel, chaîne d'autorité avec rotation/révocation, tri topologique causal, pureté prouvée) ; E2E bridge reproduit de bout en bout avec le vrai dépôt ZORAN épinglé.

**Synthèse Partie III** : prototype avancé de qualité technique élevée sur son noyau, non industrialisé et sur-vendu par son appareil de preuve. La seule certification valable est celle que l'on ré-exécute — elle passe localement, mais n'est branchée sur aucune CI de ce dépôt.

---

# Partie IV — Applications TypeScript et sécurité

Périmètre : `ui_zoran_blue_v169` et `semantic_bge_m3_browser_v156`. Exécution réelle : `npm ci` (510 paquets, 0 vulnérabilité à l'installation), `tsc --noEmit` strict → 0 erreur, build `vinext` → succès, `node --test` → 830/830 PASS, `check:zmos` → 158/158, `pytest test_stabilization.py` → 9 passed.

## IV.1 Sécurité

- **Secrets : RAS (vérifié).** Balayage regex complet (`sk-`, `sk-ant-`, `AIza`, `ghp_`, `xox*`, `AKIA`, `Bearer`, blocs PEM) sur tout le dépôt, y compris `.openai/hosting.json`, `.npmrc`, les `package-lock.json`, tests et reports : **aucun secret trouvé**. `.openai/hosting.json` ne contient qu'un `project_id` OpenAI Sites (identifiant interne divulgué — mineur).
- **[MAJEUR — dépendant du déploiement] Identité = en-tête HTTP non authentifié.** `lib/request-security.ts:20-25` : toute l'authentification (chat, coffres, TTS, session) et le rate-limiting reposent sur `oai-authenticated-user-email`, injecté par le dispatch OpenAI ChatGPT Sites. Modèle documenté de la plateforme, acceptable **sur** Sites — mais le dépôt embarque l'entrée Cloudflare Worker (`worker/index.ts`, wrangler) permettant de déployer ailleurs, où **n'importe quel client forge l'en-tête** : usurpation d'identité, accès aux statuts de coffre d'autrui, contournement du rate-limit. Aucune vérification de signature, ni même de format email. La protection open-redirect de `chatgpt-auth.ts` (l.57-70) est, elle, correcte.
- **Coffre de clés API (`lib/vault.ts`) : chiffrement RÉEL, pas simulé.** AES-256-GCM authentifié, IV 96 bits aléatoire, clé maître 32 octets depuis l'env (fail-closed si absente), cookie `httpOnly/secure/sameSite:strict`, payload validé au déchiffrement et lié à l'identité (`subjectHash`). Réserves : clé maître unique sans rotation ni AAD ; la clé API chiffrée transite dans le cookie à chaque requête (assumé et documenté) ; `subjectHash` = SHA-256 **non salé** de l'email (recalculable par quiconque connaît l'email).
- **`request-security.ts` : contrats appliqués, pas seulement déclarés (vérifié à l'exécution).** `assertSameOrigin` fail-closed ; `readBoundedJson` borne réellement le flux (chunks, annulation au dépassement, UTF-8 strict) ; appliqués sur toutes les écritures API. Réserve **[MAJEUR]** : rate-limit en `Map` de module, par isolate — quasi inopérant sur Workers multi-isolate/multi-PoP (admis « best-effort » dans le README) ; c'est pourtant la seule défense anti-abus de routes qui relaient des clés payantes.
- **[MAJEUR] DoS mémoire applicatif.** `app/api/chat/route.ts:16` : `MAX_BODY_BYTES = 36_000_000` — corps JSON de 36 Mo bufferisés en mémoire, pièces jointes ≤ 25 Mo décodées par `atob`, sur un isolate Workers (~128 Mo) : quelques requêtes concurrentes suffisent, et le rate-limit forgeable/par-isolate ne protège pas. Timeouts fournisseurs corrects par ailleurs.
- **SSRF via connecteurs : non exploitable.** `zoran-connector-gate.ts` ne fait aucune requête sortante ; `safeEndpointConfigured` (https obligatoire, rejet IP littérales/localhost/userinfo) correct ; `zoran-core-runtime.ts` fetch une URL d'env serveur, pas utilisateur.
- **Routes API** : validation exemplaire des messages du chat (rôles bornés, magic bytes par type de pièce jointe, base64 strict, tailles recoupées, détection de secrets dans les messages → 400) ; mandats de forum injectés dans le message user, jamais dans le system prompt (bonne hygiène anti-injection). **[MINEUR]** : GET `/api/vault` mutateur sans contrôle d'origine ; CSP `script-src 'unsafe-inline'` ; exemple `examples/d1` sans auth avec fuite d'erreurs (non routé mais compilé) ; providers DeepSeek/kimi enregistrables dans le coffre mais inutilisables par le chat (fonctionnalité fantôme) ; historique de conversation en clair dans `localStorage` ; données personnelles de l'auteur dans les rapports commités (`C:\Users\frede\…`, « Autorisation Fred ») ; `check-zmos-manifest.mjs` écrit des objets dans `.git` alors que c'est un script de vérification.

## IV.2 Fond — cohérence docs/certifications vs code

- **Le composant A builde** : `tsc` strict 0 erreur, build `vinext` complet, tous les imports locaux résolvent (vérifié exhaustivement). **Le composant B ne builde pas** (cf. constat critique n°8 de la synthèse).
- **Traçabilité ZMOS de l'UI : cohérente en interne, provenance invérifiable.** `check:zmos` → 158/158 (mécanisme réel, empreintes recalculées depuis les blobs git). Mais tous les `rollback.base_sha` (`645e97b2…`) et tous les SHA cités dans les docs n'existent pas dans ce dépôt — le checker ne vérifie pas l'existence du `base_sha`, c'est pour cela qu'il passe.
- **Docs de certification plutôt honnêtes, chiffres désynchronisés** : `SECURITY_AUDIT_CANDIDATE.md` en statut explicite « AWAITING… », ses affirmations locales reproduites par l'exécution ; mais 802 vs 810 vs 830 tests selon le document — docs figées jamais régénérées. Les sections « parcours réels », « audit runtime », « deux audits Claude indépendants », « publication » sont toutes non cochées : le dépôt ne prétend pas être certifié — le vocabulaire ambiant le suggère pourtant.
- **Le « certificat cryptographique Claude + Codex »** (`zoran-connector-gate.ts`) est techniquement sérieux (Ed25519, fenêtres temporelles, clés distinctes obligatoires, comparaison constant-time) mais conceptuellement creux : quiconque détient les clés privées d'environnement fabrique un « audit Claude ». Verrou de configuration, pas certification tierce. `connected: false` codé en dur — la passerelle n'est jamais fonctionnelle.
- **« IA déterministe » vs UI** : wrapper multi-LLM à température 0.3 ; le contrat `k3-response-contract.ts` (réel et rigoureux, fail-closed, anti-altération) garde une porte dont la maison n'existe pas dans ce dépôt.

## IV.3 Tests : 830 asserts, ~83 % de « checklists »

Décompte exact : **60/72 fichiers ne testent aucun comportement** (lecture du source + `assert.match` de regex — ex. vérifier que la chaîne `AES-GCM` apparaît dans `vault.ts`). **12/72 exécutent du vrai code** (import direct des `.ts`) — exécutés, tous PASS. **1 seul test d'intégration réel** (fetch du worker construit). Aucune route API testée bout-en-bout (auth, coffres, chat), aucun test navigateur (admis dans `FINALIZATION_STATUS.md`). `test_stabilization.py` n'est branché nulle part (ni npm ni CI). Sans `node_modules`, 2 tests « autonomes » échouent.

## IV.4 Qualité et forme

- **[MAJEUR]** `app/page.tsx` : 3 165 lignes, monolithe client (156 hooks : conversation + voix + caméra + forum multi-IA + coffres + timeline + import/export), aucune décomposition. Les libs extraites (`lib/*`) sont propres et testées.
- **[MAJEUR]** Duplication inter-composants : le `page.tsx` du composant B (3 206 lignes) est identique à ~98 % (diff total 71 lignes) — deux snapshots du même fichier vivent dans le dépôt.
- **Plateforme cible** : la coexistence `next.config.ts` + `vite.config.ts` + worker Cloudflare + `.openai/hosting.json` n'est pas une incohérence mais la pile OpenAI ChatGPT « Sites » (`vinext` buildé en Worker, auth injectée par le dispatch). Cohérent, mais totalement propriétaire : l'application n'est pas auto-hébergeable sans perdre l'authentification. Le README du template `vinext-starter` a été conservé tel quel en tête, ce qui brouille l'identité du projet.
- **[MINEUR]** Fichiers anormaux versionnés : `.vinext/fonts/**` (10 binaires .woff2 + CSS, 172 Ko — cache généré de `next/font` commité, revendiqué par la « gouvernance de fichiers » mais artefact de build) ; `drizzle/meta/_journal.json` sans aucune migration, `db/schema.ts` vide ; `examples/d1/` du template. Versionnage incohérent : dossier « v169 », `package.json` 0.156.0, UI affichant « v156 » ; aucun tag git. `layout.tsx` laisse `"codex-preview": "development"` en métadonnées de production. Cinq `UI_BUILD_ORDER_V140…V144.md` quasi identiques (logs de process versionnés comme docs).

## IV.5 Composant B — `semantic_bge_m3_browser_v156`

- **[CRITIQUE]** Non compilable (détail au constat n°8 de la synthèse) ; la CI l'assume : job `bge-m3-candidate-diagnostic` en `continue-on-error`, qui ne typecheck que le worker et la lib, jamais `page.tsx`.
- **[MAJEUR]** `session-client.tsx` : code mort orphelin qui POSTe `/api/session` avec un token d'invitation — cette route n'existe dans aucun des deux composants. Le mécanisme « lien d'invitation individuel » est fictif dans ce dépôt ; SHA d'affichage `7139dbad4ac2` codé en dur et invérifiable.
- **Faisabilité BGE-M3 navigateur : réelle mais lourde.** `@huggingface/transformers` + `onnx-community/bge-m3-ONNX` int8 dans un Web Worker : voie standard qui existe bel et bien ; CSP correctement ouverte vers HuggingFace. Mais ~568 Mo à télécharger au premier usage, warmup toléré jusqu'à 240 s — démonstrateur, pas moteur de production.
- **[MAJEUR]** Déterminisme non garanti inter-machines : le worker ne fixe ni backend (WASM/WebGPU) ni device ; les arrondis flottants diffèrent entre backends → la même phrase peut produire des empreintes SHA-256 différentes selon l'appareil, alors que l'empreinte est présentée comme `decision_hash`. Limite jamais mentionnée. (La politique racine classe honnêtement BGE-M3 « candidate only / NON_MESURE ».)
- **[MINEUR]** `bge-m3-browser.ts` : un timeout d'un seul encode tue le worker et rejette toutes les requêtes en attente ; `cosineSimilarity` est un produit scalaire brut (valide uniquement grâce à `normalize: true` — nom trompeur si réutilisé) ; `Promise<any>`.

---

# Conclusion générale

**Fond.** Le dépôt est un mono-dépôt d'agrégation, assemblé en trois jours (21–23 août 2026) par transplantation « exacte » de composants venus de dépôts privés, avec un historique écrasé qui rompt toutes les chaînes de provenance internes. Deux réalités y cohabitent : un socle technique dont plusieurs pièces sont authentiquement solides (canonicalisation RFC 8785 contre-vérifiée, writer transactionnel crash-safe, reconstruction cryptographique sérieuse, logique K3 exacte, chiffrement correct, quelques suites de tests adversariales réelles), et un appareil de « certification / preuve / scellement » qui, dès qu'on le vérifie, se révèle auto-référentiel (le moteur juge est privé, l'autorité est auto-signée en clé de test, les chiffres de preuve sont codés en dur, les scellements-clés sont cassés, le critère de promotion est inatteignable). La partie la plus honnête du dispositif est son propre aveu permanent : tout est NON_MESURÉ.

**Forme.** Typo dans le nom même du dépôt, README de deux lignes, absence totale de LICENSE (un dépôt public sans licence est juridiquement « tous droits réservés » : personne ne peut légalement le réutiliser), franglais systémique, jargon jamais défini pour un lecteur externe, docs figées désynchronisées, fuites de chemins et de données personnelles de l'auteur, artefacts de build et caches commités.

**Qualité.** Très inégale : de l'excellent (reconstruction ZMOS, tests adversariaux S_ADD_V2, validation d'entrées de l'UI) au factice (tests-grep, théâtre calculatoire, composant non compilable), sans packaging, avec duplication massive et deux conventions incompatibles pour les invariants les plus centraux (canonicalisation, orthographe de NON_MESURÉ).

**Lecture recommandée pour un tiers** : traiter ce dépôt comme un *prototype de recherche personnel intéressant par endroits*, dont aucune revendication de certification, de preuve ou de déterminisme ne doit être acceptée sans ré-exécution — et dont plusieurs revendications sont, en l'état, réfutées par son propre contenu. Les recommandations priorisées figurent en section 0.

---

*Audit réalisé le 2026-08-25 sur le commit `742fea7`. Toutes les affirmations d'exécution de ce rapport correspondent à des commandes réellement lancées sur un clone local ; les preuves détaillées (commandes et sorties) figurent dans les parties I à IV.*

