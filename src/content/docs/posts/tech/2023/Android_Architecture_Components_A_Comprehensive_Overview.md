---
title: "Android Architecture Components: ViewModel, LiveData, Room, WorkManager and Navigation in Kotlin"
pubDate: "2023-08-17T05:09:31.000Z"
lastUpdated: 2026-11-14
description: "A short Kotlin example for each of the main Jetpack architecture libraries (ViewModel, LiveData, Room, Data Binding, WorkManager, Navigation) and the gotchas in each."
tags: ["android", "kotlin"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2223533571.webp
---

Android Architecture Components are the Jetpack libraries Google built for the problems every Android app hits: surviving configuration changes, observing data without leaking an Activity, storing data in SQLite, running background work and moving between screens. Each library is independent, so you can adopt one without the others. This post gives a minimal Kotlin example of each and points out where people usually trip up.

The examples are written against Lifecycle 2.11, Activity 1.13, Room 2.8, WorkManager 2.12 and Navigation 2.10.

## ViewModel and LiveData

A `ViewModel` holds UI state and survives configuration changes such as rotation. It is cleared only when its owner (Activity, Fragment or navigation destination) is finished for good. `LiveData` is an observable holder that only delivers updates to observers whose lifecycle is at least `STARTED`, and removes them automatically when the lifecycle is destroyed.

```kotlin
// build.gradle.kts (app)
dependencies {
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.11.0")
    implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.11.0")
    implementation("androidx.activity:activity-ktx:1.13.0")
}
```

```kotlin
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class CounterViewModel : ViewModel() {
    private val _count = MutableLiveData(0)
    val count: LiveData<Int> = _count

    fun increment() {
        _count.value = (_count.value ?: 0) + 1
    }
}
```

```kotlin
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity

class CounterActivity : AppCompatActivity() {
    private val viewModel: CounterViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_counter)

        val label = findViewById<TextView>(R.id.count_label)
        viewModel.count.observe(this) { count ->
            label.text = count.toString()
        }

        findViewById<Button>(R.id.increment_button).setOnClickListener {
            viewModel.increment()
        }
    }
}
```

Rotate the device and the count stays, because `by viewModels()` returns the same `CounterViewModel` instance to the recreated Activity.

Gotchas:

- A ViewModel survives rotation but **not** process death. Use `SavedStateHandle` (add it as a constructor parameter) for small state that must survive the process being killed.
- Never hold a reference to an Activity, Fragment or View in a ViewModel. It outlives them and leaks them.
- In a Fragment, observe with `viewLifecycleOwner`, not `this`, or you'll register a new observer every time the view is recreated.
- For new Kotlin code, Google's guidance favours `StateFlow` over `LiveData`. LiveData still works and is not deprecated.

## Room

Room is an abstraction over SQLite. You declare entities and DAOs with annotations, and Room's annotation processor generates the implementation and checks your SQL against the schema at compile time.

```kotlin
// build.gradle.kts (app); requires the KSP Gradle plugin
dependencies {
    implementation("androidx.room:room-runtime:2.8.5")
    implementation("androidx.room:room-ktx:2.8.5")
    ksp("androidx.room:room-compiler:2.8.5")
}
```

```kotlin
import android.content.Context
import androidx.lifecycle.LiveData
import androidx.room.*

@Entity
data class User(
    @PrimaryKey val id: String,
    val name: String,
    val age: Int
)

@Dao
interface UserDao {
    @Query("SELECT * FROM user WHERE id = :userId")
    fun observeUser(userId: String): LiveData<User?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: User)
}

@Database(entities = [User::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao

    companion object {
        @Volatile private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "app_database"
                ).build().also { instance = it }
            }
    }
}
```

Using it from a ViewModel:

```kotlin
import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

class UserViewModel(app: Application) : AndroidViewModel(app) {
    private val dao = AppDatabase.get(app).userDao()

    val user = dao.observeUser("123")

    fun save(name: String, age: Int) {
        viewModelScope.launch { dao.insertUser(User("123", name, age)) }
    }
}
```

Gotchas:

- Room throws if you run a blocking query on the main thread. Make write methods `suspend` (or return `Flow`/`LiveData` for reads) and Room moves the work off the main thread for you.
- Build the database once per process. Each `databaseBuilder(...).build()` opens a new connection pool.
- Changing an entity means bumping `version` and supplying a `Migration` (or `AutoMigration`). Without one, Room throws at startup rather than silently losing data, unless you opted into `fallbackToDestructiveMigration()`.

## Data Binding

Data Binding lets layout XML reference variables directly with `@{...}` expressions. Enable it in the module:

```kotlin
// build.gradle.kts (app)
android {
    buildFeatures {
        dataBinding = true
    }
}
```

Wrap the layout in a `<layout>` tag and declare variables in `<data>`:

```xml
<!-- res/layout/activity_main.xml -->
<layout xmlns:android="http://schemas.android.com/apk/res/android">
    <data>
        <variable
            name="user"
            type="com.example.User" />
    </data>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@{user.name}" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="@{String.valueOf(user.age)}" />
    </LinearLayout>
</layout>
```

The build generates `ActivityMainBinding` from the layout name:

```kotlin
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.databinding.DataBindingUtil
import com.example.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = DataBindingUtil.setContentView(this, R.layout.activity_main)
        binding.user = User("123", "John Doe", 25)
    }
}
```

Two-way binding (`@={...}`) is also supported, typically against a `MutableLiveData` or `ObservableField`. To bind LiveData, set `binding.lifecycleOwner = this` or the views won't update.

If you only want typed references to views and no expressions in XML, use [View Binding](https://developer.android.com/topic/libraries/view-binding) instead. It's simpler and builds faster. For new UI, most Google samples now use Jetpack Compose, which doesn't need either.

## WorkManager

WorkManager runs deferrable background work that must complete even if the user leaves the app or the device reboots. It persists work requests in its own database and schedules them through `JobScheduler`.

```kotlin
// build.gradle.kts (app)
dependencies {
    implementation("androidx.work:work-runtime-ktx:2.12.0")
}
```

```kotlin
import android.content.Context
import androidx.work.*

class UploadWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val fileId = inputData.getString("file_id") ?: return Result.failure()
        return try {
            // upload(fileId)
            Result.success()
        } catch (e: java.io.IOException) {
            Result.retry()
        }
    }
}

fun scheduleUpload(context: Context, fileId: String) {
    val request = OneTimeWorkRequestBuilder<UploadWorker>()
        .setInputData(workDataOf("file_id" to fileId))
        .setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        )
        .build()

    WorkManager.getInstance(context)
        .enqueueUniqueWork("upload-$fileId", ExistingWorkPolicy.KEEP, request)
}
```

Gotchas:

- WorkManager is not for work that must start right now while the user watches. Use a coroutine in `viewModelScope` for that, or an expedited request / foreground service for urgent long-running work.
- `PeriodicWorkRequest` has a minimum interval of 15 minutes.
- Use `enqueueUniqueWork` when the same job could be scheduled twice, otherwise you get duplicates.

## Navigation

The Navigation component describes screens and the actions between them in a navigation graph, and handles the Fragment transactions and back stack for you.

```kotlin
// build.gradle.kts (app)
dependencies {
    implementation("androidx.navigation:navigation-fragment-ktx:2.10.2")
    implementation("androidx.navigation:navigation-ui-ktx:2.10.2")
}
```

```xml
<!-- res/navigation/nav_graph.xml -->
<navigation xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/nav_graph"
    app:startDestination="@id/listFragment">

    <fragment
        android:id="@+id/listFragment"
        android:name="com.example.ListFragment">
        <action
            android:id="@+id/action_list_to_detail"
            app:destination="@id/detailFragment" />
    </fragment>

    <fragment
        android:id="@+id/detailFragment"
        android:name="com.example.DetailFragment" />
</navigation>
```

Host the graph in the Activity layout:

```xml
<androidx.fragment.app.FragmentContainerView
    android:id="@+id/nav_host"
    android:name="androidx.navigation.fragment.NavHostFragment"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:defaultNavHost="true"
    app:navGraph="@navigation/nav_graph" />
```

Then navigate from a Fragment:

```kotlin
import androidx.navigation.fragment.findNavController

// inside ListFragment
findNavController().navigate(R.id.action_list_to_detail)
```

To pass arguments type-safely, add the Safe Args Gradle plugin or, since Navigation 2.8, use the Kotlin-serialization-based type-safe routes. For Compose-only apps, also look at [Navigation 3](https://developer.android.com/guide/navigation/navigation-3), a separate library built around a back stack you own.

## Further reading

- [Guide to app architecture](https://developer.android.com/topic/architecture)
- [ViewModel overview](https://developer.android.com/topic/libraries/architecture/viewmodel)
- [Room](https://developer.android.com/training/data-storage/room)
- [WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent)
- [Navigation](https://developer.android.com/guide/navigation)
