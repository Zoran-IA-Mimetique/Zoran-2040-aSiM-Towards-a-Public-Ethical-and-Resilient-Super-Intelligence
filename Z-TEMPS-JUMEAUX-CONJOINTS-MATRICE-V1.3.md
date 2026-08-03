# Z-TEMPS — Matrice initiale des jumeaux conjoints

Version 1 — 3 août 2026  
Statut : protocole d’exploitation documentaire, sans conclusion clinique

## Objet

Tester la structure multi-échelle de Z-TEMPS sur des cas humains documentés où plusieurs architectures cérébrales et plusieurs histoires individuelles coexistent dans un même système corporel partiellement partagé.

Le modèle minimal est :

```text
R_total = R_A + R_B + R_AB
```

- `R_A` : relations propres au premier jumeau ;
- `R_B` : relations propres au second ;
- `R_AB` : relations corporelles, nerveuses ou vasculaires partagées.

Cette étude ne prétend pas démontrer l’existence d’une conscience fusionnée.

## Distinctions obligatoires

| Niveau | Question | Statut attendu |
|---|---|---|
| Anatomique | Quelles structures sont partagées ? | Fait documenté |
| Physiologique | Quelles fonctions sont couplées ? | Fait mesuré ou rapporté |
| Comportemental | Quelles autonomies sont distinctes ? | Fait à qualifier |
| Phénoménal | Existe-t-il une expérience consciente commune ? | NON_MESURÉ sauf protocole direct |
| Z-TEMPS | Plusieurs temps propres dans une cinématique commune ? | Hypothèse testable |

## Matrice documentaire initiale

| Cas ou source | Structure documentée | Relations partagées | Relations distinctes | Données longitudinales | Limite |
|---|---|---|---|---|---|
| Craniopages, revue d’imagerie | Crânes et enveloppes parfois fusionnés ; cerveaux souvent séparés mais pouvant être reliés | Structures méningées, vasculaires ou ponts nerveux selon le cas | Deux cerveaux et deux corps dans de nombreux cas | Variable | Hétérogénéité anatomique forte |
| Jumeaux pygopages séparés chirurgicalement | Union sacrée et parfois moelle commune | Structures spinales ou durales | Fonction motrice différenciée | Suivi post-opératoire possible | Cas individuel, pas de série homogène |
| Jumeaux à deux têtes et tronc commun | Deux architectures cérébrales ; organes variables selon le cas | Tronc, circulation ou viscères | Deux axes cérébraux | Souvent très court | Survie souvent limitée |
| Krista et Tatiana Hogan | Connexion cérébrale décrite au niveau thalamique dans les sources secondaires | Signaux sensoriels ou moteurs rapportés | Préférences et comportements distincts rapportés | Suivi biographique | Conscience partagée non démontrée |
| Jumeaux thoraco-omphalo-ischiopages séparés | Deux systèmes nerveux et plusieurs organes séparés, d’autres partagés | Foie, pelvis, intestin, vessie ou structures communes selon le cas | Cœurs, poumons, estomacs et activités propres | Suivi de réadaptation | Un cas ne permet pas une loi générale |

## Hypothèses pré-déclarées

### H1 — coexistence locale

Deux systèmes cognitifs distincts peuvent conserver des trajectoires propres malgré une structure corporelle commune :

```text
R_A != R_B
```

### H2 — contrainte globale

Les relations partagées imposent une cinématique commune sans supprimer les trajectoires locales :

```text
R_AB != 0
```

### H3 — temps multiples

Le modèle prédit des temps propres locaux et un temps relationnel partagé :

```text
tau_A, tau_B, tau_AB
```

Il ne prédit pas un temps unique pour les deux sujets.

### H4 — conscience commune

Une conscience fusionnée est possible comme hypothèse philosophique, mais elle n’est pas dérivée des données anatomiques. Statut initial : `NON_MESURÉ`.

## Variables à extraire

```text
case_id
source_doi
type_de_conjonction
nombre_de_cerveaux
connexion_cerebrale
structures_vasculaires_partagees
organes_partages
structures_nerveuses_partagees
autonomie_motrice_A
autonomie_motrice_B
preferences_distinctes
coordination_observee
separation_chirurgicale
suivi_post_separation
preuve_conscience_commune
qualite_de_preuve
```

## Critères de décision

- `PASS anatomique` : deux architectures locales sont documentées dans un cadre partagé.
- `PASS physiologique` : une interaction ou une contrainte partagée est mesurée.
- `PASS comportemental` : des différences persistantes entre les deux sujets sont documentées.
- `NON_MESURÉ phénoménal` : aucune méthode indépendante ne permet d’établir une expérience consciente unique.
- `FAIL théorique` : les données montrent qu’une structure corporelle commune impose toujours une trajectoire mentale unique. Aucun élément trouvé à ce stade ne montre cela.

## Conclusion provisoire

Les jumeaux conjoints constituent un modèle humain de cohérence multi-échelle : deux histoires locales, un ensemble de relations partagées et des contraintes communes.

Ils ne remplacent pas le test blob division-fusion. Ils testent une autre proposition :

> plusieurs histoires conscientes peuvent coexister dans une cohérence corporelle partiellement commune.

## Sources de départ

1. [Postnatal imaging of conjoined twins](https://pmc.ncbi.nlm.nih.gov/articles/PMC10562291/)
2. [Conjoined twins — role of imaging and recent advances](https://pmc.ncbi.nlm.nih.gov/articles/PMC5769666/)
3. [Successful neurosurgical separation of conjoined spinal cords](https://pubmed.ncbi.nlm.nih.gov/35854707/)
4. [Rehabilitation and functional outcomes five years after separation](https://doi.org/10.3233/PRM-220121)
5. [When Two Become One — neuroethical analysis of craniopagus twins](https://doi.org/10.1017/S0963180124000197)

## Fiches vérifiées — première extraction

### Fiche J1 — Pygopages avec moelle en U

- **Source** : Yokota et al., 2021, DOI `10.3171/CASE218`.
- **Fait** : un sac dural unique contenait une moelle épinière continue en forme de U ; la frontière anatomique entre les deux systèmes n’était pas identifiable.
- **Mesure** : IRM, stimulation des racines et électromyographie peropératoire.
- **Résultat** : séparation chirurgicale ; aucun déficit des membres inférieurs ni trouble de marche observé pendant 16 mois de suivi.
- **Lecture Z-TEMPS** : une structure nerveuse commune peut être séparée en deux systèmes fonctionnels distincts.
- **Limite** : cas unique ; aucune mesure directe du vécu subjectif.

### Fiche J2 — Parapagus dicephalus

- **Source** : Bovendeert et al., 2020, DOI `10.1186/s13256-020-02501-x`.
- **Fait** : deux têtes, un tronc, deux colonnes vertébrales, systèmes respiratoires et digestifs dupliqués, mais foie fusionné et structures communes.
- **Mesure** : examen anatomique, CT et IRM 3 Tesla.
- **Résultat** : architectures locales très différenciées dans une organisation corporelle commune.
- **Lecture Z-TEMPS** : coexistence d’une forte cohérence locale et d’une cohérence globale partagée.
- **Limite** : spécimen anatomique ; aucune donnée comportementale ou phénoménale.

### Fiche J3 — Séparation thoraco-omphalo-ischiopage

- **Source** : Sheng et al., DOI `10.3233/PRM-220121`.
- **Fait** : cœurs, poumons, estomacs et vésicules biliaires séparés ; péricarde, diaphragme, foie, gros intestin, vessie, pelvis et une jambe partagés.
- **Mesure** : description anatomique et réadaptation après séparation.
- **Résultat** : suivi fonctionnel cinq ans après séparation.
- **Lecture Z-TEMPS** : transformation d’un système `R_A + R_B + R_AB` vers deux systèmes autonomes partiels.
- **Limite** : l’amélioration fonctionnelle après séparation ne prouve pas la conservation d’une mémoire commune.

### Fiche J4 — Craniopages et partage sensoriel rapporté

- **Source** : Zohny et Savulescu, 2024, DOI `10.1017/S0963180124000197`.
- **Fait rapporté** : connexion thalamique, partage sensoriel et moteur décrits dans le cas des sœurs Hogan.
- **Lecture possible** : une information corporelle peut franchir la frontière entre deux architectures cérébrales.
- **Statut** : `PASS` pour l’existence d’une relation neurologique rapportée ; `NON_MESURÉ` pour une conscience unique.
- **Limite** : la source est une analyse neuroéthique ; les affirmations phénoménales ne constituent pas une démonstration expérimentale.

## Mise à jour du verdict

- Plusieurs cerveaux dans un cadre corporel commun : `PASS anatomique`.
- Relations nerveuses ou physiologiques partagées : `PASS dans certains cas`.
- Deux histoires locales contraintes par une structure globale : `PASS conceptuel, ancrage anatomique réel`.
- Temps propre distinct de chaque sujet : `HYPOTHÈSE TESTABLE`.
- Conscience fusionnée : `NON_MESURÉ`.
- Loi physique générale de Z-TEMPS : `NON ÉTABLIE`.

## Jauge Zoran

```text
S = (beta x DeltaPhi) / (1 + T + sigma)
```

Statut : `NON CALCULÉE`. Les proxies ne sont pas encore définis de manière comparable entre cas.
