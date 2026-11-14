---
title: "Side hustle income tracker in Flutter: SQLite storage and CSV export"
description: A small Flutter app that records side hustle income in SQLite with sqflite, lists and deletes entries, and exports everything to a CSV file.
pubDate: Saturday, 23 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["flutter", "dart"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/dalle-2022-12-25-21-48-03-teddy-bear-on-coach-looking-out-the-window-at-a-tree.webp'
---

If you earn money from a few different places (freelance work, a part-time job, selling things online), a spreadsheet gets messy fast. This post builds a minimal Flutter app for logging that income: each entry has a source, date, amount and optional notes, entries are stored locally in SQLite, and the whole table can be exported to CSV so you can open it in a spreadsheet at tax time.

The app has two files: a database helper and a single screen.

## Dependencies

Create a project and add the packages:

```bash
flutter create income_tracker
cd income_tracker
flutter pub add sqflite path path_provider csv intl
```

This post was last checked against sqflite 2.4.6, path 1.9.1, path_provider 2.1.6, csv 8.0.0 and intl 0.20.3.

- `sqflite` is the SQLite plugin. It supports Android, iOS and macOS; for Windows/Linux desktop you need `sqflite_common_ffi`, and it doesn't run on the web.
- `path` and `path_provider` build the file paths for the database and the CSV export.
- `csv` turns rows into CSV text. Version 7 was a rewrite and 8.0 changed the API again, so older examples using `ListToCsvConverter` won't match the code below.
- `intl` formats dates.

## The database helper

Create `lib/database_helper.dart`. It is a singleton that opens the database once, creates the table on first run, and exposes insert, delete, query and export methods.

```dart
import 'dart:io';

import 'package:csv/csv.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

class DatabaseHelper {
  static const _databaseName = 'income.db';
  static const _databaseVersion = 1;

  static const table = 'income';
  static const columnId = '_id';
  static const columnSource = 'source';
  static const columnDate = 'date';
  static const columnAmount = 'amount';
  static const columnNotes = 'notes';

  DatabaseHelper._privateConstructor();
  static final DatabaseHelper instance = DatabaseHelper._privateConstructor();

  static Database? _database;

  Future<Database> get database async {
    return _database ??= await _initDatabase();
  }

  Future<Database> _initDatabase() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, _databaseName);
    return openDatabase(path, version: _databaseVersion, onCreate: _onCreate);
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE $table (
        $columnId INTEGER PRIMARY KEY,
        $columnSource TEXT NOT NULL,
        $columnDate TEXT NOT NULL,
        $columnAmount REAL NOT NULL,
        $columnNotes TEXT
      )
    ''');
  }

  Future<int> insert(Map<String, Object?> row) async {
    final db = await database;
    return db.insert(table, row);
  }

  Future<int> delete(int id) async {
    final db = await database;
    return db.delete(table, where: '$columnId = ?', whereArgs: [id]);
  }

  Future<List<Map<String, Object?>>> queryAllRows() async {
    final db = await database;
    return db.query(table, orderBy: '$columnDate DESC');
  }

  /// Writes every row to income.csv in the app documents directory
  /// and returns the file path.
  Future<String> exportToCsv() async {
    final rows = await queryAllRows();
    final csvData = <List<Object?>>[
      [columnSource, columnDate, columnAmount, columnNotes],
      for (final row in rows)
        [row[columnSource], row[columnDate], row[columnAmount], row[columnNotes]],
    ];

    final documentsDirectory = await getApplicationDocumentsDirectory();
    final file = File(join(documentsDirectory.path, 'income.csv'));
    await file.writeAsString(csv.encode(csvData));
    return file.path;
  }
}
```

Dates are stored as ISO 8601 strings. SQLite has no date type, and ISO strings sort correctly, which is what the `orderBy` relies on.

## The screen

Replace `lib/main.dart` with a single page: a list of entries at the top and a form for adding new ones at the bottom. The `Future` for the list lives in state and is replaced after every insert or delete, so `FutureBuilder` doesn't re-query the database on every rebuild.

```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'database_helper.dart';

void main() => runApp(const IncomeTrackerApp());

class IncomeTrackerApp extends StatelessWidget {
  const IncomeTrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(title: 'Income Tracker', home: HomePage());
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _formKey = GlobalKey<FormState>();
  final _sourceController = TextEditingController();
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  late Future<List<Map<String, Object?>>> _rows;

  @override
  void initState() {
    super.initState();
    _rows = DatabaseHelper.instance.queryAllRows();
  }

  @override
  void dispose() {
    _sourceController.dispose();
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _refresh() {
    setState(() {
      _rows = DatabaseHelper.instance.queryAllRows();
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _addEntry() async {
    if (!_formKey.currentState!.validate()) return;
    await DatabaseHelper.instance.insert({
      DatabaseHelper.columnSource: _sourceController.text,
      DatabaseHelper.columnDate: _selectedDate.toIso8601String(),
      DatabaseHelper.columnAmount: double.parse(_amountController.text),
      DatabaseHelper.columnNotes:
          _notesController.text.isEmpty ? null : _notesController.text,
    });
    if (!mounted) return;
    _sourceController.clear();
    _amountController.clear();
    _notesController.clear();
    _selectedDate = DateTime.now();
    _refresh();
  }

  Future<void> _deleteEntry(int id) async {
    await DatabaseHelper.instance.delete(id);
    if (mounted) _refresh();
  }

  Future<void> _export() async {
    final path = await DatabaseHelper.instance.exportToCsv();
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text('Exported to $path')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Income Tracker'),
        actions: [
          IconButton(
            icon: const Icon(Icons.file_download),
            tooltip: 'Export to CSV',
            onPressed: _export,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: FutureBuilder<List<Map<String, Object?>>>(
              future: _rows,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text('${snapshot.error}'));
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final rows = snapshot.data!;
                return ListView.builder(
                  itemCount: rows.length,
                  itemBuilder: (context, index) {
                    final row = rows[index];
                    final date =
                        DateTime.parse(row[DatabaseHelper.columnDate] as String);
                    final notes = row[DatabaseHelper.columnNotes] as String?;
                    return ListTile(
                      title: Text(row[DatabaseHelper.columnSource] as String),
                      subtitle: Text([
                        DateFormat.yMMMd().format(date),
                        '\$${row[DatabaseHelper.columnAmount]}',
                        if (notes != null) notes,
                      ].join(' | ')),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete),
                        onPressed: () =>
                            _deleteEntry(row[DatabaseHelper.columnId] as int),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _sourceController,
                    decoration: const InputDecoration(hintText: 'Source'),
                    validator: (value) => (value == null || value.isEmpty)
                        ? 'Please enter a source'
                        : null,
                  ),
                  TextFormField(
                    controller: _amountController,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(hintText: 'Amount'),
                    validator: (value) =>
                        double.tryParse(value ?? '') == null
                            ? 'Please enter a number'
                            : null,
                  ),
                  TextFormField(
                    controller: _notesController,
                    decoration:
                        const InputDecoration(hintText: 'Notes (optional)'),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Text('Date: ${DateFormat.yMMMd().format(_selectedDate)}'),
                      const SizedBox(width: 16),
                      OutlinedButton(
                        onPressed: _pickDate,
                        child: const Text('Select date'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _addEntry,
                    child: const Text('Add entry'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

Run it with `flutter run` on an Android or iOS device or emulator.

## Gotchas and next steps

- The CSV lands in the app's private documents directory, which users can't easily browse to on a phone. To get the file off the device, pass the path to a share sheet (for example the `share_plus` package) instead of only showing a snackbar.
- Amounts are stored as `REAL`, so totals can pick up floating-point rounding. If you start summing amounts, store integer cents instead.
- The table schema is version 1. If you add columns later (a category, or an income/expense flag), bump `_databaseVersion` and add an `onUpgrade` callback; `onCreate` only runs for fresh installs.
- Features worth adding once the basics work: expense entries, per-source monthly totals, and a backup to cloud storage. None of these are implemented here.

## Further reading

- [sqflite on pub.dev](https://pub.dev/packages/sqflite)
- [csv on pub.dev](https://pub.dev/packages/csv)
- [Flutter cookbook: persist data with SQLite](https://docs.flutter.dev/cookbook/persistence/sqlite)
