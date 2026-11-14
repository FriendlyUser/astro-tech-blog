---
description: How to set up Android's Room library with KSP, define an entity, DAO and database, and read and write data from an Activity with coroutines and Flow.
imgSrc: /imgs/2023/2627778103.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-04-23T06:31:46.000Z'
lastUpdated: 2026-11-14
tags: ["android", "kotlin"]
title: 'Android Room basics: entities, DAOs and a database in Kotlin'
---

Room is the Jetpack library for storing structured data in SQLite on Android. You describe tables as annotated Kotlin classes and queries as annotated interface methods, and Room's annotation processor generates the SQLite code. Because the processor parses your SQL at build time, a typo in a column name breaks the build instead of crashing the app.

This post sets up Room 2.8, defines the three pieces Room needs, and uses them from an Activity.

## Add the dependencies

Room's compiler runs under [KSP](https://kotlinlang.org/docs/ksp-overview.html) in Kotlin projects. The older `kapt` setup still works but is slower, and since Room 2.7 only KSP generates Kotlin code. Apply the KSP Gradle plugin (its version has to match your Kotlin version), then add Room in the module's `build.gradle.kts`:

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

dependencies {
    val roomVersion = "2.8.5"
    implementation("androidx.room:room-runtime:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")
}
```

Older guides also add `room-ktx` for coroutine support. Since Room 2.7.0 that code lives in `room-runtime` and `room-ktx` is an empty artifact, so you can leave it out.

## Entity: one class per table

An `@Entity` class maps to a table, and each instance is a row. Give the auto-generated primary key a default of `0` so you can create new rows without inventing an ID. Room treats `0` as "not set" and lets SQLite assign one.

```kotlin
import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "full_name") val fullName: String,
    val email: String,
)
```

Without `@ColumnInfo`, the column name is the property name.

## DAO: the queries

A DAO (data access object) is an interface whose methods Room implements. `suspend` methods run once on Room's background executor. A method that returns `Flow` emits the current result and then emits again whenever the `users` table changes.

```kotlin
import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(user: User): Long

    @Query("SELECT * FROM users ORDER BY full_name")
    fun getAllUsers(): Flow<List<User>>

    @Update
    suspend fun update(user: User)

    @Delete
    suspend fun delete(user: User)
}
```

`@Insert` returns the new row ID when the return type is `Long`.

## Database: the entry point

The database class lists the entities, holds the schema version, and exposes the DAOs.

```kotlin
import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [User::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
}
```

`exportSchema = false` keeps this example from warning about a missing schema directory. In a real app, export the schema (see the last section) so you can test migrations.

Opening a database is expensive, so build one instance and share it. A lazy property on your `Application` subclass is the simplest way:

```kotlin
import android.app.Application
import androidx.room.Room

class App : Application() {
    val database: AppDatabase by lazy {
        Room.databaseBuilder(this, AppDatabase::class.java, "app_database").build()
    }
}
```

Register it in `AndroidManifest.xml` with `android:name=".App"` on the `<application>` element.

## Read and write from an Activity

Room throws an `IllegalStateException` if you run a blocking query on the main thread. `suspend` and `Flow` DAO methods don't have that problem because Room moves the work off the main thread itself, so you can call them from `lifecycleScope`:

```kotlin
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val userDao = (application as App).database.userDao()

        lifecycleScope.launch {
            userDao.insert(User(fullName = "John Doe", email = "john.doe@example.com"))
        }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                userDao.getAllUsers().collect { users ->
                    // Update the UI with the latest list
                }
            }
        }
    }
}
```

`repeatOnLifecycle` stops collecting when the Activity goes to the background and restarts when it comes back, so the Flow doesn't keep querying for a screen nobody can see. In a larger app this code belongs in a ViewModel, which exposes the Flow to the UI.

## Gotchas

- **Schema changes need a migration.** If you change an entity and bump `version` without a migration, Room throws at startup. Add a `Migration` object with `addMigrations()`, or use `@AutoMigration` for simple changes such as adding a column. Both need the schema exported: set `exportSchema = true` and configure a schema directory with the [Room Gradle plugin](https://developer.android.com/training/data-storage/room/migrating-db-versions).
- **`fallbackToDestructiveMigration` deletes user data.** When no migration matches, it drops and recreates the tables. That is fine during early development and a bad surprise in production.
- **`REPLACE` is a delete plus an insert.** With foreign keys that cascade on delete, replacing a parent row also deletes its children. Use `@Upsert` (Room 2.5+) if you want insert-or-update.
- **Use Room only for structured data.** Small key/value settings fit DataStore better.

## Further reading

- [Save data in a local database using Room](https://developer.android.com/training/data-storage/room)
- [Room release notes](https://developer.android.com/jetpack/androidx/releases/room)
