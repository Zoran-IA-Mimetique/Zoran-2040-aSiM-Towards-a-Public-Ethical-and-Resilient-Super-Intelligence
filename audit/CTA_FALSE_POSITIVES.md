# CTA_FALSE_POSITIVES — Risques de faux CTA et garde-fous

mission : ZORAN_CTA_CLICKABLE_RUNTIME_V13_20260517

## Définition

Un "faux positif" CTA est un objet UX cliquable qui :
- ne mérite pas l'attention qu'il consomme,
- détourne le lecteur de l'information principale,
- ou crée une attente de profondeur que le popup ne tient pas.

## Sources connues de faux positifs

### 1. Fallback heuristique sur texte sans signal

Pattern : LLM émet 0 markers, le fallback heuristique injecte 2-3 markers
sur des matches regex (normes, verbes d'action, étapes).

Risques :
- Une phrase comme "Vérifier la météo" peut être marquée comme CTA terrain
  alors qu'elle est anodine.
- Une norme citée en passant (`NF P 03-001` mentionnée pour info) devient
  un CTA monitor cliquable qui ne mène à rien.

Garde-fou actuel :
- Fallback désactivé si `text.includes('{cta:')` (LLM a fourni ≥ 1 marker)
- Cap maxCount=3 sur le fallback
- Démotion en popup minimal "Pas de détail technique fourni — relance
  pour approfondir" qui signale honnêtement le manque d'enrichissement

À mesurer : fast_close_rate sur les CTAs issus du fallback. Si > 50%,
le fallback est plus nuisible qu'utile → désactiver par défaut.

### 2. LLM qui surcharge en CTAs

Pattern : Sonnet, surstimulé par le prompt, émet 6-8 markers.

Garde-fou : priority engine cap à 3. Les 3-5 markers en surplus sont
**démotés en texte** (pas supprimés). L'information reste lisible.

À mesurer : ratio markers_emitted / markers_kept sur les réponses LLM.
Si moyenne > 2 (≥ 6 markers émis pour 3 gardés), c'est un signal que le
prompt sur-incite.

### 3. CTA décoratif (vide de contenu opérationnel)

Pattern : `{cta:terrain|label=Faire attention}` sans cout, délai, preuve, risque.

Pénalité dans le scoring : `richness × 0.1`. Un CTA sans aucun champ
rempli reçoit un bonus de 0. Avec 5 champs remplis, +0.5. Différence
suffisante pour départager deux CTAs de même type/criticité.

Garde-fou popup : si tous les champs cout/delai/preuve/risque sont vides,
la table n'apparaît pas (skip render `<table>`). Le popup affiche
uniquement badges + label + accordion vide. Signal visuel d'incomplétude.

### 4. Type mal attribué par le LLM

Pattern : `{cta:terrain|...}` alors que l'action est en réalité juridique
(opposabilité, délai légal).

Pas de garde-fou automatique — c'est une dérive sémantique que seul
un LLM-critic pourrait détecter. À surveiller via review humaine sur
échantillon de 20 réponses.

### 5. Imbrication de markers (parser bug potentiel)

Pattern : `{cta:terrain|label=Étude {cta:falsif|...} contradictoire}`.

Garde-fou parser : regex non-greedy `\{cta:\s*([^}]+?)\s*\}` capture
jusqu'au premier `}`, donc le marker interne est mal capturé mais le
marker externe est break. Pas idéal mais ne crash pas.

Garde-fou fallback : `if (match.includes('{cta:')) return match` ignore
les matches déjà imbriqués.

## Métriques à observer

| Métrique | Seuil sain | Seuil critique |
|---|---|---|
| `opens` per session | 1-3 par réponse | > 5 par réponse |
| `ask_rate` | > 25% des opens | < 10% (faux positif) |
| `fast_close_rate` (< 800ms) | < 20% | > 40% (mauvais ciblage) |
| `dwell_ms` moyen | 4-15s | < 2s (vide) ou > 60s (mur de texte) |

## Test empirique à faire

Lancer 10 questions ZORAN variées (5 BTP, 3 IA, 2 médecine) avec API key
active, mesurer :
- Nombre moyen de markers émis par le LLM
- Nombre moyen kept par priority engine
- Type distribution (terrain vs falsif vs ...)
- ask_rate et fast_close_rate après 30 min d'usage

Si ask_rate < 10% ou fast_close_rate > 40% → revoir le seuil cap et/ou
désactiver le fallback heuristique en production.

## Garde-fou ultime (à implémenter si besoin)

Toggle utilisateur : `localStorage['zoran_cta_v13_enabled']` (default true).
Permet de désactiver complètement les boutons CTA si l'expérience devient
nuisible — les markers seraient juste rendus en texte simple.

Statut : pas implémenté (premature optimization tant que pas mesuré).
