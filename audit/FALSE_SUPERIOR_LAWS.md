# FALSE SUPERIOR LAWS

**Mission** : `ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515`

Lois ayant déclenché des **flags faux superior** (filtre conservateur).
Source raw : `audit/FALSE_SUPERIOR_LAWS.json`.

---

## 1. Détections (4 lois)

### 1.1 ULG-001 (Grammaire Latente Universelle)

**Flags** :
- `pseudo-universal language in description`
- `pseudo-universal global frame: 'système ZORAN entier (graphe complet de toutes familles)'`

**Analyse** : ULG-001 est par nature une loi **fondationnelle**
opérant sur "tous les cadres représentationnels". Le terme "Universelle"
dans le nom est **légitime** (c'est l'invariant que ULG postule).

**Verdict** : faux positif. Pas d'action.

### 1.2 ULG-002 (Convergence des cadres latents)

**Flag** : `pseudo-universal language in description`

**Analyse** : description : "Tout cadre représentationnel admissible
converge..." Le terme "tout" est utilisé techniquement (formellement,
pour quantifier sur F admissibles), pas comme exagération.

**Verdict** : faux positif.

### 1.3 DVE-001 (ΔVariant Engine)

**Flag** : `pseudo-universal global frame: 'graphe complet de toutes les dérivations possibles'`

**Analyse** : DVE-001 est l'**engine** qui produit les variantes ; son
scope global EST par définition l'ensemble des dérivations possibles.
Le langage est précis.

**Verdict** : faux positif.

### 1.4 WP11-003 (Métrique S_global)

**Flag** : `pseudo-universal global frame: 'graphe complet — toutes paires de cadres F1, F2'`

**Analyse** : S_global est par définition une métrique systémique sur
toutes les paires de cadres. Le scope EST le graphe complet.

**Verdict** : faux positif.

---

## 2. Vrais faux superior historiques

### 2.1 ISO-005 (supprimé en P0.5)

**Flags qu'il aurait déclenchés (s'il existait encore)** :
- in_degree = 7 (gravity)
- weight 0.99 sans démonstration des invariants
- 7 related vers racines canoniques sans invariants
- pseudo-clôture systémique

**Verdict historique** : VRAI faux superior. **Supprimé** en P0.5.

C'est l'**exemple type** que le moteur Superior Law Engine doit
détecter. État actuel : 0 occurrence.

---

## 3. Calibration du filtre

Le filtre actuel produit **4 faux positifs** sur 241 lois (1.7% taux
faux positif). Acceptable.

Calibration possible :
- Whitelist de termes légitimes ("Universelle", "tous", "graphe complet")
  pour lois racines canoniques
- Distinction : "universel" dans titre famille (légitime) vs dans
  description individuelle (suspect)

À implémenter en P0.6+ si nécessaire. Actuellement, les 4 faux positifs
sont **non-bloquants** (signal informatif, pas blocking).

---

## 4. Vrais faux superior à surveiller (futur)

Pour qu'un VRAI faux superior émerge :
- une loi déclarerait μ-tier sans avoir les compositions
- une loi avec weight = 1.0 sans children
- une loi avec related vers ≥ 5 racines canoniques sans invariants

État courant : **0 occurrence**. Les protections (P0.5 refactor +
pipeline strict) éliminent ces patterns.

---

## 5. Procédure si vrai faux superior détecté

```
1. Le moteur flag la loi
2. Adaptive vérifie si les flags sont des vrais positifs
3. Si vrai positif :
   a. Démotion μ-tier (si tier déclaré)
   b. Audit complet de la loi
   c. Considérer démotion canonical → sandbox via demote
4. Si faux positif :
   a. Documenter (ce document)
   b. Considérer recalibration filtre
   c. Pas d'action sur la loi
```

---

## SIGNATURE

```
DOCUMENT:               FALSE_SUPERIOR_LAWS.md
VERSION:                1.0
FALSE_POSITIVES:        4 (ULG-001, ULG-002, DVE-001, WP11-003)
TRUE_FALSE_SUPERIOR:    0 (actuellement)
HISTORICAL_REFERENCE:   ISO-005 (supprimé P0.5)
FILTER_FALSE_POS_RATE:  1.7%
ACTION_REQUIRED:        aucune (faux positifs non-bloquants)
```

🔶
