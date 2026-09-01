import 'package:flutter/material.dart';

import '../services/settings_service.dart';
import '../theme/zoran_theme.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _settings = SettingsService.instance;
  late double _threshold = _settings.threshold;
  late bool _autoCopy = _settings.autoCopy;
  late int _dedup = _settings.dedupSeconds;
  late final TextEditingController _agentCtrl =
      TextEditingController(text: _settings.agentId ?? '');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Réglages')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Seuil de confiance (copie auto)',
              style: TextStyle(color: ZoranTheme.petrolLight)),
          Slider(
            value: _threshold,
            min: 0.5,
            max: 0.99,
            divisions: 49,
            label: '${(_threshold * 100).toStringAsFixed(0)}%',
            onChanged: (v) => setState(() => _threshold = v),
            onChangeEnd: (v) => _settings.threshold = v,
          ),
          SwitchListTile(
            title: const Text('Copie automatique presse-papiers'),
            value: _autoCopy,
            onChanged: (v) {
              setState(() => _autoCopy = v);
              _settings.autoCopy = v;
            },
          ),
          ListTile(
            title: const Text('Anti-doublons (secondes)'),
            trailing: DropdownButton<int>(
              value: _dedup,
              items: const [3, 5, 10, 15, 30]
                  .map((s) =>
                      DropdownMenuItem(value: s, child: Text('$s s')))
                  .toList(),
              onChanged: (v) {
                if (v == null) return;
                setState(() => _dedup = v);
                _settings.dedupSeconds = v;
              },
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _agentCtrl,
            decoration: const InputDecoration(
              labelText: 'Identifiant agent (optionnel)',
              border: OutlineInputBorder(),
            ),
            onChanged: (v) =>
                _settings.agentId = v.trim().isEmpty ? null : v.trim(),
          ),
          const SizedBox(height: 24),
          Text('Device ID: ${_settings.deviceId}',
              style: const TextStyle(color: Colors.white38, fontSize: 12)),
          const SizedBox(height: 8),
          const Text(
            'Mode 100% hors-ligne. OCR et stockage locaux. '
            'Aucune donnée envoyée sur le réseau.',
            style: TextStyle(color: Colors.white38, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
