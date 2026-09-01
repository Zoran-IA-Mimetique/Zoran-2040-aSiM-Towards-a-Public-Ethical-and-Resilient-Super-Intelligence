import 'package:flutter/material.dart';

/// ZORAN visual identity: black / petrol blue / white.
class ZoranTheme {
  static const Color black = Color(0xFF0A0E12);
  static const Color surface = Color(0xFF12181E);
  static const Color petrol = Color(0xFF0E7C86); // bleu pétrole
  static const Color petrolLight = Color(0xFF14B8C4);
  static const Color white = Color(0xFFF5F7FA);
  static const Color success = Color(0xFF2ECC71);
  static const Color danger = Color(0xFFE74C3C);

  static ThemeData get dark {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: black,
      colorScheme: const ColorScheme.dark(
        primary: petrol,
        secondary: petrolLight,
        surface: surface,
        onPrimary: white,
        onSurface: white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: black,
        foregroundColor: white,
        centerTitle: true,
        elevation: 0,
      ),
      cardTheme: const CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        indicatorColor: petrol.withValues(alpha: 0.25),
        labelTextStyle: WidgetStateProperty.all(
          const TextStyle(color: white, fontSize: 11),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: petrol,
          foregroundColor: white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
