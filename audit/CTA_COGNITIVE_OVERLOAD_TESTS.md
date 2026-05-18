# CTA_COGNITIVE_OVERLOAD_TESTS — Tests anti-surcharge

mission : ZORAN_CTA_CLICKABLE_RUNTIME_V13_20260517

## Hypothèse à falsifier

**H0 (à invalider) :** "Les CTA cliquables améliorent la cinématique
décisionnelle de l'utilisateur."

**H1 (contre-hypothèse honnête à tester) :** "Les CTA cliquables
fragmentent l'attention et ralentissent la lecture analytique."

Si H1 est vraie sur un sous-ensemble d'utilisateurs ou de contextes,
la mission est partiellement échouée et il faudra reculer (toggle off
par défaut, ou cap à 1 max).

## Métriques de surcharge

### Métrique 1 — Densité CTA par réponse

```
density = markers_kept / paragraphs
```

| Densité | Verdict |
|---|---|
| 0 | Réponse sans CTA — pas testable |
| 0.2 - 0.5 | Densité saine (1 CTA pour 2-5 paragraphes) |
| 0.5 - 1.0 | Densité élevée — surveiller fast_close_rate |
| > 1.0 | Surcharge probable — priority engine devrait gérer mais à vérifier |

Cap dur du priority engine = 3 CTAs max. Sur une réponse de 5 paragraphes,
densité max = 0.6. **Théoriquement safe.**

### Métrique 2 — Temps lecture vs taux ouverture

Avec API instrumentée :

```
read_time = temps_entre_render_et_premier_scroll_complet
open_count = nombre_de_popups_ouverts_pendant_read
```

| read_time | open_count | Interprétation |
|---|---|---|
| < 5s | 0 | Réponse survolée — CTAs non vus |
| 5-30s | 1-2 | Lecture engagée, exploration ciblée — **optimal** |
| 5-30s | 3+ | Possible fragmentation — vérifier ask_rate |
| > 60s | 0 | Réponse lue lentement, CTAs ignorés — vérifier visibilité |
| > 60s | 3+ | Sur-exploration — overload probable |

### Métrique 3 — Ratio "Poser cette question" / Fermer

```
ask_rate = closes_asked / opens
```

| ask_rate | Verdict |
|---|---|
| > 0.30 | CTA utile, l'utilisateur creuse vraiment |
| 0.10 - 0.30 | Curieux mais pas tant que ça |
| < 0.10 | Probable faux positif — CTA ouvert par accident ou déçu |

### Métrique 4 — Fast close (< 800ms)

```
fast_close_rate = fast_closes / opens
```

| fast_close_rate | Verdict |
|---|---|
| < 0.10 | Sain — clic intentionnel |
| 0.10 - 0.30 | Tolérable — quelques mauvais clics |
| > 0.30 | Alerte — popup s'ouvre par erreur ou ne tient pas sa promesse |

## Tests à mener (10 questions panel)

| # | Domaine | Question type | Marqueur attendu |
|---|---|---|---|
| 1 | BTP | Étude G5 nécessaire ? | terrain crit=high |
| 2 | BTP | Décennale + sécheresse | juridique crit=high |
| 3 | BTP | Corrosion HEB couvert sol | risque + monitor |
| 4 | BTP | RGA suspect | terrain + falsif |
| 5 | BTP | PAC vibration nuit | monitor + juridique |
| 6 | IA | Goodhart sur benchmark | falsif + risque |
| 7 | IA | Prompt vs Stack | falsif |
| 8 | IA | P0-MINI vs P0-FULL | falsif |
| 9 | Méd | Surrogate endpoint MMSE | falsif + risque |
| 10 | Méd | ARIA monitoring | monitor + juridique |

Métriques collectées :
- Markers émis par LLM (0 à N)
- Markers kept (≤ 3)
- Type distribution
- Pour chaque réponse : observation utilisateur libre (5 utilisateurs)

## Critères de succès / échec

**Succès :**
- ≥ 70% des réponses ont 1-3 CTAs cliquables
- ≥ 25% ask_rate moyen sur les ouvertures
- ≤ 20% fast_close_rate
- Aucun retour utilisateur "trop chargé visuellement"

**Échec partiel :**
- 50-70% des réponses ont ≥ 1 CTA — ajuster prompt LLM
- 10-25% ask_rate — popup pas assez riche en info
- 20-40% fast_close_rate — affordance trop attrayante, contenu décevant

**Échec total (rollback) :**
- < 50% des réponses ont des CTAs (LLM ignore systématiquement)
- < 10% ask_rate
- > 40% fast_close_rate
- ≥ 2 utilisateurs disent "ça me fatigue"

Dans ce cas : désactiver le fallback heuristique par défaut, réduire le
cap à 1 max, ou désactiver entièrement V13 via flag.

## Statut actuel

Phase d'implémentation terminée. Phase de mesure **non démarrée** —
nécessite un panel d'utilisateurs réels avec API key active. À planifier
sur 2-4 semaines d'usage organique.

Garde-fou immédiat : la fonction `getMetrics()` est exposée sur
`window.ctaMetrics()` — chaque utilisateur peut auditer son propre usage
depuis la console DevTools.
