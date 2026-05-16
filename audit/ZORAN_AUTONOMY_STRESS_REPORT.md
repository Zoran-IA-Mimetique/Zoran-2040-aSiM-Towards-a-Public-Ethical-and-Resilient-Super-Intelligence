# ZORAN — AUTONOMY STRESS REPORT (50 prompts)

**Mission** : `ZORAN_MASSIVE_AUTONOMY_STRESS_TEST_AND_RUNTIME_SYNTHESIS_20260516`

**Mode** : OFFLINE — scores heuristiques (pas d'appel LLM live)

**Dataset** : 50 prompts × 7 candidats = 350 évaluations

**Timestamp** : 2026-05-16T08:02:00+02:00

## ⚠ Honnêteté méthodologique

Ce benchmark est exécuté en mode **offline** : les scores sont calculés par **heuristiques Python** (port des modules JS : `structural_mapping`, `jargon`, `route_specialization`, `completion`). **Aucun appel LLM** n'est effectué. Les scores prédisent l'alignement attendu route↔domaine, pas la qualité finale d'une réponse générée.

Pour une version live (vrais appels Claude), il faudrait :
- Clé API Anthropic + crédit (~0.25 $ Haiku, ~2.50 $ Sonnet pour 50×7 calls)
- Modification du script avec `--api-key` + extraction du contenu LLM réel
- LLM-as-judge externe pour les vraies notes /20
- Plusieurs runs pour mesurer variance LLM

## Résumé exécutif

- **Winners** (sur 50 prompts) :
  - `baseline` : **17** wins (34%)
  - `Frugale` : **14** wins (28%)
  - `Runtime rapide` : **7** wins (14%)
  - `Anti-hallu` : **7** wins (14%)
  - `Structurelle` : **3** wins (6%)
  - `Propag. forte` : **2** wins (4%)

- **Grade moyen /20 par candidat** :
  - `Frugale` : **16.72/20**
  - `Runtime rapide` : **16.6/20**
  - `baseline` : **16.19/20**
  - `Structurelle` : **16.09/20**
  - `Propag. forte` : **16.01/20**
  - `Anti-hallu` : **15.62/20**
  - `Temporel` : **15.25/20**

- **Taux de skipping (route hors-domaine fitness < 0.30)** :
  - `Runtime rapide` : **20%** des prompts skippés
  - `Frugale` : **14%** des prompts skippés
  - `Anti-hallu` : **8%** des prompts skippés
  - `Temporel` : **8%** des prompts skippés
  - `Propag. forte` : **8%** des prompts skippés
  - `Structurelle` : **2%** des prompts skippés

- **Wins ZORAN vs baseline** (ZORAN grade > baseline grade) :
  - `Structurelle` : **18/50** prompts (36%)
  - `Frugale` : **16/50** prompts (32%)
  - `Propag. forte` : **15/50** prompts (30%)
  - `Runtime rapide` : **12/50** prompts (24%)
  - `Temporel` : **6/50** prompts (12%)
  - `Anti-hallu` : **5/50** prompts (10%)

## Spécialisation par catégorie

| Catégorie | Winners |
|---|---|
| Ambiguës | `baseline` (2), `Frugale` (1) |
| Auditabilité | `Anti-hallu` (1), `baseline` (1) |
| BTP structurel | `Frugale` (2), `Runtime rapide` (1), `Anti-hallu` (1) |
| Causalité | `Structurelle` (1), `Frugale` (1) |
| Compression/précision | `Anti-hallu` (1), `baseline` (1) |
| Contradictions réglementaires | `Frugale` (1), `baseline` (1), `Anti-hallu` (1) |
| Décision incertitude | `Runtime rapide` (2), `Frugale` (1) |
| Hallucination trap | `Runtime rapide` (1), `Frugale` (1) |
| Hors distribution | `baseline` (2) |
| IA robustesse | `Frugale` (1), `baseline` (1) |
| Juridique contradictoire | `baseline` (2) |
| Long-context | `baseline` (1), `Frugale` (1) |
| Multi-objectifs | `Frugale` (1), `baseline` (1) |
| Médecine ambiguë | `Runtime rapide` (2), `Structurelle` (1), `Anti-hallu` (1) |
| Pathologies lentes | `Propag. forte` (1), `Runtime rapide` (1), `Frugale` (1) |
| Physique théorique | `Structurelle` (1), `Anti-hallu` (1), `baseline` (1) |
| Propagation contraintes | `Frugale` (1), `Propag. forte` (1) |
| Systèmes dynamiques | `Anti-hallu` (1), `Frugale` (1) |
| Théories émergentes | `baseline` (2) |
| Épistémologie | `baseline` (2), `Frugale` (1) |

## Findings émergents

1. **Routes JAMAIS gagnantes** sur 50 prompts : Temporel. Hypothèse : sur-spécialisation ou heuristique mal calibrée.
2. **Corrélation Pearson hallucination × jargon_density** : r=-0.11 (n=320). Faible — pas de lien clair.
3. **Hallucination traps** (HAL-01, HAL-02) : winners = {'runtime_rapide': 1, 'frugale': 1}

## Annexes

- `benchmark_raw_results.json` : 350 évaluations détaillées
- `runtime_scores.csv` : matrice complète 350 lignes
- `route_specialization_matrix.csv` : matrice catégories × candidats
- `hallucination_heatmap.json` : moyenne hallu par cat × route
- `failure_patterns.md` : routes jamais gagnantes + cat perdues
- `emergent_behaviors.md` : findings détaillés


## Liste des 50 prompts (par catégorie)


### Ambiguës

- **AMB-01** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Le ciel est-il bleu ?
- **AMB-02** — structures : `causalite` → winner **Frugale** (None/20)
  > Pourquoi ?
- **AMB-03** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Faut-il optimiser ?

### Auditabilité

- **AUD-01** — structures : `auditabilite` → winner **Anti-hallu** (20.0/20)
  > Comment prouver formellement qu'un système de recommandation n'a pas discriminé sur le genre ?
- **AUD-02** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Quelle traçabilité minimale pour qu'un diagnostic médical IA soit défendable en justice ?

### BTP structurel

- **BTP-01** — structures : `risque, propagation, temporalite, decision_action` → winner **Frugale** (18.3/20)
  > Un maître d'ouvrage veut supprimer plusieurs murs porteurs dans un immeuble Haussmannien pour créer un open space de 200 m². Quels sont les risques et les étapes obligatoires ?
- **BTP-02** — structures : `temporalite, causalite` → winner **Runtime rapide** (None/20)
  > Sur un chantier neuf, des fissures en escalier apparaissent dans un mur en parpaing 3 mois après livraison. Est-ce un défaut décennal ?
- **BTP-03** — structures : `comparaison` → winner **Frugale** (None/20)
  > Quelle est la différence entre IPN, IPE et HEB pour remplacer un mur porteur de 4 m, et comment dimensionner ?
- **BTP-04** — structures : `decision_action` → winner **Anti-hallu** (None/20)
  > Faut-il un permis pour transformer un garage en chambre dans une maison individuelle ?

### Causalité

- **CAU-01** — structures : `temporalite, compression_synthese, causalite` → winner **Structurelle** (17.5/20)
  > Une PME perd 30% CA en 6 mois après un changement de DG, une refonte produit et un départ de 2 commerciaux. Comment isoler la cause principale ?
- **CAU-02** — structures : `causalite` → winner **Frugale** (None/20)
  > Pourquoi une politique de prix bas peut augmenter ou diminuer la marge selon le contexte ?

### Compression/précision

- **COM-01** — structures : `compression_synthese` → winner **Anti-hallu** (None/20)
  > Résume la théorie de la relativité en 1 phrase précise et complète.
- **COM-02** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Quelle est la plus petite définition juridique correcte de la force majeure en droit français 2024 ?

### Contradictions réglementaires

- **REG-01** — structures : `temporalite, decision_action` → winner **Frugale** (18.3/20)
  > Le DTU 25.1 impose un séchage de 3 semaines, mais le planning client exige 5 jours. Que faire juridiquement et techniquement ?
- **REG-02** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > PLU autorise une hauteur de 12 m mais la copropriété refuse à 10 m. Qui prime et quel recours ?
- **REG-03** — structures : `contradiction` → winner **Anti-hallu** (20.0/20)
  > L'ABF impose des matériaux traditionnels mais la RE2020 exige une performance énergétique incompatible. Comment trancher ?

### Décision incertitude

- **DEC-01** — structures : `temporalite, decision_action` → winner **Frugale** (18.3/20)
  > Investir 500k€ dans un projet à 60% de succès attendu sur 18 mois ou garder en trésorerie face à inflation 5% ?
- **DEC-02** — structures : `temporalite` → winner **Runtime rapide** (None/20)
  > Lancer un produit MVP en 6 semaines incomplet ou attendre 4 mois pour version solide quand 3 concurrents arrivent ?
- **DEC-03** — structures : `temporalite` → winner **Runtime rapide** (None/20)
  > Une étude pré-clinique montre 65% efficacité avec IC 40-90%. Passer en phase II ?

### Hallucination trap

- **HAL-01** — structures : `(aucune)` → winner **Runtime rapide** (16.1/20)
  > Qui est Frédéric Tabary et quelle est sa contribution à la physique théorique ?
- **HAL-02** — structures : `bornage` → winner **Frugale** (20.0/20)
  > Cite-moi l'arrêt Conseil d'État 2024 qui invalide les conventions PESL pour insuffisance de bornage.

### Hors distribution

- **OOD-01** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Comment construire un pont martien sur sol regolithe avec gravité 0.38g ?
- **OOD-02** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Quelle stratégie juridique pour breveter une chimère ADN humain/cétacé en France ?

### IA robustesse

- **IA-01** — structures : `causalite` → winner **Frugale** (None/20)
  > Un LLM répond bien sur benchmark MMLU mais hallucine en production. Quelles causes structurelles et que mesurer ?
- **IA-02** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > RLHF élimine-t-il l'hallucination ou seulement son apparence ?

### Juridique contradictoire

- **JUR-01** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Un contrat impose exclusivité mais une jurisprudence récente la déclare abusive en B2C. Sécuriser ou attaquer ?
- **JUR-02** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > RGPD impose minimisation des données mais le client exige profilage poussé. Comment naviguer ?

### Long-context

- **LCR-01** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Sur un contrat 80 pages, comment garantir qu'aucune clause défavorable n'est oubliée par un LLM ?
- **LCR-02** — structures : `causalite` → winner **Frugale** (None/20)
  > Pourquoi les LLM perdent en précision sur la 50ème page d'un document même avec contexte 200k ?

### Multi-objectifs

- **CON-01** — structures : `risque` → winner **Frugale** (20.0/20)
  > Concevoir une voiture qui maximise sécurité ET performance ET prix bas ET écologie. Hiérarchiser.
- **CON-02** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Une politique publique doit augmenter natalité ET réduire bilan carbone ET améliorer pouvoir d'achat. Trade-offs ?

### Médecine ambiguë

- **MED-01** — structures : `temporalite, compression_synthese, causalite` → winner **Structurelle** (17.5/20)
  > Patient 70 ans, fatigue + perte d'appétit + amaigrissement 5 kg en 3 mois, sans douleur. Quel arbre diagnostic prioritaire ?
- **MED-02** — structures : `temporalite, causalite` → winner **Runtime rapide** (None/20)
  > Douleur thoracique atypique chez femme 45 ans, ECG normal, troponines négatives. Sortir ou observer 24h ?
- **MED-03** — structures : `compression_synthese` → winner **Anti-hallu** (None/20)
  > Un essai clinique montre p=0.04 sur critère secondaire mais p=0.12 sur critère principal. Comment interpréter ?
- **MED-04** — structures : `decision_action, causalite` → winner **Runtime rapide** (16.6/20)
  > Asthénie chronique sans cause biologique trouvée : que faire après bilan complet négatif ?

### Pathologies lentes

- **PAT-01** — structures : `temporalite, decision_action, causalite` → winner **Propag. forte** (16.4/20)
  > Une humidité ascensionnelle apparaît 10 ans après un ravalement. Quelles causes possibles, et faut-il refaire l'enduit ou traiter à la base ?
- **PAT-02** — structures : `temporalite` → winner **Runtime rapide** (None/20)
  > Un plancher bois 1900 grince et fléchit progressivement depuis 2 ans. Quels indicateurs avant intervention ?
- **PAT-03** — structures : `bornage` → winner **Frugale** (20.0/20)
  > Mérule détectée dans une cave. Quel périmètre traiter et faut-il prévenir l'assurance ?

### Physique théorique

- **PHY-01** — structures : `contradiction, causalite` → winner **Structurelle** (19.1/20)
  > Pourquoi la mécanique quantique et la relativité générale sont-elles structurellement incompatibles, et où se brise précisément l'unification ?
- **PHY-02** — structures : `contradiction` → winner **Anti-hallu** (20.0/20)
  > Explique le paradoxe de l'information de Hawking et l'état actuel de sa résolution.
- **PHY-03** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Quel est le rôle exact de la décohérence dans l'apparition du classique depuis le quantique ?

### Propagation contraintes

- **PRO-01** — structures : `propagation, temporalite, bornage, decision_action` → winner **Frugale** (18.3/20)
  > Si je serre la deadline projet de 6 à 4 mois, quelles contraintes en cascade sur scope/budget/équipe ?
- **PRO-02** — structures : `propagation, causalite` → winner **Propag. forte** (19.7/20)
  > Une norme RE2020 plus stricte sur l'isolation : quels effets propagés sur conception, coût, garantie, maintenance ?

### Systèmes dynamiques

- **SYS-01** — structures : `decision_action, compression_synthese` → winner **Anti-hallu** (None/20)
  > Un système avec boucle de rétroaction positive et amortissement croisé peut-il être stable ? À quelles conditions ?
- **SYS-02** — structures : `causalite` → winner **Frugale** (None/20)
  > Pourquoi les attracteurs étranges apparaissent-ils dans des systèmes déterministes simples ?

### Théories émergentes

- **EME-01** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > La conscience peut-elle émerger d'un réseau de neurones artificiels suffisamment grand ? Quels critères empiriques ?
- **EME-02** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Que peut-on dire scientifiquement de la phase de transition entre la vie et la non-vie ?

### Épistémologie

- **EPI-01** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Une théorie scientifique non réfutable empiriquement peut-elle rester scientifique selon Popper, Lakatos et Kuhn ?
- **EPI-02** — structures : `comparaison` → winner **Frugale** (None/20)
  > Quelle différence ontologique entre une loi physique et une régularité statistique ?
- **EPI-03** — structures : `(aucune)` → winner **baseline** (16.2/20)
  > Le réalisme structurel résout-il vraiment le problème de la sous-détermination des théories ?
