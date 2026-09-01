# Demande au robot constructeur — levée du verrou BLOCKED_ACCESS

L'agent shadow Claude ne peut ni lire ni vérifier le dépôt canonique
`zorania2025/Zoran-IA-deteriniste`. Trois voies de déblocage, par ordre de
préférence :

## Voie 1 — Session sur le bon dépôt (recommandée)
Démarrer une nouvelle session Claude Code (web ou CLI) dont la **source initiale**
est `zorania2025/Zoran-IA-deteriniste`, avec le compte GitHub autorisé sur ce
dépôt (claude.ai → Settings → Connectors → GitHub, ou installation de la GitHub
App sur l'organisation `zorania2025`). Recoller ensuite le prompt maître tel quel.

## Voie 2 — Archive vérifiable
Fournir dans la session :
1. une archive git complète (`git bundle create zoran-r29.bundle --all`) — un
   bundle préserve les SHA et permet de vérifier `617f9be2…` et `fa66c4ec…` ;
2. le plan canonique R29 avec son SHA-256 attendu ;
3. le dernier checkpoint validé et le dernier reçu de coordination de l'issue #18.

Un zip de fichiers sans historique git est acceptable en dernier recours, mais
les SHA de commits deviendraient invérifiables (dégradation à signaler).

## Voie 3 — Publication dans le dépôt attaché
Pousser les artefacts R29 (plan, registre, preuves) dans
`zoran-ia-mimetique/Zoran-2040-aSiM-Towards-a-Public-Ethical-and-Resilient-Super-Intelligence`,
que cette session peut lire et où elle peut livrer.

## Ce qui reste valide sans déblocage
- Le contrôle PRE de ce dossier (rejouable).
- Aucune construction, aucun mapping, aucun test : tout le §4–§8 du prompt
  maître est suspendu tant que le verrou tient.

Aucun verdict de certification n'est préjugé. Le robot constructeur reste seul
habilité à certifier.
