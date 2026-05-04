---
title: "System Design"
weight: 1
---


# System Design for Android

> [!NOTE]
> **7 parts, 10 case studies.** Every pattern includes Android-specific implementation, tradeoffs, common pitfalls, and real-world examples from production apps.

---

## Table of Contents

### Part 1: Core Android Patterns
1. [Architecture Patterns (MVC / MVP / MVVM / MVI)](#1-architecture-patterns)
2. [Unidirectional Data Flow (UDF)](#2-unidirectional-data-flow)
3. [Dependency Injection](#3-dependency-injection)
4. [Navigation Architecture](#4-navigation-architecture)

### Part 2: Data & Caching
5. [Caching Strategies on Android](#5-caching-strategies-on-android)
6. [View Caching & RecyclerView Optimization](#6-view-caching--recyclerview-optimization)
7. [Image Loading & Caching](#7-image-loading--caching)
8. [Compose Recomposition & Stability](#8-compose-recomposition--stability)

### Part 3: Networking & Sync
9. [Offline-First Architecture](#9-offline-first-architecture)
10. [Pagination (Paging 3)](#10-pagination-paging-3)
11. [Network Layer Design](#11-network-layer-design)
12. [Background Work & Sync](#12-background-work--sync)
13. [Real-Time Communication](#13-real-time-communication)

### Part 4: Performance
14. [App Startup Optimization](#14-app-startup-optimization)
15. [Memory Management](#15-memory-management)
16. [Threading & Coroutines](#16-threading--coroutines)
17. [Battery Optimization](#17-battery-optimization)
18. [APK Size Optimization](#18-apk-size-optimization)

### Part 5: Reliability & Observability
19. [Crash Reporting & Monitoring](#19-crash-reporting--monitoring)
20. [Feature Flags & Gradual Rollout](#20-feature-flags--gradual-rollout)
21. [A/B Testing Architecture](#21-ab-testing-architecture)
22. [Security Patterns](#22-security-patterns)

### Part 6: Deep Case Studies
23. [Instagram — Feed, Stories, Reels](#23-case-study-instagram)
24. [Amazon — E-Commerce at Scale](#24-case-study-amazon)
25. [Spotify — Audio Streaming & Offline](#25-case-study-spotify)
26. [PayPal/Venmo — Payments & Social Feed](#26-case-study-paypalvenmo)
27. [Stripe — SDK & Payment Flow](#27-case-study-stripe)
28. [WhatsApp — Messaging at Scale](#28-case-study-whatsapp)
29. [Google Maps — Maps & Location](#29-case-study-google-maps)
30. [Netflix — Video Streaming](#30-case-study-netflix)
31. [Uber — Real-Time Ride Matching](#31-case-study-uber)
32. [Twitter/X — Timeline & Real-Time](#32-case-study-twitterx)

### Part 7: Interview Quick Reference
33. [System Design Interview Template](#33-system-design-interview-template)
34. [Pattern Decision Matrix](#34-pattern-decision-matrix)

---

# Part 1: Core Android Patterns

## 1. Architecture Patterns

### MVC (Model-View-Controller)

```
User Input → Controller → Model → View
                ↑                    │
                └────────────────────┘

Android reality:
  Activity/Fragment = Controller + View (tightly coupled)
  → Massive Activity problem
  → Untestable (UI + logic mixed)
  → No one uses pure MVC in modern Android
```

### MVP (Model-View-Presenter)

```
View (Activity/Fragment)
  │ user action
  ▼
Presenter (plain Kotlin class)
  │ business logic
  ▼
Model (Repository/UseCase)
  │ data
  ▼
Presenter updates View via interface

// Contract
interface FeedContract {
    interface View {
        fun showFeed(items: List<FeedItem>)
        fun showError(message: String)
        fun showLoading()
    }
    interface Presenter {
        fun loadFeed()
        fun onItemClicked(item: FeedItem)
    }
}

// Presenter
class FeedPresenter(
    private val view: FeedContract.View,
    private val repository: FeedRepository,
) : FeedContract.Presenter {
    override fun loadFeed() {
        view.showLoading()
        repository.getFeed(
            onSuccess = { view.showFeed(it) },
            onError = { view.showError(it.message) }
        )
    }
}
```

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Testable (mock the View interface) | Verbose (contract interfaces for everything) |
| Clear separation | View reference leaks if not careful |
| Works with legacy Android Views | Presenter holds View reference (lifecycle!) |
| Venmo's legacy pattern | Doesn't handle config changes well |

### MVVM (Model-View-ViewModel)

```
View (Activity/Fragment/Composable)
  │ observes
  ▼
ViewModel (AndroidX ViewModel)
  │ survives config changes
  │ exposes StateFlow/LiveData
  ▼
Model (Repository → DataSource)

// ViewModel
class FeedViewModel(
    private val repository: FeedRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<FeedUiState>(FeedUiState.Loading)
    val uiState: StateFlow<FeedUiState> = _uiState.asStateFlow()

    init { loadFeed() }

    private fun loadFeed() {
        viewModelScope.launch {
            _uiState.value = FeedUiState.Loading
            repository.getFeed()
                .onSuccess { _uiState.value = FeedUiState.Success(it) }
                .onFailure { _uiState.value = FeedUiState.Error(it.message) }
        }
    }
}

// UI State
sealed interface FeedUiState {
    data object Loading : FeedUiState
    data class Success(val items: List<FeedItem>) : FeedUiState
    data class Error(val message: String?) : FeedUiState
}
```

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Survives config changes | Can become bloated |
| No View reference needed | Two-way binding can be confusing |
| Works great with Compose | State management can get complex |
| Google's recommended pattern | Multiple StateFlows to manage |

### MVI (Model-View-Intent)

```
View emits Intents (user actions)
  │
  ▼
ViewModel processes Intent → produces new State
  │
  ▼
View renders State (pure function of state)

// Single state object
data class FeedState(
    val isLoading: Boolean = false,
    val items: List<FeedItem> = emptyList(),
    val error: String? = null,
    val isRefreshing: Boolean = false,
)

// Intents (user actions)
sealed interface FeedIntent {
    data object LoadFeed : FeedIntent
    data object RefreshFeed : FeedIntent
    data class LikeItem(val itemId: String) : FeedIntent
    data class DeleteItem(val itemId: String) : FeedIntent
}

// Side effects (one-time events)
sealed interface FeedEffect {
    data class ShowSnackbar(val message: String) : FeedEffect
    data class NavigateToDetail(val itemId: String) : FeedEffect
}

// ViewModel
class FeedViewModel(private val repository: FeedRepository) : ViewModel() {
    private val _state = MutableStateFlow(FeedState())
    val state: StateFlow<FeedState> = _state.asStateFlow()

    private val _effects = Channel<FeedEffect>()
    val effects: Flow<FeedEffect> = _effects.receiveAsFlow()

    fun processIntent(intent: FeedIntent) {
        when (intent) {
            FeedIntent.LoadFeed -> loadFeed()
            FeedIntent.RefreshFeed -> refreshFeed()
            is FeedIntent.LikeItem -> likeItem(intent.itemId)
            is FeedIntent.DeleteItem -> deleteItem(intent.itemId)
        }
    }

    private fun loadFeed() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            repository.getFeed()
                .onSuccess { items ->
                    _state.update { it.copy(isLoading = false, items = items) }
                }
                .onFailure { e ->
                    _state.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }
}
```

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Single source of truth (one State) | Boilerplate (Intent + State + Effect) |
| Predictable, time-travel debugging | State copies on every change |
| Easy to test (input → output) | Overkill for simple screens |
| Scales well for complex screens | Learning curve |

### When to Use Which

| Pattern | Best For | Avoid When |
|---------|----------|------------|
| MVP | Legacy codebases, gradual migration | New Compose projects |
| MVVM | Most apps, Google's recommendation | Very complex state machines |
| MVI | Complex interactive screens, forms | Simple CRUD screens |

---

## 2. Unidirectional Data Flow

### Concept

```
Events flow UP:       User → View → ViewModel → Repository
State flows DOWN:     Repository → ViewModel → View → User

NEVER: View directly modifies its own state based on user input
       without going through ViewModel
```

### In Compose

```kotlin
@Composable
fun FeedScreen(viewModel: FeedViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // State flows DOWN (ViewModel → Composable)
    FeedContent(
        items = state.items,
        isLoading = state.isLoading,
        // Events flow UP (Composable → ViewModel)
        onRefresh = { viewModel.processIntent(FeedIntent.RefreshFeed) },
        onItemClick = { viewModel.processIntent(FeedIntent.SelectItem(it)) },
    )
}
```

### Why It Matters in Interviews
- Prevents state inconsistency (one source of truth)
- Makes state changes traceable (every change goes through reducer/ViewModel)
- Simplifies testing (given state X + event Y → expect state Z)
- Prevents hidden mutations (View can't silently change state)

---

## 3. Dependency Injection

### Manual DI vs Framework DI

```kotlin
// Manual DI (Service Locator — used in Venmo feed)
object ServiceLocator {
    val feedRepository: FeedRepository by lazy {
        FeedRepositoryImpl(apiService, database)
    }
}

// Koin (used in Venmo main app)
val feedModule = module {
    single<FeedRepository> { FeedRepositoryImpl(get(), get()) }
    viewModel { FeedViewModel(get()) }
}

// Hilt/Dagger (Google's recommendation)
@Module
@InstallIn(SingletonComponent::class)
object FeedModule {
    @Provides @Singleton
    fun provideFeedRepository(api: ApiService, db: AppDatabase): FeedRepository =
        FeedRepositoryImpl(api, db)
}
```

### Comparison

| Feature | Manual/Locator | Koin | Hilt/Dagger |
|---------|---------------|------|-------------|
| Compile-time safety | No | No (runtime) | Yes |
| Setup complexity | Lowest | Medium | Highest |
| Performance | Fastest | Reflection-based | Code-gen (fast) |
| Testing | Manual mock swap | `loadKoinModules` | `@TestInstallIn` |
| Learning curve | None | Low | High |
| Error detection | Runtime crash | Runtime crash | Compile error |

---

## 4. Navigation Architecture

### Single Activity Pattern

```
MainActivity (NavHost)
├── FeedFragment/Composable
├── ProfileFragment/Composable
├── SettingsFragment/Composable
└── DetailFragment/Composable

vs. Multi-Activity (legacy):
FeedActivity → ProfileActivity → SettingsActivity
  Problem: Heavy transitions, no shared element animations, deep link pain
```

### Navigation in Compose

```kotlin
// Type-safe routes (Navigation 2.8+)
@Serializable data class FeedRoute(val filter: String? = null)
@Serializable data class DetailRoute(val storyId: String)
@Serializable data object ProfileRoute

NavHost(navController, startDestination = FeedRoute()) {
    composable<FeedRoute> { entry ->
        val route = entry.toRoute<FeedRoute>()
        FeedScreen(filter = route.filter)
    }
    composable<DetailRoute> { entry ->
        val route = entry.toRoute<DetailRoute>()
        DetailScreen(storyId = route.storyId)
    }
}
```

### Deep Linking

```
URI: venmo://feed/story/12345

Manifest: <intent-filter>
    <data android:scheme="venmo" android:host="feed" android:pathPrefix="/story" />
</intent-filter>

NavGraph: composable<DetailRoute>(
    deepLinks = listOf(navDeepLink { uriPattern = "venmo://feed/story/{storyId}" })
)

Challenge: Deep link into a screen that requires auth
  → Intercept in NavHost, redirect to login, then navigate to intended destination
  → Use SavedStateHandle to preserve deep link target across auth flow
```

---

# Part 2: Data & Caching

## 5. Caching Strategies on Android

### The Android Cache Hierarchy

```
Fastest ──────────────────────────────────── Slowest
   │                                            │
   ▼                                            ▼
In-Memory       Disk (File/DB)       Network (API)
HashMap/LRU     Room/SQLite          Retrofit/OkHttp
StateFlow       DataStore            REST/GraphQL
Compose State   SharedPrefs          WebSocket

Access time:    ~1ns               ~1ms              ~100-500ms
Survives:       Nothing            App restart        Server changes
Capacity:       ~50-200MB          ~GB                Unlimited
```

### Layer 1: In-Memory Cache

```kotlin
// LruCache (bounded, evicts oldest)
val profileCache = object : LruCache<String, UserProfile>(maxSize = 100) {
    override fun sizeOf(key: String, value: UserProfile): Int = 1
}

// StateFlow as cache (unbounded, lives with ViewModel)
class FeedStore {
    private val _entries = MutableStateFlow<List<FeedItem>>(emptyList())
    val entries: StateFlow<List<FeedItem>> = _entries.asStateFlow()

    suspend fun refresh() {
        val items = api.getFeed()
        _entries.value = items  // cached in memory, all collectors get update
    }
}

// ConcurrentHashMap (thread-safe, no size limit)
private val tokenCache = ConcurrentHashMap<String, AuthToken>()
```

**When to use:** Hot data accessed multiple times per session. User profiles, feed items currently on screen, feature flags.

**Pitfall:** Memory leaks. Never cache Context, View, or Activity references. Use WeakReference for large bitmaps.

### Layer 2: Disk Cache (Room/SQLite)

```kotlin
// Room Entity
@Entity(tableName = "feed_items")
data class FeedItemEntity(
    @PrimaryKey val id: String,
    val senderName: String,
    val note: String,
    val amount: Double,
    val createdAt: Long,
    val jsonBlob: String,  // full item serialized for offline
)

// DAO
@Dao
interface FeedDao {
    @Query("SELECT * FROM feed_items ORDER BY createdAt DESC LIMIT :limit OFFSET :offset")
    fun getFeedPaged(limit: Int, offset: Int): List<FeedItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<FeedItemEntity>)

    @Query("DELETE FROM feed_items WHERE createdAt < :cutoff")
    suspend fun deleteOlderThan(cutoff: Long)

    @Query("SELECT * FROM feed_items ORDER BY createdAt DESC")
    fun observeFeed(): Flow<List<FeedItemEntity>>
}
```

**When to use:** Data that should survive app restart. Feed history, user profile, recent searches, draft messages.

### Layer 3: HTTP Cache (OkHttp)

```kotlin
val client = OkHttpClient.Builder()
    .cache(Cache(
        directory = context.cacheDir.resolve("http_cache"),
        maxSize = 50L * 1024 * 1024  // 50 MB
    ))
    .addInterceptor { chain ->
        val request = chain.request()
        // Force cache when offline
        if (!isNetworkAvailable()) {
            request.newBuilder()
                .cacheControl(CacheControl.FORCE_CACHE)
                .build()
        }
        chain.proceed(request)
    }
    .build()
```

**HTTP Cache Headers:**
```
Cache-Control: max-age=300        → Cache for 5 minutes
Cache-Control: no-cache           → Always revalidate with server
Cache-Control: no-store           → Never cache (sensitive data)
ETag: "abc123"                    → Version-based revalidation
If-None-Match: "abc123"           → Server returns 304 if unchanged
```

### Layer 4: DataStore (Key-Value)

```kotlin
// Proto DataStore (type-safe, binary)
val userPreferences: Flow<UserPreferences> = dataStore.data

suspend fun setDarkMode(enabled: Boolean) {
    dataStore.updateData { prefs ->
        prefs.toBuilder().setDarkMode(enabled).build()
    }
}

// Preferences DataStore (key-value, like SharedPrefs but async)
val DARK_MODE_KEY = booleanPreferencesKey("dark_mode")
val darkMode: Flow<Boolean> = dataStore.data.map { it[DARK_MODE_KEY] ?: false }
```

**When to use:** User preferences, settings, small config values. NOT for large datasets or lists.

### The Repository Pattern (Combining All Layers)

```kotlin
class FeedRepository(
    private val api: FeedApi,
    private val dao: FeedDao,
    private val memoryCache: FeedMemoryCache,
) {
    fun getFeed(forceRefresh: Boolean = false): Flow<Resource<List<FeedItem>>> = flow {
        // Step 1: Emit cached data immediately (memory → disk)
        val cached = memoryCache.get() ?: dao.getAll().also { memoryCache.set(it) }
        if (cached.isNotEmpty()) {
            emit(Resource.Success(cached))  // UI shows stale data instantly
        }

        // Step 2: Fetch fresh from network (unless cache-only)
        if (forceRefresh || cached.isEmpty() || isCacheStale()) {
            emit(Resource.Loading(cached))  // show loading indicator with old data
            try {
                val fresh = api.getFeed()
                dao.replaceAll(fresh)        // update disk cache
                memoryCache.set(fresh)       // update memory cache
                emit(Resource.Success(fresh)) // UI updates with fresh data
            } catch (e: Exception) {
                if (cached.isEmpty()) {
                    emit(Resource.Error(e))   // no cache, show error
                }
                // else: silently keep showing stale cache
            }
        }
    }
}

// Resource wrapper
sealed interface Resource<out T> {
    data class Success<T>(val data: T) : Resource<T>
    data class Loading<T>(val staleData: T? = null) : Resource<T>
    data class Error<T>(val exception: Throwable, val staleData: T? = null) : Resource<T>
}
```

### Cache Invalidation Strategies on Android

```
1. TTL-based:
   if (System.currentTimeMillis() - lastFetchTime > 5.minutes) → refetch

2. Event-based:
   User posts comment → invalidate that story's cache
   Push notification → invalidate relevant feed section

3. Pull-to-refresh:
   User swipes down → forceRefresh = true → skip cache

4. Lifecycle-based:
   onResume() → check if cache is stale (user might have changed data in another app)

5. Version-based:
   API returns ETag/Last-Modified → compare on next request → 304 = use cache
```

---

## 6. View Caching & RecyclerView Optimization

### RecyclerView Internal Cache Layers

```
┌─────────────────────────────────────────────────────┐
│                    Screen (Visible)                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │ VH1 │ │ VH2 │ │ VH3 │ │ VH4 │ │ VH5 │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
└─────────────────────────────────────────────────────┘

Layer 1: Scrap (attached scrap + changed scrap)
  → ViewHolders recently detached but might reattach
  → No rebinding needed (exact same position)
  → Size: ~2-3 items

Layer 2: Cache (mCachedViews)
  → Recently scrolled off screen
  → No rebinding needed (same position + data)
  → Default size: 2 (configurable via setItemViewCacheSize)
  → Position-specific: only reused for same position

Layer 3: ViewCacheExtension (custom)
  → Developer-provided cache layer
  → Rarely used, for advanced cases

Layer 4: RecycledViewPool
  → Fully recycled ViewHolders (need rebinding)
  → Shared across RecyclerViews of same type
  → Grouped by viewType
  → Default: 5 per viewType
  → MUST call onBindViewHolder (data cleared)

Layer 5: Create new ViewHolder
  → onCreateViewHolder called (most expensive)
```

### Scroll Flow

```
Scroll DOWN:
  Item exits TOP → Scrap → Cache → RecycledViewPool
  Item needed at BOTTOM:
    Check Scrap → Cache → Pool → Create new

Scroll direction matters:
  mCachedViews[0] = most recently scrolled off (top when scrolling down)
  When scrolling back up, this item is reattached WITHOUT rebinding
```

### RecyclerView Performance Optimization

```kotlin
// 1. setHasFixedSize — skip layout when data changes
recyclerView.setHasFixedSize(true)

// 2. Increase cache for fast scroll
recyclerView.setItemViewCacheSize(20)

// 3. Shared pool for nested RecyclerViews
val sharedPool = RecyclerView.RecycledViewPool()
parentRecyclerView.setRecycledViewPool(sharedPool)
childRecyclerView.setRecycledViewPool(sharedPool)  // reuse across children

// 4. DiffUtil for efficient updates
class FeedDiffCallback : DiffUtil.ItemCallback<FeedItem>() {
    override fun areItemsTheSame(old: FeedItem, new: FeedItem): Boolean =
        old.id == new.id
    override fun areContentsTheSame(old: FeedItem, new: FeedItem): Boolean =
        old == new  // data class equals
}

// 5. Prefetch for nested RecyclerViews
(recyclerView.layoutManager as LinearLayoutManager).initialPrefetchItemCount = 4

// 6. setRecyclerListener to release resources
recyclerView.setRecyclerListener { holder ->
    (holder as? ImageViewHolder)?.releaseImage()  // cancel image load, release bitmap
}
```

### Common RecyclerView Pitfalls

```
Problem: Image flickering on fast scroll
  Cause: Glide/Coil loads start on bind, cancel on recycle, restart on rebind
  Fix: Use placeholder + crossfade, preload upcoming images

Problem: Jank on first scroll
  Cause: First items created (onCreateViewHolder is expensive with complex layouts)
  Fix: Pre-inflate during idle time, use simpler layouts, use ViewStub for rare views

Problem: Wrong data after scroll
  Cause: ViewHolder reused with stale state from previous item
  Fix: Reset ALL state in onBindViewHolder, never store position in ViewHolder field

Problem: Nested RecyclerViews scroll independently
  Cause: Each has its own scroll behavior
  Fix: Use RecyclerView.setNestedScrollingEnabled(false) for inner list,
       or better: flatten into single RecyclerView with multiple viewTypes
```

### Compose LazyColumn (Modern Alternative)

```kotlin
LazyColumn(
    state = rememberLazyListState(),
    contentPadding = PaddingValues(16.dp),
) {
    items(
        items = feedItems,
        key = { it.id },  // CRITICAL: stable keys enable efficient diffing
        contentType = { it.type },  // helps Compose reuse compositions by type
    ) { item ->
        FeedCard(item = item)
    }
}

// key = { it.id } is the Compose equivalent of DiffUtil.areItemsTheSame
// Without keys: Compose recreates all items on any list change
// With keys: Compose moves/reuses existing compositions
```

---

## 7. Image Loading & Caching

### How Coil/Glide Works Internally

```
Image request: "https://cdn.example.com/avatar.jpg"

Check 1: Memory Cache (LRU, strong + weak references)
  → HIT: Return Bitmap immediately (same frame, ~0ms)

Check 2: Disk Cache (journal-based, DiskLruCache)
  → HIT: Decode from disk (~5-10ms), add to memory cache

Check 3: Network
  → MISS: Download → Disk cache → Decode → Memory cache → Display
  → ~100-500ms

                    ┌──────────────┐
                    │ Memory Cache │ ← Strong refs (bounded) + Weak refs (GC'd under pressure)
                    │  (LruCache)  │
                    └──────┬───────┘
                           │ miss
                    ┌──────┴───────┐
                    │  Disk Cache  │ ← Transformed images (resized, rounded)
                    │ (DiskLruCache)│
                    └──────┬───────┘
                           │ miss
                    ┌──────┴───────┐
                    │   Network    │ ← Original full-size image
                    │ (OkHttp)     │
                    └──────────────┘
```

### Memory Cache Keys

```
Key includes ALL transformations:
  url + size + transformations + config = unique key

"https://cdn.example.com/avatar.jpg" at 100x100 with CircleCrop
  → different key than same URL at 200x200

Implication: Same image at different sizes = cached separately
  → Use consistent sizes to maximize cache hits
```

### Image Loading Best Practices

```kotlin
// Coil (Kotlin-first, Compose-native)
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(user.avatarUrl)
        .crossfade(true)
        .placeholder(R.drawable.avatar_placeholder)
        .error(R.drawable.avatar_error)
        .size(Size(100, 100))  // request exact size needed
        .memoryCachePolicy(CachePolicy.ENABLED)
        .diskCachePolicy(CachePolicy.ENABLED)
        .build(),
    contentDescription = "Avatar",
    modifier = Modifier.size(48.dp).clip(CircleShape),
)

// Preload for upcoming items
LaunchedEffect(Unit) {
    upcomingItems.forEach { item ->
        imageLoader.enqueue(
            ImageRequest.Builder(context)
                .data(item.imageUrl)
                .size(targetWidth, targetHeight)
                .build()
        )
    }
}
```

### Image Size Optimization

```
Problem: Server sends 4000x3000 image, phone displays 400x300
  → 4000x3000 * 4 bytes = 48MB in memory per image
  → 400x300 * 4 bytes = 480KB (100x smaller!)

Solutions:
  1. Request correct size from CDN: url + "?w=400&h=300"
  2. BitmapFactory.Options.inSampleSize for downsampling
  3. Use RGB_565 instead of ARGB_8888 (2 bytes vs 4 bytes per pixel)
  4. Use WebP format (30% smaller than JPEG at same quality)
```

---

## 8. Compose Recomposition & Stability

### How Compose Decides What to Recompose

```
Compose tracks which Composable functions read which State.
When State changes, ONLY functions that read that State recompose.

@Composable
fun FeedScreen(viewModel: FeedViewModel) {
    val items by viewModel.items.collectAsStateWithLifecycle()    // reads items
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle() // reads loading

    Column {
        Header()            // does NOT read items or loading → NEVER recomposes
        if (isLoading) {
            LoadingSpinner() // only recomposes when isLoading changes
        }
        FeedList(items)      // only recomposes when items changes
    }
}
```

### Stability (Why Parameters Matter)

```kotlin
// STABLE — Compose can skip recomposition if equal
data class User(val id: String, val name: String)  // all vals, primitive/String types

// UNSTABLE — Compose always recomposes (can't guarantee equality)
data class FeedState(val items: List<FeedItem>)  // List is unstable (mutable interface)

// Fixes for unstable params:
// 1. Use @Immutable annotation
@Immutable
data class FeedState(val items: List<FeedItem>)

// 2. Use @Stable annotation
@Stable
data class FeedState(val items: List<FeedItem>)

// 3. Use kotlinx.collections.immutable
data class FeedState(val items: ImmutableList<FeedItem>)
```

### remember vs derivedStateOf vs LaunchedEffect

```kotlin
// remember: cache a value across recompositions
val formatter = remember { SimpleDateFormat("MMM d", Locale.US) }

// derivedStateOf: computed value that only triggers recomposition when result changes
val hasItems by remember { derivedStateOf { items.isNotEmpty() } }
// If items goes from [A,B] to [A,B,C], hasItems is still true → NO recomposition

// LaunchedEffect: run a side effect when key changes
LaunchedEffect(userId) {  // re-runs when userId changes
    viewModel.loadProfile(userId)
}

// Common mistake: unnecessary recomposition
@Composable
fun BadExample(items: List<Item>) {
    val sorted = items.sortedBy { it.name }  // RUNS EVERY RECOMPOSITION
    LazyColumn { items(sorted) { ... } }
}

@Composable
fun GoodExample(items: List<Item>) {
    val sorted = remember(items) { items.sortedBy { it.name } }  // only when items changes
    LazyColumn { items(sorted, key = { it.id }) { ... } }
}
```

---

# Part 3: Networking & Sync

## 9. Offline-First Architecture

### The Offline-First Stack

```
┌─────────────────────────────────────┐
│            UI Layer                  │
│  (Always reads from local DB)       │
└──────────────┬──────────────────────┘
               │ observes
┌──────────────┴──────────────────────┐
│         Repository Layer             │
│  (Coordinates cache + network)       │
│  ┌─────────────┐  ┌──────────────┐  │
│  │  Room (DB)   │  │  Sync Engine │  │
│  │  Source of   │  │  (WorkMgr)   │  │
│  │  Truth       │  │              │  │
│  └──────┬──────┘  └──────┬───────┘  │
│         │                │          │
└─────────┼────────────────┼──────────┘
          │                │
  ┌───────┴────┐    ┌──────┴──────┐
  │ UI reads   │    │ Background  │
  │ from DB    │    │ sync to API │
  └────────────┘    └─────────────┘
```

### Write Queue for Offline Mutations

```kotlin
// Pending operations table
@Entity(tableName = "pending_operations")
data class PendingOperation(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val type: String,           // "ADD_COMMENT", "LIKE", "SEND_PAYMENT"
    val payload: String,        // JSON serialized data
    val createdAt: Long,
    val retryCount: Int = 0,
    val status: String = "PENDING",  // PENDING, IN_PROGRESS, FAILED
    val idempotencyKey: String, // prevent duplicate operations
)

// Sync engine
class SyncEngine(
    private val dao: PendingOperationDao,
    private val api: FeedApi,
) {
    suspend fun syncPending() {
        val pending = dao.getAllPending()
        for (op in pending) {
            try {
                dao.markInProgress(op.id)
                when (op.type) {
                    "ADD_COMMENT" -> api.addComment(op.deserializePayload())
                    "LIKE" -> api.addLike(op.deserializePayload())
                }
                dao.delete(op.id)
            } catch (e: Exception) {
                if (op.retryCount >= MAX_RETRIES) {
                    dao.markFailed(op.id)
                } else {
                    dao.incrementRetry(op.id)
                }
            }
        }
    }
}

// Trigger sync via WorkManager
val syncWork = OneTimeWorkRequestBuilder<SyncWorker>()
    .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
    .build()
WorkManager.getInstance(context).enqueueUniqueWork("sync", ExistingWorkPolicy.REPLACE, syncWork)
```

### Conflict Resolution on Sync

```
Scenario: User edits comment offline. Someone else also edits the same comment online.

Strategies:
1. Server Wins (simplest): Discard local change, accept server version
2. Client Wins: Overwrite server with local change
3. Last-Write-Wins: Compare timestamps, most recent wins
4. Merge: Apply non-conflicting changes, flag conflicts for user
5. User Decides: Show both versions, let user pick

For most apps: Server Wins + retry is sufficient
For collaborative apps: Merge with conflict UI
```

---

## 10. Pagination (Paging 3)

### Architecture

```
UI (LazyColumn)
  │ collectAsLazyPagingItems()
  ▼
PagingData<FeedItem> (Flow)
  │
  ▼
Pager (coordinates loading)
  │ creates
  ▼
PagingSource (loads pages from single source)
  OR
RemoteMediator (loads from network, caches in DB)
  │
  ▼
Data Sources (API + Room)
```

### PagingSource (Network Only)

```kotlin
class FeedPagingSource(
    private val api: FeedApi,
) : PagingSource<String, FeedItem>() {

    override suspend fun load(params: LoadParams<String>): LoadResult<String, FeedItem> {
        return try {
            val cursor = params.key
            val response = api.getFeed(cursor = cursor, limit = params.loadSize)
            LoadResult.Page(
                data = response.items,
                prevKey = null,  // no backward loading
                nextKey = response.nextCursor,  // cursor for next page
            )
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<String, FeedItem>): String? {
        return null  // refresh from beginning
    }
}
```

### RemoteMediator (Network + Database Cache)

```kotlin
@OptIn(ExperimentalPagingApi::class)
class FeedRemoteMediator(
    private val api: FeedApi,
    private val db: AppDatabase,
) : RemoteMediator<Int, FeedItemEntity>() {

    override suspend fun load(
        loadType: LoadType,
        state: PagingState<Int, FeedItemEntity>,
    ): MediatorResult {
        val cursor = when (loadType) {
            LoadType.REFRESH -> null
            LoadType.PREPEND -> return MediatorResult.Success(endOfPaginationReached = true)
            LoadType.APPEND -> db.remoteKeyDao().getKey("feed")?.nextCursor
        }

        return try {
            val response = api.getFeed(cursor = cursor, limit = state.config.pageSize)

            db.withTransaction {
                if (loadType == LoadType.REFRESH) {
                    db.feedDao().clearAll()
                    db.remoteKeyDao().clearAll()
                }
                db.feedDao().insertAll(response.items.toEntities())
                db.remoteKeyDao().insert(RemoteKey("feed", response.nextCursor))
            }

            MediatorResult.Success(endOfPaginationReached = response.nextCursor == null)
        } catch (e: Exception) {
            MediatorResult.Error(e)
        }
    }
}

// ViewModel
class FeedViewModel(db: AppDatabase, api: FeedApi) : ViewModel() {
    val feed: Flow<PagingData<FeedItem>> = Pager(
        config = PagingConfig(
            pageSize = 20,
            prefetchDistance = 5,      // start loading 5 items before end
            initialLoadSize = 40,      // first page larger
            maxSize = 200,             // max items in memory
            enablePlaceholders = false,
        ),
        remoteMediator = FeedRemoteMediator(api, db),
        pagingSourceFactory = { db.feedDao().pagingSource() },
    ).flow.cachedIn(viewModelScope)
}
```

### PagingSource vs RemoteMediator

| Feature | PagingSource only | RemoteMediator + PagingSource |
|---------|------------------|-------------------------------|
| Offline support | No | Yes (DB is source of truth) |
| Data survives process death | No | Yes |
| Complexity | Lower | Higher |
| Refresh behavior | Re-fetch all | Clear DB + re-fetch |
| Best for | Simple lists, search results | Main feeds, offline-required content |

### Common Pagination Pitfalls

```
1. Race condition on refresh:
   User pulls to refresh while page 3 is loading
   → Both responses arrive, data gets mixed
   Fix: Paging 3 handles this via generation tracking

2. Item shift on insert:
   New item posted while viewing page 2
   → Offset-based: items shift, duplicates or gaps
   Fix: Use cursor-based pagination (Paging 3 supports this)

3. Stale headers/footers:
   Error state shown after successful retry
   Fix: Use LoadState properly:
     LazyColumn {
         if (items.loadState.refresh is LoadState.Loading) { ... }
         if (items.loadState.append is LoadState.Loading) { ... }
         if (items.loadState.refresh is LoadState.Error) { ... }
     }

4. Memory bloat:
   User scrolls through 1000 items
   Fix: Set PagingConfig.maxSize to cap in-memory items
        Pages at the beginning are dropped as user scrolls far
```

---

## 11. Network Layer Design

### Retrofit + OkHttp Architecture

```
App Code
  │
  ▼
Retrofit (type-safe API interface)
  │ converts Kotlin interface to HTTP calls
  ▼
OkHttp (HTTP client)
  │
  ├── Interceptors (applied in order)
  │   ├── Application Interceptors
  │   │   ├── Auth Interceptor (add Bearer token)
  │   │   ├── Logging Interceptor
  │   │   └── Analytics Interceptor
  │   └── Network Interceptors
  │       ├── Cache Interceptor
  │       └── Retry Interceptor
  │
  ├── Connection Pool (reuse TCP connections)
  │
  ├── HTTP/2 Multiplexing (multiple requests on one connection)
  │
  └── TLS Handshake + Certificate Pinning
```

### Auth Token Refresh (Interceptor)

```kotlin
class AuthInterceptor(
    private val tokenProvider: TokenProvider,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenProvider.getAccessToken()
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()

        val response = chain.proceed(request)

        if (response.code == 401) {
            // Token expired — refresh and retry
            synchronized(this) {
                val newToken = tokenProvider.refreshToken()  // single refresh
                val retryRequest = chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $newToken")
                    .build()
                response.close()
                return chain.proceed(retryRequest)
            }
        }
        return response
    }
}

// Why synchronized?
// Without it: 5 concurrent 401s → 5 token refreshes → race condition
// With it: First request refreshes, others wait and use new token
```

### Certificate Pinning

```kotlin
val client = OkHttpClient.Builder()
    .certificatePinner(
        CertificatePinner.Builder()
            .add("api.venmo.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
            .add("api.venmo.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=") // backup
            .build()
    )
    .build()

// Why pin?
// Prevents MITM attacks even if a rogue CA issues a certificate
// Must pin at least 2 (primary + backup) to avoid bricking on cert rotation
// Must have a rotation strategy (pin next cert before deploying)
```

---

## 12. Background Work & Sync

### Choosing the Right Tool

```
┌────────────────────────┬─────────────────┬─────────────────────┐
│ Requirement            │ Tool            │ Example             │
├────────────────────────┼─────────────────┼─────────────────────┤
│ Immediate, short task  │ Coroutines      │ API call on button  │
│ Survives app close     │ WorkManager     │ Upload photo        │
│ Exact time trigger     │ AlarmManager    │ Medication reminder │
│ Continuous foreground  │ Foreground Svc  │ Music playback      │
│ Periodic background    │ WorkManager     │ Sync every 15 min   │
│ Real-time updates      │ WebSocket/SSE   │ Chat messages       │
│ Push-triggered         │ FCM + WorkMgr   │ New message notif   │
└────────────────────────┴─────────────────┴─────────────────────┘
```

### WorkManager Patterns

```kotlin
// Periodic sync (minimum 15 minutes)
val syncRequest = PeriodicWorkRequestBuilder<FeedSyncWorker>(
    repeatInterval = 15, TimeUnit.MINUTES,
    flexInterval = 5, TimeUnit.MINUTES,  // can run within last 5 min of interval
)
    .setConstraints(Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .setRequiresBatteryNotLow(true)
        .build())
    .build()

WorkManager.getInstance(context)
    .enqueueUniquePeriodicWork("feed_sync", ExistingPeriodicWorkPolicy.KEEP, syncRequest)

// Chained work
WorkManager.getInstance(context)
    .beginWith(downloadWork)     // download images
    .then(processWork)           // resize/crop
    .then(uploadWork)            // upload to server
    .enqueue()
```

---

## 13. Real-Time Communication

### WebSocket vs SSE vs Polling

```
WebSocket:
  Full-duplex, persistent TCP connection
  Client ←→ Server (both can send anytime)
  Use: Chat, live collaboration, gaming

  val webSocket = okHttpClient.newWebSocket(request, object : WebSocketListener() {
      override fun onMessage(ws: WebSocket, text: String) {
          // handle incoming message
      }
  })

SSE (Server-Sent Events):
  Server → Client only (one direction)
  Auto-reconnect built into protocol
  Use: Live scores, stock tickers, notifications

Long Polling:
  Client sends request → Server holds connection until data ready → responds → repeat
  Simpler than WebSocket but more overhead per message
  Use: Fallback when WebSocket not available

Short Polling:
  Client sends request every N seconds
  Simplest but wasteful
  Use: Low-frequency updates (check for new email every 60s)
```

### Comparison

| Feature | WebSocket | SSE | Long Poll | Short Poll |
|---------|-----------|-----|-----------|------------|
| Direction | Bidirectional | Server→Client | Server→Client | Client→Server |
| Connection | Persistent | Persistent | Per-request | Per-request |
| Overhead | Low | Low | Medium | High |
| Reconnect | Manual | Automatic | Automatic | N/A |
| Binary data | Yes | No (text) | Yes | Yes |
| Firewall | May be blocked | HTTP (passes) | HTTP | HTTP |
| Battery impact | High | Medium | Medium | Varies |

---

# Part 4: Performance

## 14. App Startup Optimization

### Startup Phases

```
Cold Start (worst case):
  Process Creation → Application.onCreate → Activity.onCreate → First Frame

  ┌──────────┐  ┌─────────────────┐  ┌──────────────┐  ┌────────────┐
  │ Process  │→ │ Application     │→ │ Activity     │→ │ First      │
  │ fork     │  │ .onCreate()     │  │ .onCreate()  │  │ Frame      │
  │ ~200ms   │  │ DI, SDKs, init  │  │ layout, data │  │ draw       │
  └──────────┘  └─────────────────┘  └──────────────┘  └────────────┘

Warm Start:
  Process exists → Activity.onCreate → First Frame (skip process + Application init)

Hot Start:
  Process + Activity exist → onResume → (fastest)
```

### Optimization Strategies

```kotlin
// 1. Lazy initialization (don't init everything in Application.onCreate)
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // WRONG: Initialize everything eagerly
        // Analytics.init()        // 50ms
        // Crashlytics.init()      // 30ms
        // FeatureFlags.init()     // 100ms — blocks on network!
        // ImageLoader.init()      // 20ms

        // RIGHT: Only critical path
        Crashlytics.init()  // critical for crash reporting
        // Everything else: lazy or background
    }
}

// 2. Background initialization
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Critical (main thread)
        Crashlytics.init()

        // Non-critical (background)
        lifecycleScope.launch(Dispatchers.IO) {
            Analytics.init()
            FeatureFlags.init()
        }
    }
}

// 3. App Startup Library (AndroidX)
class AnalyticsInitializer : Initializer<Analytics> {
    override fun create(context: Context): Analytics {
        return Analytics.init(context)  // runs automatically, can specify dependencies
    }
    override fun dependencies(): List<Class<out Initializer<*>>> = listOf(
        CrashlyticsInitializer::class.java  // Analytics depends on Crashlytics
    )
}

// 4. Baseline Profiles (pre-compile hot paths)
// Reduces cold start by 20-40% by pre-compiling critical code paths
// Generated via Macrobenchmark tests
```

### Measuring Startup

```kotlin
// Reportfully startup trace
class MyApp : Application() {
    override fun onCreate() {
        val trace = Firebase.performance.newTrace("app_startup")
        trace.start()
        super.onCreate()
        // ... init code ...
        trace.stop()
    }
}

// ADB command
adb shell am start-activity -W com.venmo/.MainActivity
// Reports: TotalTime (cold start duration)
```

---

## 15. Memory Management

### Android Memory Model

```
┌─────────────────────────────────────────────────┐
│                 App Process                      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Heap   │  │  Native  │  │   Graphics   │  │
│  │ (Dalvik/ │  │  Memory  │  │   Memory     │  │
│  │  ART)    │  │ (JNI/NDK)│  │ (GPU buffers)│  │
│  │          │  │          │  │              │  │
│  │ Objects  │  │ Bitmaps  │  │ Surfaces     │  │
│  │ Arrays   │  │ (API 26+)│  │ Textures     │  │
│  │ Strings  │  │ SQLite   │  │              │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│                                                  │
│  Heap limit: ~256-512MB (varies by device)       │
└─────────────────────────────────────────────────┘
```

### Common Memory Leaks

```kotlin
// 1. Static reference to Activity/Context
companion object {
    var leakedActivity: Activity? = null  // LEAK: Activity can't be GC'd
}

// 2. Inner class holding implicit reference
class MyActivity : Activity() {
    inner class MyHandler : Handler() {  // LEAK: inner class holds ref to Activity
        override fun handleMessage(msg: Message) { ... }
    }
    // Fix: Use static class + WeakReference, or lifecycleScope
}

// 3. Unregistered callbacks/listeners
override fun onResume() {
    locationManager.requestLocationUpdates(listener)  // registered
}
// LEAK: Never unregistered in onPause → listener holds Activity reference

// 4. Coroutine leak
class MyActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        GlobalScope.launch {  // LEAK: coroutine outlives Activity
            delay(60_000)
            updateUI()  // Activity might be destroyed
        }
        // Fix: Use lifecycleScope.launch { ... }
    }
}

// 5. ViewModel holding View reference
class MyViewModel : ViewModel() {
    var textView: TextView? = null  // LEAK: ViewModel survives Activity
    // Fix: Never store View/Context in ViewModel
}
```

### Memory Profiling Tools

```
1. Android Studio Profiler: Real-time heap, allocations, GC events
2. LeakCanary: Automatic leak detection in debug builds
3. MAT (Memory Analyzer Tool): Analyze heap dumps
4. adb shell dumpsys meminfo <package>: Process memory summary

Key metrics:
  PSS (Proportional Set Size): Actual memory footprint (shared pages proportioned)
  USS (Unique Set Size): Memory exclusive to this process
  HeapSize: Total heap allocated
  HeapFree: Available heap space
```

---

## 16. Threading & Coroutines

### Dispatchers

```kotlin
Dispatchers.Main       → UI thread (single thread)
                         Use for: UI updates, StateFlow collection
                         Never: Network, DB, heavy computation

Dispatchers.IO         → Shared pool, up to 64 threads
                         Use for: Network, file I/O, database
                         Never: CPU-intensive work (blocks IO pool)

Dispatchers.Default    → Shared pool, threads = CPU cores
                         Use for: Sorting, parsing, JSON, algorithms
                         Never: Blocking I/O (wastes CPU thread)

Dispatchers.Unconfined → Runs on caller thread until first suspension
                         Use for: Testing, rarely in production
```

### Structured Concurrency

```kotlin
// viewModelScope: cancelled when ViewModel is cleared
class FeedViewModel : ViewModel() {
    init {
        viewModelScope.launch {
            // automatically cancelled when ViewModel.onCleared()
        }
    }
}

// lifecycleScope: cancelled when lifecycle is destroyed
class FeedFragment : Fragment() {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                // only runs when fragment is STARTED or above
                // pauses when STOPPED, resumes when STARTED again
                viewModel.uiState.collect { state -> render(state) }
            }
        }
    }
}

// supervisorScope: child failure doesn't cancel siblings
supervisorScope {
    val profileDeferred = async { api.getProfile() }      // fails
    val feedDeferred = async { api.getFeed() }             // still runs
    val notifDeferred = async { api.getNotifications() }   // still runs

    val profile = try { profileDeferred.await() } catch (e: Exception) { null }
    val feed = feedDeferred.await()
    val notifications = notifDeferred.await()
}
```

### Flow vs Channel vs SharedFlow vs StateFlow

```
Flow (cold):
  Emits values only when collected. Each collector gets its own stream.
  Use for: One-shot data streams (DB queries, API calls)

Channel (hot):
  Fan-out: each value consumed by exactly ONE collector
  Use for: One-time events (navigation, snackbar, toast)

SharedFlow (hot):
  Broadcast: each value received by ALL collectors
  Configurable replay (how many past values new collectors get)
  Use for: Events that multiple observers need

StateFlow (hot):
  Special SharedFlow with replay=1 and distinctUntilChanged
  Always has a current value (.value)
  Use for: UI state (single source of truth)

  ┌──────────────┬──────────┬──────────┬────────────┬────────────┐
  │              │ Flow     │ Channel  │ SharedFlow │ StateFlow  │
  ├──────────────┼──────────┼──────────┼────────────┼────────────┤
  │ Hot/Cold     │ Cold     │ Hot      │ Hot        │ Hot        │
  │ Replay       │ N/A      │ No       │ Config     │ 1 (latest) │
  │ Multi-collect│ Each own │ Fan-out  │ Broadcast  │ Broadcast  │
  │ Has .value   │ No       │ No       │ No         │ Yes        │
  │ Distinct     │ No       │ No       │ No         │ Yes        │
  │ Backpressure │ Suspend  │ Suspend  │ Config     │ Conflate   │
  └──────────────┴──────────┴──────────┴────────────┴────────────┘
```

---

## 17. Battery Optimization

### Doze Mode & App Standby

```
Doze Mode (device stationary, screen off):
  → Network access suspended
  → Alarms deferred
  → No WiFi scanning
  → Sync adapters suspended
  → WorkManager jobs deferred to maintenance windows

App Standby Buckets:
  Active     → No restrictions (app recently used)
  Working    → Deferred jobs, some alarms
  Frequent   → More restrictions
  Rare       → Heavy restrictions, limited network
  Restricted → Almost nothing runs

Implication:
  Your periodic sync may not run for hours if user rarely opens your app
  Use FCM high-priority messages for critical real-time delivery
```

### Battery-Efficient Patterns

```
1. Batch network requests (don't make 10 calls when 1 batch call works)
2. Use WorkManager with constraints (network + charging)
3. Avoid wake locks (or use carefully with timeout)
4. Use JobScheduler-compatible windows, not exact alarms
5. Reduce location update frequency (significant changes only)
6. Use push (FCM) instead of polling
7. Minimize sensors (GPS, accelerometer) usage
```

---

## 18. APK Size Optimization

### What Makes APKs Large

```
Typical APK breakdown:
  ├── classes.dex     (30-50%)  → Compiled Kotlin/Java code
  ├── res/            (20-30%)  → Drawables, layouts, strings
  ├── lib/            (10-20%)  → Native libraries (.so files)
  ├── assets/         (5-15%)   → Raw files (fonts, JSON, ML models)
  └── resources.arsc  (5-10%)   → Compiled resources table
```

### Optimization Strategies

```
1. R8/ProGuard: Remove unused code + obfuscate (30-50% reduction)
2. Resource shrinking: Remove unused resources
   android {
       buildTypes {
           release {
               isMinifyEnabled = true
               isShrinkResources = true
           }
       }
   }

3. Android App Bundles (AAB): Only download resources for user's device
   → Splits by: ABI (arm64/x86), screen density, language
   → 20-50% smaller per-device download

4. WebP/AVIF images: 30% smaller than PNG at same quality
5. Vector drawables: Tiny for icons vs multiple density PNGs
6. Dynamic feature modules: Download features on demand
7. Remove debug info from release: -dontshrinkresources in ProGuard
```

---

# Part 5: Reliability & Observability

## 19. Crash Reporting & Monitoring

### Crash Reporting Architecture

```
App Crash
  │
  ├── UncaughtExceptionHandler catches
  │   → Serialize stack trace + device info + breadcrumbs
  │   → Write to local file (can't do network in crash handler)
  │
  ├── Next app launch
  │   → Read crash files
  │   → Upload to Crashlytics/Sentry/Datadog
  │   → Delete local files
  │
  └── Server-side
      → Symbolicate (map obfuscated names to source)
      → Group by root cause
      → Alert based on crash rate threshold
```

### Observability Stack

```
┌─────────────────────────────────────────┐
│              Dashboard                   │
│  (Datadog, Grafana, New Relic)          │
└──────────────────┬──────────────────────┘
                   │
    ┌──────────────┼──────────────────┐
    │              │                  │
┌───┴───┐    ┌────┴────┐    ┌───────┴──────┐
│Crashes│    │ Metrics  │    │   Logs       │
│       │    │          │    │              │
│Firebase│   │ Custom   │    │ Structured   │
│Sentry  │   │ counters │    │ Timber/Log   │
│Datadog │   │ timers   │    │              │
└────────┘   │ gauges   │    └──────────────┘
             └──────────┘

Key Metrics for Mobile:
  - Crash-free rate (target: >99.5%)
  - ANR rate (target: <0.5%)
  - Cold start time (p50, p95, p99)
  - Network error rate
  - API latency (p50, p95, p99)
  - Memory usage trend
  - Battery drain attribution
```

---

## 20. Feature Flags & Gradual Rollout

### Architecture

```
┌────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Flag Server │────│ Local Cache       │────│ Feature Gate  │
│ (LaunchDarkly│    │ (DataStore/Room)  │    │ if (isEnabled)│
│  Firebase)  │    │ Survives offline  │    │   show new UI │
└────────────┘     └──────────────────┘     │ else          │
                                            │   show old UI │
                                            └──────────────┘
```

### Rollout Strategy

```
Phase 1: Internal dogfood (employees only)           → 0.1%
Phase 2: Beta users                                   → 1%
Phase 3: Gradual rollout (monitor metrics)            → 5% → 25% → 50%
Phase 4: Full rollout                                  → 100%
Phase 5: Remove flag + old code path (clean up!)

Rollback: Set flag to 0% → instant kill switch without app update
```

---

## 21. A/B Testing Architecture

```
User opens app
  │
  ▼
Experiment service assigns variant (A or B)
  │ based on: user ID hash, segment, random
  ▼
Store assignment locally (consistent experience)
  │
  ▼
Show variant UI
  │
  ▼
Track events with variant tag
  │
  ▼
Server-side: Analyze statistical significance
  │ conversion rate A vs B
  ▼
Winner determined → roll out winning variant
```

---

## 22. Security Patterns

### Data at Rest

```
Sensitive data storage:
  ✓ EncryptedSharedPreferences (AndroidX Security)
  ✓ Room with SQLCipher (encrypted database)
  ✓ Android Keystore (hardware-backed key storage)
  ✗ Plain SharedPreferences (readable on rooted devices)
  ✗ Internal storage without encryption
  ✗ External storage (world-readable)
```

### Data in Transit

```
✓ TLS 1.2+ (enforced by default on API 29+)
✓ Certificate pinning (OkHttp CertificatePinner)
✓ No sensitive data in URLs (use POST body)
✓ Network security config (block cleartext traffic)
✗ HTTP for any request
✗ Trusting all certificates
✗ Logging auth tokens or PII
```

### API Key Protection

```
✗ Hardcoded in source code (decompilable)
✗ In BuildConfig (decompilable)
✗ In strings.xml (decompilable)

✓ local.properties (not committed to git)
✓ Server-side proxy (app calls your server, server calls API with key)
✓ Firebase Remote Config (encrypted transport)
✓ Android Keystore (hardware-protected)
✓ NDK (.so file — harder to decompile, not impossible)
```

---

# Part 6: Deep Case Studies

## 23. Case Study: Instagram

### Feed Architecture

```
┌─────────────────────────────────────┐
│         Instagram Feed               │
├─────────────────────────────────────┤
│                                     │
│  ┌────────────────────────────────┐ │
│  │     RecyclerView/LazyColumn    │ │
│  │     (Mixed content types)      │ │
│  │                                │ │
│  │  ┌─────────┐ Photo Post       │ │
│  │  │ Image   │ Video Post       │ │
│  │  │ Carousel│ Reel Preview     │ │
│  │  │ Video   │ Suggested User   │ │
│  │  │ Ad      │ Sponsored Post   │ │
│  │  └─────────┘ Stories Tray     │ │
│  └────────────────────────────────┘ │
│                                     │
│  Ranking Algorithm (ML-based)       │
│  → Interest score                   │
│  → Recency                          │
│  → Relationship strength            │
│  → Content type preference          │
└─────────────────────────────────────┘
```

### Instagram's Technical Challenges

```
1. IMAGE PIPELINE
   Problem: Load thousands of high-res images without OOM
   Solution: Fresco (Facebook's image library)
     - Decoded images stored in ashmem (anonymous shared memory)
       → NOT counted against Java heap → no OOM from images
     - Progressive JPEG rendering (blurry → sharp)
     - Animated GIF/WebP support with frame caching
     - 3-level cache: Bitmap → Encoded (disk) → Network

2. VIDEO PRELOADING
   Problem: Videos should play instantly when scrolled into view
   Solution:
     - Preload first 2 seconds of upcoming videos
     - Use ExoPlayer pool (reuse player instances)
     - Adaptive bitrate: Start low-res, upgrade based on bandwidth
     - Mute by default (save bandwidth, user choice to unmute)

3. STORIES CACHE
   Problem: 24-hour ephemeral content, must load instantly
   Solution:
     - Prefetch stories from close friends on app launch
     - Cache story frames in memory (LRU, ~50 stories)
     - Background download of upcoming story sets
     - "Seen" state tracked locally + synced to server

4. FEED RANKING
   Problem: Show most relevant content (not chronological)
   Solution:
     - Server-side ML model ranks posts
     - Client prefetches ranked feed on app launch
     - Local cache shows last-seen feed while refreshing
     - Pagination: cursor-based with server-side ranking

5. LIKE/COMMENT OPTIMISTIC UPDATES
   - Tap heart → immediate animation + local state update
   - API call in background
   - Failure: silently revert (user rarely notices)
   - Like count: approximate (eventual consistency OK)
```

### Key Architecture Decisions

| Decision | Why |
|----------|-----|
| Fresco over Glide | ashmem avoids Java heap limits for images |
| Cursor pagination | Feed items change ranking; offset would cause duplicates |
| Server-side ranking | Model too large for on-device inference |
| Prefetch stories | Critical for engagement (stories must load instantly) |
| Eventual consistency for likes | Perfect accuracy not needed for social features |

---

## 24. Case Study: Amazon

### E-Commerce Architecture

```
┌─────────────────────────────────────────────────┐
│                Amazon App                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Home Page                                       │
│  ├── Personalized recommendations (ML)           │
│  ├── Deal of the day (time-sensitive cache)       │
│  ├── Recently viewed (local + server sync)        │
│  ├── Category browsing (heavily cached)           │
│  └── Search (autocomplete + results)              │
│                                                  │
│  Product Detail                                   │
│  ├── Multiple image carousel (lazy + preload)     │
│  ├── Price (real-time, not cached)                │
│  ├── Availability (near-real-time)                │
│  ├── Reviews (paginated, cached aggressively)     │
│  └── Related products (recommendation engine)     │
│                                                  │
│  Cart & Checkout                                  │
│  ├── Cart (pessimistic - server is source of truth)│
│  ├── Price validation (re-check at checkout)      │
│  ├── Payment (PCI-compliant, tokenized)           │
│  └── Order placement (idempotent, exactly-once)   │
└─────────────────────────────────────────────────┘
```

### Amazon's Technical Deep Dives

```
1. SEARCH AUTOCOMPLETE
   Problem: Suggestions must appear within 100ms of typing
   Solution:
     - Local trie data structure for recent searches
     - Debounce: 200ms after last keystroke before API call
     - Server returns top 10 suggestions (pre-ranked)
     - Display local suggestions immediately, merge server results
     - Cache popular queries locally

2. PRODUCT CATALOG CACHING
   Problem: Millions of products, prices change constantly
   Solution:
     - Product metadata cached aggressively (title, images, description rarely change)
     - Price: Short TTL (5 min) or real-time fetch on product page
     - Availability: Near-real-time via WebSocket on product page
     - Reviews: Cached with long TTL (1 hour), count updated separately
     - Strategy: Stale-while-revalidate (show cached, refresh in background)

3. CART ARCHITECTURE
   Problem: Cart must be consistent across devices
   Solution:
     - Server-authoritative (no optimistic updates for cart)
     - Cart merge on login (anonymous cart + user cart)
     - Item reservation: Not reserved until checkout starts
     - Price guarantee: Price locked at time of "Add to Cart" for 15 min
     - Quantity limits: Server-enforced, client shows post-validation

4. CHECKOUT FLOW
   Problem: Cannot charge customer twice, cannot lose orders
   Solution:
     - Idempotency key per checkout attempt
     - Two-phase: Reserve → Confirm
     - Payment tokenization (card number never stored on device)
     - Order confirmation only after payment processor ACK
     - Retry with same idempotency key on timeout
     - Network error: Check order status before retrying

5. PERSONALIZATION
   Problem: Show relevant products from catalog of millions
   Solution:
     - Collaborative filtering ("customers who bought X also bought Y")
     - User behavior signals sent to server (views, searches, purchases)
     - Pre-computed recommendations cached per user segment
     - A/B testing different recommendation algorithms
     - On-device: Recently viewed stored locally for instant display
```

---

## 25. Case Study: Spotify

### Audio Streaming Architecture

```
┌─────────────────────────────────────────────────┐
│               Spotify App                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Audio Pipeline                                  │
│  ┌──────────┐  ┌────────────┐  ┌─────────────┐ │
│  │ Decoder  │→ │ Equalizer  │→ │ Audio Output │ │
│  │ (Vorbis/ │  │ (DSP)      │  │ (AudioTrack) │ │
│  │  AAC)    │  │            │  │              │ │
│  └────┬─────┘  └────────────┘  └─────────────┘ │
│       │                                          │
│  ┌────┴────────────────────────────────────────┐ │
│  │          Buffer Manager                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐│ │
│  │  │ Network  │ │ Disk     │ │ Memory       ││ │
│  │  │ Buffer   │ │ Cache    │ │ Buffer       ││ │
│  │  │ (stream) │ │ (offline)│ │ (next track) ││ │
│  │  └──────────┘ └──────────┘ └──────────────┘│ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Spotify's Technical Deep Dives

```
1. STREAMING WITH BUFFERING
   Problem: Uninterrupted playback on flaky mobile networks
   Solution:
     - Buffer 30 seconds ahead while playing
     - Adaptive bitrate: 24kbps (poor) → 96 → 160 → 320kbps (wifi)
     - Crossfade: Start buffering next track 10s before current ends
     - Gapless playback: Pre-decode next track header
     - Network loss: Play from buffer, pause if buffer exhausted

2. OFFLINE DOWNLOAD ARCHITECTURE
   Problem: Store thousands of songs offline, manage storage
   Solution:
     - Songs encrypted with user-specific key (DRM)
     - SQLite index of downloaded tracks (metadata, file path, key)
     - Smart storage management:
       → Least-recently-played songs evicted first
       → User can set storage limit (e.g., 10GB)
       → Downloads paused when storage < 500MB
     - Sync state with server (downloaded playlists tracked for licensing)
     - Background download via WorkManager (WiFi + charging constraints)

3. SEARCH ARCHITECTURE
   Problem: Search across 100M+ tracks, artists, albums, podcasts
   Solution:
     - Local search: Recently played + downloaded content (instant)
     - Remote search: Debounced API call (300ms)
     - Results ranked by: Exact match > popularity > relevance
     - Voice search: On-device STT → text query → same pipeline
     - "Did you mean?" fuzzy matching for typos

4. AUDIO QUALITY ADAPTATION
   Signal   │ Action
   ─────────┼───────────────────
   WiFi     │ 320kbps (highest)
   4G strong│ 160kbps
   4G weak  │ 96kbps
   3G       │ 24kbps
   Offline  │ Downloaded quality
   Battery  │ Lower quality when <15%

5. PLAYLIST SYNC
   Problem: User edits playlist on phone, web, and desktop
   Solution:
     - Each edit is an operation (add track, remove, reorder)
     - Operations sent to server with timestamps
     - Server resolves conflicts using operational transform
     - All clients subscribe to playlist change events
     - Offline edits queued and synced on reconnect
```

---

## 26. Case Study: PayPal/Venmo

### Payment Architecture

```
┌─────────────────────────────────────────────────┐
│              Venmo App                           │
├─────────────────────────────────────────────────┤
│                                                  │
│  PAYMENT FLOW (Pessimistic — NEVER optimistic)   │
│  ┌─────────────────────────────────────────────┐│
│  │ 1. User enters amount + note                ││
│  │ 2. Client-side validation (format, limits)  ││
│  │ 3. Show confirmation screen                 ││
│  │ 4. User confirms → disable button           ││
│  │ 5. POST /payments (idempotency_key: UUID)   ││
│  │ 6. Server validates:                        ││
│  │    - Balance/funding source                  ││
│  │    - Fraud checks (ML model)                 ││
│  │    - Compliance/sanctions screening          ││
│  │    - Rate limiting                           ││
│  │ 7. Server processes payment                  ││
│  │ 8. Return success/failure                    ││
│  │ 9. Update UI based on response               ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  SOCIAL FEED (Optimistic where safe)             │
│  ┌─────────────────────────────────────────────┐│
│  │ Comments: Optimistic insert + pending guard  ││
│  │ Likes: Optimistic toggle + async sync        ││
│  │ Feed: Cache-aside + store sync               ││
│  │ Pagination: Cursor-based                     ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Venmo's Technical Deep Dives

```
1. PAYMENT IDEMPOTENCY
   Problem: Network timeout during payment — did it go through?
   Solution:
     - Generate idempotency_key (UUID) when user taps "Pay"
     - Same key used for all retries of the same payment
     - Server: If key exists → return stored response
     - Client: On timeout → show "checking payment status" → retry with same key
     - NEVER show "payment sent" until server confirms
     - Double-tap prevention: Disable button on first tap

2. FEED CACHING (This Codebase)
   Problem: Show feed instantly, keep in sync, handle offline
   Solution:
     - In-memory store (StateFlow) → source of truth for UI
     - Comments: optimistic insert with pendingCommentIds guard
     - Store sync: init block collects from storyService.entries
     - Pagination: cursor-based with FeedPagingSource
     - Lazy ViewModel creation for comments (only when sheet opens)

3. IDENTITY VERIFICATION
   Problem: Compliance requires identity verification for payments
   Solution:
     - Step-up authentication (biometric/PIN) for sensitive actions
     - Session tokens with short TTL (15 min)
     - Refresh token rotation (each refresh invalidates previous)
     - Device binding (new device requires re-verification)
     - Biometric prompt integrated via BiometricManager

4. SECURITY LAYERS
   - Certificate pinning (OkHttp)
   - Root/jailbreak detection (SafetyNet/Play Integrity)
   - Screenshot prevention on sensitive screens (FLAG_SECURE)
   - No sensitive data in logs
   - Encrypted storage for auth tokens (EncryptedSharedPreferences)
   - Obfuscation via R8
```

---

## 27. Case Study: Stripe

### Mobile SDK Architecture

```
┌─────────────────────────────────────────────────┐
│              Stripe Android SDK                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │          PaymentSheet (Drop-in UI)         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │  Card    │ │  Google  │ │  Bank    │   │  │
│  │  │  Input   │ │  Pay     │ │  Redirect│   │  │
│  │  └──────────┘ └──────────┘ └──────────┘   │  │
│  └────────────────────┬───────────────────────┘  │
│                       │                          │
│  ┌────────────────────┴───────────────────────┐  │
│  │        Payment Intent Flow                  │  │
│  │  1. Server creates PaymentIntent            │  │
│  │  2. Client confirms with payment method     │  │
│  │  3. 3DS authentication if required          │  │
│  │  4. Server webhook confirms payment         │  │
│  └─────────────────────────────────────────────┘  │
│                                                  │
│  Security:                                       │
│  - Card number NEVER touches merchant server     │
│  - Tokenized immediately via Stripe API          │
│  - PCI DSS compliance handled by SDK             │
│  - Fraud detection (Radar) server-side           │
└─────────────────────────────────────────────────┘
```

### Stripe's Technical Deep Dives

```
1. TOKENIZATION
   Problem: Merchant app must NEVER see raw card numbers (PCI compliance)
   Solution:
     - Card input field is an iframe/isolated view
     - Card number sent directly to Stripe servers (not merchant backend)
     - Stripe returns a token/PaymentMethod ID
     - Merchant server uses token to create charge
     - Token is single-use or attached to customer for reuse

2. 3D SECURE (SCA)
   Problem: European regulations require Strong Customer Authentication
   Solution:
     - PaymentIntent status: "requires_action"
     - SDK launches WebView for bank's 3DS challenge
     - User authenticates (OTP, biometric, password)
     - SDK receives callback → confirms PaymentIntent
     - Fallback: Redirect to bank URL for non-WebView flows

3. PAYMENT RETRY & IDEMPOTENCY
   - Every API request includes Idempotency-Key header
   - Stripe stores response for 24 hours
   - Same key → same response (no duplicate charges)
   - SDK generates key per user payment attempt
   - Network timeout → retry with same key → safe
```

---

## 28. Case Study: WhatsApp

### Messaging Architecture

```
1. MESSAGE DELIVERY
   Client A → Server → Client B
     │                    │
     ├── Sent (✓)         │ stored in server queue
     ├── Delivered (✓✓)   │ Client B acknowledged receipt
     └── Read (✓✓ blue)   │ Client B opened conversation

   Server does NOT store messages long-term
   → Message deleted from server after delivery
   → End-to-end encryption: server can't read messages

2. LOCAL DATABASE
   SQLite (msgstore.db)
   ├── messages table (all messages, indexed by chat + timestamp)
   ├── chat_list table (conversations with last message)
   ├── media table (photos, videos — stored as files, referenced in DB)
   └── contacts table (synced from phone contacts)

   Size: Can be several GB for heavy users
   Backup: Encrypted backup to Google Drive (optional)

3. OFFLINE MESSAGING
   Send while offline:
     → Message saved to local DB with "pending" status
     → Queued in outbox
     → On reconnect: send queue drained in order
     → Server ACK → status updated to "sent"

4. MEDIA HANDLING
   Problem: Videos/photos are large, must handle offline
   Solution:
     - Thumbnail generated locally (show immediately in chat)
     - Full media uploaded to server → URL shared via message
     - Recipient downloads on demand (or auto-download on WiFi)
     - Media not stored on server after download (ephemeral)
     - Disk cache with configurable auto-download settings

5. GROUP MESSAGING
   Problem: Message to 256 members must be efficient
   Solution:
     - Fan-out on server (client sends once, server distributes)
     - Signal Protocol: Sender creates message key, encrypts per-recipient
     - Server stores encrypted copy per recipient in their queue
     - Delivery receipts: Aggregated (don't send 256 individual receipts)
```

---

## 29. Case Study: Google Maps

### Map Tile Architecture

```
┌─────────────────────────────────────────────────┐
│              Google Maps                         │
├─────────────────────────────────────────────────┤
│                                                  │
│  MAP RENDERING                                   │
│  ┌─────────────────────────────────────────────┐│
│  │  Vector Tiles (not raster images)            ││
│  │  → Smaller download, rendered on GPU         ││
│  │  → Smooth zoom (no pixelation)               ││
│  │  → Style changes without re-download         ││
│  │                                              ││
│  │  Tile Grid:                                   ││
│  │  ┌───┬───┬───┐                               ││
│  │  │ A │ B │ C │  ← Each tile = 256x256 area   ││
│  │  ├───┼───┼───┤     at specific zoom level     ││
│  │  │ D │ E │ F │                               ││
│  │  ├───┼───┼───┤  Visible: E (center)          ││
│  │  │ G │ H │ I │  Prefetch: A,B,C,D,F,G,H,I   ││
│  │  └───┴───┴───┘                               ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  CACHING STRATEGY                                │
│  Level 1: GPU texture cache (current tiles)      │
│  Level 2: Memory cache (recently viewed tiles)   │
│  Level 3: Disk cache (tiles cached for offline)  │
│  Level 4: Network (download new tiles)           │
│                                                  │
│  Offline maps: Pre-download entire tile pyramid  │
│  for a region (zoom levels 0-17)                 │
└─────────────────────────────────────────────────┘
```

### Google Maps Technical Deep Dives

```
1. LOCATION TRACKING
   Sources (fused, best-of):
     GPS        → 3m accuracy, high battery, slow fix
     WiFi       → 15m accuracy, medium battery, fast
     Cell tower → 300m accuracy, low battery, instant
     Bluetooth  → 1m accuracy (indoor), very low battery

   Fused Location Provider:
     → Combines all sources
     → Adaptive: Uses GPS when navigating, cell when idle
     → Batched updates: Collect locations, deliver in batch (saves battery)

2. ROUTE CALCULATION
   Problem: Real-time navigation with traffic
   Solution:
     - Initial route calculated server-side (Dijkstra + traffic data)
     - Route downloaded to device for offline use
     - Real-time traffic updates via periodic API calls
     - On-device re-routing for missed turns (no server needed)
     - Predictive: Pre-calculate alternative routes

3. SEARCH & POI
   - Local cache of recent searches
   - Autocomplete: Debounced, location-biased results
   - Place details: Cached with medium TTL (hours)
   - Photos: Lazy-loaded from CDN
```

---

## 30. Case Study: Netflix

### Video Streaming Architecture

```
1. ADAPTIVE BITRATE STREAMING (ABR)
   Content encoded at multiple quality levels:
   ┌─────────────┬──────────┬────────────┐
   │ Quality     │ Bitrate  │ Resolution │
   ├─────────────┼──────────┼────────────┤
   │ Low         │ 0.5 Mbps │ 480p       │
   │ Medium      │ 1.5 Mbps │ 720p       │
   │ High        │ 5 Mbps   │ 1080p      │
   │ Ultra       │ 15 Mbps  │ 4K         │
   └─────────────┴──────────┴────────────┘

   Player monitors bandwidth:
     → Good bandwidth: Upgrade quality (smooth transition)
     → Bandwidth drops: Downgrade quality (avoid buffering)
     → Buffer < 5 seconds: Aggressively downgrade

2. DOWNLOAD FOR OFFLINE
   Problem: DRM-protected content must be playable offline
   Solution:
     - Content encrypted with Widevine DRM
     - License fetched and cached (valid for 48 hours after first play)
     - Download via WorkManager (WiFi + storage constraints)
     - Storage management: Auto-delete watched content after 7 days
     - Download quality selectable (save storage)

3. CONTENT RECOMMENDATION
   Problem: Personalize for 200M+ users
   Solution:
     - Server-side ML models (collaborative + content-based filtering)
     - Row-based UI: Each row is a recommendation category
     - Artwork personalization: Different thumbnail per user
     - Pre-fetch recommended content metadata on app launch
     - Local cache: Last-seen home screen shown instantly

4. PLAYBACK RESUME
   Problem: Resume where user left off, across devices
   Solution:
     - Playback position saved every 10 seconds
     - Written to local DB + synced to server
     - On resume: Local position used first (faster)
     - Cross-device sync: Server position with last-update-wins
     - "Continue Watching" row uses cached positions
```

---

## 31. Case Study: Uber

### Ride Architecture

```
1. REAL-TIME LOCATION
   Driver app:
     → GPS location sent every 4 seconds
     → Batched when in ride (every 1 second for ETA accuracy)
     → Write-behind: Buffer locally, flush to server

   Rider app:
     → Subscribes to driver location via WebSocket
     → Interpolation between updates for smooth map animation
     → Fallback: Poll server if WebSocket disconnects

2. RIDE MATCHING
   Problem: Match riders with nearest available drivers in real-time
   Solution:
     - Geospatial index (S2 geometry library — divides earth into cells)
     - Driver location updates indexed in real-time
     - On ride request: Query nearby cells for available drivers
     - Ranking: Distance + ETA + driver rating + surge pricing
     - Dispatch: Push notification to top-ranked driver
     - Timeout: If driver doesn't accept in 15s → next driver

3. SURGE PRICING
   - Server calculates demand/supply ratio per geo-cell
   - Pushed to rider app before ride request
   - Rider must acknowledge surge multiplier
   - Cached with short TTL (30 seconds) — prices change rapidly

4. TRIP TRACKING
   Problem: Reliable trip recording even with network issues
   Solution:
     - Trip data recorded locally (GPS breadcrumbs)
     - Synced to server in real-time when connected
     - Offline: Stored locally, synced on reconnect
     - Server reconciles client + driver trip data
     - Dispute resolution: GPS trail is evidence

5. MAP RENDERING
   - Custom map SDK (not Google Maps — cost at scale)
   - Vector tiles with custom styling
   - Aggressive tile caching (common areas pre-cached)
   - Predictive prefetch: Cache tiles along probable route
```

---

## 32. Case Study: Twitter/X

### Timeline Architecture

```
1. TIMELINE APPROACHES
   Fan-out-on-write (Push):
     User tweets → Write to all followers' timelines
     Pro: Read is fast (pre-computed)
     Con: Celebrities with 50M followers → 50M writes per tweet

   Fan-out-on-read (Pull):
     User opens timeline → Fetch tweets from all followed users
     Pro: Write is fast (one write)
     Con: Read requires merging from many sources

   Twitter's Hybrid:
     Regular users: Fan-out-on-write (pre-computed timeline)
     Celebrities (>50K followers): Fan-out-on-read (merged at read time)
     → Best of both worlds

2. REAL-TIME TIMELINE UPDATES
   Problem: New tweets should appear without manual refresh
   Solution:
     - WebSocket connection for real-time updates
     - "New tweets" banner (don't auto-scroll — interrupts reading)
     - Streaming API for firehose consumers
     - Offline: Cache current timeline, refresh on reconnect

3. MEDIA TIMELINE
   Problem: Mixed media (text, images, videos, polls, links) in feed
   Solution:
     - Multiple ViewHolder types in RecyclerView
     - Video auto-play with visibility threshold (50% visible → play)
     - Image: Blurhash placeholder → progressive load
     - Link preview: Cached card with title + thumbnail + domain
     - Polls: Optimistic vote + server validation

4. SEARCH & TRENDS
   - Real-time trending topics (computed server-side)
   - Search: Elasticsearch with real-time indexing
   - Autocomplete: Top accounts + recent searches + trending
   - Advanced search: Filters (from, to, date range, media type)
```

---

# Part 7: Interview Quick Reference

## 33. System Design Interview Template

```
Step 1: CLARIFY (2-3 minutes)
  - What's the core feature? (e.g., "design Instagram feed")
  - Scale: DAU, QPS, data volume?
  - Offline support needed?
  - Real-time requirements?
  - Platform constraints? (Android only? Cross-platform?)

Step 2: HIGH-LEVEL DESIGN (5-7 minutes)
  - Draw the architecture (UI → ViewModel → Repository → DataSource)
  - Identify major components
  - Choose architecture pattern (MVVM/MVI)
  - Define data flow

Step 3: DEEP DIVE (15-20 minutes)
  - Caching strategy (which layers, invalidation)
  - Pagination approach (cursor vs offset)
  - Offline handling (queue + sync)
  - Performance optimization (image loading, lazy init)
  - Error handling (retry, fallback, error states)

Step 4: TRADEOFFS & SCALING (5 minutes)
  - Why this approach over alternatives?
  - What breaks at 10x scale?
  - What would you monitor?
  - What would you optimize next?
```

## 34. Pattern Decision Matrix

### Quick Lookup: "What pattern for my use case?"

```
┌────────────────────────────┬──────────────────────────────────┐
│ Use Case                   │ Pattern                          │
├────────────────────────────┼──────────────────────────────────┤
│ Social feed                │ MVVM + Paging3 + RemoteMediator  │
│ Chat app                   │ MVI + WebSocket + Room           │
│ Payment flow               │ Pessimistic + Idempotency        │
│ Photo gallery              │ LazyGrid + Coil + DiskCache      │
│ Search with autocomplete   │ Debounce + Local + Remote merge  │
│ Offline note-taking        │ Offline-First + Sync queue       │
│ Video streaming            │ ExoPlayer + ABR + Buffer mgmt    │
│ Maps/location              │ Tile cache + Fused location      │
│ Shopping cart               │ Server-authoritative + local UI  │
│ Settings/preferences       │ DataStore + Write-through cache  │
│ Push notifications         │ FCM + WorkManager + Deep link    │
│ Analytics                  │ Write-behind + Batch upload      │
│ Feature rollout            │ Feature flags + A/B + monitoring │
│ Authentication             │ Token rotation + Biometric       │
└────────────────────────────┴──────────────────────────────────┘
```

### "What should I measure?"

```
┌────────────────────┬──────────────────────────────────────┐
│ Area               │ Key Metrics                          │
├────────────────────┼──────────────────────────────────────┤
│ Startup            │ Cold start P50/P95/P99 (ms)          │
│ Feed               │ Time to first item (ms)              │
│ Network            │ API latency P50/P95, error rate (%)  │
│ Crashes            │ Crash-free rate (target >99.5%)      │
│ ANR                │ ANR rate (target <0.5%)              │
│ Memory             │ Peak RSS, GC pause time              │
│ Battery            │ mAh per session, wake locks          │
│ Storage            │ Cache size, DB size                  │
│ UI                 │ Frame drop rate, jank (>16ms frames) │
│ Engagement         │ Session length, DAU/MAU ratio        │
└────────────────────┴──────────────────────────────────────┘
```

### Architecture Comparison Summary

```
┌─────────┬───────────┬───────────┬───────────────────────────────┐
│ Pattern │ Complexity│ Best For  │ Real-World User                │
├─────────┼───────────┼───────────┼───────────────────────────────┤
│ MVP     │ Low       │ Legacy    │ Venmo (legacy), many enterprises│
│ MVVM    │ Medium    │ Most apps │ Google apps, Venmo feed (new) │
│ MVI     │ High      │ Complex UI│ Airbnb, Cash App              │
│ Clean   │ Very High │ Large teams│ Enterprise, banking apps      │
└─────────┴───────────┴───────────┴───────────────────────────────┘
```

---

## Final Tips for Interview Day

1. **Always start with the user experience** — "The user taps X, sees Y within Z ms"
2. **Name the patterns** — Interviewers want vocabulary, not just mechanics
3. **State tradeoffs explicitly** — "I chose X over Y because Z, accepting the cost of W"
4. **Draw data flow diagrams** — Visual > verbal for architecture
5. **Think about failure modes** — "What happens when the network drops mid-payment?"
6. **Know your numbers** — Memory limits (~256MB heap), network latency (~200ms), SQLite query (~1ms)
7. **Connect to real apps** — "Instagram solves this with Fresco's ashmem allocation"
8. **Don't over-engineer** — Start simple, add complexity when interviewer pushes scale
9. **Ask about constraints** — "Do we need offline support? What's the P99 latency target?"
10. **Mention monitoring** — "I'd track cold start P95 via Firebase Performance to catch regressions"
