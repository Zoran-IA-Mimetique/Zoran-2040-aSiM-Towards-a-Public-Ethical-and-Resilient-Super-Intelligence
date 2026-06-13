# ZORAN PLATE SCAN PRO — V1.0

Application Android ANPR (lecture automatique de plaques) pour agents de
stationnement. **100 % hors-ligne.**

Viser → détection → OCR → validation → **copie automatique** → historisation →
retour métier. Objectif : suppression quasi totale de la saisie manuelle.

---

## 📥 Télécharger l'APK (exécutable)

L'APK n'est pas un fichier que l'on colle dans un chat : il est **compilé
automatiquement par GitHub Actions** et publié en **Release téléchargeable**.

1. Onglet **Actions** du dépôt → workflow **« Build ZORAN Plate Scan APK »**.
2. À la fin du build : artefact `zoran-plate-scan-apk` **ou** page **Releases**
   → `ZORAN Plate Scan Pro v1.0`.
3. Téléchargez **`zoran-plate-scan-release.apk`**, transférez-le sur un
   téléphone Android, autorisez « sources inconnues », installez.

> Les APK sont signés avec la clé *debug* (installables immédiatement, sans
> compte Play). Pour une diffusion Play Store, ajoutez une clé de signature
> de release.

Déclencher manuellement : Actions → *Run workflow* (`workflow_dispatch`).

---

## Pipeline (P0)

```
CameraX (camera)
   ↓ capture continue (mode terrain, sans bouton)
Détection plaque  → localisation du bloc texte plaque (offline)
   ↓ crop (preuve visuelle)
ML Kit OCR (offline, modèle latin embarqué)
   ↓
Validation format FR  [A-Z]{2}-[0-9]{3}-[A-Z]{2}
   ↓
Correction heuristique (O↔0, I↔1, S↔5, B↔8 …)
   ↓ confiance ≥ seuil
Copie presse-papiers + vibration 150 ms + bandeau « ✓ COPIÉ » (2 s)
   ↓ anti-doublons (même plaque < 5 s ignorée)
Historisation SQLite + photos (originale + recadrée) + GPS + horodatage
```

### Note d'architecture — étage « détection »
V1 utilise un **localisateur de plaque par texte** (ML Kit) : robuste, 100 %
hors-ligne, sans modèle à entraîner. L'interface `PlateLocalizer`
(`lib/services/plate_detector.dart`) permet de brancher un détecteur
**YOLOv8n / TFLite** dédié (recadrage amont avant OCR) sans toucher au reste du
pipeline, lorsqu'un modèle `.tflite` de plaques est disponible.

---

## Données enregistrées (par lecture valide)

`event_id, plate, timestamp_utc, timestamp_local, gps_lat, gps_lon, address,
confidence, capture_duration_ms, device_id, agent_id, image_path, crop_path,
ocr_raw, status` — voir `lib/models/plate_event.dart`.

## Fonctions

| P0 | Onglet / module |
|----|-----------------|
| Mode terrain (caméra auto, sans bouton) | `ui/scan_screen.dart` |
| Normalisation FR + correction | `services/plate_normalizer.dart` |
| Copie auto / vibration 150 ms / bandeau ✓ | `services/feedback_service.dart` + scan |
| Anti-doublons < 5 s | `scan_screen.dart` + `event_repository.dart` |
| GPS + adresse + horodatage | `services/location_service.dart` |
| Historique (recherche, tri, suppression, purge) | `ui/history_screen.dart` |
| Preuve visuelle (photo orig. + recadrée + OCR brut) | `services/image_storage.dart` |
| Tableau de bord (jour/semaine/mois, temps moyen) | `ui/dashboard_screen.dart` |
| Export CSV / XLSX / JSON / PDF | `services/export_service.dart` |
| Mode 100 % offline | aucune dépendance réseau requise |

## Stack

Flutter · CameraX (`camera`) · Google ML Kit (`google_mlkit_text_recognition`)
· SQLite (`sqflite`) · `geolocator`/`geocoding` · `image` · `pdf`/`excel`/`csv`.

## Build local

```bash
flutter create --org com.zoran.platescan --project-name plate_scan_pro --platforms=android .
python3 tool/patch_android.py
flutter pub get
flutter build apk --release      # build/app/outputs/flutter-apk/app-release.apk
```

## Tests

```bash
flutter test            # logique de normalisation/extraction FR
```
Voir `TEST_REPORT.md` pour le protocole terrain (plaques propres/sales/
inclinées/nuit/pluie/faible luminosité).
