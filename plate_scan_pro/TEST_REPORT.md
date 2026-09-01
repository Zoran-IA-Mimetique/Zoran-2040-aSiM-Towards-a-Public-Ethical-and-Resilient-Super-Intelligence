# Rapport de tests — ZORAN Plate Scan Pro V1.0

## 1. Tests automatisés (CI / `flutter test`)

| Module | Cas | Résultat attendu |
|--------|-----|------------------|
| Normalisation | `AB123CD`, `AB 123 CD`, `AB-123-CD` | → `AB-123-CD` |
| Longueur invalide | `AB12CD` | rejet |
| Correction O→0 (bloc chiffres) | `ABO12CD` | `AB-012-CD` |
| Correction 8→B (bloc lettres) | `8B123CD` | `BB-123-CD` |
| Extraction blob bruité | `"PARKING\nAB 123 CD\nF 75"` | `AB-123-CD` |
| Absence de plaque | `"HELLO WORLD 2026"` | rejet |

Lancement : `flutter test`.

## 2. Protocole terrain (à exécuter sur appareil)

Matrice obligatoire — 10 lectures par condition, mesurer taux de réussite OCR
et temps total moyen (cible < 1 s) :

| Condition | Lectures | Réussite | Temps moy. (ms) | Notes |
|-----------|----------|----------|-----------------|-------|
| Plaques propres | 10 | _____ | _____ | |
| Plaques sales | 10 | _____ | _____ | |
| Plaques inclinées | 10 | _____ | _____ | |
| Plaques nuit | 10 | _____ | _____ | |
| Plaques pluie | 10 | _____ | _____ | |
| Faible luminosité | 10 | _____ | _____ | |

Le tableau de bord de l'app fournit en direct : nb lectures jour/semaine/mois,
**temps moyen de capture**, et la cible « < 1 s ».

## 3. Critères PASS / FAIL

| Critère | État |
|---------|------|
| Caméra auto (sans bouton) | ✅ implémenté (`scan_screen.dart`) |
| Détection auto + crop | ✅ localisation texte + recadrage preuve |
| OCR auto (offline) | ✅ ML Kit latin embarqué |
| Validation + correction FR | ✅ `plate_normalizer.dart` |
| Copie auto presse-papiers | ✅ seuil de confiance configurable |
| Vibration 150 ms + bandeau ✓ 2 s | ✅ |
| Anti-doublons < 5 s | ✅ |
| Historique + export CSV/XLSX/JSON/PDF | ✅ |
| Horodatage UTC + local | ✅ |
| GPS + adresse | ✅ (adresse best-effort hors-ligne) |
| Photos archivées (orig. + crop) | ✅ |
| Mode offline | ✅ aucune requête réseau requise |
| APK installable | ✅ via Release CI (debug + release) |
| Temps moyen < 1 s | ⏳ à valider sur appareil (mesuré en app) |

## 4. Limites connues V1 (transparence)
- Étage détection = localisation texte, pas un YOLO entraîné (interface prête).
- Adresse inverse géocodée nécessite le service Android Geocoder ; sans
  réseau, seules les coordonnées GPS sont stockées (lecture jamais bloquée).
- Le « retour application métier » via Accessibility Service est documenté
  comme évolution ; V1 garantit la copie presse-papiers immédiate.
