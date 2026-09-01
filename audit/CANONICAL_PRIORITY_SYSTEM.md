# CANONICAL PRIORITY SYSTEM

**Mission** : `ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516`

Système de priorité canonique : quelles lois ZORAN devrait charger en
premier.

---

## 1. `canonical_priority(L)`

```
canonical_priority = 0.7 × llm_relevance_score
                   + 0.3 × (runtime_admissible ? 1 : 0)
```

Plage [0, 1]. Score élevé → loi à charger prioritairement.

---

## 2. TOP 20 canonical priority

| rang | id | priority | famille | rôle |
|---|---|---:|---|---|
| 1 | WP12-009 | 0.711 | WP12 | anti-hallu critique |
| 2 | WP12-001 | 0.691 | WP12 | racine admissibilité |
| 3 | WP11-011 | 0.689 | WP11 | audit hallucination |
| 4 | WP12-010 | 0.689 | WP12 | citation obligatoire |
| 5 | WP11-001 | 0.688 | WP11 | racine cohérence |
| 6 | WP11-008 | 0.684 | WP11 | type-checking frames |
| 7 | WP12-028 | 0.681 | WP12 | bornage affirmations |
| 8 | WP11-028 | 0.678 | WP11 | détection régression |
| 9 | WP12-029 | 0.677 | WP12 | citation obligatoire réponse |
| 10 | DVE-018 | 0.674 | DVE | refus génératif |
| 11 | DVE-020 | 0.672 | DVE | anti-fabrication citations |
| 12 | DVE-008 | 0.670 | DVE | filter anti-hallu |
| 13 | SDE-019 | 0.665 | SDE | self-doubt |
| 14 | SDE-016 | 0.664 | SDE | refus structuré |
| 15 | UDE-014 | 0.661 | UDE | mémoire épisodique |
| 16 | WP12-007 | 0.658 | WP12 | auditabilité |
| 17 | UDE-036 | 0.654 | UDE | RAG retrieval-augmented |
| 18 | UDE-021 | 0.651 | UDE | retrieval déterministe |
| 19 | WP11-024 | 0.648 | WP11 | audit incrémental |
| 20 | WP11-026 | 0.644 | WP11 | réplication audit indépendant |

→ **Familles dominantes** : WP-12 (8 dans top 20), WP-11 (7), DVE (3),
UDE (3), SDE (2). Anti-hallucination + cohérence + audit + retrieval.

---

## 3. Sélection runtime recommandée

ZenRuntime chargerait par défaut le **TOP 30** par
canonical_priority pour une requête générale. Cela donne :
- couverture **anti-hallucination** complète (10 lois dédiées)
- **fondations cohérence** (WP11-001 et famille)
- **fondations admissibilité** (WP12-001 et famille)
- **retrieval + mémoire** (UDE-014, UDE-036)
- **self-observation** (SDE-019, SDE-016)

C'est le **noyau opérationnel ZORAN runtime**.

---

## 4. Anti-règles canonical priority

- ❌ Ne pas charger par défaut les μ0/μ1 sans pertinence requête
  (priority haute mais coût élevé)
- ❌ Ne pas mélanger sandbox et canonical
- ❌ Ne pas dépasser N_max=30 par requête générale
- ❌ Ne pas pondérer subjectivement (calcul automatique uniquement)

---

## 5. Mise à jour

`canonical_priority` recalculé à chaque run de
`tools/llm_relevant_law_estimator.py`. Adaptive peut proposer
recalibration des coefficients selon observation runtime réelle.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_LLM_RELEVANT_LAW_ESTIMATOR_20260516
TOP_PRIORITY:         WP12-009 (0.711)
NOYAU_RUNTIME:        TOP 30 = anti-hallu + cohérence + admissibilité
DOMINANT_FAMILIES:    WP-12 (8), WP-11 (7) sur top 20
```

🔶
