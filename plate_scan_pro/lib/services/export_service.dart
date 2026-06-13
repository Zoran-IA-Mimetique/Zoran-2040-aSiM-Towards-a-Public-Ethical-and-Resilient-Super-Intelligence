import 'dart:convert';
import 'dart:io';

import 'package:csv/csv.dart';
import 'package:excel/excel.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import '../models/plate_event.dart';

/// Export history to CSV / XLSX / JSON / PDF and share (P1).
class ExportService {
  Future<File> _tmp(String name) async {
    final dir = await getTemporaryDirectory();
    return File('${dir.path}/$name');
  }

  Future<void> _share(File f, String mime) async {
    await Share.shareXFiles([XFile(f.path, mimeType: mime)],
        text: 'ZORAN PLATE SCAN export');
  }

  Future<void> exportCsv(List<PlateEvent> events) async {
    final rows = <List<Object?>>[
      PlateEvent.csvHeader,
      ...events.map((e) => e.toCsvRow()),
    ];
    final csv = const ListToCsvConverter().convert(rows);
    final f = await _tmp('plates_${_stamp()}.csv');
    await f.writeAsString(csv);
    await _share(f, 'text/csv');
  }

  Future<void> exportJson(List<PlateEvent> events) async {
    final data = events.map((e) => e.toMap()).toList();
    final f = await _tmp('plates_${_stamp()}.json');
    await f.writeAsString(const JsonEncoder.withIndent('  ').convert(data));
    await _share(f, 'application/json');
  }

  Future<void> exportXlsx(List<PlateEvent> events) async {
    final excel = Excel.createExcel();
    final sheet = excel['Plates'];
    sheet.appendRow(
        PlateEvent.csvHeader.map((h) => TextCellValue(h)).toList());
    for (final e in events) {
      sheet.appendRow(
          e.toCsvRow().map((c) => TextCellValue(c.toString())).toList());
    }
    excel.delete('Sheet1');
    final bytes = excel.encode();
    final f = await _tmp('plates_${_stamp()}.xlsx');
    if (bytes != null) await f.writeAsBytes(bytes);
    await _share(f,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }

  Future<void> exportPdf(List<PlateEvent> events) async {
    final doc = pw.Document();
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (ctx) => [
          pw.Header(level: 0, text: 'ZORAN PLATE SCAN PRO — Journal'),
          pw.Paragraph(text: 'Export: ${DateTime.now()}  (${events.length} lectures)'),
          pw.Table.fromTextArray(
            headers: const ['Heure', 'Plaque', 'GPS', 'Conf.', 'Adresse'],
            data: events
                .map((e) => [
                      e.timestampLocal,
                      e.plate,
                      (e.gpsLat != null) ? 'Oui' : 'Non',
                      '${(e.confidence * 100).toStringAsFixed(0)}%',
                      e.address ?? '',
                    ])
                .toList(),
          ),
        ],
      ),
    );
    final f = await _tmp('plates_${_stamp()}.pdf');
    await f.writeAsBytes(await doc.save());
    await _share(f, 'application/pdf');
  }

  String _stamp() => DateTime.now()
      .toIso8601String()
      .replaceAll(RegExp(r'[:.]'), '-')
      .substring(0, 19);
}
