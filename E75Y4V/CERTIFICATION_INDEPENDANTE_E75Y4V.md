# Certification indépendante du paquet E75Y4V

Date : 2026-09-01 (UTC)
Vérificateur : Claude Code (session indépendante de la campagne E75Y4V)
Méthode : relecture intégrale des quatre fichiers publiés, vérification de
chaque affirmation vérifiable, puis ré-exécution de la logique du validateur
chronologique décrite dans le rapport (script `verify_e75y4v.py`, reproductible :
`python3 E75Y4V/verify_e75y4v.py`).

## Résultat : 18/18 vérifications PASS

### Ce qui est certifié (vérifié dans cette session)

**Intégrité et cohérence des fichiers (Part A, 12 vérifications) :**

1. Les SHA-256 déclarés dans `HANDOFF_276.json` correspondent exactement aux
   fichiers réels : rapport `fa20af79…861ea9`, résultats `5617d54a…3f5e0`.
2. L'arithmétique temporelle est exacte : le contre-audit R12
   (`2026-08-12T07:34:44.550822Z`) a bien été créé **211,485935 s** après
   l'ancre (`2026-08-12T07:31:13.064887Z`), comme déclaré.
3. Tous les comptes sont arithmétiquement cohérents :
   350 cas = 50 contrôles + 250 attaques (5 familles × 50) + 50 observations
   R12 ; 250 vétos = 150 FAIL + 100 NON_MESURÉ ; 350 certificats = 350
   événements = 350 cas.
4. Le détail 150 FAIL / 100 NON_MESURÉ correspond exactement à la carte des
   familles d'attaque déclarée (3 familles → FAIL, 2 familles → NON_MESURÉ).
5. Les trois fichiers JSON (résultats, certificat, handoff) portent des
   verdicts identiques, sans contradiction : verdict borné
   `PASS_…_250_OF_250_VETO_50_OF_50_CONTROL`, verdict R12
   `NON_MESURÉ_…_0_OF_4_EVIDENCE`, statut scientifique `NON_MESURÉ`.
6. Le candidat R12 réel est cohérent : 0/4 conditions démontrées, 4
   NON_MESURÉ, en accord avec le nom du verdict.

**Reproduction des résultats (Part B, 6 vérifications) :**

Le validateur chronologique à quatre conditions décrit dans le rapport
(épingle antérieure, épingle indépendante, plancher antérieur, plancher non
restaurable) a été ré-implémenté indépendamment et ré-exécuté sur la même
structure de campagne. Résultats obtenus, identiques aux comptes publiés :

- Contrôles valides : **50/50 PASS** ✓
- Attaques chronologiques bloquées : **250/250** ✓
- Détail strict : **150 FAIL / 100 NON_MESURÉ** ✓
- Comparateur contenu-seul : **250/250 faux positifs** ✓
- Observations du candidat R12 réel : **50/50 NON_MESURÉ** ✓
- Total : **350 cas** ✓

La conclusion centrale du rapport est donc reproduite : un validateur qui
ignore la chronologie accepte 100 % des attaques d'amorçage, tandis que le
contrat strict à quatre conditions les bloque toutes en conservant tous les
contrôles valides ; et l'évidence R12 réelle (contre-audit postérieur à
l'ancre, zéro hit antérieur) ne démontre aucune des quatre conditions.

### Ce qui n'est PAS certifiable depuis ces fichiers (limites honnêtes)

Conformément à la discipline NON_MESURÉ du paquet lui-même :

1. **Les 350 certificats chaînés originaux** et la tête de chaîne
   `650b7e7a…f32464d` ne sont pas dans le paquet : la chaîne SHA-256
   d'événements n'a pas pu être revérifiée.
2. **Les quatre requêtes d'index de la Bibliothèque** (0 hit avant l'ancre)
   ne sont pas rejouables d'ici : l'index interrogé n'est pas accessible.
3. **Les corpus Zenodo** (18526755, 18516353, 18497598) restent non relus,
   comme le rapport le déclare lui-même.
4. **Le SHA-256 de paquet `fe141d98…ff3c6e`** mentionné hors fichiers
   n'apparaît dans aucun des quatre documents et n'a pas pu être vérifié —
   aucune archive correspondante n'a été fournie.
5. La reproduction en Part B porte sur la **logique du validateur telle que
   décrite**, ré-implémentée indépendamment ; le code original de la campagne
   n'était pas fourni.

### Verdict de certification

`CERTIFIÉ_COHÉRENT_ET_REPRODUIT_18_OF_18` — borné aux fichiers fournis :
les quatre documents E75Y4V sont exempts de contradiction interne, leurs
empreintes et leur arithmétique sont exactes, et la logique décrite reproduit
exactement les comptes publiés. Ce certificat ne promeut aucun verdict
au-delà de ce que les fichiers déclarent : le statut scientifique et le
verdict R12 restent `NON_MESURÉ`, exactement comme publié.
