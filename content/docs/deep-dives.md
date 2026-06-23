---
title: "Framework Deep Dives"
weight: 14
---


# Framework Deep Dives

> [!NOTE]
> **4 framework areas, 23 topics.** Detailed breakdowns of Compose, Coroutines, Gradle, and Android framework internals for senior engineering interviews. For a deeper, book-grade Compose internals reference (compiler IR, Applier, MVCC snapshots, Recomposer), see [Compose Internals Mastery]({{< relref "/docs/compose-internals" >}}).

---

## Table of Contents

### Compose Internals
→ See **[Compose Internals Mastery]({{< relref "/docs/compose-internals" >}})** (full book-depth coverage)

### Coroutines & Flow Internals
8. [Coroutine Internals (CPS & State Machine)](#8-coroutine-internals)
9. [Dispatchers & Thread Pools](#9-dispatchers--thread-pools)
10. [Flow Internals](#10-flow-internals)
11. [Structured Concurrency Deep Dive](#11-structured-concurrency-deep-dive)
12. [Channel Internals](#12-channel-internals)
13. [Exception Handling in Coroutines](#13-exception-handling-in-coroutines)

### Gradle & Build System
14. [Gradle Build Lifecycle](#14-gradle-build-lifecycle)
15. [Build Speed Optimization](#15-build-speed-optimization)
16. [Kotlin DSL & Convention Plugins](#16-kotlin-dsl--convention-plugins)
17. [Dependency Resolution](#17-dependency-resolution)
18. [R8 / ProGuard Deep Dive](#18-r8--proguard-deep-dive)

### Android Framework Internals
19. [Activity/Fragment Lifecycle Internals](#19-activityfragment-lifecycle-internals)
20. [Process & Memory Management](#20-process--memory-management)
21. [Binder & IPC](#21-binder--ipc)
22. [View Rendering Pipeline](#22-view-rendering-pipeline)
23. [Handler / Looper / MessageQueue](#23-handler--looper--messagequeue)

---

# Compose Internals

Compose internals are covered in **[Compose Internals Mastery]({{< relref "/docs/compose-internals" >}})** — the full compiler → runtime → UI pipeline from Jorge Castillo's book.

| Need | Doc |
|------|-----|
| Internals (compiler, slot table, Applier, MVCC, Recomposer) | [Compose Internals Mastery]({{< relref "/docs/compose-internals" >}}) |
| LazyColumn pixel-by-pixel trace | [Compose Rendering]({{< relref "/docs/compose-rendering" >}}) |
| Production patterns & anti-patterns | [Compose Mastery]({{< relref "/docs/compose-mastery" >}}) |

---

# Coroutines & Flow Internals

## 8. Coroutine Internals

### CPS Transformation (Continuation Passing Style)

```kotlin
// What you write:
suspend fun fetchUserData(): UserData {
    val token = getToken()          // suspension point 1
    val user = getUser(token)       // suspension point 2
    return user
}

// What the compiler generates (simplified):
fun fetchUserData(continuation: Continuation<UserData>): Any? {
    class FetchUserDataStateMachine(completion: Continuation<UserData>) :
        ContinuationImpl(completion) {

        var label = 0       // current state
        var token: String? = null
        var result: Any? = null

        override fun invokeSuspend(result: Result<Any?>): Any? {
            this.result = result
            return fetchUserData(this)  // re-enter state machine
        }
    }

    val sm = continuation as? FetchUserDataStateMachine
        ?: FetchUserDataStateMachine(continuation)

    when (sm.label) {
        0 -> {
            sm.label = 1
            val result = getToken(sm)  // pass state machine as continuation
            if (result == COROUTINE_SUSPENDED) return COROUTINE_SUSPENDED
            // If getToken completed synchronously, fall through
        }
        1 -> {
            sm.token = sm.result as String
            sm.label = 2
            val result = getUser(sm.token!!, sm)
            if (result == COROUTINE_SUSPENDED) return COROUTINE_SUSPENDED
        }
        2 -> {
            return sm.result as UserData
        }
    }
}
```

### Key Insight: No Special Thread Magic

```
Coroutines are NOT lightweight threads.
They are state machines that can be suspended and resumed.

Suspension = save state (label + local variables) → return COROUTINE_SUSPENDED
Resumption = call invokeSuspend with result → re-enter state machine at saved label

No thread is blocked during suspension.
The continuation (callback) is stored and invoked later when the result is ready.
```

---

## 9. Dispatchers & Thread Pools

### How Dispatchers Work Internally

```
Dispatchers.Main:
  → Uses Android's main Looper
  → Handler(Looper.getMainLooper()).post(runnable)
  → Single thread — NEVER blocks this

Dispatchers.Default:
  → CoroutineScheduler (work-stealing thread pool)
  → Threads = max(2, number of CPU cores)
  → Designed for CPU-bound work
  → Each thread has a local work queue + can steal from others

Dispatchers.IO:
  → SHARES threads with Default (same CoroutineScheduler)
  → But has additional threads for blocking operations
  → Up to max(64, number of CPU cores) threads
  → When a Default thread blocks → IO creates a new thread
  → This is why IO can handle many blocking calls simultaneously

Dispatchers.Unconfined:
  → Runs on caller's thread until first suspension
  → After suspension, resumes on whatever thread completed the suspension
  → Unpredictable — avoid in production
```

### Work Stealing

```
Thread 1 queue: [Task_A, Task_B, Task_C]
Thread 2 queue: [Task_D]
Thread 3 queue: []  ← idle

Thread 3 steals from Thread 1:
Thread 1 queue: [Task_A, Task_B]
Thread 2 queue: [Task_D]
Thread 3 queue: [Task_C]  ← stolen from Thread 1's tail

Why steal from tail?
  Owner processes from HEAD (hot cache)
  Stealer takes from TAIL (cold, less contention)
```

### withContext vs launch

```kotlin
// withContext: Switches dispatcher, SUSPENDS caller until complete
viewModelScope.launch {  // on Dispatchers.Main
    val result = withContext(Dispatchers.IO) {
        // Runs on IO thread
        api.fetchData()  // Main thread is FREE during this
    }
    // Back on Main thread
    _state.value = result
}

// launch: Creates new coroutine, does NOT suspend caller
viewModelScope.launch {  // on Main
    launch(Dispatchers.IO) {
        // Runs concurrently on IO
        api.sendAnalytics()
    }
    // This line runs IMMEDIATELY, doesn't wait for analytics
    _state.value = "sent"
}
```

---

## 10. Flow Internals

### Cold Flow Execution Model

```kotlin
// Flow is lazy — nothing happens until collect()

val flow = flow {
    println("Flow started")     // only runs when collected
    emit(1)
    delay(100)
    emit(2)
}

// Collecting:
flow.collect { value ->
    println("Received: $value")
}

// Output:
// Flow started
// Received: 1
// (100ms delay)
// Received: 2

// Internally, flow {} creates a SafeFlow:
// collect() calls the block with a FlowCollector
// emit() calls collector.emit() which is the lambda you passed to collect()
// It's essentially: flow.block(collector) — direct function call, no channels
```

### Operator Fusion

```kotlin
// Operators create wrapper flows:
flowOf(1, 2, 3, 4, 5)
    .filter { it > 2 }     // Creates FilteredFlow wrapping original
    .map { it * 10 }       // Creates MappedFlow wrapping FilteredFlow
    .collect { println(it) }

// Execution (no intermediate collections!):
// For each element:
//   1 → filter (> 2? NO) → skip
//   2 → filter (> 2? NO) → skip
//   3 → filter (> 2? YES) → map (* 10 = 30) → collect (print 30)
//   4 → filter (> 2? YES) → map (* 10 = 40) → collect (print 40)
//   5 → filter (> 2? YES) → map (* 10 = 50) → collect (print 50)

// Each element flows through the ENTIRE chain before the next element starts
// This is like a pipeline, not like RxJava's buffer-based approach
```

### StateFlow vs MutableStateFlow

```kotlin
// StateFlow internals (simplified):
class MutableStateFlow<T>(initialValue: T) : StateFlow<T> {
    @Volatile
    private var _value: T = initialValue

    override var value: T
        get() = _value
        set(newValue) {
            if (_value != newValue) {  // distinctUntilChanged built-in
                _value = newValue
                // Notify all collectors
                subscribers.forEach { it.resume(newValue) }
            }
        }

    override suspend fun collect(collector: FlowCollector<T>) {
        // Emit current value immediately
        collector.emit(_value)
        // Then suspend and wait for future changes
        while (true) {
            val newValue = suspendUntilChanged()
            collector.emit(newValue)
        }
    }
}

// Key properties:
// 1. Always has a value (.value is non-null after init)
// 2. Conflates: Only latest value emitted (slow collectors skip intermediate values)
// 3. Distinct: Same value set twice → no emission
// 4. Hot: Active regardless of collectors
// 5. Replay 1: New collectors get current value immediately
```

---

## 11. Structured Concurrency Deep Dive

### Job Hierarchy

```
viewModelScope (SupervisorJob)
├── launch { ... }  (Job A)
│   ├── launch { ... }  (Job A1)
│   └── async { ... }   (Job A2)
├── launch { ... }  (Job B)
└── launch { ... }  (Job C)

Rules:
1. Parent waits for ALL children to complete
2. Cancelling parent → cancels ALL children (recursively)
3. Child failure → depends on Job type:
   - Regular Job: Child failure cancels parent AND all siblings
   - SupervisorJob: Child failure does NOT affect parent or siblings

viewModelScope uses SupervisorJob:
  → If Job A throws, Job B and Job C continue
  → This is why viewModelScope is safe for independent operations
```

### Cancellation Mechanics

```kotlin
val job = launch {
    try {
        repeat(1000) { i ->
            println("Working $i")
            delay(100)  // <-- cancellation check point
            // yield() is also a cancellation check point
            // ensureActive() explicitly checks
        }
    } catch (e: CancellationException) {
        println("Cancelled!")  // cleanup here
        // NEVER swallow CancellationException — rethrow or let it propagate
    } finally {
        // Always runs, even on cancellation
        // But you can't call suspend functions here (already cancelled)
        // Unless you use withContext(NonCancellable) { ... }
        withContext(NonCancellable) {
            saveState()  // suspend function in finally
        }
    }
}

// After some time:
job.cancel()  // sets isCancelled = true
// Next time a cancellable suspension point is reached → CancellationException thrown

// IMPORTANT: CPU-intensive code without suspension points is NOT cancellable:
launch {
    var i = 0
    while (i < 1_000_000) {
        i++  // NO suspension point → cancel() has no effect!
    }
}

// Fix: Check isActive or use yield()
launch {
    var i = 0
    while (isActive && i < 1_000_000) {  // checks cancellation
        i++
    }
}
```

---

## 12. Channel Internals

### Channel Types

```
Rendezvous (capacity = 0):
  send() suspends until receive() is called
  Like a handoff — sender waits for receiver

  Producer: send(1) ──── blocks ────→ Consumer: receive() → 1
  No buffer. Synchronous handoff.

Buffered (capacity = N):
  send() suspends only when buffer is full
  receive() suspends only when buffer is empty

  Buffer: [1, 2, 3, _, _]  (capacity 5)
  send(4) → [1, 2, 3, 4, _]  (doesn't suspend)
  send(5) → [1, 2, 3, 4, 5]  (doesn't suspend)
  send(6) → SUSPENDS (buffer full, waits for receive)

Conflated (capacity = CONFLATED):
  send() NEVER suspends — overwrites last value
  Only latest value available for receive

  send(1) → buffer: [1]
  send(2) → buffer: [2]  (1 is lost)
  send(3) → buffer: [3]  (2 is lost)
  receive() → 3

Unlimited (capacity = UNLIMITED):
  send() NEVER suspends — buffer grows unbounded
  Risk: OOM if producer is much faster than consumer
```

### Channel vs SharedFlow for Events

```kotlin
// Channel: Fan-out (each event consumed by ONE collector)
val events = Channel<UiEvent>()
// Collector A gets event 1, Collector B gets event 2, etc.
// Use for: Navigation events, one-time actions

// SharedFlow: Broadcast (each event received by ALL collectors)
val events = MutableSharedFlow<UiEvent>()
// Both Collector A and B get event 1, event 2, etc.
// Use for: Notifications, state changes affecting multiple observers

// Common pattern for ViewModel one-time events:
class MyViewModel : ViewModel() {
    // Channel for one-time events (navigation, snackbar)
    private val _events = Channel<UiEvent>(Channel.BUFFERED)
    val events = _events.receiveAsFlow()

    // StateFlow for UI state (continuous)
    private val _state = MutableStateFlow(UiState())
    val state = _state.asStateFlow()
}
```

---

## 13. Exception Handling in Coroutines

### The Exception Propagation Rules

```
Rule 1: launch propagates exceptions UP to parent
  viewModelScope.launch {
      throw RuntimeException("boom")
      // → Exception propagates to viewModelScope
      // → Since viewModelScope has SupervisorJob, only this coroutine dies
  }

Rule 2: async DEFERS exception until await()
  val deferred = viewModelScope.async {
      throw RuntimeException("boom")
      // → Exception stored in Deferred, NOT propagated yet
  }
  deferred.await()  // ← Exception thrown HERE

Rule 3: Try-catch works INSIDE coroutine, NOT around launch
  // WRONG — this does NOT catch the exception:
  try {
      launch { throw RuntimeException("boom") }
  } catch (e: Exception) { /* never reaches here */ }

  // RIGHT — catch inside the coroutine:
  launch {
      try { riskyOperation() }
      catch (e: Exception) { handleError(e) }
  }

Rule 4: CoroutineExceptionHandler catches uncaught exceptions
  val handler = CoroutineExceptionHandler { _, exception ->
      Log.e("Coroutine", "Uncaught: $exception")
  }
  CoroutineScope(SupervisorJob() + handler).launch {
      throw RuntimeException("boom")  // → handled by handler
  }

Rule 5: NEVER catch CancellationException (or rethrow it)
  launch {
      try { delay(1000) }
      catch (e: CancellationException) {
          // cleanup OK
          throw e  // MUST rethrow
      }
      catch (e: Exception) {
          // This does NOT catch CancellationException (it's caught above)
      }
  }
```

---

# Gradle & Build System

## 14. Gradle Build Lifecycle

### Three Phases

```
Phase 1: INITIALIZATION
  → Read settings.gradle.kts
  → Determine which projects are in the build
  → Create Project instances
  → Duration: Usually <1 second

Phase 2: CONFIGURATION
  → Execute ALL build.gradle.kts files
  → Configure ALL tasks (even those that won't run)
  → Build the task dependency graph (DAG)
  → Duration: Can be slow if scripts do heavy work
  → AVOID: Network calls, file I/O, or heavy logic in build scripts

Phase 3: EXECUTION
  → Determine which tasks need to run (from command line + dependencies)
  → Execute tasks in dependency order (parallelized where possible)
  → Check if task is UP-TO-DATE, FROM-CACHE, or needs execution
  → Duration: Varies (seconds to minutes)

Task States:
  UP-TO-DATE: Inputs unchanged since last run → skip
  FROM-CACHE: Found in build cache (local or remote) → copy output
  EXECUTED: Ran the task
  SKIPPED: Excluded by command or condition
  NO-SOURCE: No input files exist
```

---

## 15. Build Speed Optimization

### Quick Wins

```groovy
// gradle.properties
org.gradle.parallel=true           // Build independent modules in parallel
org.gradle.caching=true            // Enable local build cache
org.gradle.configuration-cache.problems=warn  // Configuration cache
org.gradle.daemon=true             // Keep daemon alive between builds
org.gradle.jvmargs=-Xmx4g         // More memory for Gradle daemon

// For CI:
org.gradle.workers.max=4           // Limit parallelism on CI (shared resources)
```

### What Makes Builds Slow

```
1. Configuration phase bloat:
   → buildscript { } with dynamic versions (checks Maven on every build)
   → Applying unnecessary plugins
   → Heavy logic in build.gradle.kts
   Fix: Use version catalogs, avoid dynamic versions

2. Unnecessary compilation:
   → Changing a constant in a base module → recompiles all dependent modules
   → Using api() instead of implementation() → exposes transitive dependencies
   Fix: Use implementation() by default, api() only when explicitly needed

3. Annotation processing:
   → kapt is slow (generates stubs, runs Java annotation processor)
   Fix: Migrate to KSP (Kotlin Symbol Processing) — 2-3x faster

4. No build cache hits:
   → Task outputs not cacheable
   → Absolute paths in task inputs
   Fix: Enable remote build cache for CI, verify cache hit rates

5. Full rebuilds:
   → ./gradlew clean before every build
   Fix: Never clean unless debugging build issues
```

### Module Architecture for Build Speed

```
Avoid:
  app → feature-a → core → network
  app → feature-b → core → network
  Changing network → recompiles core → recompiles feature-a + feature-b → app

Better (API module pattern):
  app → feature-a → core-api (interfaces only)
  app → feature-b → core-api
  core-impl → core-api    (implementation)
  network-impl → network-api

  Changing network-impl → only recompiles network-impl + app (for linking)
  core-api unchanged → feature-a and feature-b NOT recompiled
```

---

## 16. Kotlin DSL & Convention Plugins

### Convention Plugins (DRY Build Logic)

```kotlin
// build-logic/convention/src/main/kotlin/AndroidLibraryConventionPlugin.kt
class AndroidLibraryConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        with(target) {
            with(pluginManager) {
                apply("com.android.library")
                apply("org.jetbrains.kotlin.android")
            }
            extensions.configure<LibraryExtension> {
                compileSdk = 34
                defaultConfig {
                    minSdk = 26
                    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
                }
                compileOptions {
                    sourceCompatibility = JavaVersion.VERSION_17
                    targetCompatibility = JavaVersion.VERSION_17
                }
            }
        }
    }
}

// Usage in feature module's build.gradle.kts:
plugins {
    id("com.venmo.android.library")  // applies all common config
}
// Only module-specific config needed here
```

---

## 17. Dependency Resolution

### How Gradle Resolves Conflicts

```
Module A depends on: okhttp:4.9.0
Module B depends on: okhttp:4.12.0

Gradle default strategy: Highest version wins
  → okhttp:4.12.0 used everywhere

Force specific version:
  configurations.all {
      resolutionStrategy {
          force("com.squareup.okhttp3:okhttp:4.12.0")
      }
  }

Strict version (fail on conflict):
  implementation("com.squareup.okhttp3:okhttp") {
      version { strictly("4.12.0") }
  }

BOM (Bill of Materials):
  implementation(platform("com.squareup.okhttp3:okhttp-bom:4.12.0"))
  implementation("com.squareup.okhttp3:okhttp")  // version from BOM
  implementation("com.squareup.okhttp3:logging-interceptor")  // version from BOM
```

### api vs implementation

```
api: Exposes dependency to consumers (transitive)
  Module A: api("okhttp")
  Module B depends on A → can use okhttp directly
  Change okhttp → recompiles A AND B

implementation: Hides dependency from consumers
  Module A: implementation("okhttp")
  Module B depends on A → CANNOT use okhttp
  Change okhttp → recompiles only A

Rule: Use implementation by default. Only use api when
      your module's public API exposes types from the dependency.
```

---

## 18. R8 / ProGuard Deep Dive

### What R8 Does

```
1. SHRINKING (Tree Shaking):
   → Remove unused classes, methods, fields
   → Follows call graph from entry points (activities, services)
   → Typical reduction: 30-50% of code size

2. OPTIMIZATION:
   → Inline short methods
   → Remove dead code branches
   → Merge identical methods
   → Devirtualize (virtual call → direct call when only one implementation)

3. OBFUSCATION:
   → Rename classes/methods/fields to short names (a, b, c)
   → Makes decompilation harder (not impossible)
   → Requires mapping file for crash reports (upload to Crashlytics)

4. DESUGARING:
   → Convert Java 8+ features to bytecode compatible with older Android
   → Lambda expressions, default interface methods, try-with-resources
```

### Keep Rules

```
# Keep all public APIs of a library module
-keep public class com.venmo.feed.models.** { *; }

# Keep classes used by reflection (Gson, Moshi, kotlinx-serialization)
-keep class com.venmo.feed.models.FeedItem { *; }
-keepclassmembers class com.venmo.feed.models.FeedItem {
    <fields>;
}

# Keep @Serializable classes (kotlinx-serialization)
-keepattributes *Annotation*
-keep class kotlinx.serialization.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}

# Common mistakes:
# 1. Not keeping Parcelable classes → crash on process death
# 2. Not keeping Enum values → valueOf() crashes
# 3. Not keeping class names used in XML (layouts, preferences)
```

---

# Android Framework Internals

## 19. Activity/Fragment Lifecycle Internals

### The Full Lifecycle Matrix

```
                Activity         Fragment
                ────────         ────────
                                 onAttach
                onCreate ←─────  onCreate
                                 onCreateView
                onStart ←──────  onViewCreated / onStart
                onResume ←─────  onResume

              [USER INTERACTS]

                onPause ──────→  onPause
                onStop ───────→  onStop
                                 onDestroyView
                onDestroy ────→  onDestroy
                                 onDetach

Config change (rotation):
  onPause → onStop → onDestroy → onCreate → onStart → onResume
  ViewModel SURVIVES (not destroyed)
  SavedStateHandle SURVIVES

Process death (system kills app):
  onPause → onStop → [process killed]
  → User returns → onCreate(savedInstanceState != null)
  ViewModel DESTROYED (recreated)
  SavedStateHandle SURVIVES (restored from Bundle)
  Room data SURVIVES (persisted to disk)
```

---

## 20. Process & Memory Management

### Process Priority

```
1. Foreground (highest priority — almost never killed):
   - Activity in onResume
   - Service running foreground notification
   - BroadcastReceiver executing onReceive

2. Visible (high priority):
   - Activity in onPause (partially visible, e.g., behind dialog)

3. Service (medium priority):
   - Started service not in foreground

4. Cached/Background (low priority — killed first):
   - Activity in onStop (not visible)
   - LRU order: Most recently used → least recently used

System kills process when memory pressure:
  Cached processes killed first (LRU order)
  → Then service processes
  → Then visible processes
  → Foreground processes killed only in extreme cases
```

### Low Memory Killer (LMK)

```
Android uses LMK daemon (kernel level):
  Monitors free memory → kills processes by OOM adjustment score

  OOM adj score:
    -1000 = system process (never killed)
    0     = foreground activity
    100   = visible activity
    200   = perceptible (foreground service)
    700   = cached (recent)
    900   = cached (old)

  When free memory < threshold → kill highest OOM adj score processes
```

---

## 21. Binder & IPC

### What is Binder?

```
Binder is Android's inter-process communication (IPC) mechanism.

Every system service call goes through Binder:
  App process ──Binder──→ System Server process
  
  Examples:
    ActivityManager.startActivity() → Binder → system_server
    LocationManager.getLastLocation() → Binder → system_server
    MediaPlayer.play() → Binder → mediaserver

AIDL (Android Interface Definition Language):
  Defines the interface for Binder communication
  Compiler generates proxy (client-side) and stub (server-side)
  Serialization: Parcel (binary, efficient)

Transaction limits:
  Maximum Binder transaction size: ~1MB
  TransactionTooLargeException if exceeded
  Common cause: Putting too much data in Intent/Bundle
    → Use ViewModel or Room instead of passing large data between screens
```

---

## 22. View Rendering Pipeline

### How a Frame Gets Rendered (Traditional Views)

```
Frame Pipeline (16ms budget for 60fps):

1. INPUT (handle touch/gesture events)
   → MotionEvent dispatched through View hierarchy
   → ~1-2ms

2. ANIMATION (compute animation frame)
   → ValueAnimator/ObjectAnimator compute interpolated values
   → ~1ms

3. MEASURE (top-down)
   → Parent measures children → children measure their children
   → MeasureSpec: EXACTLY | AT_MOST | UNSPECIFIED
   → Can be called multiple times per frame (RelativeLayout measures twice!)
   → ~2-4ms

4. LAYOUT (top-down)
   → Parent positions children based on measured sizes
   → View.layout(left, top, right, bottom)
   → ~1-2ms

5. DRAW (top-down)
   → View.draw() → canvas operations
   → DisplayList recorded (hardware-accelerated)
   → ~2-5ms

6. SYNC (sync DisplayList to RenderThread)
   → Main thread hands off to RenderThread
   → ~1ms

7. GPU RENDER (RenderThread)
   → OpenGL/Vulkan draws to GPU
   → Happens on separate thread (doesn't block main thread)

Total budget: 16ms (60fps) or 8ms (120fps)
Exceeding budget → JANK (dropped frame)
```

### Overdraw

```
Problem: Drawing the same pixel multiple times per frame

Level 0 (blue):   1 draw → optimal
Level 1 (green):  2 draws → acceptable
Level 2 (pink):   3 draws → concerning
Level 3+ (red):   4+ draws → bad

Common causes:
  - Background set on every level of hierarchy
  - Invisible views behind visible ones
  - Overlapping views drawn fully

Fixes:
  - Remove unnecessary backgrounds
  - Use clipRect/clipPath for partially visible views
  - Use View.GONE instead of View.INVISIBLE
  - Debug: Developer Options → "Show GPU overdraw"
```

---

## 23. Handler / Looper / MessageQueue

### The Main Thread Event Loop

```
Main Thread:
  ┌─────────────────────────────────────────────┐
  │                                             │
  │   Looper.loop() {                          │
  │       while (true) {                       │
  │           Message msg = queue.next()        │ ← blocks until message available
  │           msg.target.handleMessage(msg)     │ ← dispatches to Handler
  │       }                                     │
  │   }                                         │
  │                                             │
  └─────────────────────────────────────────────┘
        ↑
  MessageQueue: [msg1, msg2, msg3, ...]
        ↑
  Handler.post(runnable) → wraps in Message → adds to MessageQueue

Everything on the main thread goes through this loop:
  - Touch events
  - Activity lifecycle callbacks
  - View.post(runnable)
  - Handler.sendMessage()
  - invalidate() → schedules draw
  - runOnUiThread { ... }

ANR (Application Not Responding):
  If a message takes >5 seconds to process
  → System shows ANR dialog
  → User can force-stop the app

Common ANR causes:
  - Network call on main thread
  - Large database query on main thread
  - Heavy computation (JSON parsing, image processing)
  - Deadlock (main thread waiting for lock held by another thread)
```

### Choreographer

```
Choreographer hooks into the display VSYNC signal:

VSYNC fires every 16ms (60Hz) or 8ms (120Hz)
  → Choreographer receives callback
  → Posts frame callback to Looper
  → Input → Animation → Measure/Layout/Draw pipeline runs
  → RenderThread renders to GPU

If main thread is busy when VSYNC fires:
  → Frame callback delayed → JANK

Choreographer.doFrame() internal order:
  1. CALLBACK_INPUT (input events)
  2. CALLBACK_ANIMATION (animation updates)
  3. CALLBACK_INSETS_ANIMATION
  4. CALLBACK_TRAVERSAL (measure/layout/draw)
  5. CALLBACK_COMMIT
```
