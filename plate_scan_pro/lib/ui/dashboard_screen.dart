import 'package:flutter/material.dart';

import '../data/event_repository.dart';
import '../theme/zoran_theme.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _repo = EventRepository.instance;
  int _today = 0, _week = 0, _month = 0, _total = 0;
  double _avgMs = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final now = DateTime.now();
    final midnight = DateTime(now.year, now.month, now.day);
    final week = now.subtract(Duration(days: now.weekday - 1));
    final weekStart = DateTime(week.year, week.month, week.day);
    final monthStart = DateTime(now.year, now.month, 1);

    final today = await _repo.countSince(midnight);
    final wk = await _repo.countSince(weekStart);
    final mo = await _repo.countSince(monthStart);
    final total = await _repo.totalCount();
    final avg = await _repo.avgCaptureMs();
    if (!mounted) return;
    setState(() {
      _today = today;
      _week = wk;
      _month = mo;
      _total = total;
      _avgMs = avg;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tableau de bord'),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(12),
          children: [
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              childAspectRatio: 1.5,
              children: [
                _stat("Aujourd'hui", '$_today', Icons.today),
                _stat('Cette semaine', '$_week', Icons.calendar_view_week),
                _stat('Ce mois', '$_month', Icons.calendar_month),
                _stat('Total', '$_total', Icons.list_alt),
                _stat('Temps moyen',
                    '${_avgMs.toStringAsFixed(0)} ms', Icons.speed),
                _stat(
                    'Cible',
                    _avgMs > 0 && _avgMs < 1000 ? '✓ < 1 s' : '—',
                    Icons.flag),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value, IconData icon) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: ZoranTheme.petrolLight),
            const SizedBox(height: 6),
            Text(value,
                style: const TextStyle(
                    fontSize: 24, fontWeight: FontWeight.w900)),
            Text(label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontSize: 12, color: Colors.white60)),
          ],
        ),
      ),
    );
  }
}
