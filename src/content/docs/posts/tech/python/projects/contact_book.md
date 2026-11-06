---
tags: ['python', 'sql']
title: How to build a contact book cli application in Python
description: A contact book is a simple but useful tool that allows users to store and manage their contacts. In this article, we will discuss how to implement a contact book using Python and SQLite.
pubDate: Fri, 14 September 2025
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2851628136.png
---

Introduction

A contact book is a simple but useful tool that allows users to store and manage their contacts. In this article, we will discuss how to implement a contact book using Python and SQLite.

SQLite is a lightweight relational database management system that is commonly used for local data storage. Python has built-in support for SQLite, which makes it a great choice for simple database applications.

In this tutorial, we will cover the following topics:

- Setting up the SQLite database
- Creating the contact book interface
- Adding contacts to the database
- Displaying contacts from the database
- Updating and deleting contacts from the database
- Setting up the SQLite database

Before we can create a contact book, we need to set up a SQLite database to store the contact information. We can do this using the sqlite3 module in Python.

To create the database, we first need to import the sqlite3 module and connect to a new or existing database file using the connect() method. We can create a new database file by providing a filename that does not already exist. If the file already exists, it will be opened and used as the database.

```python
import sqlite3

conn = sqlite3.connect('contacts.db')
```

Once we have connected to the database, we can create a table to store the contact information. In this example, we will create a table called "contacts" with columns for the contact's name, email address, and phone number.

[![](https://mermaid.ink/img/pako:eNpdjzEOwyAMRa-CPOcEzF07ZWWxwEmQwERgpFZR7l4nZYoXW09fz_YBvgQCCz5ha6-Ia8Xs2LHRupnxhQW9tOMPjZmlRl4NY6YHEvrIA-1b4RE7Ly9MkKlmjEGX3koHspGqwOoYaMGexIHjU6PYpcxf9mCldpqg7wGFxplgF0xNKYUopb7HI1c7fxFmR6g?type=png)](https://mermaid.live/edit#pako:eNpdjzEOwyAMRa-CPOcEzF07ZWWxwEmQwERgpFZR7l4nZYoXW09fz_YBvgQCCz5ha6-Ia8Xs2LHRupnxhQW9tOMPjZmlRl4NY6YHEvrIA-1b4RE7Ly9MkKlmjEGX3koHspGqwOoYaMGexIHjU6PYpcxf9mCldpqg7wGFxplgF0xNKYUopb7HI1c7fxFmR6g)


```python
c = conn.cursor()

c.execute('''CREATE TABLE contacts
             (name text, email text, phone text)''')

conn.commit()
```

Creating the contact book interface

Now that we have set up the database, we can create a simple interface for the contact book using Python's built-in input and print functions.

First, we can create a main menu that allows the user to choose between adding a new contact, displaying all contacts, updating a contact, and deleting a contact.


```python
def main_menu():
    print("1. Add new contact")
    print("2. Display all contacts")
    print("3. Update a contact")
    print("4. Delete a contact")
    print("5. Exit")

    choice = input("Enter your choice: ")
    return choice
```

Next, we can create a function for adding a new contact. This function will prompt the user for the contact's name, email address, and phone number, and then insert the new contact into the database using a SQL INSERT statement.

```python
def add_contact():
    name = input("Enter name: ")
    email = input("Enter email: ")
    phone = input("Enter phone number: ")

    c.execute("INSERT INTO contacts VALUES (?, ?, ?)", (name, email, phone))
    conn.commit()

    print("Contact added successfully.")
```

Adding contacts to the database

Now that we have the main menu and add_contact() function set up, we can test our program by adding a few contacts to the database.


```python
while True:
    choice = main_menu()

    if choice == "1":
        add_contact()
    elif choice == "2":
        display_contacts()
    elif choice == "3":
        update_contact()
    elif choice == "4":
        delete_contact()
    elif choice == "5":
        break
    else:
        print("Invalid choice. Please try again.")
```

Displaying contacts from the database

To display all the contacts in the database, we can create a function called display_contacts() that uses a SQL SELECT statement to retrieve all rows from the contacts table. We can then iterate over the rows and print the contact information.

Once we have fetched all the rows from the contacts table using the fetchall() method, we can loop through the rows and print out the contact information using the print() function.

```python
def display_contacts():
    c.execute("SELECT * FROM contacts")
    rows = c.fetchall()

    for row in rows:
        print("Name: ", row[0])
        print("Email: ", row[1])
        print("Phone: ", row[2])
        print("\n")
```

Updating and deleting contacts from the database

Finally, we can add functionality to update and delete contacts from the database. To update a contact, we can prompt the user for the contact's name, and then use a SQL UPDATE statement to modify the corresponding row in the contacts table.

```python
def update_contact():
    name = input("Enter name of contact to update: ")
    email = input("Enter new email (press enter to keep current value): ")
    phone = input("Enter new phone number (press enter to keep current value): ")

    if email != "" and phone != "":
        c.execute("UPDATE contacts SET email=?, phone=? WHERE name=?", (email, phone, name))
    elif email != "":
        c.execute("UPDATE contacts SET email=? WHERE name=?", (email, name))
    elif phone != "":
        c.execute("UPDATE contacts SET phone=? WHERE name=?", (phone, name))

    conn.commit()

    if c.rowcount == 1:
        print("Contact updated successfully.")
    else:
        print("Contact not found.")
```

To delete a contact, we can prompt the user for the contact's name, and then use a SQL DELETE statement to remove the corresponding row from the contacts table.

```python
def delete_contact():
    name = input("Enter name of contact to delete: ")

    c.execute("DELETE FROM contacts WHERE name=?", (name,))
    conn.commit()

    if c.rowcount == 1:
        print("Contact deleted successfully.")
    else:
        print("Contact not found.")
```

Conclusion

In this tutorial, we have shown how to implement a contact book using Python and SQLite. We started by setting up the SQLite database, then created a simple interface for the contact book using Python's input and print functions.

We then demonstrated how to add contacts to the database using a SQL INSERT statement, and how to display contacts from the database using a SQL SELECT statement. Finally, we added functionality to update and delete contacts from the database using SQL UPDATE and DELETE statements.

By following this tutorial, you should have a good understanding of how to create a simple database application in Python using SQLite.