# INDEX DES PREUVES

Dépôt : `Zoran-IA-Mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence`
Branche : `claude/multi-agent-exploration-protocol-26l1c5`
SHA : **`cdf9039777b4f71f62153a06d96ecf949ed94cc5`**

Cet index rend chaque preuve du registre rejouable. Toute commande ci-dessous s'exécute **depuis la
racine du dépôt**, en lecture seule.

---

## 0. PRÉCONDITION — VÉRIFIER L'ÉTAT AVANT DE REJOUER

Une preuve rejouée à un autre SHA n'est pas la même preuve : c'est une autre mesure (interdit n°5).

```sh
git rev-parse HEAD        # DOIT afficher cdf9039777b4f71f62153a06d96ecf949ed94cc5
git status --porcelain    # DOIT être vide
```

Si l'un des deux échoue, **arrêter**. Se replacer au SHA avant toute rejouabilité :

```sh
git fetch origin && git checkout cdf9039777b4f71f62153a06d96ecf949ed94cc5
```

---

## 1. EMPREINTES DE RÉFÉRENCE AU SHA

Les 6 fichiers suivis, avec l'identifiant d'objet git qui rend toute substitution détectable.

| Fichier | Octets | Blob git | sha256 (16 premiers) |
|---|---|---|---|
| `LICENSE` | 1094 | `0a8e66697247358ba9ef94d333ec1c9adf8e1fdc` | `5bc2d4bdd33d1dff` |
| `README.md` | 1142 | `92d1cdc0c81bf9d478d3bd5c90f15b3bf37f1ad5` | `43c93853ece08b48` |
| `Zoran_2040_aSiM_WhitePaper.pdf` | 6701 | `068031541e02332af7bd1bd5198c21174f0b6449` | `db7cc4dcb30ffa1f` |
| `Zoran_2040_aSiM_WhitePaper_FULL.pdf` | 13556 | `cc048f6df78237a510929f504d394fa2a14dab81` | `c62197cb3a54075e` |
| `Zoran_2040_aSiM_WhitePaper_FULL (1).pdf` | 13556 | `cc048f6df78237a510929f504d394fa2a14dab81` | `c62197cb3a54075e` |
| `Zoran_2040_aSiM_WhitePaper_FULL (2).pdf` | 13556 | `cc048f6df78237a510929f504d394fa2a14dab81` | `c62197cb3a54075e` |

**Trois lignes partagent le même blob** — c'est le fait établi par `A4-01` et confirmé par `A6-M1` :
2 artefacts uniques, 4 chemins. Commande de contrôle :

```sh
git ls-files -s -- '*.pdf' | awk '{print $2}' | sort -u | wc -l   # -> 2
```

Base d'objets complète du dépôt : **11 objets** (3 commits, 3 trees, 5 blobs).

```sh
git cat-file --batch-all-objects --batch-check | sort
```

---

## 2. OUTIL CANONIQUE — `outils/pdftext.py`

`pdftotext`, `pdfinfo`, `qpdf`, `pypdf`, `ghostscript`, `mutool` et `pdftoppm` sont **absents** du
runtime, et l'installation de paquets était interdite pendant l'exploration. L'outil ci-joint
n'utilise que la **stdlib Python**.

```sh
python3 protocole_exploration/outils/pdftext.py Zoran_2040_aSiM_WhitePaper_FULL.pdf
python3 protocole_exploration/outils/pdftext.py Zoran_2040_aSiM_WhitePaper.pdf
```

Sortie attendue au SHA `cdf9039` :

| Fichier | Caractères |
|---|---|
| `Zoran_2040_aSiM_WhitePaper_FULL.pdf` | 4720 |
| `Zoran_2040_aSiM_WhitePaper.pdf` | 2895 |

Première ligne du FULL : `Executive Summary`

### Les trois pièges que cet outil désamorce

Ils ne sont pas théoriques : chacun a été rencontré par un agent au cours du pilote.

1. **Chaîne de deux filtres.** Les flux déclarent `/Filter [ /ASCII85Decode /FlateDecode ]`. Un
   `zlib.decompress` direct échoue sur **10 flux sur 10**. Il faut
   `base64.a85decode(..., adobe=True)` **puis** `zlib.decompress`. C'est l'erreur qui a produit la
   contradiction `C-01`.

   ```sh
   python3 -c "import re;d=open('Zoran_2040_aSiM_WhitePaper_FULL.pdf','rb').read();print(sorted(set(re.findall(rb'/Filter\s*\[([^]]*)\]',d))))"
   # -> [b' /ASCII85Decode /FlateDecode ']
   ```

2. **`stream` matche aussi `endstream`.** Un motif `rb'stream'` naïf compte **20** flux au lieu de
   10. D'où le lookbehind `(?<!end)stream` dans l'outil.

3. **Texte en UTF-16BE échappé en octal.** Les échappements octaux (`\000`) **et** non-octaux
   (`\(`, `\)`) doivent être résolus **avant** le décodage UTF-16BE. Traiter `\000` comme un seul
   caractère échappé désaligne les paires d'octets et produit du faux CJK. A5 et A6 ont tous deux
   reproduit puis corrigé cette erreur.

---

## 3. CHAÎNE DE TRAÇABILITÉ

`REGISTRE_CONSTATS.jsonl` — 57 lignes JSON, une par constat. Chaque ligne porte la chaîne complète :

```
depot → branche → sha → fichier → lignes_symbole → commande → fait_verifie → preuve → verdict
```

### Retrouver une preuve depuis son identifiant

```sh
python3 -c "
import json
for l in open('protocole_exploration/REGISTRE_CONSTATS.jsonl',encoding='utf-8'):
    r=json.loads(l)
    if r['id']=='A4-01':
        print('SHA      :',r['sha']); print('FICHIER  :',r['fichier'])
        print('COMMANDE :',r['commande']); print('VERDICT  :',r['verdict'])
"
```

### Vérifier l'intégrité du registre

```sh
python3 -c "
import json
from collections import Counter
rows=[json.loads(l) for l in open('protocole_exploration/REGISTRE_CONSTATS.jsonl',encoding='utf-8')]
print('constats           :', len(rows))
print('ids uniques        :', len(set(r['id'] for r in rows))==len(rows))
print('SHA distincts      :', set(r['sha'] for r in rows))
print('par agent          :', dict(sorted(Counter(r['agent'] for r in rows).items())))
req=['depot','branche','sha','id','fichier','lignes_symbole','commande','fait_verifie','verdict','contre_exemple_recherche','incertitude','action_proposee']
print('champs manquants   :', [(r['id'],c) for r in rows for c in req if not r.get(c)] or 'AUCUN')
"
```

Sortie attendue : 57 constats · ids uniques `True` · **un seul SHA** · A1:8 A2:12 A3:8 A4:10 A5:10
A6:9 · champs manquants `AUCUN`.

Le contrôle « un seul SHA » applique l'interdit n°5 : il rend mécaniquement détectable toute
conclusion importée d'un autre SHA.

---

## 4. COMMANDES DE PREUVE PAR THÈME

### Périmètre et structure

```sh
git ls-tree -r HEAD                                    # A1-01 : 6 blobs, aucun sous-répertoire
git ls-files | grep -icE '\.(py|js|ts|sh|yml|toml)$'   # A3-02 : 0 fichier de code
git show HEAD:README.md | cat -n                       # A1-04 : 3 lignes
git log --oneline --all                                # A3-04 : 3 commits
```

### Portée — locale contre distante (leçon de `C-03`)

```sh
git branch -a                                    # cache LOCAL : 2 refs distantes seulement
git ls-remote --heads origin                     # RÉALITÉ : 6 branches
git for-each-ref refs/remotes --format='%(refname)' | wc -l   # -> 2
git rev-parse --is-shallow-repository            # -> false (réfute la réserve de A1-02, cf. C-02)
```

**Le premier et le second ne répondent pas à la même question.** Toute affirmation portant sur
« toutes les branches » exige `git ls-remote`, jamais `git branch -a`.

### Duplication des PDF

```sh
cmp 'Zoran_2040_aSiM_WhitePaper_FULL.pdf' 'Zoran_2040_aSiM_WhitePaper_FULL (1).pdf'   # identiques
cmp 'Zoran_2040_aSiM_WhitePaper.pdf' 'Zoran_2040_aSiM_WhitePaper_FULL.pdf'            # diffèrent char 1746
```

### Structure et métadonnées PDF

```sh
python3 -c "import re;[print(f,re.findall(rb'/Count\s+\d+',open(f,'rb').read()),len(re.findall(rb'/Type\s*/Page[^s]',open(f,'rb').read()))) for f in ['Zoran_2040_aSiM_WhitePaper.pdf','Zoran_2040_aSiM_WhitePaper_FULL.pdf']]"
# A4-03 : court /Count 2 (2 pages) ; FULL /Count 10 (10 pages)

for f in *.pdf; do echo "### $f"; strings "$f" | grep -aE '/Author|/Producer|CreationDate'; done
# A5-06 : /Author (anonymous), /Producer ReportLab, D:20250817145135 et D:20250817145343
```

### Inertie des conteneurs et absence de `.zgs`

```sh
python3 -c "import glob;[print(f,[k for k in ['/EmbeddedFile','/JavaScript','/Launch','/OpenAction','/URI','/XObject'] if k.encode() in open(f,'rb').read()]) for f in sorted(glob.glob('*.pdf'))]"
# A4-07 / A6-M3 : listes vides — aucun fichier embarqué, aucune action, aucun lien

python3 -c "d=open('Zoran_2040_aSiM_WhitePaper_FULL.pdf','rb').read();e=d.rfind(b'%%EOF');print('zgs:',d.count(b'zgs'),'| octets après EOF:',len(d)-(e+5))"
# A6-M3 : zgs: 0 | octets après EOF: 1  -> aucune charge appendée

git ls-files | grep -i zgs; echo "exit=$?"      # A2-12 : aucun fichier .zgs (exit=1)
```

### Police non embarquée (dépendance externe réelle)

```sh
python3 -c "import re;[print(f,sorted(set(m.decode() for m in re.findall(rb'/BaseFont\s*/([A-Za-z0-9+,-]+)',open(f,'rb').read()))),re.findall(rb'/FontFile\d?',open(f,'rb').read())) for f in ['Zoran_2040_aSiM_WhitePaper.pdf','Zoran_2040_aSiM_WhitePaper_FULL.pdf']]"
# A4-08 / A6-M7 : ['HeiseiMin-W3','Helvetica'] et [] -> aucune police embarquée
```

`A6-M7` a établi que `HeiseiMin-W3` n'est **pas** une déclaration morte : l'opérateur `Tf` de `F2`
précède la totalité des chaînes de corps de texte. C'est la seule dépendance externe effective du
dépôt, et elle n'est déclarée nulle part.

### Secrets, données personnelles, endpoints

```sh
git log -p --all | grep -aPo 'https?://[^ )>"'"'"']+' | sort -u
# A5-07 : une seule URL dans tout le dépôt et son historique — http://www.reportlab.com

git log --all --format='%H|%an|%ae|%cn|%ce'
# A5-01 / A6-M6 : e-mail d'auteur nominatif sur domaine propre (NON users.noreply.github.com),
# committer noreply@github.com. Adresse présente UNIQUEMENT dans les métadonnées de commit,
# dans aucun blob -> non corrigeable sans réécriture d'historique.
```

Les 26 familles de motifs réellement testées par A5 sont énumérées dans son contrôle d'intégrité et
résumées dans `MATRICE_COUVERTURE.md`. **C'est cette énumération qui fonde la couverture, pas le
nombre de fichiers lus** (interdit n°4).

Piège documenté (`A5-09`) : le motif de téléphone français produit **14 faux positifs** — fragments
d'horodatage PDF (`0250817145` ⊂ `D:20250817145135`), de tableaux `/Widths`, et de flux ASCII85. Un
compteur non qualifié aurait conclu à tort.

---

## 5. PREUVES HORS DÉPÔT — PORTÉE PROJET, NON PORTÉE SHA

Ces preuves ne sont **pas** rejouables par git local. Elles nécessitent un accès API GitHub en
lecture, et elles portent sur un périmètre **distinct du SHA audité**. Cette distinction est
substantielle, pas formelle (voir `C-03` et `A6-M2`).

| Constat | Objet | Moyen d'observation |
|---|---|---|
| `A3-05`, `A6-M5` | 16 exécutions `ci.yml` `success`, 8 head_sha × 2 déclencheurs, aucune sur `cdf9039` | `actions_list{method:'list_workflow_runs', resource_id:'ci.yml'}` |
| `A6-M5` | La suite de tests **n'est pas vide** : 7 fichiers, **51 tests passés**, logs IndexedDB réels | `get_job_logs{job_id:79873634108, return_content:true}` |
| `A3-07` | `package.json` de `…BQ9nA` : `"test": "vitest run"`, `"coverage": "vitest run --coverage"` | `get_file_contents{path:'package.json', ref:'refs/heads/claude/routine-cognitive-mvp-BQ9nA'}` |
| `A6-M2` | Chemins de reproduction dans PR #1/#2/#3 et `LANCER.md` — **d'applications satellites, pas du white paper** | `list_pull_requests{state:'all'}` |
| `A6-M4` | `P0_5_SPEC.md` acte « un écart entre le vocabulaire utilisé et les propriétés réellement démontrées » | lecture brute sur la tête `…pPfzR` |

---

## 6. CONTRÔLE FINAL DE NON-MODIFICATION DU PRODUIT

Les six fichiers produit doivent être **strictement inchangés**. Les artefacts du protocole vivent
dans `protocole_exploration/` et n'y touchent pas.

```sh
git diff --stat HEAD -- LICENSE README.md '*.pdf'    # DOIT être vide
git status --porcelain -- LICENSE README.md '*.pdf'  # DOIT être vide
```

Vérification par empreinte, indépendante de git :

```sh
sha256sum LICENSE README.md *.pdf
# doit reproduire la colonne sha256 du tableau §1
```
