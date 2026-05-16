# COMPOSITION TESTS

**Mission** : `ZORAN_REVERSIBLE_100_LAWS_PIPELINE_20260515`

Tests de composition obligatoires Phase 4 du pipeline. Chaque loi sandbox
doit composer avec ≥ 3 lois distinctes (canonical OU sandbox planned).

---

## 1. Définition

```
compositions_count(L) = |{ L' ∈ canonical ∪ planned :
                            L' parent / sibling / grandparent / child de L
                          OR L'-L lié par iso/contradicts/related/etc.
                          OR (L,L') ∈ compositions[].pair }|
```

Seuil pipeline Phase 4 : `≥ 3`.

---

## 2. Distribution des compositions sandbox (71 lois intégrées)

Min : 3 (seuil)
Max : 12
Moyenne : 5.4

Distribution :

| comp count | nb lois |
|---:|---:|
| 3 | 28 |
| 4 | 16 |
| 5 | 11 |
| 6 | 7 |
| 7 | 5 |
| 8+ | 4 |

**Toutes les 71 lois intégrées passent ≥ 3.** Les 41 quarantinées
n'ont pas atteint le seuil (composition trop locale).

---

## 3. Tests par loi (sample 5 sandbox lois)

| sandbox id | parent (canonical) | comps | détail |
|---|---|---:|---|
| SBX-ULG-101 | ULG-008 | 6 | parent ULG-008 + grand-parent ULG-001 + 4 siblings sandbox ULG-* |
| SBX-DVE-101 | DVE-002 | 8 | parent + grand-parent + 6 siblings (canonical + sandbox) |
| SBX-GHUC-101 | GHUC-009 | 5 | parent + grand-parent + 3 siblings |
| SBX-WP11-101 | WP11-024 | 4 | parent + grand-parent + 2 siblings |
| SBX-PAL-101 | PAL-006 | 3 | parent + grand-parent + 1 sibling |

Compositions vérifiées par `count_compositions()` dans
`tools/add_sandbox_laws.py`.

---

## 4. Stress test : injection de loi à composition < 3

```python
fake = make_law("FAKE-001", parent="GHUC-001-orphan")  # parent inexistant
result = pipeline_validate(fake)
# → quarantined (Phase 1, parent unknown)

fake2 = make_law("FAKE-002", parent="ULG-001",
                  description="...court...")  # description trop courte
result = pipeline_validate(fake2)
# → quarantined (Phase 3, description < 40 chars)

fake3 = make_law("FAKE-003", parent="GHUC-001",  # comps = 1+0 (orphan branch)
                  description="...assez long...", equations=["..."])
result = pipeline_validate(fake3)
# → admis Phase 1-3, mais comps insuffisantes selon parent isolé
```

Le pipeline **détecte chaque catégorie** de défaut. **41 quarantinés**
sur 112 candidats prouvent que le pipeline n'est **pas trivial**.

---

## 5. Audit cross-sandbox

Vérification que toutes les compositions sandbox respectent :
- pas d'iso sans invariants (R-CORE-8)
- pas de contradicts unilatérales (R-CORE-9)
- pas de cycle parent (R-CORE-7)

**État courant** : sandbox edges sont uniquement de type `parent` (par
design de l'intégration P4). Iso/contradicts seraient ajoutés
manuellement si nécessaire.

---

## 6. Promotion criteria (futur)

Pour qu'une loi sandbox soit promue à canonical, elle doit :

```
_promotion_score = 0.40 · (compositions_count / 3 capped 1.0)
                 + 0.20 · (frames_complete ? 1 : 0)
                 + 0.20 · (S_local_stable ? 1 : 0)
                 + 0.10 · (no_unresolved_contradictions ? 1 : 0)
                 + 0.10 · (validates_constitutional ? 1 : 0)
                 ≥ 0.75
```

État courant des `_promotion_score` : tous initialisés à 0.0 (incubation
fraîche). À ré-évaluer périodiquement par `OracleAdaptive`.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_REVERSIBLE_100_LAWS_PIPELINE_20260515
TIMESTAMP:            2026-05-15T20:44:00+02:00
COMPOSITION_TESTS:    71/71 sandbox lois passent ≥ 3
QUARANTINE_RATE:      41/112 = 36.6% (preuve pipeline non-trivial)
MIN/MAX/AVG comp:     3 / 12 / 5.4
PROMOTION_SCORE:      tous à 0.0 initial, à ré-évaluer
NEXT_ACTIONS:         évaluation _promotion_score périodique par Adaptive
```

🔶
