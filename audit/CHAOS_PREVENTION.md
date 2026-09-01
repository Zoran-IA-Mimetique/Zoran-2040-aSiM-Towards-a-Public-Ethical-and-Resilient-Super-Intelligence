# CHAOS PREVENTION PROTOCOL

**Mission Oracle** : `ZORAN_GLOBAL_COHERENCE_ORACLE_20260515`
**Timestamp** : `2026-05-15T19:03:00+02:00`
**Mode** : READ-ONLY

Protocole de **prévention du chaos fractal** : symptômes, déclencheurs,
actions par palier, conditions de rollback. Empêcher l'effondrement global
du graphe malgré croissance, expansion, ajout de nouvelles lois.

---

## 1. Définition opérationnelle du chaos

Le chaos n'est pas un effet visuel — c'est une **propriété structurelle**.
Définition :

```
chaos(graph) ⟺  H_normalisée(graph) > 0.20
             ∨  density(graph) > density_limit.hard
             ∨  inflation_ratio(graph) > 0.15
             ∨  false_coherence_count(graph) / count(nodes) > 0.10
             ∨  ∃ nœud gravitationnel non démontré (related ≥ 5 racines canoniques)
```

avec `H_normalisée` l'entropie de la distribution des `kind` parmi les liens,
normalisée à `[0, 1]`.

---

## 2. Taxonomie des symptômes

| symptôme | signal observable | gravité |
|---|---|---|
| explosion combinatoire | `links/nodes` croît plus vite que linéaire | 🔴 |
| pseudo-clôture systémique | apparition d'un nœud captant > 5 racines canoniques | 🔴 |
| fragmentation | composantes connexes > 3 (graphe se déchire) | 🟠 |
| inflation lexicale | usage public d'un label sans prédicat attaché | 🟠 |
| sur-harmonisation | `contradicts / nodes < 0.04` | 🟡 |
| dérive métrique | corrélation `S_local / S_global > 0.60` | 🟡 |
| galaxie décorative | > 80 streams animés simultanés | 🟡 |
| zoom vide | profondeur structurelle ≤ 2 pour > 80% des familles | 🟡 |

---

## 3. Déclencheurs d'alerte

L'Oracle (cf. `GLOBAL_ORACLE_SPEC.md`) émet alerte chaos si :

| déclencheur | seuil |
|---|---|
| D1 — densité | `density > 2.8` |
| D2 — entropie | `H_norm > 0.20` |
| D3 — gravité | un nœud non-canonique a `related` vers ≥ 5 racines canoniques |
| D4 — inflation | `inflation_ratio > 0.10` |
| D5 — fausse cohérence | > 10% des nœuds ont `S_local − S_global > 0.30` |
| D6 — fragmentation | nombre de composantes connexes > 3 |
| D7 — sur-harmonisation | `contradicts / nodes < 0.04` |
| D8 — corrélation L/G | `corr(S_local, S_global) > 0.60` |
| D9 — labellisation sans preuve | usage public de « fractal »/« attracteur » sans citation |

Chaque déclencheur produit un événement traçable.

---

## 4. Protocole par palier

### 4.1 Palier 1 — Surveillance (toujours actif)

- Audit complet au chargement.
- Recompute toutes les 30s en arrière-plan (P1, web worker).
- Affichage de `HS` dans la statusbar.

### 4.2 Palier 2 — Avertissement (déclencheur unique modéré)

Si 1 déclencheur 🟡 ou D7 :
- Badge orange dans la topbar.
- Message non bloquant.
- Audit consigné dans `audit_history.log`.

### 4.3 Palier 3 — Gel des ajouts (déclencheur fort ou plusieurs modérés)

Si 1 déclencheur 🟠 OU 2 déclencheurs 🟡 simultanés :
- Tout `add_node` ou `add_link` est **bloqué** jusqu'à acquittement.
- Modal explicatif citant les déclencheurs actifs.
- `propose_consolidations(graph)` exécuté automatiquement, suggestions
  affichées.
- L'utilisateur doit soit : (a) consolider, (b) acquitter explicitement avec
  raison consignée.

### 4.4 Palier 4 — Rollback recommandé (chaos avéré)

Si 1 déclencheur 🔴 OU plusieurs 🟠 :
- Suspension de toute opération d'ajout.
- Suggestion de `git revert` du dernier batch d'ajouts.
- Audit forensique : identifier le ou les ajouts qui ont fait passer le
  seuil.
- Si rollback refusé : `HS` figé en publication, communication publique
  suspendue jusqu'à résolution.

### 4.5 Palier 5 — Collapse imminent (seuils durs dépassés)

Si `density > 3.5` OU `inflation_ratio > 0.20` OU `false_coherence_count >
0.20 · count(nodes)` :
- Mode dégradé : seul l'audit fonctionne, l'UI graphe affiche
  uniquement les attracteurs μ₀.
- Tout ajout interdit jusqu'à intervention humaine.
- Notification à publier dans `audit/EMERGENCY_LOG.md`.

---

## 5. Conditions de retour à la normale

Après alerte palier ≥ 3 :

```
retour_normal(graph) ⟺
   ∀ déclencheur actif d : d.condition(graph) = faux
   ∧ HS(graph) ≥ 0.75
   ∧ audit consigné avec timestamp de résolution
```

---

## 6. Audit forensique

Quand un seuil est franchi, identifier la cause :

1. Lire les N derniers ajouts (depuis la dernière baseline saine).
2. Pour chaque ajout, recalculer `ΔS_global` rétrospectivement.
3. L'ajout avec `ΔS_global` le plus négatif est candidat coupable.
4. Si suppression de l'ajout fait passer tous les déclencheurs sous seuil,
   la cause est identifiée.
5. Sinon, identifier le premier ajout après lequel un déclencheur s'est
   activé : c'est la cause causale (peut différer de la cause énergétique).

---

## 7. Mécanismes de pression à éviter

| mécanisme | symptôme | contre-mesure |
|---|---|---|
| ajouter pour ajouter | density croît sans gain HS | gel palier 3 |
| « belles branches » | S_local croît, S_global stagne | corrélation R-S7 |
| relabel défensif | « non, c'est en fait un cluster » | label sous prédicat formel |
| auto-validation Oracle | l'Oracle se neutralise lui-même | audit indépendant tiers (humain) |

---

## 8. Indicateurs continus à exposer

Dans l'UI permanente :

| indicateur | format | seuil rouge |
|---|---|---|
| `density` | "links/nodes 2.38" | > 3.5 |
| `H_norm` | "entropie liens 0.14" | > 0.20 |
| `HS` | "honnêteté 0.78" | < 0.50 |
| `gap moyen` | "L−G +0.10" | > 0.25 |
| `corr L/G` | "corr 0.42" | > 0.60 |

---

## 9. Hors-scope explicite

Le protocole de prévention chaos **n'inclut pas** :
- ❌ rollback automatique sans confirmation utilisateur
- ❌ effacement de lois (toujours via `absorbed_into` traçable)
- ❌ blocage en lecture (l'utilisateur peut toujours explorer)
- ❌ suppression de l'audit historique (la trace est inviolable)

---

## SIGNATURE

```
MISSION_ID:           ZORAN_GLOBAL_COHERENCE_ORACLE_20260515
TIMESTAMP:            2026-05-15T19:03:00+02:00
FILES_ANALYZED:       P0_5_SPEC.md, audit/GLOBAL_ORACLE_SPEC.md, app/src/oracle.js
RISKS:                Oracle qui s'auto-désactive ;
                      seuils trop laxistes laissant passer le chaos ;
                      blocage des ajouts perçu comme friction inacceptable
S_LOCAL:              n/a (protocole)
S_GLOBAL:             n/a
TOP_COLLISIONS:       palier 3 (gel ajouts) vs vélocité d'exploration ;
                      palier 5 (collapse) vs préservation UX en lecture
TOP_FAKE_PATTERNS:    « tout va bien » basé sur S_local en hausse ;
                      « densité croissante = signe de richesse »
NEXT_ACTIONS:         1. implémenter les 9 déclencheurs D1..D9 en P0.5 exec
                      2. câbler les paliers 2..4 dans l'UI
                      3. consigner audit_history.log dans app/data/ (append-only)
                      4. réserver audit/EMERGENCY_LOG.md pour palier 5
```

🔶
