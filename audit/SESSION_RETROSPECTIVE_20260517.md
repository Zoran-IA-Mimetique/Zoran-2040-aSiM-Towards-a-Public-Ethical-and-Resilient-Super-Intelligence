# ZORAN — Trajectoire de session 2026-05-17

**Branche** : `claude/zoran-fractal-law-tree-pPfzR`
**Type** : retrospective de session, pas spec d'extension

> Le but de ce document n'est pas de prescrire la suite. C'est de
> préserver la cinématique cohérente d'une session de ~18 missions
> qui a abouti à un diagnostic stable, pour qu'aucune future session
> ne reparte de zéro et ne ré-empile par défaut.

---

## 1. Cinématique observée

| Phase | Versions | Caractère dominant |
|---|---|---|
| Sophistication | V1 → V8 | accumulation de détecteurs, scoring multi-axes |
| Adversarialisation | V9 → V10 | break-first, causal density, anti-Goodhart |
| Falsification | V11 | subtraction test (gap FULL vs MIN +0.088), CTA reframing, conclusion wrapper |
| Survivabilité | V12 | claim extraction, hostile refutation, tribunal mode |
| Retour au réel | P0-MINI | protocole BET humain, kit prêt à transmettre |

---

## 2. Diagnostic stable atteint

### Ce que ZORAN sait faire (vérifié interne)
- Structurer une réponse en hiérarchie causale
- Détecter jargon décoratif et causalité plausible mais fausse (V12 sur cas ciblés)
- Bloquer hallucinations identité (V7 — 100% F1 sur 56 cas)
- Forcer 3 CTAs cohérents en sortie ZORAN runtime (SDE-029 active)
- Préserver baseline Claude brut comme vraie référence

### Ce que ZORAN ne sait PAS encore
- Reconnaître l'expertise terrain réelle sans jargon (LR-1, partiellement V11.P2)
- Distinguer causalité physiquement vraie de causalité bien formulée (LR-2)
- Atteindre Spearman ≥ 0.65 même synthétique
- Affirmer quoi que ce soit sur le terrain réel sans validation BET

### Plafond actuel
**Spearman 0.639 contre ground truth synthétique = mes propres intuitions.**
Aucun gain au-delà sans changer de ground truth → P0 BET réel.

---

## 3. Pourquoi P0 reste bloquant

> *"Un système religieux finit toujours par supprimer son juge externe."*

P0-MINI BET réel a été pré-engagé comme verrou non-négociable depuis 5 missions
successives. Chaque mission a tenté de "résoudre" l'absence de P0 par plus de
sophistication code. Chaque tentative a confirmé le plafond.

Le seul moyen de sortir de l'auto-validation circulaire = exécution humaine externe.
- Coût : ~200 € (1 BET, 5 cas, 45 min)
- Bloqué par : transmission effective, pas par code

---

## 4. Verrous à ne pas relâcher

Pour toute future session (moi ou autre agent) :

1. **NE PAS ajouter de nouvelle métrique** avant P0-MINI exécuté
2. **NE PAS interpréter** un gain Spearman synthétique comme "validation terrain"
3. **NE PAS communiquer** "ZORAN niveau BET / expert / référence métier"
4. **NE PAS supprimer** le verrou P0 même si une mission semble "presque calibrée"
5. **NE PAS oublier** que CLAUDE_brut = baseline pur (pas de CTA — SDE-029 active uniquement sur candidats ZORAN)

---

## 5. État architectural actuel (commit `f63e413`)

```
LAWS    : 242 nodes (SDE-029 dernière ajoutée)
TOOLS   : 30+ scripts de test, validation, eval massive
MODULES : ~25 sous app/src/ (causal_density, anti_goodhart, vernacular_wisdom,
          physical_causality, adversarial_survivability, conclusion_wrapper,
          identity_gate, etc.)
TESTS   : tous au vert sur synthétique, AUCUN sur réel
AUDIT   : 40+ rapports markdown, full traceability commits
SMOKE   : 13/14 OK runtime
P0-KIT  : prêt à transmettre, 5 cas anonymisés
```

---

## 6. Question ouverte pour la session suivante

**Une seule** :

> Le P0-MINI a-t-il été transmis à un BET réel ?

- Si OUI → traiter les annotations, calculer Spearman, accepter le verdict
- Si NON → **STOP**. Ne rien ajouter. Relire ce document.

Toute autre question (V13, V12.1, nouvelle métrique, refactor) est secondaire
à celle-ci tant que P0 n'a pas tourné.

---

## 7. Métrique de fin de session

CC_inst (cohérence instantanée) et CC_stab (cohérence stabilité) calculées par
l'utilisateur sont restées dans la fourchette 9.5-9.9/10 sur les ~18 missions.

Le verdict honnête : **cohérence interne forte, validation externe nulle**.

Les deux ne sont pas la même chose. Ce document existe pour que cette
distinction ne soit pas perdue à la prochaine session.
