import 'dart:io';
import 'dart:ui' show Rect;

import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:image/image.dart' as img;

import 'plate_normalizer.dart';

/// Result of running the detection+OCR pipeline on one frame/photo.
class DetectionResult {
  final String? plate; // canonical FR plate or null
  final double confidence; // combined OCR x format score, 0..1
  final String ocrRaw;
  final String? cropPath; // path to cropped plate image (proof)
  final bool valid;

  const DetectionResult({
    this.plate,
    required this.confidence,
    required this.ocrRaw,
    this.cropPath,
    required this.valid,
  });

  static const DetectionResult none =
      DetectionResult(confidence: 0, ocrRaw: '', valid: false);
}

/// Pipeline: photo file -> ML Kit OCR -> locate plate text block ->
/// crop (proof) -> FR normalization/validation.
///
/// NOTE: the dedicated detector stage is interchangeable. This V1 uses a
/// text-locality detector (find the OCR line matching the FR plate regex)
/// which runs fully offline. To plug a TFLite/YOLO plate detector, implement
/// [PlateLocalizer] and pass it to [PlateDetector].
abstract class PlateLocalizer {
  /// Return a region of interest (image px) likely containing a plate, or null.
  Rect? localize(img.Image image, RecognizedText ocr);
}

class PlateDetector {
  final TextRecognizer _recognizer =
      TextRecognizer(script: TextRecognitionScript.latin);

  /// Run the full pipeline on a captured photo file.
  Future<DetectionResult> process(File photo, {String? cropDir}) async {
    final input = InputImage.fromFilePath(photo.path);
    final RecognizedText ocr = await _recognizer.processImage(input);
    final raw = ocr.text;
    if (raw.trim().isEmpty) {
      return const DetectionResult(confidence: 0, ocrRaw: '', valid: false);
    }

    // Locate the best plate among recognized lines (keeps the bounding box).
    TextLine? bestLine;
    PlateResult best = const PlateResult(null, false, 0);
    for (final block in ocr.blocks) {
      for (final line in block.lines) {
        final r = PlateNormalizer.normalize(line.text);
        if (r.valid && r.formatScore >= best.formatScore) {
          best = r;
          bestLine = line;
        }
      }
    }
    // Fallback: scan the whole blob (handles plates split across lines).
    if (!best.valid) {
      best = PlateNormalizer.extractBest(raw);
    }

    if (!best.valid || best.plate == null) {
      return DetectionResult(confidence: 0, ocrRaw: raw, valid: false);
    }

    // Combine ML Kit element confidence with our format score.
    final ocrConf = _lineConfidence(bestLine);
    final confidence = (0.5 * ocrConf + 0.5 * best.formatScore).clamp(0.0, 1.0);

    // Crop the plate region as visual proof.
    String? cropPath;
    if (bestLine?.boundingBox != null && cropDir != null) {
      cropPath = await _crop(photo, bestLine!.boundingBox, cropDir);
    }

    return DetectionResult(
      plate: best.plate,
      confidence: confidence,
      ocrRaw: raw,
      cropPath: cropPath,
      valid: true,
    );
  }

  double _lineConfidence(TextLine? line) {
    if (line == null) return 0.6;
    final vals = line.elements
        .map((e) => e.confidence)
        .whereType<double>()
        .toList();
    if (vals.isEmpty) return 0.85; // ML Kit often omits confidence on-device
    return vals.reduce((a, b) => a + b) / vals.length;
  }

  Future<String?> _crop(File photo, Rect box, String dir) async {
    try {
      final bytes = await photo.readAsBytes();
      final decoded = img.decodeImage(bytes);
      if (decoded == null) return null;
      // Pad the box by 12% for context, clamp to image bounds.
      final padX = box.width * 0.12;
      final padY = box.height * 0.30;
      final x = (box.left - padX).clamp(0, decoded.width - 1).toInt();
      final y = (box.top - padY).clamp(0, decoded.height - 1).toInt();
      final w =
          (box.width + 2 * padX).clamp(1, decoded.width - x).toInt();
      final h =
          (box.height + 2 * padY).clamp(1, decoded.height - y).toInt();
      final crop = img.copyCrop(decoded, x: x, y: y, width: w, height: h);
      final out = '$dir/crop_${DateTime.now().microsecondsSinceEpoch}.jpg';
      await File(out).writeAsBytes(img.encodeJpg(crop, quality: 85));
      return out;
    } catch (_) {
      return null;
    }
  }

  Future<void> dispose() => _recognizer.close();
}
