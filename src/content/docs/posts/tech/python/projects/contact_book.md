---
tags: ['python', 'sql']
title: Build a command-line contact book in Python with SQLite
description: A small menu-driven CLI that adds, lists, updates and deletes contacts in a SQLite database, using only Python's standard library.
pubDate: Fri, 14 September 2025
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2851628136.webp
---

A contact book is a good first database project: one table, four operations (create, read, update, delete), and a text menu. Python ships with the `sqlite3` module, so there is nothing to install. SQLite stores everything in a single local file.

The finished program is one script, `contacts.py`. The sections below build it up piece by piece; put them in the file in this order.

## Set up the database

`sqlite3.connect()` opens the file, or creates it if it doesn't exist. `CREATE TABLE IF NOT EXISTS` means the script can be run again without failing on the second run.

```python
import sqlite3

conn = sqlite3.connect("contacts.db")
c = conn.cursor()

c.execute("""
    CREATE TABLE IF NOT EXISTS contacts (
        id    INTEGER PRIMARY KEY,
        name  TEXT NOT NULL,
        email TEXT,
        phone TEXT
    )
""")
conn.commit()
```

The `id` column gives each row a unique key. The update and delete functions below look contacts up by name to keep the example short, so two contacts with the same name are both affected.

[![](https://mermaid.ink/img/pako:eNpdjzEOwyAMRa-CPOcEzF07ZWWxwEmQwERgpFZR7l4nZYoXW09fz_YBvgQCCz5ha6-Ia8Xs2LHRupnxhQW9tOMPjZmlRl4NY6YHEvrIA-1b4RE7Ly9MkKlmjEGX3koHspGqwOoYaMGexIHjU6PYpcxf9mCldpqg7wGFxplgF0xNKYUopb7HI1c7fxFmR6g?type=png)](https://mermaid.live/edit#pako:eNpdjzEOwyAMRa-CPOcEzF07ZWWxwEmQwERgpFZR7l4nZYoXW09fz_YBvgQCCz5ha6-Ia8Xs2LHRupnxhQW9tOMPjZmlRl4NY6YHEvrIA-1b4RE7Ly9MkKlmjEGX3koHspGqwOoYaMGexIHjU6PYpcxf9mCldpqg7wGFxplgF0xNKYUopb7HI1c7fxFmR6g)

## Add and list contacts

Always pass values as parameters (`?` placeholders) instead of formatting them into the SQL string. The `sqlite3` module escapes them for you, which prevents SQL injection.

```python
def add_contact():
    name = input("Enter name: ")
    email = input("Enter email: ")
    phone = input("Enter phone number: ")

    c.execute(
        "INSERT INTO contacts (name, email, phone) VALUES (?, ?, ?)",
        (name, email, phone),
    )
    conn.commit()
    print("Contact added.")


def display_contacts():
    c.execute("SELECT name, email, phone FROM contacts ORDER BY name")
    rows = c.fetchall()

    if not rows:
        print("No contacts yet.")
        return

    for name, email, phone in rows:
        print(f"Name:  {name}")
        print(f"Email: {email}")
        print(f"Phone: {phone}")
        print()
```

## Update and delete contacts

For updates, an empty answer keeps the current value. The function returns early if both answers are empty; otherwise `c.rowcount` would still hold the count from an earlier statement. `rowcount` is the number of rows the last `UPDATE` or `DELETE` changed, so `0` means no contact had that name.

```python
def update_contact():
    name = input("Enter name of contact to update: ")
    email = input("Enter new email (press Enter to keep current value): ")
    phone = input("Enter new phone number (press Enter to keep current value): ")

    if email and phone:
        c.execute("UPDATE contacts SET email = ?, phone = ? WHERE name = ?", (email, phone, name))
    elif email:
        c.execute("UPDATE contacts SET email = ? WHERE name = ?", (email, name))
    elif phone:
        c.execute("UPDATE contacts SET phone = ? WHERE name = ?", (phone, name))
    else:
        print("Nothing to update.")
        return

    conn.commit()
    print("Contact updated." if c.rowcount > 0 else "Contact not found.")


def delete_contact():
    name = input("Enter name of contact to delete: ")

    c.execute("DELETE FROM contacts WHERE name = ?", (name,))
    conn.commit()
    print("Contact deleted." if c.rowcount > 0 else "Contact not found.")
```

## The menu loop

The loop goes at the bottom of the script. All the functions it calls must be defined before it runs.

```python
def main_menu():
    print("1. Add new contact")
    print("2. Display all contacts")
    print("3. Update a contact")
    print("4. Delete a contact")
    print("5. Exit")
    return input("Enter your choice: ")


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

conn.close()
```

Run it with `python contacts.py`. The data is saved in `contacts.db`, so contacts are still there the next time you start the program.

## Where to take it next

- Look contacts up by `id` instead of name, so duplicate names don't collide. You could also add a `UNIQUE` constraint on `name`.
- Add a search option with `WHERE name LIKE ?` and a parameter like `f"%{term}%"`.
- Use `with conn:` around writes. The connection then commits on success and rolls back on an exception.

Further reading: the [`sqlite3` module docs](https://docs.python.org/3/library/sqlite3.html).
