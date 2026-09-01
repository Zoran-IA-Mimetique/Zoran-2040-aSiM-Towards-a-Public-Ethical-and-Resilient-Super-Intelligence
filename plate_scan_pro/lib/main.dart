import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'services/settings_service.dart';
import 'theme/zoran_theme.dart';
import 'ui/home_shell.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SettingsService.instance.init();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  runApp(const PlateScanApp());
}

class PlateScanApp extends StatelessWidget {
  const PlateScanApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ZORAN Plate Scan Pro',
      debugShowCheckedModeBanner: false,
      theme: ZoranTheme.dark,
      home: const HomeShell(),
    );
  }
}
