# Échantillon gelé — représentant de components/zoran_chat_runtime_v1.
# Cible CORRECT : scénario métier trop étroit, faits spécialisés codés en dur.

SPECIALIZED_FACTS = {"demo": "fait spécialisé à remplacer par le contexte ZMOS"}


def answer(question):
    return SPECIALIZED_FACTS.get(question, "ANSWER")
