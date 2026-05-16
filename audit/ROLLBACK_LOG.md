# ROLLBACK LOG — P1

**Mission** : `ZORAN_P1_DEMONSTRATED_EXPANSION_50_LAWS_20260515`
**Timestamp** : `2026-05-15T19:53:00+02:00`

Journal des rollbacks et ajustements appliqués pendant l'exécution P1.
Conforme à la règle absolue mission :

> SI HS ↓ OU S_global_proxy ↓ ALORS rollback, pruning, rejet.

---

## 1. Vérifications post-pipeline

| métrique | avant P1 | après P1 | trajectoire | action |
|---|---:|---:|---|---|
| HS                          | 0.800 | 1.000 | ↑ | **OK** — pas de rollback |
| S_global computed           | 0.891 | 0.895 | ↑ légère | **OK** |
| S_global proxy (publié)     | 0.89  | 0.89  | stable | **OK** |
| inflation_ratio             | 0.000 | 0.000 | stable | **OK** |
| C_struct                    | 1.000 | 1.000 | stable | **OK** |
| iso_invariants_ratio        | 1.000 | 1.000 | stable | **OK** |
| C_composition               | 1.000 | 1.000 | stable | **OK** |
| contradictions density      | 0.089 | 0.055 | ↓ (toujours en bande [0.04, 0.15]) | **OK** |
| S_local moyen               | 0.88 | 0.86 | ↓ -0.02 | informational — pas un seuil |
| densité                     | 1.20 | 1.21 | ≈ stable | **OK** |

**Aucun rollback déclenché.** Toutes les métriques de seuil restent dans
les bandes acceptables.

---

## 2. Rollback réservé — itération 1 (compteur)

Le **premier passage** du pipeline (avant correction du compteur de
compositions) a produit ce résultat :

```
candidates_total : 52
integrated       : 16
quarantined      : 36   ← compositions insuffisantes en cascade
```

**Diagnostic** : le compteur ignorait les **grands-parents** et les
**descendants candidates**, ce qui sous-estimait massivement les
compositions disponibles.

**Action** : rollback automatique de `app/data/laws.json` via
`git checkout`, correction de `count_compositions_for()` dans
`tools/add_p1_laws.py`, re-exécution.

```bash
git checkout app/data/laws.json
# (edit tools/add_p1_laws.py — compteur étendu)
python3 tools/add_p1_laws.py
```

**Résultat post-correction** : 46/52 intégrés, 6 quarantinés (anti-pattern
par design). **Rollback réussi** sans perte de données.

---

## 3. Quarantines (rejets sans rollback)

6 candidates ont été **rejetés à l'intégration** (pas intégrés du tout).
Pas de rollback nécessaire — ils n'ont jamais existé dans le graphe.

Ces 6 anti-patterns sont conservés dans :
- `tools/add_p1_laws.py` (préfixés `__Q_`)
- `audit/QUARANTINE_LOG.json` (raisons détaillées)

Ils servent de **test de régression** pour le pipeline : si une
modification future les acceptait, c'est un bug du pipeline.

---

## 4. Compositions sous tension / warning — sans rollback

Certaines compositions sont admissibles **avec annotation explicite**,
pas rollback :

| composition | statut | annotation |
|---|---|---|
| WP12-006 ⊥ WP12-007 | admissible_with_tension | tension réversibilité/auditabilité documentée |
| SDE-006 ∘ ULG-006 | warn_marginal | ΔS_global = −0.005 (sous seuil R-S4 = ±0.05) |
| GHUC-001 ∘ WP12-007 | blocked_by_admissibility | bloqué par WP12-007 — composition **non intégrée** dans le runtime mais documentée comme test |

Ces statuts sont des **mécanismes d'Oracle**, pas des bugs. Ils
**augmentent la transparence** du système plutôt que de la cacher.

---

## 5. Protections appliquées

Pendant l'exécution, plusieurs **protections** étaient actives :

| protection | description | déclenchée P1 ? |
|---|---|---|
| Schéma frames strict | rejet si frames incomplets | non — tous les candidates conformes |
| Composition ≥ 3 | rejet si < 3 lois liées | oui — 0 cas en P1 final (6 par design en quarantine) |
| Anti-self-loop | rejet si source == target | non — aucun cas |
| Anti-doublon kind | rejet si > 2 kinds entre paire | non — aucun cas |
| family ∈ canonical | rejet si famille hors registre | non — tous canoniques |
| ΔS_global hard seuil | rollback si > 5% chute | non — pas de chute > 5% |

---

## 6. Procédure de rollback manuel disponible

Si une future itération dégrade HS :

```bash
# 1. Revert le commit P1
git revert <SHA-commit-P1>

# 2. OU restauration ciblée
git checkout HEAD~1 -- app/data/laws.json
python3 tools/validate_laws.py   # vérifier état antérieur

# 3. Reproduire le rollback dans le log
echo "rollback @ $(date) — raison : ..." >> audit/ROLLBACK_LOG.md
```

L'ajout P1 est **un commit unique** pour faciliter le rollback total si
nécessaire.

---

## 7. Procédure de quarantaine post-intégration

Si après P1 un nœud intégré s'avère problématique :

```bash
# 1. Identifier le nœud
ID="ULG-006"

# 2. Le marquer dans le code (rétrograder en quarantine via préfixe __Q_)
#    via add_p1_laws.py + relancer

# 3. OU suppression directe :
python3 - <<EOF
import json
data = json.load(open('app/data/laws.json'))
data['nodes'] = [n for n in data['nodes'] if n['id'] != '$ID']
data['edges'] = [e for e in data['edges']
                 if e['source'] != '$ID' and e['target'] != '$ID']
json.dump(data, open('app/data/laws.json', 'w'), indent=2, ensure_ascii=False)
EOF

# 4. Re-valider
python3 tools/validate_laws.py
node tools/smoke_test.mjs
```

---

## SIGNATURE

```
MISSION_ID:           ZORAN_P1_DEMONSTRATED_EXPANSION_50_LAWS_20260515
TIMESTAMP:            2026-05-15T19:53:00+02:00
ROLLBACKS_PERFORMED:  1 (compteur de compositions corrigé en itération)
ROLLBACKS_NEEDED_END: 0 (HS ↑, S_global ↑ — toutes protections OK)
QUARANTINES:          6 (anti-patterns par design)
TENSION_DOCUMENTEES:  1 (WP12-006 ⊥ WP12-007)
WARN_MARGINAL:        1 (SDE-006 ∘ ULG-006)
BLOCKED_BY_ORACLE:    1 (GHUC-001 ∘ WP12-007 — composition non intégrée)
RUNTIME_PROTECTIONS:  6 actives — 0 déclenchements critiques
NEXT_ACTIONS:         maintenir le commit P1 atomique pour rollback total
                      facile ; surveiller HS après chaque ajout futur
```

🔶
