"""Hiérarchies déclarées — roulement (§13) et cellule batterie (§14).

Exécute les points 2 et 3 de l'ordre de travail verrouillé : construire les cas
jouets, **en gardant R2 antipodal comme relation diagnostique**.

Chaque cadre est déclaré tel que la lettre le décrit, et **rien de plus**. Là où
elle écrit `NON_MESURÉ`, le champ vaut `None` — jamais une valeur inventée pour
faire passer un critère. C'est la raison d'être du point 4 de l'ordre de
travail : « Geler les proxys, les seuils, les liens causaux et les données
manquantes avant calcul. »

Aucun calcul n'est fait ici. Ce module déclare ; `cadres.promouvoir` juge.
"""

from __future__ import annotations

from .cadres import CadreCausal, LienTransfert, RoleNiveau, Statut, Triplet

# --- §13 — Roulement ------------------------------------------------------

ROULEMENT = (
    CadreCausal(
        identifiant="R0 — Bille",
        role=RoleNiveau.LOCAL,
        frontiere="intégrité de la bille et roulement local",
        fonction="porter la charge au contact",
        proxys=("géométrie", "R0_fissure", "piqûre", "dureté", "R0_temperature_contact"),
        triplet=Triplet(
            operant="charge, rotation, contact, frottement",
            operande="bille",
            opere="nouvel état géométrique et endommagé",
        ),
        causalite_testable=("R1 — Voisinage",),
        invariants=("seuil de fissuration", "seuil de température de contact"),
        effets_causaux={
            "géométrie": "EFFET_GEOMETRIE_BILLE",
            "R0_fissure": "EFFET_FISSURATION",
            "piqûre": "EFFET_PIQURE",
            "dureté": "EFFET_DURETE",
            # Même effet causal que R1 : la chaleur CIRCULE du contact vers le
            # voisinage. Le transfert déclaré empêche de le compter deux fois.
            "R0_temperature_contact": "EFFET_CHALEUR_CONTACT",
        },
        note="La lettre le classe « à instrumenter » : les proxys sont "
        "candidats, leur calibration reste NON_MESURÉE.",
    ),
    CadreCausal(
        identifiant="R1 — Voisinage",
        role=RoleNiveau.VOISINAGE_RELATIONNEL,
        frontiere="contacts immédiats : billes adjacentes, cage, segments de "
        "pistes, film lubrifiant",
        fonction="répartir la charge entre contacts voisins",
        proxys=(
            "charge locale",
            "glissement",
            "vibration",
            "R1_epaisseur_film",
            "R1_temperature_voisinage",
        ),
        triplet=Triplet(
            operant="charge, lubrification, désalignement",
            operande="billes voisines, cage, pistes, lubrifiant",
            opere="nouvel état de contact et de film",
        ),
        causalite_testable=("R0 — Bille", "R3 — Roulement complet"),
        invariants=("épaisseur minimale de film", "seuil de glissement"),
        effets_causaux={
            "charge locale": "EFFET_CHARGE_LOCALE",
            "glissement": "EFFET_GLISSEMENT",
            "vibration": "EFFET_VIBRATION_LOCALE",
            "R1_epaisseur_film": "EFFET_FILM",
            "R1_temperature_voisinage": "EFFET_CHALEUR_CONTACT",
        },
        note="ARBITRÉ par l'auteur : R0_temperature_contact et "
        "R1_temperature_voisinage ont la même dimension physique mais ne sont "
        "pas la même observable. Elles restent séparées, et le lien est décrit "
        "comme un transfert causal (voir proxys.TRANSFERTS_ROULEMENT) plutôt "
        "que comme un partage de variable. Les fusionner créerait un double "
        "comptage ou une perte d'information.",
    ),
    CadreCausal(
        identifiant="R2 — Relation antipodale",
        role=RoleNiveau.RELATION_DIAGNOSTIQUE,
        frontiere=None,  # NON_MESURÉ : aucun protocole n'isole le secteur opposé
        fonction="comparer secteur chargé et secteur opposé",
        proxys=("phase", "ovalisation", "transfert par bagues", "asymétrie"),
        triplet=None,  # NON_MESURÉ
        causalite_testable=(),  # NON_MESURÉ : causalité distincte non testée
        invariants=(),  # NON_MESURÉ
        note="§13 : « sous-graphe diagnostique par défaut ». La lettre exige un "
        "protocole isolant le secteur antipodal, mesurant ses variables "
        "propres et testant une causalité distincte. Rien de cela n'est "
        "acquis : R2 ne doit PAS être promu.",
    ),
    CadreCausal(
        identifiant="R3 — Roulement complet",
        role=RoleNiveau.ENGLOBANT,
        frontiere="transmission et tenue mécanique du roulement",
        fonction="transmettre la charge et tenir mécaniquement",
        proxys=("répartition de charge", "défauts", "vibration globale", "dissipation"),
        triplet=Triplet(
            operant="charge, rotation, régime",
            operande="roulement complet",
            opere="état vibratoire et thermique global",
        ),
        causalite_testable=("R1 — Voisinage", "R4 — Machine"),
        invariants=("seuil de vibration globale", "seuil de dissipation"),
        effets_causaux={
            "répartition de charge": "EFFET_REPARTITION",
            "défauts": "EFFET_DEFAUTS_GLOBAUX",
            "vibration globale": "EFFET_VIBRATION_GLOBALE",
            "dissipation": "EFFET_DISSIPATION",
        },
        note="Cadre système.",
    ),
    CadreCausal(
        identifiant="R4 — Machine",
        role=RoleNiveau.SUPERIEUR,
        frontiere="arbre, logement, alignement, charge, vitesse, commande, "
        "lubrification",
        fonction="commander et soutenir le roulement",
        proxys=("désalignement", "régime", "arrêt", "maintenance"),
        triplet=Triplet(
            operant="commande, maintenance, conditions d'usage",
            operande="arbre, logement, alignement",
            opere="conditions imposées au roulement",
        ),
        causalite_testable=("R3 — Roulement complet",),
        invariants=("seuil de désalignement", "régime maximal admissible"),
        effets_causaux={
            "désalignement": "EFFET_DESALIGNEMENT",
            "régime": "EFFET_REGIME",
            "arrêt": "EFFET_ARRET",
            "maintenance": "EFFET_MAINTENANCE",
        },
        note="Cadre supérieur causal requis.",
    ),
    CadreCausal(
        identifiant="R5 — Planète",
        role=RoleNiveau.PLANETE,
        frontiere="conséquences de décision",
        fonction="borner la décision par ses effets matériels",
        proxys=(),  # NON_MESURÉ dans PRONOSTIA
        triplet=None,  # NON_MESURÉ
        causalite_testable=(),  # NON_MESURÉ
        invariants=(),  # NON_MESURÉ
        note="§13 : « NON_MESURÉ dans PRONOSTIA ». §15 : le cadre planétaire "
        "n'est ajouté que si la chaîne d'effets l'atteint réellement, et "
        "n'est jamais injecté dans la RUL locale.",
    ),
)

#: Ce que chaque niveau non promu **reste**, selon la lettre (§12.1).
REPLIS_ROULEMENT = {
    "R2 — Relation antipodale": Statut.RELATION,
    "R5 — Planète": Statut.NON_MESURE,
}

# --- §14 — Cellule batterie ----------------------------------------------

BATTERIE = (
    CadreCausal(
        identifiant="B0 — Cellule",
        role=RoleNiveau.LOCAL,
        frontiere="stockage électrochimique local",
        fonction="stocker et restituer l'énergie localement",
        proxys=("capacité", "tension", "impédance", "gonflement"),
        triplet=Triplet(
            operant="courant, température, cyclage",
            operande="cellule",
            opere="nouvel état de capacité et d'impédance",
        ),
        causalite_testable=("B1 — Voisines",),
        invariants=("seuil de capacité", "seuil de gonflement"),
        effets_causaux={
            "capacité": "EFFET_CAPACITE",
            "tension": "EFFET_TENSION",
            "impédance": "EFFET_IMPEDANCE",
            "gonflement": "EFFET_GONFLEMENT",
        },
        note="Cadre local.",
    ),
    CadreCausal(
        identifiant="B1 — Voisines",
        role=RoleNiveau.VOISINAGE_RELATIONNEL,
        frontiere="couplage thermique et électrique proche",
        fonction="propager ou absorber les écarts entre cellules voisines",
        proxys=(
            "gradient thermique",
            "propagation",
            "équilibrage",
            "résistance d'interconnexion",
        ),
        triplet=Triplet(
            operant="courant commun, chaleur, équilibrage",
            operande="cellules voisines et interconnexions",
            opere="nouvel état thermique et de dispersion",
        ),
        causalite_testable=("B0 — Cellule", "B2 — Pack"),
        invariants=("gradient thermique maximal", "seuil de propagation"),
        effets_causaux={
            "gradient thermique": "EFFET_GRADIENT_THERMIQUE",
            "propagation": "EFFET_PROPAGATION",
            "équilibrage": "EFFET_EQUILIBRAGE",
            "résistance d'interconnexion": "EFFET_INTERCONNEXION",
        },
        note="Cadre causal pertinent.",
    ),
    CadreCausal(
        identifiant="B2 — Pack",
        role=RoleNiveau.ENGLOBANT,
        frontiere="fonction collective de stockage et fourniture",
        fonction="fournir la puissance et l'énergie demandées",
        proxys=("dispersion SOC/SOH", "points chauds", "cellule limitante"),
        triplet=Triplet(
            operant="courant commun, usage, thermique",
            operande="ensemble des cellules et du pack",
            opere="état collectif de disponibilité",
        ),
        causalite_testable=("B1 — Voisines", "B3 — Régulateur"),
        effets_causaux={
            "dispersion SOC/SOH": "EFFET_DISPERSION",
            "points chauds": "EFFET_POINTS_CHAUDS",
            "cellule limitante": "EFFET_CELLULE_LIMITANTE",
        },
        invariants=(
            "sortie de la cellule limitante — verrou non compensable (§14)",
        ),
        note="« Les bonnes cellules ne compensent pas cette sortie. » Un seul "
        "invariant critique violé suffit à sortir du noyau de viabilité (§11).",
    ),
    CadreCausal(
        identifiant="B3 — Régulateur",
        role=RoleNiveau.SUPERIEUR,
        frontiere="boucle BMS + chargeur + usage/charge commandée",
        fonction="commander la charge, l'équilibrage et la coupure",
        proxys=("seuils", "coupure", "estimation", "consigne", "erreur capteur"),
        triplet=Triplet(
            operant="algorithme de commande, consignes, capteurs",
            operande="pack et cellules",
            opere="courants, coupures et états commandés",
        ),
        causalite_testable=("B2 — Pack",),
        invariants=("seuil de coupure", "erreur capteur maximale admissible"),
        effets_causaux={
            "seuils": "EFFET_SEUILS_BMS",
            "coupure": "EFFET_COUPURE",
            "estimation": "EFFET_ESTIMATION",
            "consigne": "EFFET_CONSIGNE",
            "erreur capteur": "EFFET_ERREUR_CAPTEUR",
        },
        note="§0 : « Le régulateur est une boucle causale, pas seulement un "
        "contenant plus grand. »",
    ),
    CadreCausal(
        identifiant="B4 — Planète",
        role=RoleNiveau.PLANETE,
        frontiere="conséquences de fabrication, usage, réemploi et fin de vie",
        fonction="borner la décision de remplacer, fabriquer ou jeter",
        proxys=(),  # partiellement ou NON_MESURÉ
        triplet=None,  # NON_MESURÉ
        causalite_testable=(),  # NON_MESURÉ
        invariants=(),  # NON_MESURÉ
        note="§14 : « Partiellement ou NON_MESURÉ ». §15 : requis seulement pour "
        "décider remplacer / fabriquer / jeter ; sinon NON_MESURÉ.",
    ),
)

REPLIS_BATTERIE = {
    "B4 — Planète": Statut.NON_MESURE,
}


#: Transferts déclarés — un effet qui CIRCULE n'est pas deux dettes indépendantes.
TRANSFERTS_ROULEMENT_CADRES = (
    LienTransfert(
        source="R0 — Bille",
        cible="R1 — Voisinage",
        effet_causal="EFFET_CHALEUR_CONTACT",
    ),
)

TRANSFERTS_BATTERIE_CADRES: tuple[LienTransfert, ...] = ()
