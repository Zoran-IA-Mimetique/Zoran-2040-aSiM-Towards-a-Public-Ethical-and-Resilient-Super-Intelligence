# COMPLEXITY GATING V6 — Anti sur-orchestration

**Mission** : `MISSION_COMPLEXITY_GATING_V6_20260517`
**Branche** : `claude/zoran-fractal-law-tree-pPfzR`

> Insight déclencheur (user) :
> *"Qui est Frédéric Tabary ?" déclenche 241 lois + 8 familles +
> détecteurs anti-Goodhart + débats méta-épistémologiques.*
> *Le système ne sait pas quand NE PAS réfléchir.*

V6 répond exactement à ce diagnostic : **gating de profondeur AVANT
toute orchestration**, et **détection post-hoc de la sur-réflexion**.

---

## 1. Pivot V6

| | V1-V5 | V6 |
|---|---|---|
| Architecture | maximiser richesse analytique | **rentabilité cognitive** |
| Question simple | full pipeline (overkill) | fast-path baseline only |
| Détection | qualité de réponse | **disproportion question/réponse** |
| Coût | constant max | **adaptatif** |

Le système devient un **moteur de coût cognitif adaptatif**.

---

## 2. Modules livrés

### `app/src/complexity_estimator.js`
Calcule AVANT toute orchestration :

| Composante | Marqueurs |
|---|---|
| triviality | "qui est X", "c'est quoi", "où", "quand", "combien" |
| causal_depth | pourquoi, mécanisme, cause racine, expliquer |
| multicadre | multi-factoriel, à la fois, système complexe, interaction |
| risk | critique, vital, urgent, dangereux, sécurité, santé |
| ambiguity | ou bien, peut-être, sens différents |
| deep_request | détaillé, exhaustif, analyse complète, approfondi |
| technical | DTU, Eurocode, ISO, jurisprudence, opposabilité, propagation |
| action | comment, que faire, étapes, procédure |

**Gating rule-based** (pas score linéaire) :
- `fractal` : deep_request + (multicadre OU risk) OU multicadre + technical + causal OU words>25 + causal + technical
- `deep` : causal + (action OU clauses≥2 OU words>15) OU multicadre + (causal OU long)
- `medium` : action OU causal OU technical OU deep_request OU long
- `simple` : sinon (ou trivial court)

### `app/src/overthink_detector.js`
Post-hoc : la réponse est-elle disproportionnée au budget de profondeur ?

| Profondeur | Budget mots | Budget structures | Budget routes | Budget lois |
|---|---|---|---|---|
| simple | 80 | 1 | 1 | 0 |
| medium | 250 | 3 | 2 | 3 |
| deep | 600 | 6 | 3 | 10 |
| fractal | 1500 | 10 | 5 | 30 |

`overthink_score >= 0.40` → alerte de sur-orchestration.

---

## 3. Intégration runtime

### `superiority.js` — fast-path

```js
const complexity = estimateComplexity(question);
if (complexity.depth_required === 'simple') {
  // 1 call Claude brut, pas de ZORAN, pas de juge, pas de ReZo
  return { ok: true, fast_path: 'simple', responses: [baseline], ... };
}
```

**Économie** : pour "Qui est X ?", on passe de **3-4 appels LLM** à **1 seul**.
Latence divisée par ~3-4, coût divisé par ~3-4.

### Overthink détection post-hoc

Sur les autres réponses, le système calcule `overthink_score` et
expose dans `deltas[i].overthink`. Si le système a sur-orchestré
(budget dépassé), c'est visible dans l'UI.

### Badge UI

Le verdict banner affiche désormais :
- `profondeur: simple (cplx 0.00) FAST-PATH`
- `profondeur: deep (cplx 0.42)`
- `profondeur: fractal (cplx 0.78)`

Avec couleur (vert simple, rouge fractal) et tooltip listant les
raisons (pattern trivial, marqueur causal, multi-cadre, etc.).

---

## 4. Validation empirique

`tools/test_v6_complexity_gating.mjs` — **11/11 tests pass** :

| Question | Attendu | Obtenu |
|---|---|---|
| "Qui est Frédéric Tabary ?" | simple | **simple** ✓ |
| "Quelle est la capitale du Portugal ?" | simple | simple ✓ |
| "C'est quoi le DTU 25.41 ?" | simple | simple ✓ |
| "Comment isoler une toiture ?" | medium | medium ✓ |
| "Pourquoi mon mur fissure et que faire ?" | deep | deep ✓ |
| Question médicale longue multi-cadre | fractal | **fractal** ✓ |
| "Bonjour" | simple | simple ✓ |
| "Détaillez exhaustivement propagation systémique critique" | fractal | fractal ✓ |

Overthink (3/3) :
- "Tabary surcoché" (486 mots sur simple) → overthink **0.894** ✓
- "Tabary court" (1 phrase) → overthink **0** ✓
- Question complexe + réponse proportionnée → overthink **0** ✓

---

## 5. Bug fixes en route

- `\b` ASCII ne marche pas après accents français (`opposabilité`,
  `mécanismes`). Remplacé par lookahead `(?=[^a-zA-Z]|$)`.
- Pluriels `mécanismes`, `multi-factoriels` ne matchaient pas — fix
  avec `\w*` suffix.

---

## 6. Honnêteté empirique

### Ce qui marche
- Triviality détecte "Qui est X ?" → SIMPLE → fast-path validé
- Question médicale fractale → fractal correctement
- Overthink détecte 12 structures + 5 routes + 28 lois sur question simple
- Budget aligné avec gating → pas de faux positif overthink

### Limites
- Heuristique regex FR uniquement
- Pas de détection sémantique (un "qui est X" enchâssé dans un long
  paragraphe technique sera mal classé)
- Pas d'apprentissage des préférences utilisateur
- Pas de revoting après réponse (si SIMPLE et utilisateur insatisfait,
  pas de re-route DEEP automatique)

### Non fait
- Désactivation graphique du graph 3D si fast-path (économie GPU)
- Histogramme cumulé des `complexity_score` observés
- Re-route adaptatif user-feedback

---

## 7. Conséquences attendues

**Avant V6** :
> Question : "Qui est Tabary ?"
> Système : 3 calls LLM, 241 lois activées, 4 métriques V3, 5 V4...
> Latence : ~3-5 s. Coût : ~$0.02. Réponse : 400 mots prudents.

**Après V6** :
> Question : "Qui est Tabary ?"
> Système : 1 call LLM, 0 lois, fast-path baseline.
> Latence : ~1 s. Coût : ~$0.005. Réponse : 50-100 mots directs.

**Préservé sur questions complexes** :
> Question : "Mécanismes causaux multi-factoriels d'une chute..."
> Système : pipeline complet V4 + adversarial check.

---

## 8. Signature

- **mission_id** : `MISSION_COMPLEXITY_GATING_V6_20260517`
- **modules** : `complexity_estimator.js`, `overthink_detector.js`
- **tests** : `test_v6_complexity_gating.mjs` (11/11 pass)
- **intégration** : `superiority.js` (fast-path simple + overthink détection)
- **cache-bust** : `?v=20260517-gating-v15`
- **principe** : *"Savoir quand NE PAS être intelligent."*
