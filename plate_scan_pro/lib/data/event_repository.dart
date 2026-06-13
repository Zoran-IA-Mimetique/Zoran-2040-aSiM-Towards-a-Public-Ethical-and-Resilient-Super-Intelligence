import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../models/plate_event.dart';

/// SQLite-backed history store (fully offline).
class EventRepository {
  EventRepository._();
  static final EventRepository instance = EventRepository._();

  Database? _db;

  Future<Database> get _database async {
    if (_db != null) return _db!;
    final dir = await getDatabasesPath();
    _db = await openDatabase(
      p.join(dir, 'plate_scan.db'),
      version: 1,
      onCreate: (db, v) async {
        await db.execute('''
          CREATE TABLE events(
            event_id TEXT PRIMARY KEY,
            plate TEXT NOT NULL,
            timestamp_utc TEXT NOT NULL,
            timestamp_local TEXT NOT NULL,
            gps_lat REAL,
            gps_lon REAL,
            address TEXT,
            confidence REAL NOT NULL,
            capture_duration_ms INTEGER NOT NULL,
            device_id TEXT NOT NULL,
            agent_id TEXT,
            image_path TEXT,
            crop_path TEXT,
            ocr_raw TEXT,
            status TEXT NOT NULL
          )
        ''');
        await db
            .execute('CREATE INDEX idx_plate ON events(plate)');
        await db
            .execute('CREATE INDEX idx_ts ON events(timestamp_utc)');
      },
    );
    return _db!;
  }

  Future<void> insert(PlateEvent e) async {
    final db = await _database;
    await db.insert('events', e.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  /// Most recent event for a plate, if any (anti-duplicate support).
  Future<PlateEvent?> lastForPlate(String plate) async {
    final db = await _database;
    final rows = await db.query('events',
        where: 'plate = ?',
        whereArgs: [plate],
        orderBy: 'timestamp_utc DESC',
        limit: 1);
    if (rows.isEmpty) return null;
    return PlateEvent.fromMap(rows.first);
  }

  Future<List<PlateEvent>> query({
    String? search,
    bool descending = true,
  }) async {
    final db = await _database;
    final rows = await db.query(
      'events',
      where: (search != null && search.isNotEmpty) ? 'plate LIKE ?' : null,
      whereArgs:
          (search != null && search.isNotEmpty) ? ['%${search.toUpperCase()}%'] : null,
      orderBy: 'timestamp_utc ${descending ? 'DESC' : 'ASC'}',
    );
    return rows.map(PlateEvent.fromMap).toList();
  }

  Future<void> delete(String eventId) async {
    final db = await _database;
    await db.delete('events', where: 'event_id = ?', whereArgs: [eventId]);
  }

  Future<void> purge() async {
    final db = await _database;
    await db.delete('events');
  }

  Future<int> countSince(DateTime sinceUtc) async {
    final db = await _database;
    final r = await db.rawQuery(
      'SELECT COUNT(*) c FROM events WHERE timestamp_utc >= ?',
      [sinceUtc.toUtc().toIso8601String()],
    );
    return Sqflite.firstIntValue(r) ?? 0;
  }

  Future<double> avgCaptureMs() async {
    final db = await _database;
    final r =
        await db.rawQuery('SELECT AVG(capture_duration_ms) a FROM events');
    final v = r.first['a'];
    return v == null ? 0 : (v as num).toDouble();
  }

  Future<int> totalCount() async {
    final db = await _database;
    final r = await db.rawQuery('SELECT COUNT(*) c FROM events');
    return Sqflite.firstIntValue(r) ?? 0;
  }
}
