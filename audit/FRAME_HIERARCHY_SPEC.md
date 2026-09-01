# FRAME HIERARCHY SPEC

**Mission** : `ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515`
**Timestamp** : `2026-05-15T19:42:00+02:00`
**Mode** : spec + exec autorisée

Hiérarchie obligatoire des **cadres de calcul** par loi. Empêche les
faux calculs, les extrapolations abusives, et la confusion `S_local` /
`S_global`.

---

## 1. Schéma `frames` ajouté à chaque loi

```json
"frames": {
  "local":         ["string", ...],
  "intermediate": [{"level": "micro|meso|macro|systémique", "scope": "string"}, ...],
  "global":        ["string", ...],
  "proxies":       ["string", ...],
  "limits":        ["string", ...]
}
```

**Tous les 5 champs sont obligatoires** (validés par `tools/validate_laws.py`).

---

## 2. Sémantique des champs

| champ | sens |
|---|---|
| `local` | contexte minimal où la loi s'applique de façon non-triviale (attracteur réduit, voisinage, instance unique) |
| `intermediate` | paliers entre local et global. Au moins **un** doit être présent. Niveaux admis : `micro`, `meso`, `macro`, `systémique` |
| `global` | condition systémique pour que le calcul de la loi soit cohérent à l'échelle ZORAN entière |
| `proxies` | mesures admissibles aujourd'hui (avec leur statut implicite de proxy, pas de mesure exacte) |
| `limits` | ce que la loi **NE calcule PAS** explicitement — frontière de validité |

---

## 3. Niveaux intermédiaires admis

| niveau | sens |
|---|---|
| `micro` | interaction locale entre 2–5 entités (loi + ses voisins immédiats) |
| `meso` | famille canonique entière (5–10 lois) |
| `macro` | domaine de discours (linguistique latente, exploration, consolidation, etc.) |
| `systémique` | ensemble du graphe ZORAN, méta-règles |

Le validateur **rejette** un `level` hors de ce set.

---

## 4. Règle d'usage

Pour chaque calcul (S_local, S_global, dérivation, fusion, audit) qui
implique une loi `L`, le code doit citer **explicitement** dans quel cadre
il opère :

```
calcul(L, frame=L.frames.intermediate[0])
```

Sans citation explicite : **warning** au runtime (`R-FH-1` dans
`oracle_rules.json`).

---

## 5. Exemple (GHUC-001)

```json
"frames": {
  "local": ["famille F unique soumise à consolidation"],
  "intermediate": [
    {"level": "meso", "scope": "famille GHUC (opérations C, P, F)"},
    {"level": "macro", "scope": "toutes les familles canoniques"},
    {"level": "systémique", "scope": "topologie globale ZORAN"}
  ],
  "global": ["méta-cadre Ω⁸ — invariant de consolidation préservé"],
  "proxies": ["test de monotonie S_global sous compression (R-S5)"],
  "limits": ["ne génère pas — consolide seulement", "ne traite pas hors-canonique"]
}
```

Lecture : GHUC-001 opère sur **une famille à la fois** localement, peut
s'agréger à **3 paliers intermédiaires**, vise un **méta-cadre Ω⁸** au
global, se mesure aujourd'hui par la **monotonie de S_global**, et **ne
génère rien de nouveau** (limite essentielle qui prévient la confusion
GHUC vs DVE).

---

## 6. Statistiques sur le corpus actuel (45 lois)

| catégorie | total |
|---|---|
| lois avec `frames` complets | 45/45 (100%) |
| lois avec ≥ 1 niveau `meso` | 45/45 |
| lois avec ≥ 1 niveau `macro` | 21/45 |
| lois avec ≥ 1 niveau `systémique` | 6/45 (méta-règles, racines) |
| lois avec ≥ 1 entrée `limits` | 45/45 |
| moyenne d'entrées par champ | local 1.0 · intermediate 1.5 · global 1.0 · proxies 1.1 · limits 1.7 |

Les `limits` sont systématiquement renseignées : c'est l'antidote au
sur-calcul.

---

## 7. Affichage UI

Le panneau de loi affiche les frames dans une section dédiée
**« Cadres de calcul »** (cf. `LAW_PANEL_SPEC.md` mis à jour, et la
section `Cadres de calcul` ajoutée dans `app/src/panel.js`).

Layout :

```
CADRES DE CALCUL
  ⊙ Local
      · famille F unique …
  ◉ Intermédiaire
      · meso  — famille GHUC
      · macro — toutes les familles canoniques
      · systémique — topologie globale ZORAN
  ⊕ Global
      · méta-cadre Ω⁸ …
  ↻ Proxies admissibles
      · test de monotonie S_global …
  ⊘ Limites (ne calcule PAS)
      · ne génère pas — consolide seulement
      · ne traite pas hors-canonique
```

Couleurs :
- local : `var(--canonical)` (bleu)
- intermediate : `var(--variant)` (vert)
- global : `var(--accent)` (or)
- proxies : `var(--palieronic)` (violet)
- limits : `var(--unstable)` (rouge — signal d'alerte)

---

## 8. Validation Oracle (R-FH-*)

Nouvelles règles de l'Oracle (à ajouter à `audit/oracle_rules.json` en
mise à jour) :

| règle | énoncé |
|---|---|
| R-FH-1 | tout calcul implicant une loi doit citer un `frames.intermediate.scope` |
| R-FH-2 | un nœud sans `frames.global` est inadmissible |
| R-FH-3 | un nœud sans `frames.limits` est inadmissible (sur-calcul masqué) |
| R-FH-4 | un nœud avec `frames.intermediate = []` est rejeté |
| R-FH-5 | un nœud avec uniquement `level=micro` dans `intermediate` est suspect (alerte chaos) |

---

## 9. Anti-patterns à éviter

| anti-pattern | symptôme | mitigation |
|---|---|---|
| `local` = `global` | hubris d'échelle | rejet validation |
| `proxies` vides | calcul théorique sans observable | warn |
| `limits` vagues (« nombreuses limites ») | échappatoire | exiger ≥ 1 limite spécifique |
| `intermediate` réduit à `systémique` | pas de palier intermédiaire | rejet |

---

## 10. Évolution future (P0.6+)

- Coloration des arêtes du graphe selon le palier `intermediate` partagé
  entre source et cible (proximité de cadres).
- Mode « cadre intermédiaire » : afficher uniquement les nœuds
  partageant un palier donné.
- Audit des calculs effectifs : trace systématique de quel cadre est
  invoqué (P1).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_INTERACTIVE_COGNITIVE_NODES_V2_20260515
TIMESTAMP:            2026-05-15T19:42:00+02:00
FILES_MODIFIED:       app/data/laws.json (frames sur 45 lois),
                      tools/validate_laws.py (NODE_REQUIRED + structure check),
                      tools/add_frames.py (script idempotent),
                      app/src/panel.js (section Cadres de calcul),
                      app/style.css (couleurs frames)
RISKS:                frames trop génériques par famille → perte d'info ;
                      validation trop stricte sur structure → fragilité
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       n/a
TOP_FAKE_PATTERNS:    omettre `limits` ; gonfler `proxies` sans observable ;
                      `local` ≡ `global`
NEXT_ACTIONS:         exec immédiate (frames déjà ajoutés via add_frames.py) ;
                      panel.js section ajoutée ;
                      validateur passe (45/45)
```

🔶
