import 'package:flutter/material.dart';

import 'dashboard_screen.dart';
import 'history_screen.dart';
import 'scan_screen.dart';
import 'settings_screen.dart';

/// Root navigation. Field mode (scan) is the landing tab.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    // Rebuild children so history/dashboard reload counts on tab switch.
    final pages = <Widget>[
      const ScanScreen(),
      const HistoryScreen(),
      const DashboardScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      extendBodyBehindAppBar: _index == 0,
      appBar: _index == 0
          ? AppBar(
              backgroundColor: Colors.transparent,
              title: const Text('ZORAN',
                  style: TextStyle(
                      fontWeight: FontWeight.w900, letterSpacing: 4)),
            )
          : null,
      body: IndexedStack(index: _index, sizing: StackFit.expand, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.camera_alt), label: 'Scan'),
          NavigationDestination(
              icon: Icon(Icons.history), label: 'Historique'),
          NavigationDestination(
              icon: Icon(Icons.dashboard), label: 'Tableau'),
          NavigationDestination(
              icon: Icon(Icons.settings), label: 'Réglages'),
        ],
      ),
    );
  }
}
