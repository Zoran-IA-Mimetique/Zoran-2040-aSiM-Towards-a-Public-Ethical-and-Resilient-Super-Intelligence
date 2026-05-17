# IDENTITY DISAMBIGUATION GATE V1 — Spec

**Mission** : `CLAUDE_IDENTITY_DISAMBIGUATION_GATE_V1_20260517`
**Branche** : `claude/zoran-fractal-law-tree-pPfzR`

> Défaut critique adressé :
> *"Lorsqu'une requête contient un nom propre ambigu (Frédéric Tabary, Jean Martin), le système répondait avec une biographie supposée au lieu de déclencher la désambiguïsation."*

---

## 1. Architecture

```
INPUT
↓
identityGate()  ← priorité ABSOLUE, avant V6 fast-path
↓
  ┌─ NOT identity question ──→ continue normal
  ┌─ identity_confidence ≥ 0.70 ──→ continue normal
  ┌─ 0.50 ≤ confidence < 0.70 ──→ continue + hedges obligatoires
  └─ confidence < 0.50 ──→ BLOQUE, retourne demande de clarification
↓
(si passes) → V6 complexity gating → V1-V5 pipeline
↓
post-hoc : identity_hallu_risk pour chaque réponse
```

---

## 2. Modules livrés

### `app/src/ambiguity_detector.js`

**Detection** :
- `isPersonIdentityQuestion()` : pattern "qui est X / c'est qui X / parle-moi de X"
- `extractPersonNames()` : pattern Prénom Nom (multi-mot, accents FR) +
  filtre titres (Dr, M., Mme, Pr, Maître…)
- `isFamousFigure()` : whitelist conservatrice (~50 figures historiques)
- `estimateNameCommonness()` : commonness FR (Jean Martin = 0.90, Xandar Vortessian = 0.20)
- `hasContextualAnchor()` : profession ("le philosophe", ", professeure"),
  organisation ("dans ZORAN"), époque, lieu

**Calcul `identity_confidence`** :
| Cas | Confidence |
|---|---|
| Famous + context | 0.95 |
| Famous seul | 0.85 |
| Non-famous + context | 0.70 |
| Non-famous sans context | max(0.10, 0.50 - commonness × 0.40) |

### `app/src/identity_gate.js`

- `identityGate(question)` : décision passes/blocks avec response_if_blocked
- `countUnsupportedBioClaims(text)` : compte affirmations bio + détecte disclaimer
- `identityHalluRisk(question, response)` : risque hallu = claims × (1 + 0.5 × ambiguity)

---

## 3. Comportement attendu validé

| Cas | Comportement | OK |
|---|---|---|
| "Qui est Frédéric Tabary ?" | **BLOQUE** → demande contexte | ✓ |
| "Qui est Frédéric Tabary dans ZORAN ?" | passe | ✓ |
| "Qui est Albert Einstein ?" | passe (figure célèbre) | ✓ |
| "Comment isoler une toiture ?" | passe (pas identité) | ✓ |
| "Qui est Dr Martin ?" | passe (Dr = titre filtré) | ✓ |

---

## 4. Validation empirique

### Tests canoniques (`tools/test_identity_ambiguity.mjs`)
**14/14 pass** (11 cas identité + 3 cas hallu_risk).

### Massive stress suite (`tools/massive_identity_eval.mjs`)
**56 cas × 7 catégories** :

| Catégorie | Score | Comportement |
|---|---|---|
| HOMONYME | 8/8 | bloque Jean Martin, Pierre Durand, Marie Dubois... |
| CELEBRITY | 8/8 | laisse passer Einstein, Mozart, Voltaire... |
| LOCAL_NO_CTX | 8/8 | bloque Frédéric Tabary, Sébastien Roux... |
| WITH_CONTEXT | 8/8 | laisse passer "Jean Martin, le philosophe" |
| INCOMPLETE | 8/8 | laisse passer "Qui est Marie ?" "Qui est Dr Martin ?" |
| PSEUDO | 8/8 | bloque Xandar Vortessian, Kvelin Drakathar... |
| NON_IDENTITY | 8/8 | laisse passer "Bonjour", BTP, capitales... |

**Métriques finales** :
- Accuracy : **100.0%**
- Precision : **100.0%**
- Recall : **100.0%** (0 false negatives — 0 hallu non détectée)
- F1 Score : **100.0%**

---

## 5. Intégration runtime

### `superiority.js`
Gate placé **en première ligne** dans `runSuperiorityComparison()` :
```js
const idGate = identityGate(question);
if (!idGate.passes_gate) {
  return { fast_path: 'identity_disambiguation', verdict: 'CLARIFICATION REQUISE', ... };
}
```

→ AUCUN appel LLM n'est fait si l'identité est ambiguë. La réponse retournée
est la demande de clarification générée localement.

### `rezo_engine.js`
Nouveau `WEAKNESS_CHECK` :
```js
identity_hallu_risk: {
  test: (text, ctx) => identityHalluRisk(ctx.question, text).fires,
  injection: 'anti_hallucination',
  fix_hint: 'Remplacer affirmations biographiques par "À vérifier" ou demande de désambiguïsation.',
}
```

→ Si une réponse échappe au gate (ex: identité moyennement confiance qui passe
en mode hedges) mais empile bio_claims sans disclaimer, ReZo corrigera.

---

## 6. Lois ZORAN appliquées

Le gate déclenche explicitement (référencées dans `lois_applied`) :
- **WP12-028** — Bornage des affirmations
- **WP12-009** — Anti-hallucination
- **WP11-009** — Rigueur épistémique
- **DVE-020** — Anti-fabrication
- **WP12-031** — Scope explicite
- **SDE-019** — Self-doubt obligatoire

---

## 7. Honnêteté empirique

### Ce qui marche
- 0 false negative sur 56 cas (zéro hallu identité non détectée)
- "Frédéric Tabary" SANS contexte → bloqué (mission demandée)
- "Frédéric Tabary dans ZORAN" → passe (contexte fort)
- Figures célèbres jamais bloquées (8/8)
- Filtre titres Dr, M., Mme empêche faux Prénom+Nom

### Limites
- Whitelist FAMOUS_FIGURES limitée à ~50 noms (extension empirique requise)
- Pas de détection de "même nom plusieurs époques" (Vincent van Gogh vs autre Vincent)
- Pas de désambiguïsation par recherche web réelle
- Heuristique FR uniquement (anglais ignoré)
- `bio_claims` est regex-based, peut manquer claims sophistiquées

### Non fait
- Lookup Wikidata/Wikipedia pour homonym_density réel
- UI de clarification interactive (juste texte retourné)
- Mémoire des clarifications utilisateur (si user dit "je veux le designer", garder)
- Détection cross-lingue (Einstein, Аль Эйнштейн, アインシュタイン)

---

## 8. Traceability

- **mission_id** : `CLAUDE_IDENTITY_DISAMBIGUATION_GATE_V1_20260517`
- **modules** : `ambiguity_detector.js`, `identity_gate.js`
- **tests** : `test_identity_ambiguity.mjs` (14/14), `massive_identity_eval.mjs` (56/56)
- **intégration** : `superiority.js` (gate priorité absolue), `rezo_engine.js` (post-hoc)
- **cache-bust** : `?v=20260517-identity-gate-v16`
- **lois prioritaires** : WP12-028, WP12-009, WP11-009, DVE-020, WP12-031, SDE-019

---

## 9. Avant / Après

**Avant V7** :
> Q : "Qui est Frédéric Tabary ?"
> Système : *"Frédéric Tabary est un designer français né en 1969 à Nantes..."* (hallu plausible)

**Après V7** :
> Q : "Qui est Frédéric Tabary ?"
> Système : *"Plusieurs personnes peuvent correspondre à ce nom. Pour répondre sans risque de confusion, peux-tu préciser : domaine d'activité, localisation, époque, contexte spécifique ?"*
> + AUCUN appel LLM, AUCUNE biographie inventée.
