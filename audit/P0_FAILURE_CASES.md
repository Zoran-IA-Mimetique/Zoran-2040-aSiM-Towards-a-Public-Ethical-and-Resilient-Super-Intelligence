# P0 FAILURE CASES — Template d'analyse honnête

**Mission** : `ZORAN_P0_REAL_WORLD_CALIBRATION_20260517`
**Statut** : ⚠ **À REMPLIR APRÈS ANNOTATIONS BET**

> Ce document existe pour **forcer la documentation des échecs** AVANT d'être tenté
> de les rationaliser. Le template est pré-rédigé pour empêcher la fuite narrative.

---

## 1. Cas où le BET DIVERGE significativement de ZORAN

### Template par cas divergent (|Δ| ≥ 3 points sur 10)

```
CASE_X — DIVERGENCE MAJEURE

  ZORAN expected : _.0
  BET annotation : _.0
  Δ              : _.0

  Justification BET (verbatim) :
    "_____________________________________________"

  Erreurs critiques détectées par BET :
    - _________
    - _________

  Hypothèse de biais ZORAN (PAS de rationalisation, juste constat) :
    Pourquoi mon expected_score était-il différent ?
    Quel signal n'ai-je PAS modélisé ?

  Module ZORAN responsable (best guess) :
    - btp_operational_score
    - causal_density
    - identity_gate
    - ...

  Décision corrective (NON IMPLÉMENTÉE) :
    À documenter post-mortem, à NE PAS implémenter avant analyse complète.
```

---

## 2. Cas où le BET valide ZORAN (cohérence)

Si Spearman global ≥ 0.60, ces cas représentent la **base de validité**.
Documenter aussi ces cas pour comprendre ce qui marche :

```
CASE_X — COHÉRENCE BET ↔ ZORAN

  ZORAN expected : _.0
  BET annotation : _.0
  Δ              : ≤ 1.0

  Pattern partagé : pourquoi BET et ZORAN s'accordent-ils ?
  Module ZORAN qui a "vu juste" : ...
```

---

## 3. Patterns systématiques d'erreur ZORAN

### Si BET pénalise systématiquement A4 CAUSALITE_INVERSEE mais ZORAN non
→ V11_FULL plafonné par défaut score 5-6, manque détection sémantique causale
→ Confirmation LR-2 résiduelle de V11
→ V12 résout (partiellement) — peut justifier intégration filtre conditionnel

### Si BET valorise A2 VRAI_TERRAIN mais ZORAN non
→ Confirmation LR-1 (vernacular invisible aux métriques)
→ Vernacular_wisdom_engine empiriquement justifié, mais avec filtre anti-folklore

### Si BET pénalise A5/A6 FAUX_EXPERT/JARGON mais ZORAN non
→ V11 sur-récompense la verbosité technique
→ Goodhart confirmé sur jargon décoratif
→ V12 minimal (avec extraction enrichie) pourrait remplacer modules verbosité

### Si BET note ≈ ZORAN_EXPECTED mais ≠ V11_FULL et V12
→ Mes intuitions sont OK, mais mon scoring code ne capture pas mes intuitions
→ Problème d'implémentation, pas d'architecture

### Si BET note ≠ ZORAN_EXPECTED ET ≠ V11
→ Mes intuitions sont mal calibrées → BET a raison, ZORAN a tort de bout en bout
→ Ground truth synthétique invalidé → STOP V13

---

## 4. Engagement anti-rationalisation

**Phrases interdites dans ce document après remplissage** :
- ❌ "Le BET a peut-être mal compris la question"
- ❌ "Avec un autre BET, le résultat serait différent"
- ❌ "Le cas X était mal construit"
- ❌ "Ce n'est qu'un signal faible"
- ❌ "ZORAN est meilleur sur des aspects non mesurés"
- ❌ "L'échantillon est trop petit"

**Phrases attendues** :
- ✅ "Le BET signale Y, ZORAN ratait Y, voici quel module améliorer"
- ✅ "Le BET et ZORAN convergent sur X, voici quel module valide"
- ✅ "Δ majeur sur cas Z, hypothèse de biais : ZORAN sur-pondère W"

---

## 5. Liste des modules à examiner si verdict négatif

Si Spearman < 0.40, **tous les modules suivants doivent être réévalués** :

| Module | Statut à confirmer |
|---|---|
| `btp_operational_score` | ❓ |
| `causal_density` | ❓ |
| `systemic_coherence` | ❓ |
| `anti_goodhart` | ❓ |
| `fragility_detector` | ❓ |
| `vernacular_wisdom_engine` | ❓ |
| `physical_causality_validator` | ❓ |
| `adversarial_survivability_engine` (V12) | ❓ |

→ Décision module par module post-analyse BET, **non bulk-rebuild**.

---

## 6. Signature

- **mission_id** : `ZORAN_P0_REAL_WORLD_CALIBRATION_20260517`
- **statut** : TEMPLATE — anti-rationalisation pré-engagée
- **à remplir par** : utilisateur, post-annotation BET
