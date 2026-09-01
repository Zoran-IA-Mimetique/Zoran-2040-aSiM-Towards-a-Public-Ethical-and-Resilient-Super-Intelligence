# P0.5 — RISKS (si non exécuté)

**Mission Oracle** : `ZORAN_P0_5_HONESTY_AUDIT_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Document de risques associé à `P0_5_SPEC.md`. Énumère les conséquences
prévisibles si P0.5 (refactor catégoriel + démonstration fractale + protocole
S_global opérationnel) **n'est pas exécuté** et que le projet passe directement
à P1 (relations automatiques, clusters, recherche vectorielle, expansion).

---

## R1 — Dérive lexicale propagée (CRITIQUE)

| | |
|---|---|
| sévérité | 🔴 critique |
| probabilité | 0.95 |
| détectable | oui, immédiatement |
| réversible | oui, mais avec coût croissant |

**Description** : le mot « fractal » devient citation auto-référentielle.
Chaque nouveau document ZORAN cite « l'arbre fractal des lois » comme s'il
s'agissait d'une propriété démontrée. À ~10 citations cumulées, retirer le
terme devient politiquement et structurellement coûteux.

**Indicateur déclencheur** : ≥ 3 documents (autres que les white papers
existants) citent « fractal » en s'appuyant sur ce repo comme référence.

**Mitigation** : retirer immédiatement le terme « fractal » de tous les
artefacts publics tant que `fractal_property(F)` n'est pas démontrée sur ≥ 1
famille (cf. `P0_5_SPEC.md §1.4`).

---

## R2 — Attracteur gravitationnel ISO-005 (CRITIQUE)

| | |
|---|---|
| sévérité | 🔴 critique |
| probabilité | 0.80 |

**Description** : `ISO-005` (Méta-isomorphisme global, weight 0.99, related
vers 7 moteurs canoniques) agit comme un trou structurel qui aspire toute
explication. Tout futur ajout sera tenté d'être rattaché à ISO-005 « parce
que ça boucle ». C'est la définition d'une **pseudo-clôture systémique**.

**Indicateur déclencheur** : ≥ 5 lois ajoutées au cours de P1 dont au moins 3
citent ISO-005 dans `related`.

**Mitigation** : statuer `ISO-005` (démontrer ou supprimer), cf.
`P0_5_SPEC.md §6` et `audit/RELATIONAL_COLLISIONS.md`.

---

## R3 — Inflation catégorielle figée (FORTE)

| | |
|---|---|
| sévérité | 🟠 forte |
| probabilité | 1.00 (déjà installée) |

**Description** : `VAR` et `ISO` sont actuellement des familles-nœuds alors
qu'ils décrivent des relations. Cette confusion catégorielle inflate
artificiellement `nodes.length` de ~20% et brouille tout calcul de densité.
Si P1 ajoute des clusters automatiques avant correction, les clusters
détectés engloberont VAR-* et ISO-* comme s'ils étaient des lois, propageant
l'erreur dans l'algorithme.

**Mitigation** : refactor avant P1 (cf. `P0_5_SPEC.md §3` et
`audit/EDGE_SYSTEM_SPEC.md`).

---

## R4 — Explosion combinatoire en P1 (FORTE)

| | |
|---|---|
| sévérité | 🟠 forte |
| probabilité | 0.75 |

**Description** : P1 prévoit relations automatiques (cosine sur embeddings) +
clusters + recherche vectorielle. Sans gouverneur de croissance
(`P0_5_SPEC.md §8`), chaque relation auto-détectée est ajoutée. À 200 lois,
densité passe à ~4.5 liens/nœud (au-dessus du seuil dur 3.5).

**Indicateur déclencheur** : `links.length / nodes.length > 2.8` après
une seule passe d'ajout automatique.

**Mitigation** : implémenter le gouverneur `Δ_S_global(addition)` **avant**
toute relation automatique.

---

## R5 — Sur-harmonisation persistante (MODÉRÉE)

| | |
|---|---|
| sévérité | 🟡 modérée |
| probabilité | 0.85 |

**Description** : le corpus actuel contient **1 seule contradiction**
(WP11-005 ↔ UDE-003) sur 50 lois. Un système cognitif réel a 4–15% de
contradictions internes. Cette sous-représentation calibre l'Oracle pour
ignorer les tensions, ce qui rendra invisible toute incohérence future.

**Mitigation** : introduire ≥ 3 contradictions structurelles supplémentaires
calibrées (cf. `P0_5_SPEC.md §11`).

---

## R6 — Pseudo-fractalité figée dans la documentation (MODÉRÉE)

| | |
|---|---|
| sévérité | 🟡 modérée |
| probabilité | 0.70 |

**Description** : `MISSION_LOG.md`, `README.md`, le `<title>` HTML, le
console.log de `main.js`, tous utilisent « fractal ». Si P1 démarre sans
P0.5, ces fichiers deviendront sources canoniques et la correction exigera
des modifications coordonnées multi-fichiers.

**Mitigation** : remplacement temporaire de « fractal » par « relationnel »
dans les artefacts publics jusqu'à démonstration formelle.

---

## R7 — Désactivation impossible du bruit visuel à grande échelle (MODÉRÉE)

| | |
|---|---|
| sévérité | 🟡 modérée |
| probabilité | 0.65 |

**Description** : les `linkDirectionalParticles` sont activées par défaut sur
tous les liens parent. À 50 nœuds c'est tolérable. À 200 nœuds, ~150 streams
animés simultanés provoquent une fatigue cognitive massive et un effet
« galaxie décorative » que l'utilisateur ne saura plus désactiver sans
modification du code.

**Mitigation** : `app/src/main.js` doit passer `linkDirectionalParticles(0)`
par défaut et n'activer que sur sélection.

---

## R8 — Auto-validation circulaire de S_global (MODÉRÉE)

| | |
|---|---|
| sévérité | 🟡 modérée |
| probabilité | 0.50 |

**Description** : `S_global` actuel est une **proxy moyenne**. Si on
l'utilise pour mesurer le succès de P1 (« S_global est monté de 0.78 à
0.82 »), on auto-valide les ajouts qui ont gonflé S_local sans vérifier la
préservation systémique. Violation directe de `WP11-004`.

**Mitigation** : protocole opérationnel `C_composition` (`P0_5_SPEC.md §5`)
avant toute communication sur S_global.

---

## R9 — Coût de rollback croissant (LATENT)

| | |
|---|---|
| sévérité | 🟢 latente |
| probabilité | 1.00 (loi de la dette technique) |

**Description** : chaque jour passé sans P0.5 fait croître :
- le nombre de lois dépendant de la structure inflated,
- le nombre de docs citant des labels non démontrés,
- la difficulté à statuer ISO-005 (chaque nouveau lien le renforce).

Coût de rollback estimé :
- aujourd'hui : ~2h de refactor déterministe.
- après 50 lois supplémentaires : ~8h + re-validation des nouvelles lois.
- après 200 lois : refactor manuel large, risque de régression.

---

## Synthèse — score de risque agrégé

| risque | sévérité | probabilité | poids |
|---|---|---|---|
| R1 dérive lexicale | 🔴 1.0 | 0.95 | 0.95 |
| R2 ISO-005 gravité | 🔴 1.0 | 0.80 | 0.80 |
| R3 inflation catégorielle | 🟠 0.7 | 1.00 | 0.70 |
| R4 explosion P1 | 🟠 0.7 | 0.75 | 0.53 |
| R5 sur-harmonisation | 🟡 0.5 | 0.85 | 0.43 |
| R6 doc figée | 🟡 0.5 | 0.70 | 0.35 |
| R7 bruit visuel scale | 🟡 0.5 | 0.65 | 0.33 |
| R8 auto-validation S_global | 🟡 0.5 | 0.50 | 0.25 |
| R9 rollback latent | 🟢 0.3 | 1.00 | 0.30 |
| **total pondéré** | | | **4.64 / 9** |

Score de risque global : **0.52 / 1.00** (modéré-haut, dominé par R1 et R2).

P0.5 fait passer ce score à ~0.15 (R1, R2, R3, R8 directement adressés).

---

## SIGNATURE

```
MISSION_ID:           ZORAN_P0_5_HONESTY_AUDIT_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       P0_5_SPEC.md, README.md, MISSION_LOG.md, app/index.html, app/data/laws.json
RISKS:                R1..R9 énumérés ; score agrégé 0.52
S_LOCAL:              n/a (audit de risque)
S_GLOBAL:             n/a (audit de risque)
TOP_COLLISIONS:       R1 dérive lexicale · R2 ISO-005 gravité · R3 inflation VAR/ISO
TOP_FAKE_PATTERNS:    fractalité revendiquée sans démonstration ; pseudo-clôture ISO-005
NEXT_ACTIONS:         autoriser l'exécution P0.5 OU acter le gel et purger les
                      labels non démontrés du repo public
```

🔶
