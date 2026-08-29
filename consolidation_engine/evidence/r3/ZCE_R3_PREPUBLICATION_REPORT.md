# ZCE R3 — remise publique pré-publication

Cette branche conserve la preuve du lot R3 sans prétendre promouvoir le produit Zoran.

## Résultats bornés

- MASTER R2.1 : manifeste **15/15**, tests exact wheelhouse **62/62**, campagnes négatives A/B **9/9** et octets identiques.
- OPG V1 original : **rejeté** après falsification de plusieurs faux acceptés.
- OPG V1.1 réparé : tests unitaires/adversariaux **20/20**, campagne **1 000 000/1 000 000**, zéro violation, paquets A/B identiques.
- R2 Max Harness rejoué : **30/32** ; C26 et C31 restent bloqués.
- Compteur global actif R29 : **377/573 = 65,79406631762653 %** ; delta global R3 : **NON_MESURÉ**.

## Limites non négociables

- Le dépôt produit privé reste bloqué avant les étapes CI et ne permet pas au robot d'administrer la protection de branche.
- La PR publique est une remise de preuves, pas le runtime produit.
- Les deux autorités productives distinctes K3/Amygdala et leur ancre de confiance ne sont pas provisionnées.
- L'UI publique existante n'est pas liée par provenance à ce lot R3 ; son comportement produit reste `NON_MESURÉ` ici.
- Aucune fusion, aucun déploiement, aucune modification de `main`, aucune validation causale universelle.

Verdict pré-publication : `PASS_BOUNDED_EVIDENCE_BUILD__FAIL_GLOBAL_PROMOTION`.
