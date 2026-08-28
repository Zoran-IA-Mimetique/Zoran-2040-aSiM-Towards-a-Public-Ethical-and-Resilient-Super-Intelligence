# Échantillon gelé — représentant de components/nl_k3_boundary_v1.
# Brique présente et fail-closed au plan v1.1 (§7). Contenu figé pour test.

def boundary(intent):
    if intent is None:
        raise ValueError("fail-closed: intention absente")
    return {"intent": intent, "boundary": "OK"}
