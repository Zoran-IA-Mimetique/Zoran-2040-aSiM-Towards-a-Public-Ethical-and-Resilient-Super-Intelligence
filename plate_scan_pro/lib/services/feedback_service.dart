import 'package:flutter/services.dart';
import 'package:vibration/vibration.dart';

/// Haptic + clipboard feedback for a valid detection.
class FeedbackService {
  /// 150 ms vibration on valid detection (P0).
  static Future<void> buzz() async {
    try {
      if (await Vibration.hasVibrator() ?? false) {
        Vibration.vibrate(duration: 150);
      } else {
        HapticFeedback.mediumImpact();
      }
    } catch (_) {
      HapticFeedback.mediumImpact();
    }
  }

  /// Auto-copy to clipboard (P0, <50ms).
  static Future<void> copy(String plate) async {
    await Clipboard.setData(ClipboardData(text: plate));
  }
}
