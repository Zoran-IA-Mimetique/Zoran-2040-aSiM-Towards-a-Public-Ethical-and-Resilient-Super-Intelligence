# OVERLOAD ZONES

**Mission Oracle** : `ZORAN_COGNITIVE_LOAD_AND_VISUAL_SILENCE_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Cartographie des **zones à risque de saturation** dans l'interface
actuelle, en l'état 50 lois et en projection scaling.

---

## 1. Zone Z1 — Centre du graphe (attracteurs μ₀)

**Localisation** : coordonnées 3D centrales, où s'agglutinent GHUC-001,
ISO-005, et leurs liens.

| niveau | description |
|---|---|
| état actuel | 6 attracteurs canoniques + ISO-005 + ~30 liens convergents = nœud visuel dense |
| risque | ⚠ modéré — encore lisible |
| projection 200 lois | 🔴 critique — convergence multipliée par 4 ; ISO-005 deviendra un trou noir visuel |

**Mitigation requise** :
- statuer ISO-005 (`P0_5_SPEC.md §6`)
- séparation angulaire par famille (force `radial_layout`)
- limiter `parent` convergent vers un même μ₀ à 5 visibles à la fois

---

## 2. Zone Z2 — Sidebar `#index` (liste des lois)

**Localisation** : panneau gauche, liste plate de toutes les lois.

| niveau | description |
|---|---|
| état actuel | 50 items, scrollable, OK |
| risque | 🟡 modéré |
| projection 200 lois | 🟠 fort — scroll très long sans regroupement |
| projection 500 lois | 🔴 critique — friction navigation × 10 |

**Mitigation requise** :
- regrouper par famille avec `<details>` collapsibles
- ajouter compteur par famille
- afficher uniquement les attracteurs μ₀–μ₁ par défaut, le reste sur expansion

---

## 3. Zone Z3 — Edge bundles convergents

**Localisation** : faisceaux de liens convergeant vers un même nœud canonique.

| niveau | description |
|---|---|
| état actuel | ~12 liens convergents max sur GHUC-001 et ULG-001 |
| risque | 🟡 modéré (encore distinguables) |
| projection 200 lois | 🔴 critique — bundle de ~50 liens → mur visuel |

**Mitigation requise** :
- edge bundling (regroupement géométrique des arêtes parallèles)
- ou réduction d'opacité automatique sur faisceau > 20

---

## 4. Zone Z4 — `related` cross-graphe

**Localisation** : longs liens `related` traversant l'espace 3D entre
familles éloignées.

| niveau | description |
|---|---|
| état actuel | ~10 liens longs (ISO-005 contribue à 7) |
| risque | 🟡 modéré |
| projection 200 lois | 🔴 critique — toile d'araignée superposée |

**Mitigation requise** :
- catégoriser `related` en `related-strong` / `related-weak` avec rendus
  distincts
- `related-weak` invisible par défaut, visible seulement sur sélection du
  nœud source ou cible
- ISO-005 supprimé ou contraint à 2 liens max

---

## 5. Zone Z5 — Panneau de détail (HTML)

**Localisation** : panel droite, contenu dynamique.

| niveau | description |
|---|---|
| état actuel | ~7 sections + relations cliquables ; OK pour 50 lois |
| risque | 🟢 faible |
| projection 200 lois | 🟡 modéré — listes de relations qui s'allongent |

**Mitigation requise** :
- pagination/truncation des relations au-delà de 10 par catégorie
- tri par poids décroissant

---

## 6. Zone Z6 — Statusbar

**Localisation** : barre inférieure.

| niveau | description |
|---|---|
| état actuel | counts + S_local + S_global + gap + FPS |
| risque | 🟢 faible |
| projection 500 lois | 🟢 inchangé (texte fixe) |

**Mitigation** : aucune nécessaire. Mais **modifier l'affichage de
S_global** pour ajouter le tag `proxy` (cf. `P0_5_SPEC.md §1.5`).

---

## 7. Zone Z7 — Recherche (recherche textuelle naïve)

**Localisation** : input topbar.

| niveau | description |
|---|---|
| état actuel | O(N) tokenisé sur 50 lois, latence imperceptible |
| risque | 🟢 faible |
| projection 500 lois | 🟢 acceptable (~5 ms par requête) |
| projection 5000 lois (futur) | 🟡 modéré — index incrémental nécessaire |

**Mitigation** : index inversé incrémental (P1).

---

## 8. Zone Z8 — Particules directionnelles

**Localisation** : sur tous les liens `parent` (configuration actuelle).

| niveau | description |
|---|---|
| état actuel | ~45 streams animés en continu |
| risque | 🟡 modéré (cf. `VISUAL_SILENCE_REPORT.md`) |
| projection 200 lois | 🔴 critique (~150 streams) |

**Mitigation** : désactiver par défaut.

---

## 9. Synthèse — carte des zones

```
priorité   zone         état actuel         à 200 lois       à 500 lois
─────────  ───────────  ──────────────────  ───────────────  ───────────────
HAUTE      Z1 centre    ⚠ modéré            🔴 critique      🔴 critique
HAUTE      Z2 sidebar   🟡 modéré           🟠 fort          🔴 critique
HAUTE      Z3 bundles   🟡 modéré           🔴 critique      🔴 critique
HAUTE      Z4 related   🟡 modéré           🔴 critique      🔴 critique
MOYENNE    Z8 particles 🟡 modéré           🔴 critique      🔴 critique
BASSE      Z5 detail    🟢 faible           🟡 modéré        🟠 fort
BASSE      Z6 status    🟢 faible           🟢 faible        🟢 faible
BASSE      Z7 search    🟢 faible           🟢 faible        🟡 modéré
```

**4 zones HAUTES priorité** doivent être traitées **avant scaling**.

---

## 10. Seuil de tolérance par zone

Au-delà de ces seuils, la zone passe en collapse cognitif :

| zone | seuil dur |
|---|---|
| Z1 | > 25 nœuds visuellement convergents au centre |
| Z2 | > 80 items affichés simultanément sans regroupement |
| Z3 | > 30 liens convergents vers un même nœud |
| Z4 | > 40 liens `related` long-distance simultanés |
| Z8 | > 80 streams animés simultanés |

**Implications** : le système devient inutilisable au-delà de ~150 lois si
aucune mesure préventive (P0.5) n'est prise.

---

## SIGNATURE

```
MISSION_ID:           ZORAN_COGNITIVE_LOAD_AND_VISUAL_SILENCE_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       app/index.html, app/style.css, app/src/main.js
RISKS:                4 zones HAUTES priorité non couvertes ;
                      collapse cognitif probable au-dessus de 150 lois
S_LOCAL:              n/a
S_GLOBAL:             n/a
TOP_COLLISIONS:       Z1 centre (ISO-005 gravité) ; Z3 bundles (faisceaux denses)
TOP_FAKE_PATTERNS:    « zoom infini » impossible faute de profondeur structurelle ;
                      sidebar plate présentée comme « index navigable »
NEXT_ACTIONS:         traitement Z1 (statuer ISO-005) + Z2 (regroupement
                      par famille) + Z3 (edge bundling) + Z4 (related-weak)
                      + Z8 (désactivation particules) AVANT toute extension corpus
```

🔶
