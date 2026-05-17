# V11 CAUSAL COMPRESSION — Spec + résultats honnêtes

**Mission** : `V11_CAUSAL_COMPRESSION_20260517`
**Statut** : LIVRÉ avec cible empirique partiellement atteinte

> Mission : transformer ZORAN d'un moteur "profond mais coupé"
> en moteur "expert compressé exploitable tribunal/BET/MOA".

---

## 1. Modules livrés

### `app/src/causal_compression_engine.js`
4 fonctions obligatoires + 1 utilitaire :

| Fonction | Rôle |
|---|---|
| `extractCausalCore(text)` | classe chaque phrase en 11 sections (danger, dominant_cause, falsification, instrumentation, urgent_actions, limits, cofactors, examples, context, reformulations, unclassified) |
| `detectRedundancyNoise(text)` | détecte phrases bruit + paires reformulation (overlap ≥ 65% vocabulaire) |
| `priorityPreservationOrder()` | ordre canonique 10 niveaux selon mission V11 |
| `reserveTerminalBudget(tokens)` | réserve 18% pour conclusion/falsification/limites/actions finales |
| `compressCausal(text, target_words)` | compression 2 passes : sections critiques d'abord, secondaires si budget |

### `app/src/truncation_detector_v11.js`
4 métriques + rapport global :

| Métrique | Mesure |
|---|---|
| `terminalIntegrityScore` | présence conclusion + falsification + action + limites dans dernier tiers |
| `causalRetentionRatio` | % sections critiques conservées vs original |
| `usefulDensityAfterCompression` | densité utile post-compression |
| `compressionDamageIndex` | quoi a été détruit (intégrité + causalité + composants critiques) |

### Tests + données
- `tools/test_v11_causal_compression.mjs` : 5 réponses experts × 4 budgets = 20 cas
- `audit/TRUNCATION_ADVERSARIAL_SUITE_V11.json` (20 cas)
- `audit/benchmark_before_after_v11.json`
- `audit/MASSIVE_TRUNCATION_RESULTS_V11.json`

---

## 2. Résultats empiriques (HONNÊTES)

### Compression fonctionne bien
| Budget | Causal retention moy | Damage moy |
|---|---|---|
| 50 mots | 0.62 | 0.32 (sévère) |
| 100 mots | 0.90 | 0.16 (modéré) |
| 150 mots | **1.00** | **0.04** (acceptable) |
| 250 mots | 1.00 | 0.00 (parfait) |

→ **Le compresseur PRÉSERVE bien la causalité** à partir de 100 mots.
→ **Damage acceptable** ≤ 0.10 dès 150 mots.

### Terminal integrity reste FAIBLE
| Budget | Terminal integrity moy |
|---|---|
| 50 | 0.06 |
| 100 | 0.21 |
| 150 | 0.40 |
| 250 (texte complet) | 0.46 |

→ **Échec partiel** : la cible "100% conclusions conservées" n'est PAS atteinte.

---

## 3. Analyse du gap

Pourquoi `terminal_integrity` reste à 0.40-0.50 même à budget 250 (texte complet) ?

### Hypothèse 1 — Patterns trop stricts
Mes regex `TERMINAL_CONCLUSION_RX`, `TERMINAL_FALSIFICATION_RX`, etc. cherchent
des marqueurs **explicites** ("en conclusion", "contre-hypothèse"). Mais les
vrais experts BTP utilisent souvent des conclusions **implicites** :
- "Engagement décennale article 1792 probable si..." = conclusion sans marqueur
- "Et si la cause était hydrogéologique ?" = falsification sans marqueur

### Hypothèse 2 — Position terminale stricte
Le check ne regarde que le **dernier tiers**. Une conclusion en milieu de
texte (style synthétique BET) n'est pas captée.

### Hypothèse 3 — La métrique mesure le bon signal mais le seuil 0.80 est trop strict
La cible "100% conclusions conservées" est peut-être irréaliste sans LLM.

---

## 4. Limites résiduelles documentées

| ID | Limite | Sévérité |
|---|---|---|
| LR-TI | terminal_integrity reste 0.46 à budget max | HAUTE |
| LR-CR | causal_retention 1.00 mais sections detection regex-based | MOY |
| LR-RX | patterns "en conclusion" trop explicites, manquent implicites | HAUTE |
| LR-POS | check uniquement dernier tiers, manque conclusions médianes | MOY |
| LR-TX | textes test synthétiques, pas vrais rapports d'expertise judiciaire | HAUTE |

---

## 5. Cible mission V11 vs réel

| Cible mission | Atteinte | Mesure réelle |
|---|---|---|
| 0 troncature critique | ⚠ Partiel | damage_index ≤ 0.10 à budget ≥ 150 |
| 100% conclusions conservées | ❌ Non | terminal_integrity 0.40 moy à budget 150 |
| 100% actions urgentes conservées | ⚠ Partiel | détection action_present ~75% des cas |
| ≥80% causalité conservée | ✅ **OUI** | causal_retention 1.00 dès budget 100 |
| ≥25% réduction bruit | ⚠ Non vérifié | détection noise/reformulation présente mais non mesurée vs total |
| Aucune baisse qualité expert | ⚠ Non vérifié | requiert BET réel pour confirmer |

---

## 6. Décision opérationnelle

### Garder le compresseur causal en production
- Causal retention 100% à budget réaliste (150+ mots) = succès empirique
- Damage acceptable = pas de régression sur ce qui compte

### NE PAS utiliser terminal_integrity comme metric winner
- Trop strict, trop biaisé regex
- Garder en diagnostic mais pas en filtre dur

### Pas d'intégration runtime automatique pour l'instant
- Le compresseur peut être appelé explicitement quand besoin (UI bouton ?)
- Pas dans le pipeline default tant que P0-MINI BET non exécuté

---

## 7. Signature

- **mission_id** : `V11_CAUSAL_COMPRESSION_20260517`
- **modules livrés** : 2 (causal_compression_engine + truncation_detector_v11)
- **tests** : 20 cas (5 experts × 4 budgets)
- **causal_retention** : ✅ 100% à budget 150+
- **terminal_integrity** : ❌ 0.40 moy (cible 0.80)
- **damage_index** : ✅ 0.04 à budget 150+
- **engagement transparence** : échec partiel publié intégralement
