import 'dart:convert';

/// A single validated plate reading event (P0 data structure).
class PlateEvent {
  final String eventId;
  final String plate;
  final String timestampUtc; // ISO8601 Z
  final String timestampLocal; // yyyy-MM-dd HH:mm:ss
  final double? gpsLat;
  final double? gpsLon;
  final String? address;
  final double confidence; // 0..1
  final int captureDurationMs;
  final String deviceId;
  final String? agentId;
  final String? imagePath; // original photo
  final String? cropPath; // cropped plate photo
  final String? ocrRaw; // raw OCR text (proof)
  final String status; // VALIDATED / REVIEW

  const PlateEvent({
    required this.eventId,
    required this.plate,
    required this.timestampUtc,
    required this.timestampLocal,
    this.gpsLat,
    this.gpsLon,
    this.address,
    required this.confidence,
    required this.captureDurationMs,
    required this.deviceId,
    this.agentId,
    this.imagePath,
    this.cropPath,
    this.ocrRaw,
    this.status = 'VALIDATED',
  });

  Map<String, Object?> toMap() => {
        'event_id': eventId,
        'plate': plate,
        'timestamp_utc': timestampUtc,
        'timestamp_local': timestampLocal,
        'gps_lat': gpsLat,
        'gps_lon': gpsLon,
        'address': address,
        'confidence': confidence,
        'capture_duration_ms': captureDurationMs,
        'device_id': deviceId,
        'agent_id': agentId,
        'image_path': imagePath,
        'crop_path': cropPath,
        'ocr_raw': ocrRaw,
        'status': status,
      };

  factory PlateEvent.fromMap(Map<String, Object?> m) => PlateEvent(
        eventId: m['event_id'] as String,
        plate: m['plate'] as String,
        timestampUtc: m['timestamp_utc'] as String,
        timestampLocal: m['timestamp_local'] as String,
        gpsLat: (m['gps_lat'] as num?)?.toDouble(),
        gpsLon: (m['gps_lon'] as num?)?.toDouble(),
        address: m['address'] as String?,
        confidence: (m['confidence'] as num).toDouble(),
        captureDurationMs: (m['capture_duration_ms'] as num).toInt(),
        deviceId: m['device_id'] as String,
        agentId: m['agent_id'] as String?,
        imagePath: m['image_path'] as String?,
        cropPath: m['crop_path'] as String?,
        ocrRaw: m['ocr_raw'] as String?,
        status: m['status'] as String? ?? 'VALIDATED',
      );

  String toJson() => jsonEncode(toMap());

  /// CSV-safe row in a fixed column order.
  List<Object?> toCsvRow() => [
        eventId,
        plate,
        timestampUtc,
        timestampLocal,
        gpsLat ?? '',
        gpsLon ?? '',
        address ?? '',
        (confidence * 100).toStringAsFixed(0),
        captureDurationMs,
        status,
      ];

  static const List<String> csvHeader = [
    'event_id',
    'plate',
    'timestamp_utc',
    'timestamp_local',
    'gps_lat',
    'gps_lon',
    'address',
    'confidence_pct',
    'capture_ms',
    'status',
  ];
}
