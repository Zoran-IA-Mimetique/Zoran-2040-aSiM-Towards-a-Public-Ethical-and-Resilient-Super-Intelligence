# COLLAPSE AND REFORMATION

**Mission** : `ZORAN_TEMPORAL_COHERENCE_AND_SELECTION_ENGINE_20260515`

Étude des dynamiques de **collapse** et **réformation** observées sous
stress.

---

## 1. Définitions

| terme | sens |
|---|---|
| **collapse** | chute brutale de HS ou perte irréversible d'une famille |
| **réformation** | reconstitution naturelle d'un sous-graphe après dégradation |
| **résilience** | capacité à éviter le collapse sous pression |

---

## 2. Tests de collapse exécutés (cf. `TEMPORAL_STRESS_SUITE.md`)

5 tests appliqués, **5/5 sans collapse total**.

| test | ΔHS | type d'événement |
|---|---:|---|
| perturbation_legere | 0.0000 | aucun |
| perturbation_forte | 0.0000 | aucun |
| contradiction_locale | 0.0000 | aucun |
| retrait_dependance | 0.0000 | aucun (résilience par redondance) |
| collapse_partiel famille DVE | -0.1000 | dégradation tolérable |

Aucun test n'a produit un collapse total (ΔHS ≤ -0.50).

---

## 3. Conditions de collapse hypothétiques

Pour qu'un collapse total survienne :

```
collapse_total ⟺
   (HS_après < 0.50)
   OU (fractal_families < 1)
   OU (C_struct < 0.80, i.e. > 20% refs cassées)
```

Pour atteindre ces conditions, il faudrait :
- retirer **plusieurs familles** simultanément (≥ 3)
- corrompre les iso edges (suppression invariants)
- déclencher massive cascade de contradictions

Le système est conçu pour **résister à ces attaques par design**
(R-CORE-6, R-CORE-7, R-CORE-8).

---

## 4. Réformation possible ?

Le système actuel **n'a pas de mécanisme automatique de réformation** :
- pas de regénération de loi perdue
- pas de re-promotion auto sandbox → canonical
- pas de reconstruction de iso après suppression invariants

Réformation = action manuelle ou via DiscoveryEngine + Adaptive
proposition.

→ Cible P0.7+ : implémenter `AutoReformationEngine` qui détecte les
trous structurels et propose des promotions sandbox.

---

## 5. Tests de réformation simulés (proxy)

Test : si je retire une racine de famille fractale, est-ce que les
descendants restent fractaux ?

```
Famille DVE :
  Initial : depth 3 démontrée
  Si retrait DVE-001 : depth max devient 2 (perte de la chaîne)
  fractal_property(DVE) = FAUX après retrait
```

→ **Pas de réformation naturelle.** Sans la racine, la fractalité s'éteint.

Ce qui suggère que les racines canoniques sont **non-réformables**.
Elles doivent être protégées (R-CORE-6 rollback).

---

## 6. Implications théoriques

### 6.1 Le système est robuste mais pas auto-réparateur

ZORAN résiste très bien aux perturbations mais **ne se répare pas
spontanément**. C'est une limite à reconnaître.

### 6.2 La réformation nécessite acteur externe

Pour qu'un sous-graphe perdu soit reconstitué, il faut :
- DiscoveryEngine produit candidates → Sandbox
- Adaptive observe les "trous" structurels
- Adaptive propose promotion
- Core valide
- CanonicalGraph re-intègre

Ce pipeline est **conçu** mais **pas automatisé** en P0.5–P3.

### 6.3 Métaphore biologique

Comme un organisme :
- résiste très bien aux blessures mineures (regen tissulaire)
- résiste moyennement aux blessures graves (cicatrisation)
- ne reconstitue pas un organe entier perdu (sauf certains animaux)

ZORAN se comporte comme cette dernière classe : robuste mais non
réformateur autonome.

---

## 7. Recommandations

| recommandation | priorité |
|---|---|
| Tester collapse multi-famille | medium |
| Implémenter AutoReformationEngine | low (futur P0.7+) |
| Documenter les "trous" structurels | high (audit régulier) |
| Backup régulier du CanonicalGraph | critical (déjà via git) |

---

## SIGNATURE

```
MISSION_ID:               ZORAN_TEMPORAL_COHERENCE_AND_SELECTION_ENGINE_20260515
COLLAPSE_TOTAL_OBSERVED:  0
COLLAPSE_PARTIAL_OBSERVED: 1 (famille DVE, ΔHS=-0.10)
RÉFORMATION_AUTO:         non implémentée
RACINES_NON_RÉFORMABLES:  ✓ documenté
NEXT:                     AutoReformationEngine P0.7+
```

🔶
