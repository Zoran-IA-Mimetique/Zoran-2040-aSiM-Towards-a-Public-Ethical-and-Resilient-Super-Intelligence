# CTA_POPUP_CINEMATICS — Cinématique UX du popup typé

mission : ZORAN_CTA_CLICKABLE_RUNTIME_V13_20260517
fichier : `app/src/chat.js` (`openCtaPopup`, `renderCtaPopupBody`)
style   : `app/style.css` (sélecteurs `.zoran-cta-popup-*`)

## Cinématique

```
[click CTA bouton inline]
         ↓ (≤ 50ms)
[popup overlay s'ouvre, fade-in 150ms]
         ↓
[utilisateur lit niveau 1 (badges) + niveau 2 (table)]
         ↓
[option : déplier accordion niveau 3 (détail technique)]
         ↓
[choix : "Poser cette question" → relance / "Fermer" / ESC / click overlay]
         ↓
[popup ferme, métriques commit (asked / no_ask + dwell)]
```

## Positionnement

- **Desktop (≥ 720px)** : popup positionné `fixed` près de l'anchor (sous le
  bouton cliqué + 8px, clampé aux bords de l'écran)
- **Mobile (< 720px)** : popup centré dans le viewport (overlay flex center)

## Niveaux d'information

### Niveau 1 — Résumé (toujours visible)

```
[Badge type]  [Badge criticité]  [Badge slot]
LABEL DU CTA
```

Badges colorés par type (orange terrain, violet falsif, rouge risque,
bleu juridique, vert monitor). Permet identification immédiate du registre.

### Niveau 2 — Opérationnel (toujours visible si ≥ 1 champ rempli)

Table compacte 2 colonnes :

| Champ | Affichage |
|---|---|
| Coût | "3-5k€" |
| Délai | "4-6 sem" |
| Preuve | "Rapport opposable assurance" |
| Risque si non exécuté | "Refus indemnisation décennale" |

Lecture rapide : décision possible sans déplier le niveau 3.

### Niveau 3 — Détail technique (replié par défaut)

```html
<details>
  <summary>Détails techniques</summary>
  <div>{detail}</div>
</details>
```

Prose enrichie (2-4 phrases) avec normes, mécanismes, contre-indications.
Replié pour éviter overload — clic explicite pour déployer.

Si `detail` vide : message "Pas de détail technique fourni — relance pour
approfondir." (signal que le LLM n'a pas joué le jeu, ou que c'est un
fallback heuristique sans détail).

## Anti-bruit visuel

- Pas d'animation parasite (juste fade-in 150ms du overlay)
- Pas de glow, pas de pulse, pas d'emoji
- Couleurs accent uniquement sur badges (8-12px) et dot du bouton (6×6 px)
- Fond popup : `var(--bg-1)` (cohérent avec le thème global)
- Bordure popup : couleur du type tinté à 45% opacité

## Mode dégradé

Cas où le popup s'ouvre avec données minimales (fallback heuristique
sans champs riches) :
- Badges affichent type + crit (toujours présents)
- Pas de table opérationnelle (skip si 0 champ)
- Tech accordion remplacé par message "Pas de détail technique fourni"
- Bouton "Poser cette question" reste disponible → user peut creuser

L'expérience reste cohérente même quand le LLM n'a fourni que `label`.

## Accessibility

- `role="dialog"` + `aria-modal="true"` + `aria-label={label}`
- Focus trap : focus va sur le bouton "Fermer" à l'ouverture (à implémenter)
- ESC ferme + restaure focus sur l'anchor
- Click overlay (hors card) ferme
- Bouton "Fermer" + bouton "✕" en haut-droite (redondance volontaire)

Gap : Tab cycling dans le popup pas encore garanti.

## Risque cognitif identifié

**Surcharge si > 3 popups ouverts en cascade** : le système empêche
ce cas en supprimant tout popup existant avant d'en ouvrir un nouveau
(`document.querySelectorAll('.zoran-cta-popup-overlay').forEach(p => p.remove())`).

**Risque résiduel** : si l'utilisateur clique frénétiquement, métriques
`fast_close` (< 800ms) montent. À surveiller — si > 30% sur une session,
revoir le design.
