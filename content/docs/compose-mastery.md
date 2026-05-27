---
title: "Compose Mastery"
weight: 9
---

# Compose Mastery — The Complete Reference

> [!NOTE]
> **10 parts, 40+ topics.** Best practices, anti-patterns, advanced patterns, animations, performance, architecture at scale, interop, theming, accessibility, and production war stories. Assumes you already know Compose basics — this is the "senior to staff" layer. For the underlying engine (compiler, runtime, snapshots), start with [Compose Internals Mastery]({{< relref "/docs/compose-internals" >}}).

---

## Table of Contents

### Part 1: Best Practices & Anti-Patterns
1. [The Golden Rules of Compose](#1-golden-rules)
2. [Stability — The #1 Performance Lever](#2-stability)
3. [Common Anti-Patterns & Fixes](#3-anti-patterns)
4. [Lambda Allocation Traps](#4-lambda-traps)

### Part 2: State Architecture at Scale
5. [State Hoisting Done Right](#5-state-hoisting)
6. [Unidirectional Data Flow in Compose](#6-udf-compose)
7. [ViewModel ↔ Compose Contract Patterns](#7-viewmodel-contract)
8. [Multi-Screen State Coordination](#8-multi-screen-state)
9. [Process Death & State Restoration](#9-process-death)

### Part 3: Advanced Composition Patterns
10. [Slot APIs & Compound Components](#10-slot-apis)
11. [CompositionLocal — Power & Pitfalls](#11-composition-local)
12. [Modifier Factories vs Modifier.composed](#12-modifier-factories)
13. [Movable Content & Content Hoisting](#13-movable-content)
14. [Lazy Layout DSL Patterns](#14-lazy-layout-dsl)

### Part 4: Animation Deep Dive
15. [Animation Decision Tree](#15-animation-decision-tree)
16. [Animate*AsState — Simple Value Animations](#16-animate-as-state)
17. [Transition API — Coordinated Animations](#17-transition-api)
18. [AnimatedContent & AnimatedVisibility](#18-animated-content)
19. [Infinite & Gesture-Driven Animations](#19-infinite-gesture-animations)
20. [Shared Element Transitions](#20-shared-element)
21. [Custom Animation with Animatable](#21-custom-animatable)

### Part 5: Performance & Profiling
22. [Compose Performance Mental Model](#22-performance-mental-model)
23. [Baseline Profiles for Compose](#23-baseline-profiles)
24. [Profiling with Android Studio](#24-profiling)
25. [Lazy List Performance Checklist](#25-lazy-list-checklist)
26. [Heavy Computation in Composition](#26-heavy-computation)

### Part 6: Navigation in Compose
27. [Navigation Compose Architecture](#27-navigation-architecture)
28. [Type-Safe Navigation (Kotlin Serialization)](#28-type-safe-navigation)
29. [Deep Links & Multi-Module Navigation](#29-deep-links)
30. [Nested Navigation Graphs](#30-nested-graphs)

### Part 7: Interop — Compose ↔ Views
31. [ComposeView in Fragments](#31-compose-in-fragments)
32. [AndroidView in Compose](#32-android-view)
33. [Migration Strategy — Strangler Fig Pattern](#33-migration-strategy)
34. [Shared Theme Bridge](#34-theme-bridge)

### Part 8: Theming & Design Systems
35. [Custom Design System with MaterialTheme](#35-custom-design-system)
36. [Dynamic Theming (Material You)](#36-dynamic-theming)
37. [Dark Mode — Proper Implementation](#37-dark-mode)
38. [Typography Scale & Responsive Text](#38-typography)

### Part 9: Accessibility
39. [Semantics Tree — How TalkBack Reads Your UI](#39-semantics-tree)
40. [Making Custom Components Accessible](#40-accessible-components)
41. [Touch Target Size & Focus Order](#41-touch-targets)

### Part 10: Production War Stories
42. [Real Bugs & Lessons Learned](#42-war-stories)
43. [Compose Gotchas Cheat Sheet](#43-gotchas-cheat-sheet)

---

# Part 1: Best Practices & Anti-Patterns

## 1. Golden Rules

### The 7 Rules Every Compose Developer Must Know

```
Rule 1: Composable functions must be FAST
  → No disk I/O, network calls, or heavy computation in @Composable
  → They may re-execute on ANY frame (16ms budget)
  → Do work in ViewModel/Repository, expose results via State

Rule 2: Composable functions must be IDEMPOTENT
  → Same inputs → same UI output, every time
  → No hidden side effects (no writing to global variables)
  → Use SideEffect / LaunchedEffect for side effects

Rule 3: Composable functions must be FREE OF SIDE EFFECTS
  → Don't modify external state during composition
  → Don't write to SharedPreferences, databases, analytics
  → Side effects go in effect handlers (LaunchedEffect, SideEffect)

Rule 4: State reads determine recomposition scope
  → Read state as LATE as possible (push reads toward leaves)
  → Read state in the SMALLEST scope possible
  → derivedStateOf for computed values

Rule 5: Stability determines skip-ability
  → Unstable parameters → composable ALWAYS recomposes
  → Use @Immutable, @Stable, or make params primitive
  → Check stability reports regularly

Rule 6: Use keys for identity in lists
  → key = { item.id } in LazyColumn/LazyRow
  → key(item.id) { } in regular Column/Row
  → Without keys → wrong state, wasted recomposition

Rule 7: Match the phase to the work
  → Composition phase: what to show
  → Layout phase: Modifier.offset { }
  → Draw phase: Modifier.drawBehind { }, graphicsLayer { }
  → Animations should target layout/draw phases, not composition
```

---

## 2. Stability

### Why Stability Is the #1 Performance Lever

```
When a parent recomposes and calls Child(param):
  - If param is STABLE and equals() returns true → Child SKIPPED
  - If param is UNSTABLE → Child ALWAYS recomposes (even if data is the same)

This cascades: an unstable param at the top of a tree
forces recomposition of everything below it.
```

### Stability Rules (Reference Card)

```
STABLE types (compiler can skip):
  ✅ Primitives: Int, Long, Float, Double, Boolean, Char, String
  ✅ Enum classes
  ✅ Function types (lambdas): () -> Unit, (Int) -> String
  ✅ Data class where ALL properties are stable
  ✅ Classes annotated @Immutable or @Stable
  ✅ Pair<Stable, Stable>, Triple<Stable, Stable, Stable>

UNSTABLE types (compiler cannot skip):
  ❌ List<T>, Set<T>, Map<K,V> — they're interfaces (could be mutable)
  ❌ Classes with var properties (mutable)
  ❌ Classes from external modules (compiler can't verify immutability)
  ❌ Any class containing an unstable property
  ❌ MutableState<T> when T is unstable
  ❌ Anything with a property of type Any, Object, or abstract type
```

### Fixing Stability Problems

```kotlin
// PROBLEM: List is unstable
data class FeedState(
    val items: List<FeedItem>,  // ❌ List is unstable
    val isLoading: Boolean,
)

// FIX 1: Use @Immutable (guarantees you won't mutate)
@Immutable
data class FeedState(
    val items: List<FeedItem>,  // ✅ @Immutable overrides instability
    val isLoading: Boolean,
)

// FIX 2: Use kotlinx.collections.immutable
data class FeedState(
    val items: ImmutableList<FeedItem>,  // ✅ ImmutableList IS stable
    val isLoading: Boolean,
)

// FIX 3: Stability config file (compose compiler 1.5.5+)
// compose-stability.conf:
// java.time.LocalDate
// com.google.gson.JsonObject
// kotlinx.datetime.Instant

// build.gradle.kts:
composeCompiler {
    stabilityConfigurationFile = rootProject.file("compose-stability.conf")
}

// FIX 4: Wrap unstable types
@Immutable
data class StableHolder<T>(val item: T)
// Use StableHolder(myUnstableObject) as parameter
```

### Checking Stability

```bash
# Generate compose compiler reports:
./gradlew assembleRelease \
  -PcomposeCompilerReports=true \
  -PcomposeCompilerMetrics=true

# Output files:
# build/compose_metrics/
#   *-classes.txt    → shows stable/unstable classification
#   *-composables.txt → shows restartable/skippable status
#   *-module.json    → module-level metrics

# What to look for:
# restartable but NOT skippable → PROBLEM
# "unstable" in classes.txt → fix these first
```

---

## 3. Anti-Patterns

### The 10 Most Common Compose Anti-Patterns

```kotlin
// ❌ ANTI-PATTERN 1: Creating objects in composition
@Composable
fun Bad() {
    val paint = Paint()  // new allocation EVERY recomposition
    Canvas { drawCircle(center, 50f, paint) }
}
// ✅ FIX:
@Composable
fun Good() {
    val paint = remember { Paint() }  // allocated once
    Canvas { drawCircle(center, 50f, paint) }
}


// ❌ ANTI-PATTERN 2: Reading state too early
@Composable
fun Bad(scrollState: ScrollState) {
    val offset = scrollState.value  // read in COMPOSITION → all 3 phases re-run
    Box(Modifier.offset(0.dp, offset.dp))
}
// ✅ FIX:
@Composable
fun Good(scrollState: ScrollState) {
    Box(Modifier.offset {  // read in LAYOUT → only layout+draw re-run
        IntOffset(0, scrollState.value)
    })
}


// ❌ ANTI-PATTERN 3: Unnecessary remember of stable values
@Composable
fun Bad(text: String) {
    val label = remember(text) { text.uppercase() }  // String.uppercase is trivial
    Text(label)
}
// ✅ FIX: Only remember expensive computations
@Composable
fun Good(text: String) {
    Text(text.uppercase())  // no remember needed for trivial ops
}


// ❌ ANTI-PATTERN 4: Forgetting derivedStateOf for filtering
@Composable
fun Bad(items: List<Item>, query: String) {
    val filtered = items.filter { it.name.contains(query) }  // runs EVERY recomposition
    LazyColumn { items(filtered) { ... } }
}
// ✅ FIX:
@Composable
fun Good(items: List<Item>, query: String) {
    val filtered by remember(items, query) {
        derivedStateOf { items.filter { it.name.contains(query) } }
    }
    LazyColumn { items(filtered) { ... } }
}


// ❌ ANTI-PATTERN 5: Using mutableStateOf for derived data
@Composable
fun Bad(vm: MyViewModel) {
    val items by vm.items.collectAsStateWithLifecycle()
    var count by remember { mutableStateOf(0) }

    LaunchedEffect(items) {
        count = items.size  // TWO state writes → TWO recompositions
    }
    Text("Count: $count")
}
// ✅ FIX:
@Composable
fun Good(vm: MyViewModel) {
    val items by vm.items.collectAsStateWithLifecycle()
    val count by remember { derivedStateOf { items.size } }  // derived, not separate state
    Text("Count: $count")
}


// ❌ ANTI-PATTERN 6: Passing ViewModel to child composables
@Composable
fun Bad(vm: FeedViewModel) {
    FeedCard(vm)  // ❌ Child depends on entire ViewModel
}
// ✅ FIX: Pass only what child needs (state hoisting)
@Composable
fun Good(vm: FeedViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    FeedCard(
        item = state.currentItem,
        onLike = vm::onLike,  // specific callback
    )
}


// ❌ ANTI-PATTERN 7: Non-capturing lambda that looks capturing
@Composable
fun Bad(items: List<Item>) {
    LazyColumn {
        items(items) { item ->
            Button(onClick = { viewModel.delete(item.id) }) {  // ❌ new lambda per recomposition
                Text("Delete")
            }
        }
    }
}
// ✅ FIX: Use remember for item-scoped lambdas
@Composable
fun Good(items: List<Item>, onDelete: (String) -> Unit) {
    LazyColumn {
        items(items, key = { it.id }) { item ->
            val deleteCallback = remember(item.id) { { onDelete(item.id) } }
            Button(onClick = deleteCallback) {
                Text("Delete")
            }
        }
    }
}


// ❌ ANTI-PATTERN 8: Using LaunchedEffect for one-time events
@Composable
fun Bad(vm: MyViewModel) {
    val event by vm.event.collectAsStateWithLifecycle(null)
    LaunchedEffect(event) {  // ❌ Fires on recomposition, may double-handle
        event?.let { navigateTo(it.destination) }
    }
}
// ✅ FIX: Collect events in LaunchedEffect
@Composable
fun Good(vm: MyViewModel) {
    LaunchedEffect(Unit) {
        vm.events.collect { event ->  // ✅ Collect Flow directly
            navigateTo(event.destination)
        }
    }
}


// ❌ ANTI-PATTERN 9: Nesting scrollable containers without height constraint
@Composable
fun Bad() {
    LazyColumn {
        item {
            LazyRow { ... }  // OK — different scroll directions
        }
        item {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                // ❌ CRASH: Nested same-direction scrollables without fixed height
            }
        }
    }
}
// ✅ FIX: Use fixed height or use LazyColumn items directly
@Composable
fun Good() {
    LazyColumn {
        items(innerItems) { item ->  // ✅ Flat structure
            ItemCard(item)
        }
    }
}


// ❌ ANTI-PATTERN 10: Running suspend functions in composition
@Composable
fun Bad(imageUrl: String) {
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    // ❌ This does NOT work — composition is not a coroutine scope
    // bitmap = loadImage(imageUrl)  // suspend fun can't be called here

    // Also bad: launching coroutine without effect handler
    val scope = rememberCoroutineScope()
    scope.launch { bitmap = loadImage(imageUrl) }  // ❌ launches on every recomposition
}
// ✅ FIX:
@Composable
fun Good(imageUrl: String) {
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(imageUrl) {  // ✅ launches once, re-launches only when imageUrl changes
        bitmap = loadImage(imageUrl)
    }
    bitmap?.let { Image(it.asImageBitmap(), contentDescription = null) }
}
```

---

## 4. Lambda Traps

### How Lambdas Affect Recomposition

```kotlin
// TRAP 1: Lambdas capture mutable variables → new instance every recomposition

@Composable
fun Parent() {
    var count by remember { mutableStateOf(0) }

    // ❌ This lambda captures `count` (a local variable)
    // A NEW lambda object is created every time Parent recomposes
    // Child CANNOT be skipped (lambda changed)
    Child(onClick = { println("count is $count") })
}

// ✅ FIX: Use method references or remember
@Composable
fun Parent(vm: MyViewModel) {
    Child(onClick = vm::increment)  // ✅ method reference — stable, same instance
}

// ✅ FIX: remember with key
@Composable
fun Parent() {
    var count by remember { mutableStateOf(0) }
    val onClick = remember { { count++ } }  // ✅ same lambda instance
    Child(onClick = onClick)
}


// TRAP 2: Non-inlined lambdas in LazyColumn
LazyColumn {
    items(items) { item ->
        // onClick creates a new lambda for EACH item
        // These are inside an inline content lambda, so they're OK
        // BUT if you pass them to a non-inline child composable:
        ItemCard(
            item = item,
            onClick = { onItemClicked(item.id) },  // new lambda per composition
        )
    }
}

// ✅ FIX: remember with item-specific key
LazyColumn {
    items(items, key = { it.id }) { item ->
        ItemCard(
            item = item,
            onClick = remember(item.id) { { onItemClicked(item.id) } },
        )
    }
}


// WHY THIS MATTERS (performance):
// With 50 visible items:
//   Without remember: 50 lambda allocations per recomposition
//   With remember: 0 lambda allocations (cached)
//   Each allocation → ItemCard cannot skip → recomposes → its children recompose
//   Total: 50 × O(tree_depth) wasted work per frame
```

---

# Part 2: State Architecture at Scale

## 5. State Hoisting

### The State Hoisting Pattern

```kotlin
// PRINCIPLE: Move state UP to the lowest common ancestor that needs it
// Composables become stateless → reusable, testable, previewable

// ❌ Stateful (hard to test, can't reuse with different data source)
@Composable
fun SearchBar() {
    var query by remember { mutableStateOf("") }
    TextField(value = query, onValueChange = { query = it })
}

// ✅ Stateless (state hoisted to caller)
@Composable
fun SearchBar(
    query: String,              // state flows DOWN
    onQueryChange: (String) -> Unit, // events flow UP
    modifier: Modifier = Modifier,
) {
    TextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier,
    )
}

// Caller owns the state:
@Composable
fun SearchScreen(vm: SearchViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    SearchBar(
        query = state.query,
        onQueryChange = vm::updateQuery,
    )
}
```

### When NOT to Hoist

```
DON'T hoist state that is purely UI-internal:

  @Composable
  fun ExpandableCard(title: String, content: String) {
      var expanded by remember { mutableStateOf(false) }  // ✅ UI-only state
      Card(onClick = { expanded = !expanded }) {
          Text(title)
          if (expanded) Text(content)
      }
  }

  // expanded is visual state — no business logic cares about it
  // Hoisting would add noise to the parent with no benefit

HOIST when:
  ✓ Parent needs to read the state
  ✓ Parent needs to control the state
  ✓ State needs to survive navigation
  ✓ State needs to sync with ViewModel/backend
  ✓ Multiple composables share the state

DON'T HOIST when:
  ✗ State is purely visual (expanded, scroll position, animation)
  ✗ Only the composable itself reads/writes the state
  ✗ Hoisting would add complexity without benefit
```

---

## 6. UDF Compose

### Unidirectional Data Flow in Compose

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   ViewModel                                     │
│   ┌─────────────────────────┐                  │
│   │ StateFlow<UiState>       │──── State ────→  UI
│   │                         │                  │
│   │ fun onEvent(UiEvent)    │←─── Events ────  UI
│   └─────────────────────────┘                  │
│                                                 │
└─────────────────────────────────────────────────┘

State flows DOWN:  ViewModel → Screen → Components
Events flow UP:    Button click → Screen → ViewModel
```

```kotlin
// 1. Define the contract
data class FeedUiState(
    val items: ImmutableList<FeedItem> = persistentListOf(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val isRefreshing: Boolean = false,
)

sealed interface FeedEvent {
    data object Refresh : FeedEvent
    data class LikeItem(val id: String) : FeedEvent
    data class DeleteItem(val id: String) : FeedEvent
    data object LoadMore : FeedEvent
}

// 2. ViewModel processes events, emits state
class FeedViewModel(private val repo: FeedRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedUiState())
    val state = _state.asStateFlow()

    fun onEvent(event: FeedEvent) {
        when (event) {
            FeedEvent.Refresh -> refresh()
            is FeedEvent.LikeItem -> likeItem(event.id)
            is FeedEvent.DeleteItem -> deleteItem(event.id)
            FeedEvent.LoadMore -> loadMore()
        }
    }

    private fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isRefreshing = true) }
            repo.getFeed()
                .onSuccess { items ->
                    _state.update { it.copy(items = items.toImmutableList(), isRefreshing = false) }
                }
                .onFailure { e ->
                    _state.update { it.copy(error = e.message, isRefreshing = false) }
                }
        }
    }
}

// 3. Screen connects ViewModel to UI
@Composable
fun FeedScreen(vm: FeedViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()

    FeedContent(
        state = state,
        onEvent = vm::onEvent,  // ✅ method reference — stable
    )
}

// 4. Content is pure UI (stateless, previewable, testable)
@Composable
fun FeedContent(
    state: FeedUiState,
    onEvent: (FeedEvent) -> Unit,
) {
    // Pure rendering — no ViewModel, no side effects
    SwipeRefresh(
        isRefreshing = state.isRefreshing,
        onRefresh = { onEvent(FeedEvent.Refresh) },
    ) {
        LazyColumn {
            items(state.items, key = { it.id }) { item ->
                FeedCard(
                    item = item,
                    onLike = { onEvent(FeedEvent.LikeItem(item.id)) },
                    onDelete = { onEvent(FeedEvent.DeleteItem(item.id)) },
                )
            }
        }
    }
}
```

---

## 7. ViewModel Contract

### Screen-Level vs Component-Level ViewModels

```
SCREEN-LEVEL ViewModel (recommended):
  - One ViewModel per screen/route
  - Owns ALL state for that screen
  - Composables below receive state + callbacks

  Screen
  └── ViewModel(StateFlow<UiState>)
      ├── Header(state.userName, state.avatar)
      ├── Body(state.items, onItemClick)
      └── Footer(state.isLoading)

COMPONENT-LEVEL ViewModel (avoid):
  - Each component has its own ViewModel
  - Tight coupling, hard to coordinate
  - State split across multiple ViewModels

  Screen
  ├── HeaderViewModel → Header
  ├── BodyViewModel → Body
  └── FooterViewModel → Footer
  // ❌ How does Header know Body is loading? Cross-VM communication = pain
```

### The ViewModel ↔ Compose Boundary

```kotlin
// RULE: ViewModel emits State + receives Events. That's it.
// ViewModel should NEVER know about Compose.
// No Composable functions, no Modifier, no Color, no Dp in ViewModel.

// ❌ BAD: ViewModel returns Compose types
class BadViewModel : ViewModel() {
    val headerColor: Color = Color.Red  // ❌ Compose type in ViewModel
    val padding: Dp = 16.dp            // ❌ Compose type in ViewModel
}

// ✅ GOOD: ViewModel returns domain types
class GoodViewModel : ViewModel() {
    val headerStyle: HeaderStyle = HeaderStyle.ERROR  // ✅ domain enum
}

// Composable maps domain → presentation:
@Composable
fun Header(style: HeaderStyle) {
    val color = when (style) {
        HeaderStyle.ERROR -> MaterialTheme.colorScheme.error
        HeaderStyle.SUCCESS -> MaterialTheme.colorScheme.primary
    }
    Surface(color = color) { ... }
}
```

---

## 8. Multi-Screen State

### Shared State Across Screens

```kotlin
// Pattern 1: Shared ViewModel (scoped to NavBackStackEntry)
// Both ScreenA and ScreenB share the same ViewModel instance

NavHost(navController, startDestination = "list") {
    navigation(startDestination = "detail", route = "flow") {
        composable("list") {
            val parentEntry = remember(it) {
                navController.getBackStackEntry("flow")
            }
            val sharedVm: SharedViewModel = viewModel(parentEntry)
            ListScreen(sharedVm)
        }
        composable("detail") {
            val parentEntry = remember(it) {
                navController.getBackStackEntry("flow")
            }
            val sharedVm: SharedViewModel = viewModel(parentEntry)
            DetailScreen(sharedVm)
        }
    }
}

// Pattern 2: SavedStateHandle for cross-screen results
// Screen A sets result → Screen B reads it

// In ScreenB (the one returning result):
navController.previousBackStackEntry?.savedStateHandle?.set("result", selectedItem)
navController.popBackStack()

// In ScreenA (the one receiving result):
val result = navController.currentBackStackEntry
    ?.savedStateHandle
    ?.getStateFlow("result", defaultValue)
    ?.collectAsStateWithLifecycle()
```

---

## 9. Process Death

### Surviving Process Death in Compose

```kotlin
// PROBLEM: remember { } is LOST on process death
// mutableStateOf values → GONE
// ViewModel → GONE (recreated)
// Only SavedStateHandle and persistent storage survive

// SOLUTION 1: rememberSaveable (for UI state)
@Composable
fun SearchScreen() {
    var query by rememberSaveable { mutableStateOf("") }  // ✅ survives process death
    var expanded by rememberSaveable { mutableStateOf(false) }
    // These go into the Activity's savedInstanceState Bundle
}

// SOLUTION 2: Custom Saver (for complex objects)
data class FilterState(val category: String, val minPrice: Int, val maxPrice: Int)

val FilterStateSaver = Saver<FilterState, Bundle>(
    save = { state ->
        bundleOf(
            "category" to state.category,
            "minPrice" to state.minPrice,
            "maxPrice" to state.maxPrice,
        )
    },
    restore = { bundle ->
        FilterState(
            category = bundle.getString("category", ""),
            minPrice = bundle.getInt("minPrice", 0),
            maxPrice = bundle.getInt("maxPrice", Int.MAX_VALUE),
        )
    },
)

@Composable
fun FilterScreen() {
    var filter by rememberSaveable(stateSaver = FilterStateSaver) {
        mutableStateOf(FilterState("all", 0, 100))
    }
}

// SOLUTION 3: SavedStateHandle in ViewModel
class SearchViewModel(private val savedState: SavedStateHandle) : ViewModel() {
    val query = savedState.getStateFlow("query", "")

    fun updateQuery(new: String) {
        savedState["query"] = new  // ✅ survives process death
    }
}

// WHAT SURVIVES WHAT:
//
// Scenario                  | remember | rememberSaveable | ViewModel | SavedStateHandle | Room
// ─────────────────────────────────────────────────────────────────────────────────────────────
// Recomposition             |    ✅    |       ✅         |    ✅    |       ✅        |  ✅
// Config change (rotation)  |    ❌    |       ✅         |    ✅    |       ✅        |  ✅
// Process death             |    ❌    |       ✅         |    ❌    |       ✅        |  ✅
// App uninstall             |    ❌    |       ❌         |    ❌    |       ❌        |  ❌
```

---

# Part 3: Advanced Composition Patterns

## 10. Slot APIs

### Slot API Pattern (Like Android's ViewGroup but Compose)

```kotlin
// Instead of hardcoding child content, accept composable lambdas as "slots"

// ❌ Rigid — caller can't customize layout
@Composable
fun CardWithFixedHeader(title: String, body: String) {
    Column {
        Text(title, style = titleStyle)
        Text(body, style = bodyStyle)
    }
}

// ✅ Slot API — caller fills slots with anything
@Composable
fun CardWithSlots(
    header: @Composable () -> Unit,
    content: @Composable () -> Unit,
    footer: @Composable () -> Unit = {},  // optional slot with default
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier) {
        Column(Modifier.padding(16.dp)) {
            header()
            Spacer(Modifier.height(8.dp))
            content()
            footer()
        }
    }
}

// Usage — caller decides what goes in each slot
CardWithSlots(
    header = {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Avatar(url = user.avatarUrl)
            Spacer(Modifier.width(8.dp))
            Text(user.name, style = MaterialTheme.typography.titleMedium)
        }
    },
    content = {
        Text(item.description)
        if (item.hasImage) AsyncImage(item.imageUrl)
    },
    footer = {
        Row {
            LikeButton(count = item.likes, onClick = onLike)
            CommentButton(count = item.comments, onClick = onComment)
        }
    },
)
```

### Compound Component Pattern

```kotlin
// Like TabRow + Tab — components that work together
// Uses CompositionLocal for implicit coordination

// Step 1: Define the scope
@Stable
class AccordionState {
    var expandedIndex by mutableIntStateOf(-1)
        internal set

    fun toggle(index: Int) {
        expandedIndex = if (expandedIndex == index) -1 else index
    }
}

@Composable
fun rememberAccordionState() = remember { AccordionState() }

// Step 2: Parent component
@Composable
fun Accordion(
    state: AccordionState = rememberAccordionState(),
    modifier: Modifier = Modifier,
    content: @Composable AccordionScope.() -> Unit,
) {
    val scope = remember(state) { AccordionScopeImpl(state) }
    Column(modifier) {
        scope.content()
    }
}

// Step 3: Child component (knows about parent via scope)
interface AccordionScope {
    @Composable
    fun Section(
        title: @Composable () -> Unit,
        content: @Composable () -> Unit,
    )
}

class AccordionScopeImpl(private val state: AccordionState) : AccordionScope {
    private var index = 0

    @Composable
    override fun Section(
        title: @Composable () -> Unit,
        content: @Composable () -> Unit,
    ) {
        val myIndex = remember { index++ }
        val isExpanded = state.expandedIndex == myIndex

        Column {
            Row(
                Modifier.clickable { state.toggle(myIndex) }
            ) {
                title()
                Icon(
                    if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null,
                )
            }
            AnimatedVisibility(isExpanded) {
                content()
            }
        }
    }
}

// Usage:
Accordion {
    Section(title = { Text("Section 1") }) { Text("Content 1") }
    Section(title = { Text("Section 2") }) { Text("Content 2") }
    Section(title = { Text("Section 3") }) { Text("Content 3") }
}
```

---

## 11. CompositionLocal

### Power & Pitfalls

```kotlin
// CompositionLocal = implicit parameter passing through the tree
// Like Android's Context — available everywhere without explicit passing

// Built-in examples:
LocalContext.current           // Android Context
LocalDensity.current           // Screen density
LocalConfiguration.current     // Screen size, locale
LocalLifecycleOwner.current    // Lifecycle
LocalContentColor.current      // Current content color

// Creating custom CompositionLocal:
val LocalAnalytics = staticCompositionLocalOf<AnalyticsTracker> {
    error("No AnalyticsTracker provided")  // crash if not provided
}

// OR with safe default:
val LocalFeatureFlags = compositionLocalOf { FeatureFlags() }

// static vs compositionLocalOf:
//   staticCompositionLocalOf: When value RARELY changes
//     → Change causes ENTIRE subtree to recompose (broad invalidation)
//     → Better for: themes, analytics, context — set once at root
//
//   compositionLocalOf: When value MIGHT change
//     → Change only recomposes composables that READ it (targeted invalidation)
//     → Better for: dynamic values like content color, elevation

// Providing:
@Composable
fun App() {
    CompositionLocalProvider(
        LocalAnalytics provides analyticsTracker,
        LocalFeatureFlags provides featureFlags,
    ) {
        MainContent()  // everything inside can access these
    }
}

// Consuming:
@Composable
fun TrackableButton(label: String, onClick: () -> Unit) {
    val analytics = LocalAnalytics.current
    Button(onClick = {
        analytics.track("button_clicked", mapOf("label" to label))
        onClick()
    }) {
        Text(label)
    }
}
```

### When to Use vs When NOT to Use

```
✅ USE CompositionLocal for:
  - Theme values (colors, typography, shapes)
  - Android system services (Context, LifecycleOwner)
  - Cross-cutting concerns (analytics, feature flags)
  - Values that would require passing through many layers
  - Design system tokens

❌ DO NOT USE CompositionLocal for:
  - Business data (use state hoisting instead)
  - Navigation actions (use callbacks)
  - ViewModel references (use explicit parameter)
  - Anything that makes data flow hard to trace

Golden rule: If you can use an explicit parameter, do that instead.
CompositionLocal is for framework-level plumbing, not app-level data.
```

---

## 12. Modifier Factories

### Modifier.composed vs Factory Extension

```kotlin
// ❌ Modifier.composed (DEPRECATED pattern — allocates per-element)
fun Modifier.shimmerEffect() = composed {
    val transition = rememberInfiniteTransition()
    val alpha by transition.animateFloat(...)
    this.then(Modifier.drawBehind { drawRect(Color.Gray.copy(alpha = alpha)) })
}
// Problem: composed {} creates a new composition for EACH element using it
// 100 list items with .shimmerEffect() → 100 separate compositions

// ✅ Modifier.Node factory (modern pattern — shared state)
fun Modifier.shimmerEffect(): Modifier = this then ShimmerElement

private data object ShimmerElement : ModifierNodeElement<ShimmerNode>() {
    override fun create() = ShimmerNode()
    override fun update(node: ShimmerNode) {} // no params to update
}

private class ShimmerNode : Modifier.Node(), DrawModifierNode {
    override fun ContentDrawScope.draw() {
        drawContent()
        drawRect(Color.Gray.copy(alpha = computeAlpha()))
    }
}

// Modifier.Node advantages:
// - Single shared instance per modifier (not per-element)
// - No composition overhead
// - Can be animated efficiently
// - ~10x faster than composed {} in lists
```

---

## 13. Movable Content

### movableContentOf — Preserve State Across Locations

```kotlin
// Problem: Moving content between two locations resets state
@Composable
fun AdaptiveLayout(isWide: Boolean) {
    if (isWide) {
        Row {
            VideoPlayer()  // state LOST when switching layouts
            Comments()
        }
    } else {
        Column {
            VideoPlayer()  // this is a DIFFERENT instance
            Comments()
        }
    }
}

// Fix: movableContentOf preserves composition identity
@Composable
fun AdaptiveLayout(isWide: Boolean) {
    val video = remember { movableContentOf { VideoPlayer() } }
    val comments = remember { movableContentOf { Comments() } }

    if (isWide) {
        Row { video(); comments() }
    } else {
        Column { video(); comments() }
    }
    // VideoPlayer keeps its playback position, buffered data, remember {} state
}

// Use cases:
// - Responsive layouts (phone → tablet)
// - Drag-and-drop reordering
// - Shared element transitions
// - Collapsing/expanding panels
```

---

## 14. Lazy Layout DSL

### LazyListScope Extensions for Clean Code

```kotlin
// Pattern: Extension functions on LazyListScope for reusable sections

fun LazyListScope.feedHeader(userName: String, onProfileClick: () -> Unit) {
    item(key = "header", contentType = "header") {
        FeedHeader(userName = userName, onProfileClick = onProfileClick)
    }
}

fun LazyListScope.feedItems(
    items: ImmutableList<FeedItem>,
    onItemClick: (String) -> Unit,
) {
    items(
        items = items,
        key = { it.id },
        contentType = { it.type },
    ) { item ->
        FeedCard(item = item, onClick = { onItemClick(item.id) })
    }
}

fun LazyListScope.loadingFooter(isLoading: Boolean) {
    if (isLoading) {
        item(key = "loading", contentType = "loading") {
            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
    }
}

// Usage — clean, declarative:
LazyColumn {
    feedHeader(state.userName, onProfileClick = { onEvent(Event.ProfileClicked) })
    feedItems(state.items, onItemClick = { onEvent(Event.ItemClicked(it)) })
    loadingFooter(state.isLoadingMore)
}
```

---

# Part 4: Animation Deep Dive

## 15. Animation Decision Tree

```
What are you animating?
│
├── A simple value (alpha, size, color, offset)?
│   └── animate*AsState()
│       animateDpAsState, animateColorAsState, animateFloatAsState
│
├── Multiple values that must be coordinated?
│   └── updateTransition()
│       Define states → each value animates to its target
│
├── Content appearing/disappearing?
│   ├── Single content → AnimatedVisibility
│   └── Content switching → AnimatedContent / Crossfade
│
├── Repeating/infinite animation?
│   └── rememberInfiniteTransition()
│       Pulse, shimmer, rotate, breathe effects
│
├── Gesture-driven (drag, swipe)?
│   └── Animatable + pointerInput
│       Manual control with snapTo, animateTo, animateDecay
│
├── Shared element between screens?
│   └── SharedTransitionLayout + sharedElement modifier
│
├── Complex choreography or spring physics?
│   └── Animatable
│       Full control: animateTo, animateDecay, snapTo, stop
│
└── Layout size/position changes?
    └── Modifier.animateContentSize() or animateItem()
```

---

## 16. Animate As State

```kotlin
// The simplest animation API — animate a single value

@Composable
fun ExpandableCard(isExpanded: Boolean) {
    // Automatically animates when isExpanded changes
    val height by animateDpAsState(
        targetValue = if (isExpanded) 200.dp else 80.dp,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow,
        ),
        label = "cardHeight",
    )

    val alpha by animateFloatAsState(
        targetValue = if (isExpanded) 1f else 0f,
        animationSpec = tween(durationMillis = 300),
        label = "contentAlpha",
    )

    val backgroundColor by animateColorAsState(
        targetValue = if (isExpanded) Color.White else Color.LightGray,
        animationSpec = tween(500),
        label = "cardColor",
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .height(height),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
    ) {
        Column {
            Text("Header", style = MaterialTheme.typography.titleMedium)
            Text(
                "Details go here...",
                modifier = Modifier.alpha(alpha),
            )
        }
    }
}
```

---

## 17. Transition API

```kotlin
// Coordinated animations — multiple values animate together based on state

enum class CardState { Collapsed, Expanded }

@Composable
fun AnimatedCard(isExpanded: Boolean) {
    val transition = updateTransition(
        targetState = if (isExpanded) CardState.Expanded else CardState.Collapsed,
        label = "cardTransition",
    )

    val height by transition.animateDp(
        transitionSpec = { spring(stiffness = Spring.StiffnessLow) },
        label = "height",
    ) { state ->
        when (state) {
            CardState.Collapsed -> 80.dp
            CardState.Expanded -> 200.dp
        }
    }

    val cornerRadius by transition.animateDp(
        transitionSpec = { tween(300) },
        label = "corner",
    ) { state ->
        when (state) {
            CardState.Collapsed -> 16.dp
            CardState.Expanded -> 4.dp
        }
    }

    val elevation by transition.animateDp(
        transitionSpec = { tween(300) },
        label = "elevation",
    ) { state ->
        when (state) {
            CardState.Collapsed -> 2.dp
            CardState.Expanded -> 8.dp
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth().height(height),
        shape = RoundedCornerShape(cornerRadius),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation),
    ) { /* ... */ }

    // ALL three animations start and end together
    // Different specs → different curves but same trigger
}
```

---

## 18. Animated Content

```kotlin
// AnimatedVisibility — animate content entering/exiting

@Composable
fun NotificationBanner(message: String?, onDismiss: () -> Unit) {
    AnimatedVisibility(
        visible = message != null,
        enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
        exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
    ) {
        Surface(
            color = MaterialTheme.colorScheme.errorContainer,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(Modifier.padding(16.dp)) {
                Text(message ?: "", Modifier.weight(1f))
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, "Dismiss")
                }
            }
        }
    }
}

// AnimatedContent — animate between different content
@Composable
fun CounterDisplay(count: Int) {
    AnimatedContent(
        targetState = count,
        transitionSpec = {
            if (targetState > initialState) {
                // Counting up: slide up + fade in from bottom
                slideInVertically { it } + fadeIn() togetherWith
                    slideOutVertically { -it } + fadeOut()
            } else {
                // Counting down: slide down + fade in from top
                slideInVertically { -it } + fadeIn() togetherWith
                    slideOutVertically { it } + fadeOut()
            }.using(SizeTransform(clip = false))
        },
        label = "counter",
    ) { targetCount ->
        Text(
            "$targetCount",
            style = MaterialTheme.typography.displayLarge,
        )
    }
}
```

---

## 19. Infinite Gesture Animations

```kotlin
// Infinite animation — shimmer loading effect
@Composable
fun ShimmerEffect(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val offset by infiniteTransition.animateFloat(
        initialValue = -300f,
        targetValue = 300f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerOffset",
    )

    Box(
        modifier = modifier
            .background(Color.LightGray)
            .graphicsLayer {  // draw-phase only — no recomposition
                val brush = Brush.linearGradient(
                    colors = listOf(Color.LightGray, Color.White, Color.LightGray),
                    start = Offset(offset, 0f),
                    end = Offset(offset + 200f, 0f),
                )
                // Using graphicsLayer keeps animation in draw phase
            }
    )
}

// Gesture-driven animation — swipe to dismiss
@Composable
fun SwipeToDismiss(onDismiss: () -> Unit, content: @Composable () -> Unit) {
    val offsetX = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .offset { IntOffset(offsetX.value.roundToInt(), 0) }
            .pointerInput(Unit) {
                detectHorizontalDragGestures(
                    onDragEnd = {
                        scope.launch {
                            if (abs(offsetX.value) > size.width / 3) {
                                // Fling to dismiss
                                offsetX.animateTo(
                                    targetValue = if (offsetX.value > 0) size.width.toFloat()
                                                  else -size.width.toFloat(),
                                    animationSpec = tween(200),
                                )
                                onDismiss()
                            } else {
                                // Snap back
                                offsetX.animateTo(0f, spring())
                            }
                        }
                    },
                    onHorizontalDrag = { _, dragAmount ->
                        scope.launch { offsetX.snapTo(offsetX.value + dragAmount) }
                    },
                )
            }
    ) {
        content()
    }
}
```

---

## 20. Shared Element

```kotlin
// Shared Element Transitions (Compose 1.7+)

@Composable
fun ListToDetailTransition() {
    SharedTransitionLayout {
        AnimatedContent(targetState = showDetail) { isDetail ->
            if (!isDetail) {
                // List view
                LazyColumn {
                    items(items) { item ->
                        Row(Modifier.clickable { selectedItem = item; showDetail = true }) {
                            Image(
                                painter = rememberAsyncImagePainter(item.imageUrl),
                                contentDescription = null,
                                modifier = Modifier
                                    .size(60.dp)
                                    .sharedElement(
                                        state = rememberSharedContentState(key = "image-${item.id}"),
                                        animatedVisibilityScope = this@AnimatedContent,
                                    ),
                            )
                            Text(
                                item.title,
                                modifier = Modifier.sharedBounds(
                                    sharedContentState = rememberSharedContentState(key = "title-${item.id}"),
                                    animatedVisibilityScope = this@AnimatedContent,
                                ),
                            )
                        }
                    }
                }
            } else {
                // Detail view
                Column {
                    Image(
                        painter = rememberAsyncImagePainter(selectedItem!!.imageUrl),
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(300.dp)
                            .sharedElement(
                                state = rememberSharedContentState(key = "image-${selectedItem!!.id}"),
                                animatedVisibilityScope = this@AnimatedContent,
                            ),
                    )
                    Text(
                        selectedItem!!.title,
                        style = MaterialTheme.typography.headlineLarge,
                        modifier = Modifier.sharedBounds(
                            sharedContentState = rememberSharedContentState(key = "title-${selectedItem!!.id}"),
                            animatedVisibilityScope = this@AnimatedContent,
                        ),
                    )
                }
            }
        }
    }
}

// sharedElement: Content morphs during transition (same visual, different size)
// sharedBounds: Container morphs, content crossfades inside bounds
```

---

## 21. Custom Animatable

```kotlin
// Animatable — full manual control over animations

@Composable
fun BouncyButton(onClick: () -> Unit, content: @Composable () -> Unit) {
    val scale = remember { Animatable(1f) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .graphicsLayer {
                scaleX = scale.value
                scaleY = scale.value
            }
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        scope.launch {
                            // Press down: shrink
                            scale.animateTo(0.9f, tween(100))
                        }
                        tryAwaitRelease()
                        scope.launch {
                            // Release: bounce back
                            scale.animateTo(
                                1f,
                                spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessMedium,
                                ),
                            )
                        }
                        onClick()
                    },
                )
            }
    ) {
        content()
    }
}

// Animatable key methods:
//   animateTo(target, spec) — animate to value, suspends until done
//   snapTo(value)           — instant jump, no animation
//   animateDecay(velocity, spec) — fling/momentum, velocity-based
//   stop()                  — stop current animation
//   .value                  — current value (observable)
//   .isRunning              — whether animation is active
//   .targetValue            — where animation is heading
//   .velocity               — current velocity
```

---

# Part 5: Performance & Profiling

## 22. Performance Mental Model

```
The Compose Performance Pyramid:

       /\
      /  \        1. STABILITY (top priority)
     /    \       Make params stable → enable skipping
    /──────\
   /        \     2. STATE READS (second priority)
  /          \    Read state late, in smallest scope
 /────────────\
/              \  3. PHASE AWARENESS (third priority)
\              /  Use graphicsLayer/offset lambdas for animations
 \────────────/
  \          /    4. REMEMBER (fourth)
   \        /     Cache expensive computations
    \──────/
     \    /       5. LAZY LAYOUT TUNING (fifth)
      \  /        keys, contentType, prefetch
       \/

Fix from TOP DOWN. No point optimizing remember if stability is broken.
```

### Quick Performance Audit

```
Step 1: Check stability
  ./gradlew assembleRelease -PcomposeCompilerReports=true
  → Look for "restartable but not skippable" → fix these

Step 2: Check recomposition counts
  Layout Inspector → Enable "Show Recomposition Counts"
  → Scroll the list → counts should be LOW
  → High counts on unchanged items → stability or lambda issue

Step 3: Check frame timing
  Android Studio Profiler → CPU → System Trace
  → Look for frames > 16ms
  → Composition time should be < 5ms per frame

Step 4: Check for unnecessary work
  systrace: Look for "Compose:recompose" spans
  → If many composables show up that shouldn't → state read too early
```

---

## 23. Baseline Profiles

```kotlin
// Baseline Profiles pre-compile hot paths → faster first launch

// 1. Add dependency:
// androidTest/build.gradle.kts
dependencies {
    implementation("androidx.benchmark:benchmark-macro-junit4:1.3.0")
}

// 2. Write profile generator:
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {

    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    fun generateProfile() {
        rule.collect("com.myapp") {
            // Launch the app
            pressHome()
            startActivityAndWait()

            // Navigate through critical user journeys
            device.findObject(By.text("Feed")).click()
            device.waitForIdle()

            // Scroll the feed
            val list = device.findObject(By.scrollable(true))
            list.scroll(Direction.DOWN, 3f)

            // Open detail
            device.findObject(By.text("View Details")).click()
            device.waitForIdle()
        }
    }
}

// 3. Run and apply:
// ./gradlew :app:generateReleaseBaselineProfile

// Impact:
//   Cold start: 20-40% faster
//   First scroll: 30-50% fewer janky frames
//   First render: 15-25% faster
```

---

## 24. Profiling

### Tools & What to Look For

```
TOOL 1: Layout Inspector (best for recomposition)
  View → Tool Windows → Layout Inspector
  ✅ Shows recomposition counts per composable
  ✅ Shows skip counts
  ✅ Highlights components that recompose too often
  → Look for: High recomposition count with low skip count

TOOL 2: Compose Compiler Reports (best for stability)
  ./gradlew assembleRelease -PcomposeCompilerReports=true
  → *-classes.txt: stable/unstable classification
  → *-composables.txt: restartable/skippable status
  → Look for: "restartable but NOT skippable"

TOOL 3: System Trace / Perfetto (best for frame timing)
  Android Studio → Profiler → CPU → System Trace
  → Record interaction → analyze trace
  → Look for: "Choreographer#doFrame" spans > 16ms
  → Look for: "Compose:recompose" showing unexpected composables

TOOL 4: GPU Rendering Profiler (best for draw performance)
  Developer Options → Profile GPU Rendering → On screen as bars
  → Green bars = draw time
  → Bars above the green line = janky frame
  → Look for: Consistent bars above 16ms line

TOOL 5: Composition Tracing (Compose 1.4+)
  // Add to code:
  compose.tracing.enabled=true (in gradle.properties)
  → Shows individual composable function names in system trace
  → Identifies WHICH composable is slow
```

---

## 25. Lazy List Checklist

```
Performance checklist for production LazyColumn:

✅ 1. key = { item.id }
   Without: Deletions/insertions recompose all items below
   With: Only affected item recomposes

✅ 2. contentType = { item.type }
   Without: Composition created from scratch for each new item
   With: Compositions recycled from pool → much faster

✅ 3. All item parameters are STABLE
   Check: ./gradlew assembleRelease -PcomposeCompilerReports=true
   Fix: @Immutable, ImmutableList, stable primitives

✅ 4. No object allocations in item composable
   Bad: val style = TextStyle(...) inside item
   Good: Use MaterialTheme.typography or remember { }

✅ 5. Lambda callbacks use remember or method references
   Bad: onClick = { vm.delete(item.id) }
   Good: onClick = remember(item.id) { { vm.delete(item.id) } }

✅ 6. Images use proper sizing + placeholder
   Bad: AsyncImage without size → measure twice
   Good: AsyncImage(Modifier.size(48.dp), placeholder = ...)

✅ 7. animateItem() for smooth add/remove
   LazyColumn { items(items, key = { it.id }) { item ->
       ItemCard(Modifier.animateItem())
   }}

✅ 8. Avoid nested scrollables in same direction
   Bad: LazyColumn { item { Column(Modifier.verticalScroll()) } }
   Good: Flatten into LazyColumn items

✅ 9. Pre-measure heavy items
   Use SubcomposeLayout or Modifier.onSizeChanged for dynamic heights

✅ 10. Use rememberLazyListState for scroll position
    val listState = rememberLazyListState()
    LazyColumn(state = listState)
    // listState survives recomposition + config change
```

---

## 26. Heavy Computation

### Keeping Composition Fast

```kotlin
// ❌ PROBLEM: Heavy computation blocks composition (and the main thread)
@Composable
fun Bad(items: List<Item>) {
    val sorted = items.sortedBy { it.score }       // O(n log n) per recomposition!
    val grouped = sorted.groupBy { it.category }    // O(n) per recomposition!
    // ...
}

// ✅ FIX 1: Remember expensive computations
@Composable
fun Good(items: List<Item>) {
    val grouped = remember(items) {
        items.sortedBy { it.score }.groupBy { it.category }
    }
    // Only re-computes when items reference changes
}

// ✅ FIX 2: Move to ViewModel
class MyViewModel : ViewModel() {
    val groupedItems = repository.items
        .map { items -> items.sortedBy { it.score }.groupBy { it.category } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyMap())
}

// ✅ FIX 3: Offload to background thread
class MyViewModel : ViewModel() {
    val groupedItems = repository.items
        .map { items ->
            withContext(Dispatchers.Default) {  // CPU work off main thread
                items.sortedBy { it.score }.groupBy { it.category }
            }
        }
        .stateIn(...)
}

// ✅ FIX 4: Use derivedStateOf for filtering that depends on Compose state
@Composable
fun FilteredList(items: List<Item>) {
    var query by remember { mutableStateOf("") }
    val filtered by remember(items) {
        derivedStateOf {
            if (query.isEmpty()) items
            else items.filter { it.name.contains(query, ignoreCase = true) }
        }
    }
    // derivedStateOf caches — only recomputes when query or items changes
}
```

---

# Part 6: Navigation in Compose

## 27. Navigation Architecture

```kotlin
// Navigation Compose — declarative, state-driven navigation

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "feed") {

        composable("feed") {
            val vm: FeedViewModel = hiltViewModel()
            FeedScreen(
                viewModel = vm,
                onItemClick = { id -> navController.navigate("detail/$id") },
                onProfileClick = { navController.navigate("profile") },
            )
        }

        composable(
            route = "detail/{itemId}",
            arguments = listOf(navArgument("itemId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val itemId = backStackEntry.arguments?.getString("itemId") ?: return@composable
            val vm: DetailViewModel = hiltViewModel()
            DetailScreen(viewModel = vm)
        }

        composable("profile") {
            val vm: ProfileViewModel = hiltViewModel()
            ProfileScreen(viewModel = vm)
        }
    }
}

// Key rules:
// 1. navController lives in the nav host — NOT in ViewModels
// 2. Screens receive callbacks for navigation, NOT the navController
// 3. Each composable route has its own ViewModel instance
// 4. ViewModel is scoped to the NavBackStackEntry (destroyed on pop)
```

---

## 28. Type-Safe Navigation

```kotlin
// Type-safe navigation with Kotlin Serialization (Navigation 2.8+)

@Serializable data object Feed
@Serializable data class Detail(val itemId: String)
@Serializable data class Profile(val userId: String)
@Serializable data object Settings

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Feed) {

        composable<Feed> {
            FeedScreen(
                onItemClick = { id -> navController.navigate(Detail(itemId = id)) },
            )
        }

        composable<Detail> { backStackEntry ->
            val detail: Detail = backStackEntry.toRoute()
            DetailScreen(itemId = detail.itemId)
        }

        composable<Profile> { backStackEntry ->
            val profile: Profile = backStackEntry.toRoute()
            ProfileScreen(userId = profile.userId)
        }
    }
}

// Benefits over string routes:
// ✅ Compile-time safety (typo in route → compiler error)
// ✅ Type-safe arguments (no manual parsing)
// ✅ Refactor-friendly (rename → auto-updates everywhere)
// ✅ No argument type mismatches at runtime
```

---

## 29. Deep Links

```kotlin
// Deep links + multi-module navigation

// Module: feature-feed
// navigation/FeedNavigation.kt
fun NavGraphBuilder.feedGraph(onItemClick: (String) -> Unit) {
    composable<Feed> {
        FeedScreen(onItemClick = onItemClick)
    }
}

fun NavController.navigateToFeed() = navigate(Feed)

// Module: feature-detail
// navigation/DetailNavigation.kt
fun NavGraphBuilder.detailGraph() {
    composable<Detail>(
        deepLinks = listOf(
            navDeepLink<Detail>(basePath = "https://myapp.com/item"),
        ),
    ) { backStackEntry ->
        val detail: Detail = backStackEntry.toRoute()
        DetailScreen(itemId = detail.itemId)
    }
}

// App module wires everything:
NavHost(navController, startDestination = Feed) {
    feedGraph(onItemClick = { id -> navController.navigate(Detail(id)) })
    detailGraph()
}

// Deep link: https://myapp.com/item/abc123
// → Opens Detail(itemId = "abc123") directly
```

---

## 30. Nested Graphs

```kotlin
// Nested navigation graphs — group related screens

NavHost(navController, startDestination = "main") {

    // Main tab graph
    navigation(startDestination = "feed", route = "main") {
        composable("feed") { FeedScreen(...) }
        composable("search") { SearchScreen(...) }
        composable("profile") { ProfileScreen(...) }
    }

    // Auth flow (separate graph)
    navigation(startDestination = "login", route = "auth") {
        composable("login") { LoginScreen(...) }
        composable("signup") { SignupScreen(...) }
        composable("forgot-password") { ForgotPasswordScreen(...) }
    }

    // Onboarding flow (separate graph)
    navigation(startDestination = "welcome", route = "onboarding") {
        composable("welcome") { WelcomeScreen(...) }
        composable("permissions") { PermissionsScreen(...) }
        composable("interests") { InterestsScreen(...) }
    }
}

// Navigate between graphs:
navController.navigate("auth") {
    popUpTo("main") { inclusive = true }  // clear main stack
}
```

---

# Part 7: Interop — Compose ↔ Views

## 31. ComposeView in Fragments

```kotlin
// Hosting Compose in existing Fragment-based app

class FeedFragment : Fragment() {
    private val viewModel: FeedViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        return ComposeView(requireContext()).apply {
            setViewCompositionStrategy(
                ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed
            )
            setContent {
                AppTheme {
                    val state by viewModel.state.collectAsStateWithLifecycle()
                    FeedScreen(state = state, onEvent = viewModel::onEvent)
                }
            }
        }
    }
}

// ViewCompositionStrategy options:
//   DisposeOnViewTreeLifecycleDestroyed (DEFAULT for Fragments)
//     → Dispose when Fragment's view lifecycle is destroyed
//     → Use this for Fragments
//
//   DisposeOnDetachedFromWindow
//     → Dispose when ComposeView detached from window
//     → Use this for RecyclerView items or dynamic views
//
//   DisposeOnLifecycleDestroyed(lifecycle)
//     → Dispose when specific lifecycle is destroyed
//     → Use for Activities
```

---

## 32. AndroidView

```kotlin
// Hosting Android Views inside Compose (for legacy views, maps, WebView, etc.)

@Composable
fun LegacyMapView(location: LatLng, modifier: Modifier = Modifier) {
    AndroidView(
        factory = { context ->
            // Called ONCE — create the view
            MapView(context).apply {
                onCreate(null)
                getMapAsync { map ->
                    map.uiSettings.isZoomControlsEnabled = true
                }
            }
        },
        update = { mapView ->
            // Called on EVERY recomposition with new parameters
            mapView.getMapAsync { map ->
                map.moveCamera(CameraUpdateFactory.newLatLng(location))
            }
        },
        onRelease = { mapView ->
            // Called when composable leaves composition
            mapView.onDestroy()
        },
        modifier = modifier,
    )
}

// AndroidView lifecycle:
//   factory → called once (create View)
//   update → called on recomposition (update View with new state)
//   onRelease → called when composable removed (cleanup)
```

---

## 33. Migration Strategy

### Strangler Fig Pattern for Compose Migration

```
Phase 1: LEAF NODES (weeks 1-4)
  Start with isolated, self-contained screens
  ✅ Settings screen → Compose
  ✅ Profile screen → Compose
  ✅ About screen → Compose
  These have no complex interactions with other Views

Phase 2: SHARED COMPONENTS (weeks 5-8)
  Replace common View components with Compose equivalents
  ✅ Custom buttons → Compose buttons
  ✅ Loading indicators → Compose
  ✅ Error states → Compose
  Wrap in ComposeView for backward compat

Phase 3: FEATURE SCREENS (weeks 9-16)
  Migrate main features one at a time
  ✅ Feed screen → Compose (biggest win: LazyColumn vs RecyclerView)
  ✅ Detail screen → Compose
  ✅ Search screen → Compose
  Keep Fragment shell, replace content with ComposeView

Phase 4: NAVIGATION (weeks 17-20)
  Replace Fragment navigation with Navigation Compose
  ✅ Remove FragmentManager
  ✅ Remove navigation XML
  ✅ Remove Fragment classes (just Composable functions now)

Phase 5: CLEANUP (weeks 21-24)
  ✅ Remove View dependencies (RecyclerView, ConstraintLayout)
  ✅ Remove Fragment base classes
  ✅ Remove XML layouts
  ✅ Single Activity architecture
```

---

## 34. Theme Bridge

```kotlin
// Share theme between View system and Compose

// 1. Create a bridge theme
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current

    // Read Material Design theme from XML (for interop)
    val colorScheme = if (isSystemInDarkTheme()) {
        darkColorScheme(
            primary = Color(context.getColor(R.color.primary_dark)),
            secondary = Color(context.getColor(R.color.secondary_dark)),
            surface = Color(context.getColor(R.color.surface_dark)),
        )
    } else {
        lightColorScheme(
            primary = Color(context.getColor(R.color.primary)),
            secondary = Color(context.getColor(R.color.secondary)),
            surface = Color(context.getColor(R.color.surface)),
        )
    }

    MaterialTheme(colorScheme = colorScheme) {
        content()
    }
}

// 2. Use MdcTheme for automatic bridging (Material Components → Compose)
// dependency: com.google.android.material:compose-theme-adapter
MdcTheme {
    // Automatically reads your XML theme and maps to MaterialTheme
    // Colors, typography, shapes — all bridged
}
```

---

# Part 8: Theming & Design Systems

## 35. Custom Design System

```kotlin
// Build a custom design system layer on top of MaterialTheme

// Step 1: Define custom color tokens
@Immutable
data class AppColors(
    val brandPrimary: Color,
    val brandSecondary: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val surfaceCard: Color,
    val positive: Color,
    val negative: Color,
)

val LocalAppColors = staticCompositionLocalOf {
    AppColors(
        brandPrimary = Color.Unspecified,
        brandSecondary = Color.Unspecified,
        textPrimary = Color.Unspecified,
        textSecondary = Color.Unspecified,
        surfaceCard = Color.Unspecified,
        positive = Color.Unspecified,
        negative = Color.Unspecified,
    )
}

// Step 2: Define custom typography
@Immutable
data class AppTypography(
    val displayLarge: TextStyle,
    val titleBold: TextStyle,
    val bodyRegular: TextStyle,
    val caption: TextStyle,
)

val LocalAppTypography = staticCompositionLocalOf {
    AppTypography(
        displayLarge = TextStyle.Default,
        titleBold = TextStyle.Default,
        bodyRegular = TextStyle.Default,
        caption = TextStyle.Default,
    )
}

// Step 3: Create the theme object (convenience accessor)
object AppTheme {
    val colors: AppColors @Composable get() = LocalAppColors.current
    val typography: AppTypography @Composable get() = LocalAppTypography.current
}

// Step 4: Apply in the app root
@Composable
fun AppTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val colors = if (darkTheme) darkAppColors else lightAppColors
    val typography = appTypography

    CompositionLocalProvider(
        LocalAppColors provides colors,
        LocalAppTypography provides typography,
    ) {
        MaterialTheme(
            colorScheme = colors.toMaterialColorScheme(),
            content = content,
        )
    }
}

// Step 5: Use everywhere
@Composable
fun TransactionCard(amount: String, isPositive: Boolean) {
    Text(
        text = amount,
        style = AppTheme.typography.titleBold,
        color = if (isPositive) AppTheme.colors.positive else AppTheme.colors.negative,
    )
}
```

---

## 36. Dynamic Theming

```kotlin
// Material You — Dynamic Color (Android 12+)

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    val context = LocalContext.current
    val colorScheme = when {
        // Dynamic color available on Android 12+
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            if (isSystemInDarkTheme()) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        // Fallback for older devices
        isSystemInDarkTheme() -> darkColorScheme()
        else -> lightColorScheme()
    }

    MaterialTheme(colorScheme = colorScheme, content = content)
}

// Dynamic color pulls from the user's wallpaper:
//   Primary → dominant wallpaper color
//   Secondary → complementary color
//   Tertiary → analogous color
//   Surface, background, error → derived algorithmically
```

---

## 37. Dark Mode

```kotlin
// Proper dark mode implementation

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    // Update system bars to match theme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val activity = view.context as Activity
            activity.window.statusBarColor = colorScheme.surface.toArgb()
            WindowCompat.getInsetsController(activity.window, view)
                .isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(colorScheme = colorScheme, content = content)
}

// Dark mode rules:
// ✅ Use MaterialTheme.colorScheme.* — never hardcode colors
// ✅ Use Surface with tonalElevation — higher elevation = lighter in dark mode
// ✅ Test both themes — use @Preview with uiMode = UI_MODE_NIGHT_YES
// ❌ Never use Color.White or Color.Black directly
// ❌ Never use View system colors (R.color.*) in Compose without bridging
```

---

## 38. Typography

### Responsive Typography

```kotlin
// Scale typography based on screen size

@Composable
fun responsiveTypography(): Typography {
    val configuration = LocalConfiguration.current
    val screenWidth = configuration.screenWidthDp

    val scaleFactor = when {
        screenWidth < 360 -> 0.85f   // small phones
        screenWidth < 400 -> 1.0f    // normal phones
        screenWidth < 600 -> 1.1f    // large phones
        else -> 1.25f                // tablets
    }

    return Typography(
        displayLarge = TextStyle(
            fontSize = (32 * scaleFactor).sp,
            lineHeight = (40 * scaleFactor).sp,
            fontWeight = FontWeight.Bold,
        ),
        titleMedium = TextStyle(
            fontSize = (16 * scaleFactor).sp,
            lineHeight = (24 * scaleFactor).sp,
            fontWeight = FontWeight.SemiBold,
        ),
        bodyMedium = TextStyle(
            fontSize = (14 * scaleFactor).sp,
            lineHeight = (20 * scaleFactor).sp,
        ),
    )
}

// Text overflow patterns:
Text(
    text = longText,
    maxLines = 2,
    overflow = TextOverflow.Ellipsis,  // "This is a very long te..."
)

Text(
    text = title,
    maxLines = 1,
    softWrap = false,
    overflow = TextOverflow.Ellipsis,  // single line with ellipsis
)

// Auto-size text (Compose 1.7+):
Text(
    text = title,
    style = MaterialTheme.typography.headlineLarge,
    maxLines = 1,
    autoSize = TextAutoSize.StepBased(
        minFontSize = 12.sp,
        maxFontSize = 32.sp,
        stepSize = 2.sp,
    ),
)
```

---

# Part 9: Accessibility

## 39. Semantics Tree

### How TalkBack Reads Your Compose UI

```
Every composable has a semantics node that TalkBack uses:

Visual tree:              Semantics tree (what TalkBack sees):
Card                      "Alice, Paid Bob for lunch, Double tap to open"
├── Row
│   ├── Avatar
│   ├── Column
│   │   ├── Text("Alice")
│   │   └── Text("Paid Bob for lunch")
│   └── Icon(Like)
└── clickable { }

Compose MERGES descendants by default when a parent is clickable.
This is usually correct — TalkBack reads the card as one unit.
```

```kotlin
// Controlling semantics
@Composable
fun FeedCard(item: FeedItem, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .clickable(
                onClick = onClick,
                onClickLabel = "Open transaction details",  // ✅ describes action
            )
            .semantics(mergeDescendants = true) {},  // merge children into one node
    ) {
        Row {
            Avatar(
                url = item.avatarUrl,
                modifier = Modifier.semantics {
                    contentDescription = "${item.userName}'s avatar"
                },
            )
            Column {
                Text(item.userName)  // automatically in semantics
                Text(item.description)  // automatically in semantics
            }
            IconButton(
                onClick = { onLike(item.id) },
                modifier = Modifier.semantics {
                    // ✅ Separate action — not merged with card click
                    contentDescription = if (item.isLiked) "Unlike" else "Like"
                    stateDescription = if (item.isLiked) "Liked" else "Not liked"
                },
            ) {
                Icon(Icons.Default.Favorite, contentDescription = null)
                // null because parent semantics provides the description
            }
        }
    }
}
```

---

## 40. Accessible Components

```kotlin
// Making custom components accessible

// Custom toggle:
@Composable
fun CustomSwitch(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .toggleable(
                value = checked,
                onValueChange = onCheckedChange,
                role = Role.Switch,  // ✅ TalkBack announces "Switch"
            )
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, Modifier.weight(1f))
        // Visual indicator
        Box(
            Modifier
                .size(48.dp, 24.dp)
                .background(
                    if (checked) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.surfaceVariant,
                    RoundedCornerShape(12.dp),
                )
        ) {
            Box(
                Modifier
                    .size(20.dp)
                    .align(if (checked) Alignment.CenterEnd else Alignment.CenterStart)
                    .background(Color.White, CircleShape)
            )
        }
    }
}
// TalkBack reads: "Dark mode, Switch, OFF, Double tap to toggle"

// Custom slider with live announcements:
@Composable
fun VolumeSlider(volume: Float, onVolumeChange: (Float) -> Unit) {
    Column {
        Text("Volume: ${(volume * 100).toInt()}%")
        Slider(
            value = volume,
            onValueChange = onVolumeChange,
            modifier = Modifier.semantics {
                contentDescription = "Volume"
                liveRegion = LiveRegionMode.Polite  // ✅ announces changes
                stateDescription = "${(volume * 100).toInt()} percent"
            },
        )
    }
}

// Headings for screen structure:
@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
        modifier = Modifier.semantics { heading() },  // ✅ TalkBack can jump between headings
    )
}
```

---

## 41. Touch Targets

### Minimum Touch Target Size

```kotlin
// Material guidelines: 48dp minimum touch target

// ❌ Too small — fails accessibility
IconButton(onClick = onClose) {
    Icon(Icons.Default.Close, "Close", Modifier.size(16.dp))  // visual size 16dp
}
// But IconButton already adds 48dp touch target → actually OK!

// ❌ Actually problematic — custom clickable without sizing
Icon(
    Icons.Default.Close,
    "Close",
    Modifier
        .size(16.dp)
        .clickable { onClose() },  // touch target = 16dp → TOO SMALL
)

// ✅ Fix: Use sizeIn for minimum touch target
Icon(
    Icons.Default.Close,
    "Close",
    Modifier
        .sizeIn(minWidth = 48.dp, minHeight = 48.dp)
        .clickable { onClose() },
)

// Focus order for keyboard/switch access:
@Composable
fun LoginForm() {
    val (emailFocus, passwordFocus, submitFocus) = remember { FocusRequester.createRefs() }

    TextField(
        value = email,
        onValueChange = { email = it },
        modifier = Modifier
            .focusRequester(emailFocus)
            .focusProperties { next = passwordFocus },  // Tab → password
    )
    TextField(
        value = password,
        onValueChange = { password = it },
        modifier = Modifier
            .focusRequester(passwordFocus)
            .focusProperties { next = submitFocus },  // Tab → submit
    )
    Button(
        onClick = onSubmit,
        modifier = Modifier.focusRequester(submitFocus),
    ) { Text("Login") }
}
```

---

# Part 10: Production War Stories

## 42. War Stories

### Real Bugs & Their Root Causes

```
WAR STORY 1: "The Infinite Recomposition Loop"

  Symptom: Screen frozen, CPU at 100%, ANR after 5 seconds
  Code:
    @Composable
    fun Bad() {
        var items by remember { mutableStateOf(listOf<Item>()) }
        items = fetchItems()  // ❌ WRITES STATE during composition!
        // Write → triggers recomposition → composition reads → write → infinite loop
    }
  Fix: Use LaunchedEffect for async work that writes state
  Lesson: NEVER write to State<T> directly during composition


WAR STORY 2: "The Phantom Scroll Position Reset"

  Symptom: LazyColumn scrolls to top randomly during navigation
  Code:
    @Composable
    fun Bad(vm: FeedViewModel) {
        val items by vm.items.collectAsState()  // ❌ new list reference every emission
        LazyColumn {
            items(items) { ... }  // no key → identity by index → resets on list change
        }
    }
  Fix: Add key = { it.id } and use distinctUntilChanged on the flow
  Lesson: Keys are not optional for real lists


WAR STORY 3: "The Memory Leak in LazyColumn"

  Symptom: Memory grows without bound while scrolling
  Code:
    items(items) { item ->
        val bitmap = remember { loadBitmap(item.url) }  // ❌ remember holds Bitmap
        // When item scrolls off, remember is disposed BUT bitmap isn't recycled
    }
  Fix: Use DisposableEffect + bitmap.recycle(), or use Coil/Glide
  Lesson: remember doesn't know how to clean up external resources


WAR STORY 4: "The Double Navigation Bug"

  Symptom: Tapping a button navigates twice (opens two Detail screens)
  Cause: Fast double-tap → onClick fires twice before navigation completes
  Fix:
    fun NavController.navigateOnce(route: String) {
        if (currentBackStackEntry?.lifecycle?.currentState == Lifecycle.State.RESUMED) {
            navigate(route)
        }
    }
  Lesson: Always debounce navigation in production


WAR STORY 5: "The Missing State After Rotation"

  Symptom: Form data lost after screen rotation
  Code:
    var name by remember { mutableStateOf("") }  // ❌ remember = gone on config change
  Fix: var name by rememberSaveable { mutableStateOf("") }
  Lesson: remember ≠ rememberSaveable. Always ask: "Does this survive rotation?"
```

---

## 43. Gotchas Cheat Sheet

```
GOTCHA → FIX (one-liner reference card)

List without key
  → items(list, key = { it.id })

Unstable data class with List property
  → Use ImmutableList or add @Immutable

remember in LazyColumn item doesn't persist after scroll
  → Expected — use rememberSaveable or ViewModel

LaunchedEffect runs every recomposition
  → You're passing a changing key. Use Unit for "run once"

Modifier order matters
  → padding before background ≠ background before padding
  → Think "wrap outside-in"

clickable absorbs touch but no visual feedback
  → Use Modifier.clickable (includes ripple) not pointerInput

TextField doesn't update
  → You're not calling onValueChange. Wire value + onValueChange

Snackbar won't show
  → Use SnackbarHostState.showSnackbar() in a coroutine scope (LaunchedEffect or rememberCoroutineScope)

Dialog doesn't dismiss on back press
  → Add onDismissRequest handler to Dialog

Back handler not working
  → Use BackHandler(enabled = true) { ... } from activity.compose

Image fills entire screen
  → Add contentScale = ContentScale.Crop and explicit size modifier

Text color doesn't change in dark mode
  → You're using hardcoded Color(). Use MaterialTheme.colorScheme.*

Column content not scrollable
  → Add Modifier.verticalScroll(rememberScrollState())

Preview doesn't show
  → Check: @Preview + @Composable, no ViewModel dependencies, parameter defaults

Compose test can't find element
  → Check: onNodeWithText uses exact text. Try substring match or testTag
```
