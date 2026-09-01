import 'package:flutter_test/flutter_test.dart';
import 'package:plate_scan_pro/services/plate_normalizer.dart';

void main() {
  group('PlateNormalizer.normalize', () {
    test('accepts compact form', () {
      expect(PlateNormalizer.normalize('AB123CD').plate, 'AB-123-CD');
    });

    test('accepts spaced form', () {
      // non-alnum chars are stripped before normalization
      expect(PlateNormalizer.normalize('AB 123 CD').plate, 'AB-123-CD');
    });

    test('accepts dashed form', () {
      expect(PlateNormalizer.normalize('AB-123-CD').plate, 'AB-123-CD');
    });

    test('rejects wrong length', () {
      expect(PlateNormalizer.normalize('AB12CD').valid, false);
    });

    test('heuristic corrects O->0 in number block', () {
      // "ABO12CD" wrong; "AB O12 CD" -> AB-012-CD
      expect(PlateNormalizer.normalize('ABO12CD').plate, 'AB-012-CD');
    });

    test('heuristic corrects digit->letter in letter block', () {
      // 8 at a letter position -> B (O/I/U are excluded from group 1)
      expect(PlateNormalizer.normalize('8B123CD').plate, 'BB-123-CD');
    });
  });

  group('PlateNormalizer.extractBest', () {
    test('finds plate in noisy OCR blob', () {
      const blob = 'PARKING\nAB 123 CD\nF 75';
      final r = PlateNormalizer.extractBest(blob);
      expect(r.valid, true);
      expect(r.plate, 'AB-123-CD');
    });

    test('returns invalid when no plate present', () {
      final r = PlateNormalizer.extractBest('HELLO WORLD 2026');
      expect(r.valid, false);
    });
  });
}
