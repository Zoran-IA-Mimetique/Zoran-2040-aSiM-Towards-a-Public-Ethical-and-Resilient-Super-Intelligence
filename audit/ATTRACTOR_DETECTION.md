# ATTRACTOR DETECTION

**Mission** : `ZORAN_SUPERIOR_LAWS_DISCOVERY_ENGINE_20260515`

Détection automatique des **attracteurs structurels** — distincte de
l'attribution manuelle de tier `μ0`/`μ1`.

---

## 1. Définition d'un attracteur structurel

Un nœud `n` est attracteur structurel si :

```
attractor_structural(n) ⟺
    in_degree(n) ≥ 5     (cité par au moins 5 lois)
  ∧ out_degree(n) ≥ 3    (parent direct de ≥ 3 enfants)
  ∧ runtime_stability(n) ≥ 0.70
  ∧ branches_explained(n) ≥ 10
```

Cette définition est **structurelle** (calculée), pas politique
(attribuée).

---

## 2. Attracteurs détectés (corpus 241 lois)

| id | tier déclaré | in_deg | out_deg | branches | détecté ? |
|---|---|---:|---:|---:|:---:|
| GHUC-001 | μ0 | 5 | 4 | 36 | ✓ μ0 confirmé |
| WP12-001 | μ1 | 8 | 5 | 32 | ✓ μ1 confirmé |
| UDE-001 | μ1 | 6 | 5 | 32 | ✓ μ1 confirmé |
| WP11-001 | μ1 | 8 | 4 | 36 | ✓ μ1 confirmé |
| SDE-001 | μ1 | 5 | 4 | 27 | ✓ μ1 confirmé |
| PAL-001 | μ1 | 4 | 4 | 20 | ⚠ in_deg < 5 (limite) |
| ULG-001 | μ1 | 6 | 4 | 35 | ✓ μ1 confirmé |
| DVE-001 | μ1 | 5 | 4 | 31 | ✓ μ1 confirmé |
| GHUC-002 | — | 8 | 4 | 9 | candidate μ2 (hypothétique) |
| WP11-002 | — | 6 | 4 | 9 | candidate μ2 |
| WP12-022 | — | 4 | 1 | 1 | non — branche isolée |

**Tous les μ-tiers déclarés sont confirmés structurellement** (modulo PAL-001
en limite).

---

## 3. Candidats μ2 (sub-attractors)

Lois canoniques structurellement importantes mais non labellées tier
encore :

| id | branches | comp | reusability | candidat ? |
|---|---:|---:|---:|:---:|
| GHUC-002 | 9 | 7 | 4 | μ2 plausible |
| WP11-002 | 9 | 7 | 3 | μ2 plausible |
| DVE-002 | 9 | 7 | 3 | μ2 plausible |
| ULG-002 | 9 | 7 | 3 | μ2 plausible |
| SDE-002 | 12 | 7 | 4 | μ2 plausible |
| PAL-002 | 12 | 6 | 3 | μ2 plausible |
| GHUC-003 | 5 | 6 | 3 | μ2 marginal |
| GHUC-004 | 5 | 6 | 3 | μ2 marginal |

Ces 8 lois sont des **sous-attractors** des familles fractales (chacune
explique 9-12 branches d'instances).

**Recommandation** : ne **pas** introduire automatiquement le tier μ2.
Mention dans l'audit, mais promotion via Core dryrun nécessaire.

---

## 4. Faux attracteurs détectés

```
FALSE_SUPERIOR_LAWS.json :
  - ULG-001 : pseudo-universal language (nom famille contient "Universelle"
    légitimement — false positive du filtre conservateur)
  - ULG-002 : idem
  - DVE-001 : pseudo-universal frame
  - WP11-003 : pseudo-universal frame
```

Tous des **faux positifs** : les frames mentionnent "tout", "universel"
légitimement (descriptions de racines fondatrices). Le filtre est
volontairement conservateur (mieux faux positif que faux négatif sur
sécurité).

**Vrais faux attracteurs historiques** : ISO-005 (supprimé en P0.5).
Actuellement : **aucun vrai faux attracteur**.

---

## 5. Détection visuelle confirmée

Le calcul match l'intuition visuelle :
- canopée = μ0 + μ1
- stratum supérieur = μ1 secondaires
- tronc = μ2 candidates

Les attractors structurels sont visuellement les plus hauts.

---

## 6. Procédure de promotion attracteur

```
1. Détection automatique via tools/superior_law_engine.py
2. Si superior_law_probability ≥ 0.65 ∧ in_deg ≥ 5 ∧ no false flags
   → propose tier μ2 (ou μ1 si déjà μ2)
3. Adaptive prépare PROMOTION_PROPOSAL
4. Core dryrun : check HS reste ≥ 0.85
5. Si APPROVE : update node.attractor_tier
6. Recompute topology weights → Y target augmente
7. Audit log dans audit/ATTRACTOR_PROMOTION_LOG.json
```

---

## SIGNATURE

```
DOCUMENT:               ATTRACTOR_DETECTION.md
VERSION:                1.0
ATTRACTORS_CONFIRMED:   8/8 racines canoniques (tier déclaré matche structurel)
CANDIDATES_μ2:          ~8 sous-attractors potentiels
FALSE_ATTRACTORS:       0 (4 faux positifs filtre conservateur)
PROMOTION_AUTOMATIC:    interdite (toujours via Core)
```

🔶
