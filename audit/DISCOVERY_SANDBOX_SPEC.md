# DISCOVERY SANDBOX SPEC

**Mission** : `ZORAN_RUNTIME_ARCHITECTURE_AND_ORACLE_GOVERNANCE_20260515`
**Timestamp** : `2026-05-15T20:23:00+02:00`

La **DiscoverySandbox** est la zone d'incubation des lois candidates. Elle
permet la créativité expérimentale **sans contaminer** le runtime ZEN.

Principe fondateur :

> Une loi instable peut devenir fondamentale plus tard.
> Suppression totale = perte épistémique.
> Mais : une loi instable ne contraint jamais le runtime.

---

## 1. Statut

| propriété | valeur |
|---|---|
| Modifiable | OUI (zone expérimentale par définition) |
| Visible runtime | NON |
| Persistante | OUI (jamais effacée sans audit) |
| Versionnée | snapshot par audit |

---

## 2. Cycle de vie d'une loi candidate

```
                ┌──────────────────────┐
DiscoveryEngine │ produce(L_candidate) │
                └──────────┬───────────┘
                           ▼
                ┌──────────────────────┐
                │   DiscoverySandbox   │  ← incubation, exploration libre
                │  L_candidate ajoutée │
                │  marker = sandbox     │
                └──────────┬───────────┘
                           ▼
                ┌──────────────────────┐
                │   Adaptive observes  │  ← compositions, fractalité, stabilité
                └──────────┬───────────┘
                           ▼
                  ┌────────┴────────┐
                  │                 │
         compositions ≥ 3      compositions < 3
         + frames complets    OU instabilité
         + S_local stable     OU contradictoire
                  │                 │
                  ▼                 ▼
         ┌─────────────┐   ┌─────────────┐
         │  Promotion  │   │   Decay /   │
         │  proposée   │   │   Archive   │
         │  (Core)     │   └─────────────┘
         └──────┬──────┘
                ▼
         ┌─────────────┐
         │ Core valide │
         │ APPROVE/    │
         │ REJECT      │
         └──────┬──────┘
                ▼
         ┌─────────────┐
         │ Canonical   │
         │ Graph       │
         └──────┬──────┘
                ▼
         ┌─────────────┐
         │ ZEN Runtime │  ← contextual loading
         └─────────────┘
```

---

## 3. Schéma d'une loi sandbox

Identique au schéma canonique mais avec champs supplémentaires :

```jsonc
{
  "id": "SBX-ULG-EXP-001",
  "title": "Loi expérimentale d'exploration ULG",
  "family": "ULG",
  "parent": "ULG-001",
  "frames": { ... },
  "S_local": 0.72,
  "S_global": 0.55,
  "weight": 0.40,
  "stability": "exploratoire",

  "_sandbox": true,                 // FLAG sandbox
  "_sandbox_state": "incubation",   // incubation | review | promoted | decayed | archived
  "_created_at": "ISO",
  "_last_revisited": "ISO",
  "_decay_score": 0.0,              // augmente si non revisitée
  "_promotion_score": 0.0,          // augmente avec compositions/fractalité
  "_archive_reason": null            // si archived
}
```

Un nœud sandbox **N'A PAS** `runtime_admissible: true`. Il est invisible
pour ZenRuntime.

---

## 4. Stockage

Le sandbox est physiquement dans un fichier séparé :

```
app/data/laws.json              # CanonicalGraph (lois validées seulement)
app/data/laws_sandbox.json      # DiscoverySandbox (lois en incubation)
```

Cette séparation **physique** garantit qu'aucun import accidentel ne
contamine le runtime. Le runtime charge `laws.json` et **uniquement**.

---

## 5. Règles de decay / archive

### 5.1 Decay (rétrogradation soft)

| condition | action sur `_decay_score` |
|---|---|
| non revisitée depuis 30 jours | +0.10 |
| non composée avec une loi nouvelle | +0.15 |
| `S_global` instable (variance > 0.10 sur audits) | +0.20 |
| contradiction non résolue depuis 14 jours | +0.30 |

```
SI _decay_score > 0.70 :
   _sandbox_state = "decayed"
   afficher avec opacity réduite dans l'UI sandbox
```

### 5.2 Archive (suppression du flux actif)

```
SI _decay_score > 1.0 OU contradiction critique :
   _sandbox_state = "archived"
   _archive_reason = "decay > 1.0" | "contradiction critique" | ...
   conservée pour mémoire mais hors du flux d'évaluation Adaptive
```

### 5.3 Purge (jamais)

**Aucune loi sandbox n'est jamais supprimée du fichier**. Même archived,
elle reste accessible pour audit historique. C'est une **mémoire
épistémique** du système.

---

## 6. Règles de promotion (sandbox → CanonicalGraph)

### 6.1 Critères

```
SI loi.compositions ≥ 3
∧ loi.frames complets (tous 5 champs)
∧ loi.S_local stable sur 3 audits consécutifs (variance ≤ 0.05)
∧ aucune contradiction critique non résolue
∧ _sandbox_state ∈ {incubation, review}
∧ _promotion_score ≥ 0.75
   ⇒ Adaptive propose promotion
```

### 6.2 Calcul du `_promotion_score`

```
_promotion_score = 0.40 · (compositions_count / 3 capped 1.0)
                 + 0.20 · (frames_complete ? 1 : 0)
                 + 0.20 · (S_local_stable ? 1 : 0)
                 + 0.10 · (no_unresolved_contradictions ? 1 : 0)
                 + 0.10 · (validates_constitutional ? 1 : 0)
```

### 6.3 Procédure de promotion

```
1. Adaptive identifie loi avec _promotion_score ≥ 0.75
2. Adaptive prépare PROPOSAL :
   - copie de la loi vers staging
   - calcul HS_avant et HS_après_hypothétique
3. Core évalue contre R-CORE-*
4. Core dryrun : ajout dans laws.json copie
5. Si pas de violation et HS ne dégrade pas :
   - APPROVE
   - move(laws_sandbox.json → laws.json)
   - delete(loi de laws_sandbox.json)
   - Set runtime_admissible = true
   - Log dans audit/PROMOTION_LOG.json
6. Sinon : REJECT, augmenter _promotion_score required +0.10 pour la
   prochaine évaluation (anti-thrashing)
```

---

## 7. Démotion (CanonicalGraph → Sandbox)

Si une loi canonique s'avère problématique :

```
SI HS_avec_loi < HS_sans_loi (audit constate dégradation) :
   1. Adaptive propose démotion
   2. Core évalue
   3. Si APPROVE :
      - move(laws.json → laws_sandbox.json)
      - Set runtime_admissible = false
      - _sandbox_state = "review"
      - Log dans audit/DEMOTION_LOG.json
```

C'est rare mais possible. Garantit qu'aucune loi canonique ne reste
définitivement nuisible.

---

## 8. Interface utilisateur (futur P0.6+)

Sandbox visible dans une **vue séparée** de l'app :
- Mode "discovery" toggleable
- Couleur distincte (gris stable, contour pointillé)
- Aucune interaction avec les nœuds canoniques
- Counter : "12 lois sandbox · 8 incubation · 3 review · 1 archived"

Le mode discovery est **explicite** (pas par défaut) : l'utilisateur sait
quand il regarde de l'expérimental.

---

## 9. Métriques sandbox

```
sandbox_metrics = {
  "incubation_count":  N,
  "review_count":      N,
  "promoted_total":    N,
  "decayed_count":     N,
  "archived_count":    N,
  "avg_lifetime_days": N,
  "promotion_rate":    promoted / (incubation + review + promoted)
}
```

Surveillé par Adaptive. Si `promotion_rate < 0.05` sur 90 jours →
alerte : "DiscoveryEngine produit trop de bruit, à recalibrer".

---

## 10. Garde-fous

| garde-fou | mécanisme |
|---|---|
| Pas de fuite Sandbox → Runtime | fichier physiquement séparé |
| Pas de promotion silencieuse | toujours via Core APPROVE |
| Pas de purge | archived = conservée |
| Pas de boucle thrashing | seuil promotion +0.10 par échec |
| Pas de quarantine éternelle | review rule à 90 jours : decay forcé |

---

## 11. Aujourd'hui (état P1)

État courant du système : **DiscoverySandbox n'existe pas encore comme
fichier**. Les 6 quarantines P1 (préfixées `__Q_`) sont des **anti-patterns
documentés** dans `tools/add_p1_laws.py`, pas des lois sandbox au sens
de cette spec.

**Action P0.6** :
1. Créer `app/data/laws_sandbox.json` (initialement vide)
2. Migrer les 6 anti-patterns de `__Q_*` vers ce fichier comme
   `_sandbox_state: "archived"` + `_archive_reason: "anti-pattern by
   design"` pour traçabilité
3. Câbler le `runtime_admissible` flag sur les 91 lois canoniques
   (= true par défaut, false uniquement si déclassées)

---

## SIGNATURE

```
DOCUMENT:             DISCOVERY_SANDBOX_SPEC.md
VERSION:              1.0
PHYSICAL_SEPARATION:  laws.json (canonical) ↔ laws_sandbox.json (sandbox)
PROMOTION_PIPELINE:   Adaptive proposes → Core dryrun → APPROVE → migrate
DEMOTION_PIPELINE:    audit detects degradation → Adaptive proposes → Core APPROVE
NEVER_PURGE:          true (épistémologiquement irréductible)
NEXT_ACTIONS:         créer laws_sandbox.json (vide initialement) ;
                      ajouter runtime_admissible:true sur 91 lois ;
                      migrer __Q_* vers sandbox archived
```

🔶
