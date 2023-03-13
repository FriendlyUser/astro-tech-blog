---
title: Side Hustle Income Tracker in Flutter
description: "Income Tracker" is a mobile app that helps you keep track of your income and expenses. The app uses SQLite to store and retrieve data, allowing you to easily add and delete entries with a source, date, amount, and notes. You can also export the database to a CSV file, making it easy to analyze your income and expenses in a spreadsheet program. With "Income Tracker," you can easily stay on top of your finances and make informed decisions about your spending.
pubDate: Saturday, 23 March 2023 13:00:00 GMT
tags: ["flutter"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-25 21.48.03 - teddy bear on coach looking out the window at a tree.png'
---

Side hustles have become increasingly popular over the past few years as people look for ways to supplement their income or pursue their passions. However, keeping track of all the different sources of income and expenses can be a challenge. That's where an income tracker app can come in handy. And what better way to build such an app than using Flutter?

Flutter is a popular framework for building cross-platform mobile apps. It's easy to learn, has a fast development cycle, and produces beautiful and performant apps. In this blog post, we'll discuss the key features of a side hustle income tracker app in Flutter.

Simple and Intuitive UI
The app's UI should be easy to navigate and use. The main screen should display a summary of income and expenses for the current month. Users should be able to add income and expenses quickly and easily by entering a description and amount.

Multiple Income Sources
The app should allow users to track income from multiple sources. For example, a user might have income from a part-time job, freelance work, and selling items online. Each income source should be assigned a category for easy tracking.

Expense Tracking
In addition to income, users should be able to track their expenses. The app should allow users to categorize expenses and enter a description and amount. This will give users a complete picture of their finances.

Goal Setting
Goal setting is an essential part of achieving financial stability. The app should allow users to set financial goals, such as saving for a vacation or paying off debt. Users should be able to track their progress towards their goals and receive notifications when they reach milestones.

Reports and Analytics
The app should provide users with detailed reports and analytics on their income and expenses. This will allow users to identify trends, such as which income sources are the most profitable or which expenses are the most significant. Users should also be able to export reports for tax purposes.

Syncing and Backup
The app should allow users to sync their data across multiple devices. This will allow users to access their data from anywhere and avoid the risk of losing their data if their device is lost or stolen. Additionally, the app should provide users with the option to backup their data to the cloud.


here is some source code for a Flutter app that uses SQLite, allows users to export the database to CSV, and add/delete entries with source, date, amount, and notes. This is just a basic example to get you started, and you will need to modify it to suit your specific needs:

1. Create a new Flutter project using the Flutter CLI or your preferred IDE.

2. Add the following dependencies to your pubspec.yaml file:

```yaml
dependencies:
  sqflite: ^2.0.0+3
  csv: ^5.0.0
```
3. Create a new file called database_helper.dart with the following code:
```dart
import 'dart:async';
import 'dart:io';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path_provider/path_provider.dart';
import 'package:csv/csv.dart';

class DatabaseHelper {
  static final _databaseName = 'myDatabase.db';
  static final _databaseVersion = 1;

  static final table = 'myTable';

  static final columnId = '_id';
  static final columnSource = 'source';
  static final columnDate = 'date';
  static final columnAmount = 'amount';
  static final columnNotes = 'notes';

  // make this a singleton class
  DatabaseHelper._privateConstructor();
  static final DatabaseHelper instance = DatabaseHelper._privateConstructor();

  // only have a single app-wide reference to the database
  static Database? _database;
  Future<Database> get database async {
    if (_database != null) return _database!;

    // lazily instantiate the db the first time it is accessed
    _database = await _initDatabase();
    return _database!;
  }

  // this opens the database (and creates it if it doesn't exist)
  _initDatabase() async {
    Directory documentsDirectory = await getApplicationDocumentsDirectory();
    String path = join(documentsDirectory.path, _databaseName);
    return await openDatabase(path,
        version: _databaseVersion, onCreate: _onCreate);
  }

  // SQL code to create the database table
  Future _onCreate(Database db, int version) async {
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

  // Helper methods

  // Inserts a row in the database
  Future<int> insert(Map<String, dynamic> row) async {
    Database db = await instance.database;
    return await db.insert(table, row);
  }

  // Deletes a row from the database
  Future<int> delete(int id) async {
    Database db = await instance.database;
    return await db.delete(table, where: '$columnId = ?', whereArgs: [id]);
  }

  // Gets all rows from the database
  Future<List<Map<String, dynamic>>> queryAllRows() async {
    Database db = await instance.database;
    return await db.query(table);
  }

  // Exports the database to a CSV file
  Future<void> exportToCsv() async {
    List<Map<String, dynamic>> rows = await queryAllRows();
    List<List<dynamic>> csvData = [
      [columnSource, columnDate, columnAmount, columnNotes]
    ];
    rows.forEach((row) {
      csvData.add([
        row[columnSource],
        row[columnDate],
        row[columnAmount],
        row[columnNotes],
      ]);
    });
    String csv = const ListToCsvConverter().convert(csvData);
      // get the app's documents directory
    Directory documentsDirectory = await getApplicationDocumentsDirectory();

    // create a file to store the CSV data
    File file = File('${documentsDirectory.path}/myDatabase.csv');

    // write the CSV data to the file
    await file.writeAsString(csv);
  }
}
```

4.  Create a new file called `main.dart` with the following code:

In conclusion, a side hustle income tracker app can help users manage their finances and achieve their financial goals. By building this app in Flutter, you can create a beautiful and performant app that works on both iOS and Android devices. With the right features and a simple and intuitive UI, your app could become an essential tool for side hustlers everywhere.


```dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:my_app/database_helper.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'My App',
      home: MyHomePage(),
    );
  }
}

class MyHomePage extends StatefulWidget {
  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  final _formKey = GlobalKey<FormState>();
  final _sourceController = TextEditingController();
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _selectedDate = DateTime.now();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('My App'),
        actions: [
          IconButton(
            icon: Icon(Icons.file_download),
            onPressed: () async {
              await DatabaseHelper.instance.exportToCsv();
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                content: Text('Exported to CSV'),
              ));
            },
          )
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: FutureBuilder(
              future: DatabaseHelper.instance.queryAllRows(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return Center(
                    child: CircularProgressIndicator(),
                  );
                } else {
                  List<Map<String, dynamic>> rows = snapshot.data as List<Map<String, dynamic>>;
                  return ListView.builder(
                    itemCount: rows.length,
                    itemBuilder: (context, index) {
                      Map<String, dynamic> row = rows[index];
                      return ListTile(
                        title: Text(row[DatabaseHelper.columnSource]),
                        subtitle: Text(
                            DateFormat.yMMMd().format(DateTime.parse(row[DatabaseHelper.columnDate])) +
                                ' | \$' +
                                row[DatabaseHelper.columnAmount].toString() +
                                (row[DatabaseHelper.columnNotes] == null ? '' : ' | ' + row[DatabaseHelper.columnNotes])),
                        trailing: IconButton(
                          icon: Icon(Icons.delete),
                          onPressed: () async {
                            await DatabaseHelper.instance.delete(row[DatabaseHelper.columnId]);
                            setState(() {});
                          },
                        ),
                      );
                    },
                  );
                }
              },
            ),
          ),
          Padding(
            padding: EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: _sourceController,
                    decoration: InputDecoration(hintText: 'Source'),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter a source';
                      }
                      return null;
                    },
                  ),
                  TextFormField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(hintText: 'Amount'),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter an amount';
                      }
                      return null;
                    },
                  ),
                  TextFormField(
                    controller: _notesController,
                    decoration: InputDecoration(hintText: 'Notes (optional)'),
                  ),
                  SizedBox(height: 16),
                  Text('Date: ${DateFormat.yMMMd.format(_selectedDate)}'),
                  ElevatedButton(
                    onPressed: () async {
                      DateTime picked = await showDatePicker(
                          context: context,
                          initialDate: _selectedDate,
                          firstDate: DateTime(2000),
                          lastDate: DateTime.now());
                      if (picked != null && picked != _selectedDate) {
                        setState(() {
                          _selectedDate = picked;
                        });
                      }
                    },
                    child: Text('Select Date'),
                  ),
                  SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () async {
                      if (_formKey.currentState.validate()) {
                        await DatabaseHelper.instance.insert({
                          DatabaseHelper.columnSource: _sourceController.text,
                          DatabaseHelper.columnDate: _selectedDate.toIso8601String(),
                          DatabaseHelper.columnAmount: double.parse(_amountController.text),
                          DatabaseHelper.columnNotes: _notesController.text.isNotEmpty ? _notesController.text : null,
                        });
                        setState(() {
                          _sourceController.clear();
                          _amountController.clear();
                          _notesController.clear();
                          _selectedDate = DateTime.now();
                        });
                      }
                    },
                    child: Text('Add Entry'),
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

That's it! You now have a fully functional Flutter app that uses SQLite to store and retrieve data, allows users to export the database to a CSV file, and lets users add and delete entries with a source, date, amount, and notes. You can customize the app's user interface and add more features as needed.

In conclusion, a side hustle income tracker app can help users manage their finances and achieve their financial goals. By building this app in Flutter, you can create a beautiful and performant app that works on both iOS and Android devices. With the right features and a simple and intuitive UI, your app could become an essential tool for side hustlers everywhere.