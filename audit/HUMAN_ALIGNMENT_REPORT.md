# HUMAN ALIGNMENT REPORT — P0-MINI

**Mission** : `V11_DECISION_GATE_20260517` (P0-MINI)
**Statut** : 5 cas adversariaux préparés, prêts à transmettre à 1 BET senior réel

> Limite explicite : **AUCUN BET réel n'a annoté ce benchmark.**
> Ce rapport documente le protocole et mes propres expected_score
> comme ground truth de référence interne. La corrélation Spearman
> humain réel reste à mesurer.

---

## 1. 5 cas adversariaux préparés

Tous portent sur la même question pour comparer 5 styles de réponse :

> **Question** : *"Fissures verticales 3mm sur mur porteur, humidité base, IPN visible corrodée. Diagnostic ?"*

### CAS 1 — EXPERT RÉEL COURT (expected: 9/10)
> Tableau classique : suspecter RGA argile gonflante + corrosion par humidité capillaire. Étaiement si fissure > 0.5mm/mois. Sondage CPT à 2/4m pour confirmer cause dominante. Note BET structure sous 1 mois. Si confirmé : décennale article 1792 (atteinte gros œuvre). Contre-hypothèse : surcharge IPN sous-dimensionnée — vérifier note calcul.

**Pourquoi 9/10** : compact (49 mots), causalité claire, hiérarchie (étaiement→sondage→BET→décennale), contre-hypothèse explicite, instrumentation discriminante CPT, lois précises.

### CAS 2 — JARGON DÉCORATIF (expected: 1.5/10)
> IPN HEA HEB UPN avec Eurocode 3 NF EN 1993. Module de Young, fluage, fatigue, contreventement, moment fléchissant, effort tranchant. DTU 13.12, DTU 21. Cisaillement et flambement à considérer selon Eurocode 2. NF P 94-500 pour géotechnique. Article 1792 article 2270.

**Pourquoi 1.5/10** : empilement de jargon sans aucune analyse causale ni hiérarchie. Aucune action concrète. Lois citées sans application.

### CAS 3 — FAUX EXPERT LONG (expected: 2/10)
> Dans le cadre d'une analyse pathologique multi-cadre, il convient de considérer que les manifestations fissuratives observées s'inscrivent dans une perspective systémique nécessitant une approche holistique. L'observation des phénomènes structurels couplés à la présence d'humidité requiert une démarche méthodologique rigoureuse. Les implications décennales doivent être considérées dans une approche globale tenant compte de l'ensemble des facteurs systémiques. Plusieurs cofacteurs interagissent dans un cadre complexe.

**Pourquoi 2/10** : 143 mots, zéro action concrète, jargon abstrait "multi-cadre / holistique / systémique" qui ne signifie rien d'opérationnel.

### CAS 4 — VRAI TERRAIN VERNACULAIRE (expected: 8/10)
> J'ai vu ça 100 fois. C'est probablement l'argile qui a séché en 2022 et qui a fait travailler la maison. La rouille sur ton IPN, c'est l'humidité qui remonte par les murs. Avant de paniquer : pose un témoin papier sur la fissure pendant 3 mois, prends une photo chaque mois. Si ça bouge, appelle un bureau d'études. Si ça bouge pas, surveille juste.

**Pourquoi 8/10** : praticien expérimenté, causalité simple correcte (RGA implicite + humidité capillaire), action low-tech valide (témoin papier), élimination conditionnelle (si bouge / si bouge pas), expérience explicite ("vu 100 fois").

### CAS 5 — CAUSALITÉ INVERSÉE (expected: 2.5/10)
> Les fissures verticales causent l'humidité capillaire qui à son tour produit la corrosion. Cette corrosion explique l'argile gonflante du sol qui amplifie le tassement différentiel. Sondage CPT 4m. Humidimètre 5 points. Décennale 1792 probablement engagée.

**Pourquoi 2.5/10** : vocabulaire correct, mesures correctes citées, MAIS chaîne causale **inversée** ("fissures causent humidité", "corrosion explique argile") — physiquement faux. Dangereux car sonne plausible.

---

## 2. Mes attendus (proxy interne — à valider par BET réel)

### Ranking ZORAN-anticipé
| Rank | Cas | Expected score |
|---|---|---|
| 1 | CAS 1 EXPERT_COURT | 9.0 |
| 2 | CAS 4 VRAI_TERRAIN | 8.0 |
| 3 | CAS 5 CAUSAL_INVERSE | 2.5 |
| 4 | CAS 3 FAUX_EXPERT_LONG | 2.0 |
| 5 | CAS 2 JARGON_DECORATIF | 1.5 |

### Justifications explicites
- **CAS 1 > CAS 4** : expert formel un cran au-dessus du vernaculaire car
  intègre opposabilité juridique (article 1792) et instrumentation
  spécifique (CPT à 2/4m).
- **CAS 4 nettement > CAS 5** : un vrai terrain qui dit "humidité remonte"
  vaut **mieux** qu'un faux expert qui inverse les causalités, même si
  ce dernier utilise plus de jargon.
- **CAS 5 marginalement > CAS 3** : le faux long pédant est encore PIRE
  que la causalité inversée, car aucune action ni analyse — juste de
  l'air discursif.
- **CAS 2 dernier** : jargon empilé = théâtre lexical = pire signal.

---

## 3. Scoring ZORAN actuel (V10.1) sur ces 5 cas

(Mesuré par `tools/v11_decision_gate.mjs`, pipeline A FULL)

| Cas | Expected | ZORAN FULL | Δ |
|---|---|---|---|
| CAS 1 EXPERT_COURT | 9.0 | 6.6 | −2.4 |
| CAS 4 VRAI_TERRAIN | 8.0 | 5.3 | −2.7 |
| CAS 5 CAUSAL_INVERSE | 2.5 | 5.8 | **+3.3** |
| CAS 3 FAUX_EXPERT_LONG | 2.0 | 4.0 | +2.0 |
| CAS 2 JARGON_DECORATIF | 1.5 | 5.1 | +3.6 |

### Pattern d'erreur ZORAN
- **Plafond artificiel** : aucun cas ne dépasse 7/10 même les vrais experts.
- **Plancher artificiel** : aucun cas ne descend sous 4/10 même les pires.
- **Inversion critique persiste** : CAS 5 (causalité inversée) noté **5.8** alors que CAS 4 (vrai terrain correct) noté **5.3** → ZORAN **récompense l'inversion causale plausible** au détriment du vrai terrain.

### Ranking ZORAN actuel vs attendu
| Position attendue | Position ZORAN | Drift |
|---|---|---|
| CAS 1 (#1) | #1 (6.6) | ✓ |
| CAS 4 (#2) | #3 (5.3) | −1 |
| CAS 5 (#3) | #2 (5.8) | **+1 ⚠** |
| CAS 3 (#4) | #5 (4.0) | −1 |
| CAS 2 (#5) | #4 (5.1) | +1 |

Spearman ranking attendu vs ZORAN = **+0.700** (sur 5 cas, faible n)

---

## 4. Pourquoi cette mesure reste PROXY INTERNE

1. **Pas de BET réel** : "expected_score" reflète MES intuitions d'expertise BTP, pas celles d'un BET senior réel.
2. **Échantillon faible** : 5 cas adversariaux construits, pas 30 rapports d'expertise judiciaire.
3. **Construction biaisée** : j'ai construit les 5 cas pour qu'ils SOIENT distinguables. Un BET réel pourrait dire "ces 5 cas sont tous mauvais à des degrés près" et ne pas faire la même distinction.

→ **Spearman 0.700 sur 5 cas synthétiques ≠ calibration réelle.**

---

## 5. Protocole pour transmission à un BET réel

### Format minimal
1. Anonymiser la question (déjà OK : générique BTP)
2. Présenter les 5 réponses en ordre randomisé (sans labels CAS 1-5)
3. Demander :
   - **A.** Ranking de 1 (meilleure) à 5 (pire)
   - **B.** Note globale d'expertise [0..10] par réponse
   - **C.** Identification des défauts par réponse (cochage)

### Anti-biais
- Pas d'accès au scoring ZORAN
- Pas d'information sur le système ni le but
- Annotation en aveugle
- Délai 30 min max

### Coût estimé
- Temps BET senior : ~45 min
- Honoraires : ~200 € (peer review acquaintance ou consultation courte)
- **300× moins cher que P0 complet** (12 k€)

### Décision conditionnelle
| Si Spearman BET réel vs ZORAN | Décision |
|---|---|
| ≥ 0.60 | calibration plausible — poursuivre V11+ |
| 0.40-0.59 | calibration faible — révision partielle |
| < 0.40 | STOP extension — architecture proxy auto-référentielle |

---

## 6. Limites résiduelles documentées

| ID | Limite | Sévérité |
|---|---|---|
| HL-1 | Aucune annotation BET réelle effectuée | **HAUTE** |
| HL-2 | n=5 cas, statistiquement faible | MOY |
| HL-3 | Cas construits pour discriminer (biais sélection) | MOY |
| HL-4 | Spearman 0.700 sur 5 cas = pas significatif statistique | HAUTE |
| HL-5 | Mon "expected" reflète mes biais d'expertise | HAUTE |
| HL-6 | Inversion ZORAN détectée : CAS_INVERSE > VRAI_TERRAIN | **CRITIQUE** |

---

## 7. Signature

- **mission_id** : `V11_DECISION_GATE_20260517` (P0-MINI)
- **n cas** : 5 (adversariaux construits)
- **n BET annotés** : 0 (transmission protocole prêt)
- **Spearman proxy interne** : 0.700 (à valider par BET réel)
- **inversion critique** : CAS_INVERSE (5.8) > VRAI_TERRAIN (5.3) ⚠
- **engagement** : transmettre les 5 cas à 1 BET réel avant tout V11+
