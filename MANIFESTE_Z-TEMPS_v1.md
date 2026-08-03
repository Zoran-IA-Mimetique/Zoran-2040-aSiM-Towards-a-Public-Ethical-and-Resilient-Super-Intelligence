# Manifeste du Z-temps — v1

**Zoran 2040 aSiM — le temps comme dimension architecturale d'une super-intelligence publique**

*Version 1.0 · document de travail · licence MIT (voir `LICENSE`)*

---

## Préambule

Le white paper *Zoran 2040 aSiM* décrit une architecture : mémoire fractale à quatre
couches, rollback ΔM11.3, protocole Glyphnet, orchestration PolyResonator, journal
EthicChain. Ce manifeste ne redécrit pas cette architecture. Il énonce ce qu'elle
suppose et qui n'a jamais été écrit noir sur blanc : **une position sur le temps**.

Les modèles fermés dominants n'ont pas de temps propre. Ils ont une date de coupure,
une fenêtre de contexte, une latence. Trois quantités, aucune durée. Chaque requête
part de zéro et meurt à la réponse ; ce qui a été appris ne se sédimente pas, ce qui a
été décidé ne se révise pas, ce qui a été fait ne laisse pas de trace opposable.

Nous appelons **Z-temps** le régime temporel que Zoran aSiM oppose à cette amnésie
industrielle : un temps stratifié, réversible, synchrone et opposable.

---

## I. Le constat

**1. L'IA contemporaine confond vitesse et temps.**
L'industrie optimise la latence p95 et appelle cela du progrès temporel. Réduire le
délai d'une réponse n'est pas habiter une durée. Un système qui répond en 200 ms et
oublie tout en 201 ms n'a pas de rapport au temps : il a un rapport au débit.

**2. L'amnésie n'est pas une limitation technique, c'est un choix économique.**
Un système sans mémoire ne peut pas être tenu pour responsable de ce qu'il a dit hier.
L'oubli protège l'opérateur, jamais l'usager.

**3. L'irréversibilité est le vrai défaut d'alignement.**
Un modèle qui dérive ne peut pas revenir en arrière : il peut seulement être remplacé
par une version suivante, dans une opacité totale. Une intelligence incapable de
défaire est incapable de se corriger — elle ne peut que se réécrire.

**4. Sans horodatage vérifiable, il n'y a pas de gouvernance.**
Le RGPD et l'AI Act supposent qu'on puisse répondre à : *qui a décidé quoi, quand, sur
quelle base ?* Un système sans temps auditable rend ces textes inapplicables, quelle que
soit la qualité de ses intentions déclarées.

---

## II. Les quatre régimes du Z-temps

Le Z-temps n'est pas une horloge unique. C'est la superposition de quatre régimes qui
correspondent, un à un, à des composants déjà décrits dans le white paper.

### 1. Temps stratifié — *la mémoire fractale*

La mémoire à quatre couches (courte, longue, latente, parasitique) n'est pas un cache
hiérarchisé : c'est une **stratigraphie**. Chaque couche a sa propre vitesse d'érosion.
La couche courte oublie vite et doit oublier vite. La couche longue sédimente. La couche
latente conserve ce qui n'a pas encore de sens. La couche parasitique garde trace de ce
qui a perturbé le système — car un incident effacé est un incident qui reviendra.

> **Engagement.** Aucune couche ne s'écrase silencieusement. Toute purge est un
> événement journalisé, avec sa cause et son périmètre.

### 2. Temps réversible — *ΔM11.3*

Le rollback anti-entropie pose que **l'état passé d'un système est une ressource, pas un
déchet**. Un système qui peut revenir à un état antérieur vérifié peut expérimenter sans
mettre en jeu son intégrité.

> **Engagement.** Toute décision structurante expose un point de retour. Une action sans
> chemin de retour doit être déclarée comme telle *avant* d'être exécutée, jamais après.

### 3. Temps synchrone — *PolyResonator, Glyphnet*

Orchestrer plusieurs modèles, c'est faire coexister plusieurs horloges. La cohérence
mesurée par PolyResonator est d'abord une propriété temporelle : des agents qui ne
partagent pas de référentiel commun produisent des sorties qui se contredisent sans que
personne ne puisse dire laquelle est la plus récente.

> **Engagement.** Tout échange inter-agents porte son référentiel temporel. Un message
> sans origine datée n'est pas une information : c'est une rumeur.

### 4. Temps opposable — *EthicChain*

Le journal Merkle-like ne sert pas à prouver que le système a eu raison. Il sert à
rendre possible la démonstration qu'il a eu tort. **Une trace n'a de valeur que si elle
peut accuser celui qui la produit.**

> **Engagement.** Le journal est antérieur à la décision, jamais reconstruit après coup.
> Un audit produit à la demande n'est pas un audit.

---

## III. Ce que nous affirmons

**5. Une intelligence publique doit vieillir en public.**
Les versions successives, leurs écarts, leurs régressions sont des biens communs. Un
système qui ne publie que sa version courante demande qu'on lui fasse confiance sur son
passé.

**6. L'oubli est un droit, pas un défaut.**
Le Z-temps n'est pas l'accumulation totale. Minimisation RGPD et mémoire fractale ne
s'opposent pas : la question n'est pas *combien de temps garde-t-on*, mais *qui décide
de la durée, et cette décision est-elle inscrite*.

**7. La lenteur est une fonction de sécurité.**
Certaines décisions doivent coûter du temps. Un système capable de tout faire
instantanément est un système dont aucune erreur n'est rattrapable. Le délai
délibéré — fenêtre de contestation, temps de rollback, période d'observation — est un
composant d'architecture, pas une dette de performance.

**8. Reproductible signifie rejouable.**
« Open source » ne suffit pas. Un artefact n'est vérifiable que si l'on peut rejouer la
séquence qui l'a produit : mêmes entrées, même état, même horloge logique, même sortie.
C'est le critère minimal que se donne ce projet.

---

## IV. Ce qui est établi, ce qui reste à prouver

Ce manifeste est un texte de position. Il serait contraire à son propre article 4 de
présenter ses ambitions comme des résultats.

| Élément | Statut à la date de cette v1 |
| --- | --- |
| Mémoire fractale 4 couches | Décrite dans le white paper, POC revendiqué |
| ΔM11.3 (rollback anti-entropie) | Décrit, mécanisme non publié en détail |
| PolyResonator (+20 % cohérence, +15 % stabilité) | Chiffres issus du white paper, protocole de mesure non publié |
| Glyphnet / format `.zgs` | Spécifié comme format de blocs glyphiques, spécification publique à produire |
| EthicChain | Journal Merkle-like décrit, implémentation de référence à publier |
| Les quatre régimes du Z-temps | **Position théorique — c'est l'objet de ce document, rien de plus** |

Les chiffres cités proviennent du white paper de ce dépôt et n'ont pas été reproduits de
façon indépendante. Ils sont rapportés comme revendications, pas comme mesures validées.

---

## V. Engagements opérationnels

Pour que ce qui précède ne reste pas déclaratif, la v1 engage le projet sur cinq points
vérifiables :

1. **Horloge logique explicite.** Tout artefact produit par Zoran porte un identifiant
   d'état et un horodatage logique reproductible.
2. **Politique de rétention par couche.** Chaque couche mémoire publie sa durée, sa règle
   d'érosion et son responsable.
3. **Point de retour obligatoire.** Toute opération structurante déclare son coût de
   rollback avant exécution.
4. **Journal antérieur.** L'écriture EthicChain précède l'effet ; un effet sans écriture
   préalable est un incident, traité comme tel.
5. **Publication des régressions.** Les écarts entre versions sont publiés, y compris
   défavorables.

---

## VI. Feuille de route du Z-temps

Alignée sur la feuille de route générale du white paper (2025-2026 consolidation POC,
2027-2030 industrialisation multi-agents, 2030-2035 adoption institutionnelle, 2040
cible) :

- **v1 — ce document.** Position théorique, vocabulaire, engagements.
- **v2.** Spécification de l'horloge logique et du format d'horodatage des artefacts.
- **v3.** Protocole de mesure reproductible pour les métriques PolyResonator, permettant
  la vérification indépendante des chiffres cités en section IV.
- **v4.** Implémentation de référence EthicChain avec jeu de tests d'opposabilité.

---

## VII. Clause de révision

Ce manifeste s'applique à lui-même. Il est versionné, ses révisions sont publiques, et
les positions abandonnées restent lisibles dans l'historique plutôt que d'être
réécrites. Un manifeste sur le temps qui effacerait son propre passé se réfuterait
seul.

---

*Zoran 2040 aSiM — vers une super-intelligence publique, éthique et résiliente.*
*Manifeste du Z-temps, v1.0 — document ouvert, contributions par pull request.*
