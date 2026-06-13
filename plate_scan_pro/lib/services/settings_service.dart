import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

/// App settings + a stable device id (offline).
class SettingsService {
  SettingsService._();
  static final SettingsService instance = SettingsService._();

  late SharedPreferences _prefs;

  static const _kThreshold = 'confidence_threshold';
  static const _kAgent = 'agent_id';
  static const _kDevice = 'device_id';
  static const _kAutoCopy = 'auto_copy';
  static const _kDedupSeconds = 'dedup_seconds';

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    if (!_prefs.containsKey(_kDevice)) {
      await _prefs.setString(_kDevice, const Uuid().v4());
    }
  }

  double get threshold => _prefs.getDouble(_kThreshold) ?? 0.80;
  set threshold(double v) => _prefs.setDouble(_kThreshold, v);

  String? get agentId => _prefs.getString(_kAgent);
  set agentId(String? v) =>
      v == null ? _prefs.remove(_kAgent) : _prefs.setString(_kAgent, v);

  String get deviceId => _prefs.getString(_kDevice) ?? 'UNKNOWN';

  bool get autoCopy => _prefs.getBool(_kAutoCopy) ?? true;
  set autoCopy(bool v) => _prefs.setBool(_kAutoCopy, v);

  int get dedupSeconds => _prefs.getInt(_kDedupSeconds) ?? 5;
  set dedupSeconds(int v) => _prefs.setInt(_kDedupSeconds, v);
}
