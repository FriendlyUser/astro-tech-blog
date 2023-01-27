---
title: Flutter todo list with supabase
description: Building a simple todo list with supabase
alt: my first blog post
tags: ["flutter", "supabase"]
layout: '@/templates/BasePost.astro'
pubDate: Sunday, 7 Feburary 2023 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-12 19.51.13 - fridge with blank paper on it.png'
---


This code defines a Homepage widget that uses a FutureBuilder to display a list of todos fetched from an API. The FutureBuilder widget listens to a Future object and builds a widget based on the Future's state. In this case, the Future is a `Future<TodoModel>` object that is created by calling the fetchTodos function. The TodoModel class is defined in a different file and is used to represent a list of todos.

The Homepage widget has a floating action button that navigates to a different page when pressed. This page is defined by the AddTodo widget and allows the user to add a new todo to the list.

The todos are displayed in a ListView, with each todo represented as a ListTile widget. Each ListTile widget has a title, a description, and two icons - one for marking a todo as done and one for deleting it. When a todo is marked as done or deleted, the FutureBuilder is rebuilt using the updated `Future<TodoModel>` object, which reflects the changes made to the list of todos.

```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter_todo/api/api.dart';
import 'package:supabase_flutter_todo/model/todo_model.dart';
import 'package:supabase_flutter_todo/screen/add_todo.dart';

import '../api/sp_client.dart';

class Homepage extends StatefulWidget {
  const Homepage({Key? key}) : super(key: key);

  @override
  State<Homepage> createState() => _HomepageState();
}

class _HomepageState extends State<Homepage> {
  Future<TodoModel>? futureTodoList;

  @override
  void initState() {
    super.initState();
    futureTodoList = fetchTodos();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Todo List'),
      ),
      body: Center(
        child: FutureBuilder<TodoModel>(
          future: futureTodoList,
          builder: (context, snapshot) {
            if (snapshot.hasData) {
              return ListView.builder(
                  itemCount: snapshot.data!.todos.length,
                  itemBuilder: (BuildContext context, int index) {
                    var listItem = snapshot.data!.todos[index];
                    var isDone = listItem.isDone;
                    return ListTile(
                      title: Text(listItem.title),
                      subtitle: Text(listItem.description),
                      onTap: () => {
                        // open menu for delete item?
                        // alert menu
                        showMenu(
                          position: RelativeRect.fromSize(
                            Rect.fromCenter(
                                center: Offset.zero, width: -100, height: -100),
                            const Size(100, 100),
                          ),
                          items: <PopupMenuEntry>[
                            PopupMenuItem(
                              child: Row(
                                children: const <Widget>[
                                  Icon(Icons.delete),
                                  Text("Delete"),
                                ],
                              ),
                            )
                          ],
                          context: context,
                        )
                      },
                      trailing: isDone
                          ? IconButton(
                              icon: const Icon(
                                  Icons.radio_button_checked_outlined),
                              onPressed: () {
                                SBHelper.setDone(listItem.id, false);
                                Future.delayed(const Duration(milliseconds: 500), () {
                                  setState(() {
                                    futureTodoList = fetchTodos();
                                  });
                                });
                              })
                          : IconButton(
                              icon: const Icon(
                                  Icons.radio_button_unchecked_outlined),
                              onPressed: () {
                                // send api call to check the todo
                                SBHelper.setDone(listItem.id, true);
                                Future.delayed(const Duration(milliseconds: 500), () {
                                  setState(() {
                                    futureTodoList = fetchTodos();
                                  });
                                });
                              }),
                    );
                  });
            } else if (snapshot.hasError) {
              return Text("${snapshot.error}");
            }

            // By default, show a loading spinner.
            return const CircularProgressIndicator();
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Add your onPressed code here!
          // go to add todo page
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const AddTodo()),
          );
        },
        backgroundColor: Colors.green,
        child: const Icon(Icons.add),
      ),
    );
  }

  Future<TodoModel> fetchTodos() async {
    final todoList = await SBHelper.getAllTodo();
    return TodoModel.fromJson(todoList);
  }
}
```


```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter_todo/api/sp_client.dart';

class AddTodo extends StatefulWidget {
  const AddTodo({Key? key}) : super(key: key);

  @override
  State<AddTodo> createState() => _AddTodoState();
}

class _AddTodoState extends State<AddTodo> {
  final _formKey = GlobalKey<FormState>();
  final titleController = TextEditingController();
  final descController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Todo'),
      ),
      body: Form(
        key: _formKey,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              TextFormField(
                controller: titleController,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  labelText: 'Title',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter title';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16.0),
              TextFormField(
                controller: descController,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  labelText: 'Description',
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter description';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16.0),
              ElevatedButton(
                onPressed: () {
                  if (_formKey.currentState!.validate()) {
                    SBHelper.addTodo(titleController.text, descController.text);
                    Navigator.pop(context);
                  }
                },
                child: const Text('Submit'),
              )
            ],
          ),
        ),
      ),
    );
  }
}
```

This code defines a AddTodo widget that allows the user to add a new todo to the list. The widget contains a form with two text fields - one for the title of the todo and one for its description. The form is validated using the Form widget's validate method, and if the form is valid, the todo is added to the list by calling the SBHelper.addTodo function. This function is defined in the sp_client.dart file and is used to add a new todo to the list via the API. Once the todo is added, the user is redirected back to the Homepage widget.


```dart
import 'package:supabase/supabase.dart';
import "package:supabase_flutter_todo/constants.dart";

class SBHelper {
  static final SupabaseClient supabase = SupabaseClient(
    Constants.supabaseUrl,
    Constants.supabaseAnnonKey
  );

  static SupabaseClient getClient() {
    return supabase;
  }

  static Future<List<dynamic>> getAllTodo() async {
    final response = await supabase.from('todo').select();
    return response;
  }
  // add todo
  static Future<Map<String, dynamic>> addTodo(
      String title, String description) async {
    final response = await supabase.from('todo').insert([
      {
        'title': title,
        'description': description,
        'isDone': false,
      }
    ]);
    return response;
  }
  // set isDone flag to true
  static Future<void> setDone(int id, bool isDone) async {
    await supabase.from('todo').update({'isDone': isDone}).eq('id', id);
  }
}
```

This code defines a SBHelper class that provides utility functions for interacting with the API. The SBHelper class uses the SupabaseClient class from the supabase package to make HTTP requests to the API. The SupabaseClient class takes the URL of the API and an authorization key as arguments and uses these to authenticate requests made to the API.

The SBHelper class has three static functions - getAllTodo, addTodo, and setDone. The getAllTodo function makes a SELECT request to the API to get a list of all todos in the database. The addTodo function makes an INSERT request to the API to add a new todo to the database. The setDone function makes an UPDATE request to the API to set the isDone flag of a todo to true or false, depending on the value passed to the function.


## References

* https://github.com/FriendlyUser/supabase_flutter_todo