import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';

import '../data/event_repository.dart';
import '../models/plate_event.dart';
import '../services/feedback_service.dart';
import '../services/image_storage.dart';
import '../services/location_service.dart';
import '../services/plate_detector.dart';
import '../services/settings_service.dart';
import '../theme/zoran_theme.dart';

/// P0 Field mode: open -> camera live -> continuous scan, no button.
class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> with WidgetsBindingObserver {
  CameraController? _cam;
  final PlateDetector _detector = PlateDetector();
  final ImageStorage _storage = ImageStorage();
  final LocationService _location = LocationService();
  final _repo = EventRepository.instance;
  final _settings = SettingsService.instance;

  bool _running = false;
  bool _busy = false;
  String? _lastPlate;
  DateTime? _lastShownAt;
  int _todayCount = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await _location.ensurePermission();
    await _refreshTodayCount();
    await _initCamera();
    _startLoop();
  }

  Future<void> _initCamera() async {
    try {
      final cams = await availableCameras();
      final back = cams.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cams.first,
      );
      final controller = CameraController(
        back,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      await controller.initialize();
      if (!mounted) return;
      setState(() => _cam = controller);
    } catch (e) {
      debugPrint('Camera init failed: $e');
    }
  }

  void _startLoop() {
    if (_running) return;
    _running = true;
    _loop();
  }

  Future<void> _loop() async {
    while (_running && mounted) {
      await _scanOnce();
      // Pace the loop; target ~1 capture/700ms.
      await Future<void>.delayed(const Duration(milliseconds: 250));
    }
  }

  Future<void> _scanOnce() async {
    final cam = _cam;
    if (cam == null || !cam.value.isInitialized || _busy) return;
    _busy = true;
    final sw = Stopwatch()..start();
    try {
      final shot = await cam.takePicture();
      final cropDir = await _storage.dirPath();
      final result =
          await _detector.process(File(shot.path), cropDir: cropDir);
      sw.stop();

      if (!result.valid || result.plate == null) return;
      if (result.confidence < _settings.threshold) return;

      // P0 anti-duplicate: same plate within dedup window -> ignore.
      final last = await _repo.lastForPlate(result.plate!);
      if (last != null) {
        final lastTs = DateTime.tryParse(last.timestampUtc)?.toUtc();
        if (lastTs != null &&
            DateTime.now().toUtc().difference(lastTs).inSeconds <
                _settings.dedupSeconds) {
          return;
        }
      }

      await _commit(result, File(shot.path), sw.elapsedMilliseconds);
    } catch (e) {
      debugPrint('scan error: $e');
    } finally {
      _busy = false;
    }
  }

  Future<void> _commit(
      DetectionResult result, File shot, int durationMs) async {
    final now = DateTime.now();
    final fix = await _location.currentFix();
    final origPath = await _storage.saveOriginal(shot);

    final event = PlateEvent(
      eventId: const Uuid().v4(),
      plate: result.plate!,
      timestampUtc: now.toUtc().toIso8601String(),
      timestampLocal: DateFormat('yyyy-MM-dd HH:mm:ss').format(now),
      gpsLat: fix.lat,
      gpsLon: fix.lon,
      address: fix.address,
      confidence: result.confidence,
      captureDurationMs: durationMs,
      deviceId: _settings.deviceId,
      agentId: _settings.agentId,
      imagePath: origPath,
      cropPath: result.cropPath,
      ocrRaw: result.ocrRaw,
      status: 'VALIDATED',
    );

    await _repo.insert(event);

    // P0 auto-copy + vibration + visual signal.
    if (_settings.autoCopy) {
      await FeedbackService.copy(event.plate);
    }
    await FeedbackService.buzz();
    await _refreshTodayCount();

    if (!mounted) return;
    setState(() {
      _lastPlate = event.plate;
      _lastShownAt = DateTime.now();
    });
    // Clear the "✓ COPIÉ" banner after 2 seconds.
    Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() {});
    });
  }

  Future<void> _refreshTodayCount() async {
    final start = DateTime.now();
    final midnight = DateTime(start.year, start.month, start.day);
    final c = await _repo.countSince(midnight);
    if (mounted) setState(() => _todayCount = c);
  }

  bool get _bannerVisible =>
      _lastPlate != null &&
      _lastShownAt != null &&
      DateTime.now().difference(_lastShownAt!).inSeconds < 2;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      _running = false;
    } else if (state == AppLifecycleState.resumed) {
      _startLoop();
    }
  }

  @override
  void dispose() {
    _running = false;
    WidgetsBinding.instance.removeObserver(this);
    _cam?.dispose();
    _detector.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cam = _cam;
    return Stack(
      fit: StackFit.expand,
      children: [
        if (cam != null && cam.value.isInitialized)
          CameraPreview(cam)
        else
          const ColoredBox(
            color: ZoranTheme.black,
            child: Center(
              child: CircularProgressIndicator(color: ZoranTheme.petrol),
            ),
          ),

        // Plate guide overlay.
        Center(
          child: FractionallySizedBox(
            widthFactor: 0.82,
            heightFactor: 0.20,
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border.all(color: ZoranTheme.petrolLight, width: 2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Center(
                child: Text('ZONE PLAQUE',
                    style: TextStyle(
                        color: ZoranTheme.petrolLight,
                        fontSize: 12,
                        letterSpacing: 2)),
              ),
            ),
          ),
        ),

        // ✓ COPIÉ banner (2s).
        if (_bannerVisible)
          Positioned(
            bottom: 110,
            left: 24,
            right: 24,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: ZoranTheme.success.withValues(alpha: 0.92),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('✓ COPIÉ',
                      style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16)),
                  Text(_lastPlate ?? '',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2)),
                ],
              ),
            ),
          ),

        // Today counter.
        Positioned(
          bottom: 24,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              decoration: BoxDecoration(
                color: ZoranTheme.surface.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text("Aujourd'hui : $_todayCount",
                  style: const TextStyle(
                      color: ZoranTheme.white, fontSize: 14)),
            ),
          ),
        ),
      ],
    );
  }
}
