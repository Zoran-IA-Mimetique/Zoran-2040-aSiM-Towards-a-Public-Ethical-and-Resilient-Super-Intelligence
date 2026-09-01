import 'dart:io';

import 'package:flutter/material.dart';

import '../data/event_repository.dart';
import '../models/plate_event.dart';
import '../services/export_service.dart';
import '../theme/zoran_theme.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final _repo = EventRepository.instance;
  final _export = ExportService();
  final _searchCtrl = TextEditingController();
  bool _descending = true;
  List<PlateEvent> _events = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final list = await _repo.query(
        search: _searchCtrl.text, descending: _descending);
    if (mounted) setState(() => _events = list);
  }

  Future<void> _confirmPurge() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Purge complète'),
        content: const Text('Supprimer tout l’historique ? Irréversible.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('Annuler')),
          TextButton(
              onPressed: () => Navigator.pop(c, true),
              child: const Text('Purger',
                  style: TextStyle(color: ZoranTheme.danger))),
        ],
      ),
    );
    if (ok == true) {
      await _repo.purge();
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Historique'),
        actions: [
          IconButton(
            tooltip: _descending ? 'Plus récent' : 'Plus ancien',
            icon: Icon(_descending
                ? Icons.arrow_downward
                : Icons.arrow_upward),
            onPressed: () {
              setState(() => _descending = !_descending);
              _load();
            },
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.ios_share),
            onSelected: (v) async {
              switch (v) {
                case 'csv':
                  await _export.exportCsv(_events);
                  break;
                case 'xlsx':
                  await _export.exportXlsx(_events);
                  break;
                case 'json':
                  await _export.exportJson(_events);
                  break;
                case 'pdf':
                  await _export.exportPdf(_events);
                  break;
              }
            },
            itemBuilder: (c) => const [
              PopupMenuItem(value: 'csv', child: Text('Export CSV')),
              PopupMenuItem(value: 'xlsx', child: Text('Export Excel')),
              PopupMenuItem(value: 'json', child: Text('Export JSON')),
              PopupMenuItem(value: 'pdf', child: Text('Export PDF')),
            ],
          ),
          IconButton(
            tooltip: 'Purge complète',
            icon: const Icon(Icons.delete_forever),
            onPressed: _confirmPurge,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Rechercher une plaque…',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: ZoranTheme.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (_) => _load(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: const [
                Expanded(flex: 2, child: Text('Heure', style: _h)),
                Expanded(flex: 3, child: Text('Plaque', style: _h)),
                Expanded(flex: 1, child: Text('GPS', style: _h)),
                Expanded(flex: 1, child: Text('Conf.', style: _h)),
              ],
            ),
          ),
          const Divider(height: 8),
          Expanded(
            child: _events.isEmpty
                ? const Center(child: Text('Aucune lecture enregistrée'))
                : ListView.builder(
                    itemCount: _events.length,
                    itemBuilder: (c, i) => _row(_events[i]),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _row(PlateEvent e) {
    final time = e.timestampLocal.length >= 16
        ? e.timestampLocal.substring(11, 16)
        : e.timestampLocal;
    return Dismissible(
      key: ValueKey(e.eventId),
      direction: DismissDirection.endToStart,
      background: Container(
        color: ZoranTheme.danger,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) async {
        await _repo.delete(e.eventId);
        setState(() => _events.remove(e));
      },
      child: ListTile(
        onTap: () => _showDetail(e),
        title: Row(
          children: [
            Expanded(flex: 2, child: Text(time)),
            Expanded(
                flex: 3,
                child: Text(e.plate,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1))),
            Expanded(
                flex: 1,
                child: Text(e.gpsLat != null ? 'Oui' : 'Non',
                    style: TextStyle(
                        color: e.gpsLat != null
                            ? ZoranTheme.success
                            : ZoranTheme.danger))),
            Expanded(
                flex: 1,
                child: Text('${(e.confidence * 100).toStringAsFixed(0)}%')),
          ],
        ),
      ),
    );
  }

  void _showDetail(PlateEvent e) {
    showModalBottomSheet(
      context: context,
      backgroundColor: ZoranTheme.surface,
      builder: (c) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(e.plate,
                style: const TextStyle(
                    fontSize: 28, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text('UTC: ${e.timestampUtc}'),
            Text('Local: ${e.timestampLocal}'),
            if (e.gpsLat != null)
              Text('GPS: ${e.gpsLat!.toStringAsFixed(5)}, '
                  '${e.gpsLon!.toStringAsFixed(5)}'),
            if (e.address != null) Text('Adresse: ${e.address}'),
            Text('Confiance: ${(e.confidence * 100).toStringAsFixed(0)}%'),
            Text('Durée capture: ${e.captureDurationMs} ms'),
            const SizedBox(height: 12),
            if (e.cropPath != null && File(e.cropPath!).existsSync())
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.file(File(e.cropPath!), height: 90),
              ),
            const SizedBox(height: 8),
            if (e.imagePath != null && File(e.imagePath!).existsSync())
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.file(File(e.imagePath!), height: 180),
              ),
            if (e.ocrRaw != null) ...[
              const SizedBox(height: 8),
              Text('OCR brut: ${e.ocrRaw}',
                  style: const TextStyle(
                      fontSize: 11, color: Colors.white54)),
            ],
          ],
        ),
      ),
    );
  }
}

const _h = TextStyle(fontWeight: FontWeight.bold, color: ZoranTheme.petrolLight);
