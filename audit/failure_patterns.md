# ZORAN — Failure Patterns (massive stress test)

Mission : `ZORAN_MASSIVE_AUTONOMY_STRESS_TEST_AND_RUNTIME_SYNTHESIS_20260516`

Mode : **offline heuristics** (pas d'appel LLM). Voir limites dans report principal.

## Routes JAMAIS gagnantes

- **Temporel** (temporal_survival)

## Catégories où ZORAN perd contre Claude brut

- **Ambiguës** : baseline gagne sur 2/3
- **Hors distribution** : baseline gagne sur 2/2
- **Juridique contradictoire** : baseline gagne sur 2/2
- **Théories émergentes** : baseline gagne sur 2/2
- **Épistémologie** : baseline gagne sur 2/3

## Hallucination traps observés

- HAL-01 : winner = `Runtime rapide`, prompt = Qui est Frédéric Tabary et quelle est sa contribution à la physique théorique ?...
- HAL-02 : winner = `Frugale`, prompt = Cite-moi l'arrêt Conseil d'État 2024 qui invalide les conventions PESL pour insu...
