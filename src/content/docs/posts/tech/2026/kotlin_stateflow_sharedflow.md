---
title: "StateFlow and SharedFlow in Kotlin for Android UI state"
description: "Hot and cold flows, StateFlow for screen state, SharedFlow for one-off events, stateIn with WhileSubscribed(5000), repeatOnLifecycle, and testing with runTest."
tags: ["Kotlin", "Android", "Coroutines", "StateFlow", "Jetpack Compose", "Testing"]
pubDate: "2026-09-12T16:00:00.000Z"
imgSrc: "/imgs/2026/kotlin_stateflow_sharedflow.webp"
imgAlt: "A ViewModel emitting a stream of UI state into a StateFlow box and one-off events into a SharedFlow pipe, both feeding an Android screen"
---

`StateFlow` and `SharedFlow` are the two hot flow types in kotlinx.coroutines. On Android they replace `LiveData` in most new code: a ViewModel exposes the screen's state as a `StateFlow`, and the UI collects it while it is visible. `SharedFlow` covers the cases that aren't state, like broadcasting events to several collectors.

The code here was written against Kotlin 2.2, kotlinx.coroutines 1.10.2 and AndroidX Lifecycle 2.9. The APIs it uses have been stable for several releases.

## Cold flows and hot flows

A flow built with `flow { }` is *cold*: nothing happens until someone collects it, and every collector runs the block from the start. Two collectors mean two database queries or two network calls:

```kotlin
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.*

fun main() = runBlocking {
    val cold = flow {
        println("cold: starting")
        emit(1)
        emit(2)
    }
    cold.collect { println("A got $it") }
    cold.collect { println("B got $it") }
}
```

"cold: starting" is printed twice, once per collector.

A *hot* flow exists independently of its collectors. It holds or broadcasts values whether anyone is listening or not, and every collector shares the same source. That's what you want for UI state: one source of truth in the ViewModel, no matter how many times the screen subscribes.

## StateFlow: always has a value

A `StateFlow<T>` always holds exactly one current value, readable at any time through `.value`. Collectors get the current value immediately, then every change. Two properties matter for UI state:

- **It's conflated.** A slow collector skips intermediate values and only sees the latest. For rendering a screen that's exactly right; for anything where every value matters, it isn't.
- **It skips equal values.** Setting `value` to something `equal` to the current value doesn't emit. Use immutable `data class`es for state, so equality means "nothing changed".

The usual ViewModel shape is a private `MutableStateFlow` and a public read-only view of it:

```kotlin
private val _uiState = MutableStateFlow(TodoUiState())
val uiState: StateFlow<TodoUiState> = _uiState.asStateFlow()

fun setFilter(filter: Filter) {
    _uiState.update { it.copy(filter = filter) }
}
```

`update { }` is an atomic read-modify-write. Prefer it over `_uiState.value = _uiState.value.copy(...)`, which can lose an update when two coroutines change the state at the same time.

## stateIn: turning a repository flow into UI state

Most screen state is derived from other flows: a Room query, a DataStore preference, a filter the user picked. Combine them, then convert the result to a `StateFlow` with `stateIn`:

```kotlin
data class Todo(val id: Long, val title: String, val done: Boolean)

enum class Filter { ALL, OPEN, DONE }

data class TodoUiState(
    val todos: List<Todo> = emptyList(),
    val filter: Filter = Filter.ALL,
    val isLoading: Boolean = true,
)

sealed interface TodoEvent {
    data class ShowMessage(val text: String) : TodoEvent
}

interface TodoRepository {
    fun observeTodos(): Flow<List<Todo>>
    suspend fun delete(id: Long)
}

class TodoViewModel(private val repository: TodoRepository) : ViewModel() {
    private val selectedFilter = MutableStateFlow(Filter.ALL)

    val uiState: StateFlow<TodoUiState> =
        combine(repository.observeTodos(), selectedFilter) { todos, selected ->
            TodoUiState(
                todos = todos.matching(selected),
                filter = selected,
                isLoading = false,
            )
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = TodoUiState(),
        )

    private val _events = MutableSharedFlow<TodoEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<TodoEvent> = _events.asSharedFlow()

    fun setFilter(filter: Filter) {
        selectedFilter.value = filter
    }

    fun delete(todo: Todo) {
        viewModelScope.launch {
            repository.delete(todo.id)
            _events.emit(TodoEvent.ShowMessage("Deleted ${todo.title}"))
        }
    }
}

private fun List<Todo>.matching(selected: Filter): List<Todo> = when (selected) {
    Filter.ALL -> this
    Filter.OPEN -> filterNot { it.done }
    Filter.DONE -> filter { it.done }
}
```

`stateIn` needs three things:

- **A scope** to run the upstream in. `viewModelScope` is cancelled when the ViewModel is cleared.
- **An initial value**, shown until the first upstream value arrives. Here it's a loading state.
- **A start policy.** `SharingStarted.WhileSubscribed(5_000)` starts collecting the upstream when the first subscriber appears, and stops 5 seconds after the last one goes away.

Why 5 seconds? When the user rotates the phone, the Activity is destroyed and recreated, and for a moment there are no subscribers. A 5 second grace period is long enough to cover that, so the Room query isn't torn down and restarted on every rotation. But when the user leaves the app, the subscription ends, and after 5 seconds the upstream stops too, so you aren't running database queries for a screen nobody can see. The last value stays cached in the `StateFlow`, so the UI shows it immediately when the user comes back.

The other policies are `SharingStarted.Eagerly` (start now, never stop) and `SharingStarted.Lazily` (start on first subscriber, never stop). Both keep the upstream running for the whole life of the ViewModel, which is wasteful for anything that listens to a database or a location sensor.

## SharedFlow for events

Some things aren't state: "show a snackbar", "navigate to the detail screen". A `SharedFlow` has no current value. It broadcasts each emitted value to the collectors that are subscribed at that moment, and its constructor lets you configure a replay cache and a buffer:

```kotlin
private val _events = MutableSharedFlow<TodoEvent>(extraBufferCapacity = 1)
val events: SharedFlow<TodoEvent> = _events.asSharedFlow()
```

With the default `replay = 0`, a value emitted while nobody is collecting is gone. That's the main trade-off with SharedFlow events. If the user rotates the device just as `delete` finishes, the "Deleted" message is emitted in the gap between the old screen's collector stopping and the new one starting, and the snackbar never appears.

`extraBufferCapacity = 1` gives `emit` room so it doesn't suspend while a collector is busy, and it lets `tryEmit` succeed from non-suspending code. With no buffer at all, `tryEmit` has nowhere to put a value while there are subscribers, so it returns `false`.

You have three options for events, and they suit different cases:

| Approach | Lost when no collector? | Collectors | Use for |
|---|---|---|---|
| `MutableSharedFlow` (replay 0) | Yes | All current ones | Nice-to-have signals, broadcasts to several listeners |
| `Channel(Channel.BUFFERED)` + `receiveAsFlow()` | No, buffered until collected | Exactly one | Navigation, things that must happen once |
| A field in the UI state, cleared after it's handled | No | The screen | What Android's architecture guidance recommends for most events |

For a snackbar after a delete, losing the occasional message is acceptable, so the example uses `SharedFlow`. For "navigate to the payment confirmation", I'd put it in the state (for example `val confirmedOrderId: String?`) and have the UI call a `onNavigated()` method that clears it.

## Collecting in the UI

Collecting a flow from a coroutine that lives as long as the Activity would keep updating the UI while the app is in the background. `repeatOnLifecycle` starts the collection when the lifecycle reaches a state and cancels it when it drops below it.

### Views and Fragments

```kotlin
class TodoFragment : Fragment(R.layout.fragment_todo) {
    private val viewModel: TodoViewModel by viewModels() // with Hilt or a factory

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch { viewModel.uiState.collect { render(it) } }
                launch { viewModel.events.collect { handle(it) } }
            }
        }
    }

    private fun render(state: TodoUiState) { /* update views */ }
    private fun handle(event: TodoEvent) { /* show snackbar */ }
}
```

Two details matter here. In a Fragment, use `viewLifecycleOwner`, not the Fragment itself, because the Fragment can outlive its view. And each flow needs its own `launch` inside the `repeatOnLifecycle` block, since `collect` never returns for a hot flow; a second `collect` after the first would never run.

### Jetpack Compose

Compose has `collectAsStateWithLifecycle`, from `androidx.lifecycle:lifecycle-runtime-compose`, which does the same lifecycle-aware collection for state:

```kotlin
@Composable
fun TodoRoute(viewModel: TodoViewModel, snackbarHostState: SnackbarHostState) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    val lifecycleOwner = LocalLifecycleOwner.current
    LaunchedEffect(viewModel, lifecycleOwner) {
        lifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            viewModel.events.collect { event ->
                when (event) {
                    is TodoEvent.ShowMessage -> snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }

    TodoScreen(state = state, onFilterChange = viewModel::setFilter, onDelete = viewModel::delete)
}
```

Use `collectAsStateWithLifecycle` rather than plain `collectAsState`, which keeps collecting while the app is in the background. `LocalLifecycleOwner` here is the one from `androidx.lifecycle.compose`. A `when` over a sealed interface is exhaustive, so adding a new event type makes this code fail to compile until you handle it.

## Testing with runTest

ViewModel logic is plain Kotlin, so it can be tested on the JVM with `kotlinx-coroutines-test`. Add the test dependencies:

```kotlin
dependencies {
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("junit:junit:4.13.2")
}
```

`viewModelScope` runs on `Dispatchers.Main`, which doesn't exist in a JVM unit test. Replace it with a test dispatcher using a small JUnit rule:

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class MainDispatcherRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher(),
) : TestWatcher() {
    override fun starting(description: Description) = Dispatchers.setMain(dispatcher)
    override fun finished(description: Description) = Dispatchers.resetMain()
}
```

When `Dispatchers.Main` is a `TestDispatcher`, `runTest` uses its scheduler, so the ViewModel's coroutines and the test share one virtual clock.

A fake repository backed by a `MutableStateFlow` behaves like a Room DAO: it emits the current list to new collectors and emits again after every change:

```kotlin
class FakeTodoRepository : TodoRepository {
    val todos = MutableStateFlow(
        listOf(
            Todo(1, "Buy milk", done = true),
            Todo(2, "Write post", done = false),
            Todo(3, "Book flights", done = false),
        )
    )

    override fun observeTodos(): Flow<List<Todo>> = todos

    override suspend fun delete(id: Long) {
        todos.update { list -> list.filterNot { it.id == id } }
    }
}
```

Now the tests. Because `uiState` uses `WhileSubscribed`, nothing runs upstream until something collects it, so each test starts a collector in `backgroundScope`. `runTest` cancels that scope when the test body ends, so the never-ending collection doesn't hang the test:

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class TodoViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun filterDoneShowsOnlyFinishedTodos() = runTest {
        val viewModel = TodoViewModel(FakeTodoRepository())
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            viewModel.uiState.collect()
        }

        assertEquals(3, viewModel.uiState.value.todos.size)
        assertFalse(viewModel.uiState.value.isLoading)

        viewModel.setFilter(Filter.DONE)
        assertEquals(listOf(1L), viewModel.uiState.value.todos.map { it.id })
    }

    @Test
    fun deleteRemovesTodoAndEmitsMessage() = runTest {
        val repository = FakeTodoRepository()
        val viewModel = TodoViewModel(repository)
        val events = mutableListOf<TodoEvent>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            viewModel.events.toList(events)
        }
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            viewModel.uiState.collect()
        }

        viewModel.delete(repository.todos.value.first())

        assertEquals(listOf<TodoEvent>(TodoEvent.ShowMessage("Deleted Buy milk")), events)
        assertEquals(listOf(2L, 3L), viewModel.uiState.value.todos.map { it.id })
    }
}
```

The `UnconfinedTestDispatcher(testScheduler)` on the collectors makes them start immediately, so they are subscribed before the test triggers anything. That matters most for the `SharedFlow` test: an event emitted before the collector subscribed would be dropped, exactly as in the app.

For longer sequences of emissions, the [Turbine](https://github.com/cashapp/turbine) library gives you `flow.test { awaitItem() }`, which reads better than collecting into a list.

## Gotchas

- **Don't expose `MutableStateFlow`.** If the UI can set `uiState.value`, the ViewModel is no longer the single source of truth. Expose `StateFlow` and `SharedFlow` types only.
- **Don't call `stateIn` inside a function.** `fun state() = flow.stateIn(...)` creates a new shared flow, and a new upstream subscription, on every call. Assign it to a property once.
- **Mutable objects in StateFlow.** Mutating a list inside the current state and setting it again doesn't emit, because the new value is the same object and therefore equal. Always build a new value with `copy`.
- **Conflation hides intermediate values.** If you need every value, such as progress events you log, a `StateFlow` is the wrong type.
- **`Eagerly` in a ViewModel** keeps upstream work running while the app is in the background. It's rarely what you want for anything backed by a database or sensor.

## Further reading

- [Android developers: StateFlow and SharedFlow](https://developer.android.com/kotlin/flow/stateflow-and-sharedflow)
- [Android developers: Testing Kotlin flows on Android](https://developer.android.com/kotlin/flow/test)
- [Android developers: UI events](https://developer.android.com/topic/architecture/ui-layer/events)
- [kotlinx.coroutines: StateFlow API reference](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/-state-flow/)
