import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// Local archive for evidence photos (original + crop). Fully offline.
class ImageStorage {
  Directory? _root;

  Future<Directory> get root async {
    if (_root != null) return _root!;
    final base = await getApplicationDocumentsDirectory();
    _root = Directory('${base.path}/captures');
    if (!await _root!.exists()) await _root!.create(recursive: true);
    return _root!;
  }

  Future<String> dirPath() async => (await root).path;

  /// Persist a captured frame as the original-photo proof.
  Future<String> saveOriginal(File temp) async {
    final dir = await root;
    final dest =
        '${dir.path}/orig_${DateTime.now().microsecondsSinceEpoch}.jpg';
    await temp.copy(dest);
    return dest;
  }
}
