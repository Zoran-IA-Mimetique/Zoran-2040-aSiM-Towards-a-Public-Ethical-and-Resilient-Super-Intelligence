# ZORAN — Emergent Behaviors (massive stress test)

Mission : `ZORAN_MASSIVE_AUTONOMY_STRESS_TEST_AND_RUNTIME_SYNTHESIS_20260516`

## Découvertes émergentes (mode offline)

### 1. **Routes JAMAIS gagnantes** sur 50 prompts : Temporel. Hypothèse : sur-spécialisation ou heuristique mal calibrée.

### 2. **Corrélation Pearson hallucination × jargon_density** : r=-0.11 (n=320). Faible — pas de lien clair.

### 3. **Hallucination traps** (HAL-01, HAL-02) : winners = {'runtime_rapide': 1, 'frugale': 1}

## Caveat

Ces findings sont basés sur des HEURISTIQUES OFFLINE (pas d'appel LLM). La version live nécessiterait l'exécution réelle de 350 appels API (~0.25-2.50$ Anthropic).
