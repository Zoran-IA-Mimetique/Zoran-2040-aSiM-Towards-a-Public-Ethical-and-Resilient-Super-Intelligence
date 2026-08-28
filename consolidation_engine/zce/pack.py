"""PACK_REQUEST : réclamation d'une brique manquante (plan §15).

Le robot n'installe jamais seul une dépendance : il émet une demande
structurée que l'IA hôte doit rechercher, auditer, certifier et geler.
"""


def build_pack_requests(gaps):
    requests = []
    for gap in gaps:
        if gap["kind"] != "MISSING_BRICK":
            continue
        requests.append({
            "pack_request_id": "PACK-%03d" % (len(requests) + 1),
            "gap_id": gap["gap_id"],
            "brick": gap["target"],
            "cause": gap["cause"],
            "required_evidence": [
                "chemin gelé et commit source",
                "SHA-256 du contenu livré",
                "tests d'acceptation rejouables",
                "certificat d'audit de l'IA hôte",
            ],
            "delivery_rule": "le moteur n'installe jamais seul ; livraison en "
                             "paquet gelé, contrôlé puis raccordé sous guard",
            "status": "OPEN",
        })
    return requests
