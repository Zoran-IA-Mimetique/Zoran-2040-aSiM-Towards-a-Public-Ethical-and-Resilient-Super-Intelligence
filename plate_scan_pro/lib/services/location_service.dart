import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';

class GpsFix {
  final double? lat;
  final double? lon;
  final String? address;
  const GpsFix({this.lat, this.lon, this.address});
  static const GpsFix empty = GpsFix();
}

/// Offline-tolerant GPS. Position works without network; reverse-geocoding
/// (address) is best-effort and silently skipped when offline.
class LocationService {
  Position? _last;

  Future<void> ensurePermission() async {
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
  }

  Future<GpsFix> currentFix({bool resolveAddress = true}) async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        return GpsFix(lat: _last?.latitude, lon: _last?.longitude);
      }
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return GpsFix.empty;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 4),
        ),
      ).catchError((_) => _last ?? _zero());
      _last = pos;

      String? addr;
      if (resolveAddress) {
        addr = await _reverse(pos.latitude, pos.longitude);
      }
      return GpsFix(lat: pos.latitude, lon: pos.longitude, address: addr);
    } catch (_) {
      return GpsFix(lat: _last?.latitude, lon: _last?.longitude);
    }
  }

  Future<String?> _reverse(double lat, double lon) async {
    try {
      final marks = await placemarkFromCoordinates(lat, lon);
      if (marks.isEmpty) return null;
      final m = marks.first;
      final parts = [
        if ((m.street ?? '').isNotEmpty) m.street,
        if ((m.locality ?? '').isNotEmpty) m.locality,
      ];
      return parts.join(', ');
    } catch (_) {
      return null; // offline -> no address, position still stored
    }
  }

  Position _zero() => Position(
        longitude: 0,
        latitude: 0,
        timestamp: DateTime.now(),
        accuracy: 0,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      );
}
