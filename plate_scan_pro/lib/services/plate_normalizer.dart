/// French plate (SIV format) normalization + heuristic correction.
///
/// Accepts: "AB123CD", "AB 123 CD", "AB-123-CD" (and dirty OCR variants).
/// Produces canonical: "AB-123-CD".
/// Canonical regex: ^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$
class PlateResult {
  final String? plate; // canonical or null if not a plate
  final bool valid;
  final double formatScore; // 0..1 contribution from structure/heuristics

  const PlateResult(this.plate, this.valid, this.formatScore);
}

class PlateNormalizer {
  static final RegExp canonical = RegExp(r'^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$');

  /// SIV letter series excludes I, O, U (and SS) to avoid confusion.
  static const String _forbiddenLetters = 'IOU';

  // OCR confusion maps, applied positionally.
  static const Map<String, String> _toLetter = {
    '0': 'O',
    '1': 'I',
    '2': 'Z',
    '5': 'S',
    '6': 'G',
    '8': 'B',
  };
  static const Map<String, String> _toDigit = {
    'O': '0',
    'Q': '0',
    'D': '0',
    'I': '1',
    'L': '1',
    'Z': '2',
    'S': '5',
    'G': '6',
    'B': '8',
  };

  /// Strip everything except A-Z 0-9, uppercased.
  static String _clean(String raw) =>
      raw.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');

  /// Try to interpret a 7-char alnum block as a French SIV plate,
  /// applying positional OCR correction. Returns canonical or null.
  static PlateResult normalize(String raw) {
    final s = _clean(raw);
    if (s.length != 7) return const PlateResult(null, false, 0);

    final l1 = _coerceLetter(s[0]);
    final l2 = _coerceLetter(s[1]);
    final d1 = _coerceDigit(s[2]);
    final d2 = _coerceDigit(s[3]);
    final d3 = _coerceDigit(s[4]);
    final l3 = _coerceLetter(s[5]);
    final l4 = _coerceLetter(s[6]);

    if ([l1, l2, d1, d2, d3, l3, l4].contains(null)) {
      return const PlateResult(null, false, 0);
    }

    // Count how many chars had to be corrected -> lowers the format score.
    int corrections = 0;
    if (l1 != s[0]) corrections++;
    if (l2 != s[1]) corrections++;
    if (d1 != s[2]) corrections++;
    if (d2 != s[3]) corrections++;
    if (d3 != s[4]) corrections++;
    if (l3 != s[5]) corrections++;
    if (l4 != s[6]) corrections++;

    final candidate = '$l1$l2-$d1$d2$d3-$l3$l4';
    final valid = canonical.hasMatch(candidate) &&
        !_forbiddenLetters.contains(l1!) &&
        !_forbiddenLetters.contains(l2!);

    // Format score: 1.0 clean, minus 0.12 per correction.
    final score = (1.0 - corrections * 0.12).clamp(0.0, 1.0);
    return PlateResult(valid ? candidate : null, valid, score);
  }

  static String? _coerceLetter(String c) {
    if (RegExp(r'[A-Z]').hasMatch(c)) return c;
    return _toLetter[c];
  }

  static String? _coerceDigit(String c) {
    if (RegExp(r'[0-9]').hasMatch(c)) return c;
    return _toDigit[c];
  }

  /// Scan an arbitrary OCR text blob for the best plate candidate.
  /// Slides a 7-char window over each alnum token and contiguous joins.
  static PlateResult extractBest(String ocrText) {
    final tokens = ocrText
        .toUpperCase()
        .split(RegExp(r'[\s\n]+'))
        .map(_clean)
        .where((t) => t.isNotEmpty)
        .toList();

    final candidates = <String>{};
    // whole tokens
    for (final t in tokens) {
      candidates.add(t);
    }
    // joined adjacent tokens (plate split across spaces: "AB 123 CD")
    for (var i = 0; i < tokens.length; i++) {
      var acc = tokens[i];
      for (var j = i + 1; j < tokens.length && acc.length < 9; j++) {
        acc += tokens[j];
        candidates.add(acc);
      }
    }
    // sliding window of 7 over long blobs
    for (final c in candidates.toList()) {
      if (c.length > 7) {
        for (var k = 0; k + 7 <= c.length; k++) {
          candidates.add(c.substring(k, k + 7));
        }
      }
    }

    PlateResult best = const PlateResult(null, false, 0);
    for (final c in candidates) {
      final r = normalize(c);
      if (r.valid && r.formatScore > best.formatScore) best = r;
    }
    return best;
  }
}
