---
title: "Firebase Realtime Database on Android: setup, reads, writes and security rules"
pubDate: "2024-07-04T02:40:40.000Z"
lastUpdated: 2026-11-14
description: "Add Firebase Realtime Database to an Android app with the Firebase BoM, write and listen for data in Java, enable offline persistence, and lock it down with rules."
tags: ["android", "java", "firebase"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1086816529.webp
---

Firebase Realtime Database is a Google-hosted NoSQL database that stores everything as one big JSON tree. Clients attach listeners to paths in the tree, and any change is pushed to every connected client within moments. That makes it a good fit for chat, presence indicators and small collaborative apps. It's a poor fit for complex queries: you can sort and filter on one child key at a time, with no joins. For richer querying, Google points new projects at Cloud Firestore.

## What you get

- **Live sync.** Listeners fire with the current value, then again on every change.
- **Offline writes.** The client queues writes made while offline and sends them when it reconnects. With disk persistence enabled (off by default, see below), cached data and queued writes also survive an app restart.
- **Security Rules.** A JSON rules language, evaluated on the server, decides who can read and write each path.
- **Limits worth knowing.** A single database allows 200,000 simultaneous connections (100 on the free Spark plan) and around 1,000 writes per second. Past that, you shard data across multiple database instances.

## Setup

1. In the [Firebase console](https://console.firebase.google.com/), create a project, add an Android app with your package name, and download `google-services.json` into the `app/` directory.
2. In the console, open **Realtime Database** and create a database. Pick **locked mode** unless you're only experimenting; test mode lets anyone read and overwrite your data.
3. Add the Google services Gradle plugin and the Firebase BoM. With the Kotlin DSL, in the root `build.gradle.kts`:

```kotlin
plugins {
    id("com.google.gms.google-services") version "4.6.0" apply false
}
```

In `app/build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:35.2.0"))
    implementation("com.google.firebase:firebase-database")
}
```

The BoM pins compatible versions of every Firebase library, so the individual Firebase dependencies don't need version numbers. The separate `-ktx` artifacts are gone: the Kotlin extensions now live in the main modules.

## Getting a database reference

```java
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

FirebaseDatabase database = FirebaseDatabase.getInstance();
DatabaseReference users = database.getReference("users");
```

The no-argument `getInstance()` only finds databases in `us-central1`. If you created the database in another region, pass its URL, which you'll find at the top of the Realtime Database page in the console:

```java
FirebaseDatabase database =
        FirebaseDatabase.getInstance("https://my-app-default-rtdb.europe-west1.firebasedatabase.app");
```

## Writing data

The SDK maps plain Java objects to JSON. The class needs a public no-argument constructor and public getters (or public fields):

```java
public class User {
    private String name;
    private String email;

    public User() {} // required for getValue(User.class)

    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }

    public String getName() { return name; }
    public String getEmail() { return email; }
}
```

`push()` creates a child with a unique, time-ordered key:

```java
users.push()
        .setValue(new User("John Doe", "john.doe@example.com"))
        .addOnFailureListener(e -> Log.w("Users", "Write failed", e));
```

To update a few fields without overwriting the whole node, use `updateChildren(Map<String, Object>)` instead of `setValue`.

## Listening for data

`addValueEventListener` fires once with the current data and again whenever anything under that path changes:

```java
import android.util.Log;
import androidx.annotation.NonNull;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.ValueEventListener;

ValueEventListener listener = new ValueEventListener() {
    @Override
    public void onDataChange(@NonNull DataSnapshot snapshot) {
        for (DataSnapshot child : snapshot.getChildren()) {
            User user = child.getValue(User.class);
            if (user != null) {
                Log.d("Users", child.getKey() + ": " + user.getName() + ", " + user.getEmail());
            }
        }
    }

    @Override
    public void onCancelled(@NonNull DatabaseError error) {
        // Usually a permission-denied error from your security rules
        Log.w("Users", "Listener cancelled", error.toException());
    }
};

users.addValueEventListener(listener);
```

Remove the listener when the screen goes away (for example in `onStop`) with `users.removeEventListener(listener)`, or it keeps downloading updates and holds a reference to your Activity. For a one-off read, use `users.get()`, which returns a `Task<DataSnapshot>`.

A value listener on `users` downloads the entire list every time any user changes. For lists, prefer `addChildEventListener`, which tells you which child was added, changed or removed, and limit the data with a query such as `users.orderByKey().limitToLast(50)`.

## Offline persistence

Disk persistence is off by default. Turn it on once, before you create any references, usually in `Application.onCreate()`:

```java
FirebaseDatabase.getInstance().setPersistenceEnabled(true);
```

By default the SDK caches up to 10 MB of previously synced data and evicts the least recently used data beyond that. Transactions are not persisted across app restarts.

## Security rules

Rules are set in the console under **Realtime Database → Rules**, or deployed with the Firebase CLI. Rules cascade: a `.read` or `.write` granted at a path applies to everything below it, and a child rule can't take it away. This version lets any signed-in user read the user list, but only write their own record:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

`auth` is only set when the user is signed in with Firebase Authentication (the `firebase-auth` library). To use rules like this, write records under the signed-in user's UID (`users.child(FirebaseAuth.getInstance().getUid())`) rather than under `push()` keys. Rules are not filters: a read on `/users` that isn't allowed fails entirely rather than returning only the permitted children.

## Further reading

- [Get started with Realtime Database on Android](https://firebase.google.com/docs/database/android/start)
- [Structure your database](https://firebase.google.com/docs/database/android/structure-data)
- [Enabling offline capabilities](https://firebase.google.com/docs/database/android/offline-capabilities)
- [Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Usage limits](https://firebase.google.com/docs/database/usage/limits)
