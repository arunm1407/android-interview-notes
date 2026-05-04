---
title: "Coding Patterns"
weight: 5
---


# Coding Patterns

> [!NOTE]
> **30 problems, 4 system design exercises.** Each includes problem statement, approach, Kotlin implementation, time/space complexity, and Android-specific context.

---

## Table of Contents

### Data Structures & Implementations
1. [LRU Cache](#1-lru-cache)
2. [LFU Cache](#2-lfu-cache)
3. [Trie (Autocomplete)](#3-trie-autocomplete)
4. [Min/Max Heap (Priority Queue)](#4-minmax-heap)
5. [Blocking Queue (Producer-Consumer)](#5-blocking-queue-producer-consumer)
6. [Rate Limiter](#6-rate-limiter)
7. [Debounce & Throttle](#7-debounce--throttle)

### Concurrency Patterns
8. [Thread-Safe Singleton](#8-thread-safe-singleton)
9. [Read-Write Lock](#9-read-write-lock)
10. [CountDownLatch / Barrier](#10-countdownlatch--barrier)
11. [Actor Pattern (Coroutines)](#11-actor-pattern)
12. [Mutex vs Synchronized](#12-mutex-vs-synchronized)

### Android-Specific Patterns
13. [Event Bus / Observable Pattern](#13-event-bus--observable-pattern)
14. [Pagination State Machine](#14-pagination-state-machine)
15. [Retry with Exponential Backoff](#15-retry-with-exponential-backoff)
16. [Image Downsampling](#16-image-downsampling)
17. [Diff Algorithm (RecyclerView DiffUtil)](#17-diff-algorithm)
18. [State Reducer Pattern](#18-state-reducer-pattern)

### Classic Problems (Android Context)
19. [Two Sum / HashMap Patterns](#19-two-sum--hashmap-patterns)
20. [Merge K Sorted Lists (Multi-Source Feed)](#20-merge-k-sorted-lists)
21. [Serialize/Deserialize Tree (Parcelable)](#21-serializedeserialize-tree)
22. [Topological Sort (Build Dependencies)](#22-topological-sort)
23. [Sliding Window (Analytics Aggregation)](#23-sliding-window)
24. [Graph BFS/DFS (Navigation Graph)](#24-graph-bfsdfs)
25. [String Matching (Mention/Hashtag Parsing)](#25-string-matching)
26. [Interval Scheduling (Calendar/Booking)](#26-interval-scheduling)

### Behavioral & System Design Coding
27. [Design a Feed](#27-design-a-feed)
28. [Design an Image Loader](#28-design-an-image-loader)
29. [Design a Chat System](#29-design-a-chat-system)
30. [Design an Analytics SDK](#30-design-an-analytics-sdk)

---

# Data Structures & Implementations

## 1. LRU Cache

### Problem
Design a cache that evicts the Least Recently Used item when capacity is reached.

### Why It Matters in Android
- Bitmap memory cache (Glide/Coil use LRU internally)
- OkHttp connection pool
- RecyclerView RecycledViewPool
- Any bounded in-memory cache

### Implementation

```kotlin
class LRUCache<K, V>(private val capacity: Int) {

    private data class Node<K, V>(
        val key: K,
        var value: V,
        var prev: Node<K, V>? = null,
        var next: Node<K, V>? = null,
    )

    private val map = HashMap<K, Node<K, V>>()
    private val head = Node<K, V>(key = null as K, value = null as V)  // dummy
    private val tail = Node<K, V>(key = null as K, value = null as V)  // dummy

    init {
        head.next = tail
        tail.prev = head
    }

    fun get(key: K): V? {
        val node = map[key] ?: return null
        moveToFront(node)
        return node.value
    }

    fun put(key: K, value: V) {
        val existing = map[key]
        if (existing != null) {
            existing.value = value
            moveToFront(existing)
            return
        }

        if (map.size >= capacity) {
            val lru = tail.prev!!
            removeNode(lru)
            map.remove(lru.key)
        }

        val newNode = Node(key, value)
        addToFront(newNode)
        map[key] = newNode
    }

    private fun addToFront(node: Node<K, V>) {
        node.next = head.next
        node.prev = head
        head.next!!.prev = node
        head.next = node
    }

    private fun removeNode(node: Node<K, V>) {
        node.prev!!.next = node.next
        node.next!!.prev = node.prev
    }

    private fun moveToFront(node: Node<K, V>) {
        removeNode(node)
        addToFront(node)
    }
}
```

### Complexity
```
get():  O(1) time, O(1) space
put():  O(1) time, O(n) space total
evict:  O(1) time (remove from tail)

Data structure: HashMap + Doubly Linked List
  HashMap: O(1) lookup by key
  Doubly Linked List: O(1) insert/remove, maintains access order
```

### Android's Built-in LruCache

```kotlin
// Android provides LruCache in android.util
val bitmapCache = object : LruCache<String, Bitmap>(maxMemoryKB) {
    override fun sizeOf(key: String, bitmap: Bitmap): Int {
        return bitmap.byteCount / 1024  // size in KB
    }
    override fun entryRemoved(evicted: Boolean, key: String, old: Bitmap, new: Bitmap?) {
        if (evicted) old.recycle()  // release bitmap memory
    }
}
```

### Interview Follow-Up Questions
```
Q: How would you make it thread-safe?
A: Wrap get/put in synchronized(lock) or use ConcurrentHashMap +
   ReentrantReadWriteLock for better read concurrency.

Q: How would you add TTL (expiration)?
A: Add timestamp to Node, check on get(), background cleanup thread.

Q: How would you persist across process death?
A: Serialize to Room/SharedPrefs, load on cold start.
```

---

## 2. LFU Cache

### Problem
Evict the Least Frequently Used item. On frequency tie, evict the least recently used among them.

### Implementation

```kotlin
class LFUCache<K, V>(private val capacity: Int) {

    private data class Entry<K, V>(
        val key: K,
        var value: V,
        var frequency: Int = 1,
    )

    private val cache = HashMap<K, Entry<K, V>>()
    private val freqMap = HashMap<Int, LinkedHashSet<K>>()  // frequency → keys in LRU order
    private var minFreq = 1

    fun get(key: K): V? {
        val entry = cache[key] ?: return null
        incrementFrequency(entry)
        return entry.value
    }

    fun put(key: K, value: V) {
        if (capacity <= 0) return

        val existing = cache[key]
        if (existing != null) {
            existing.value = value
            incrementFrequency(existing)
            return
        }

        if (cache.size >= capacity) {
            evict()
        }

        val entry = Entry(key, value, frequency = 1)
        cache[key] = entry
        freqMap.getOrPut(1) { LinkedHashSet() }.add(key)
        minFreq = 1
    }

    private fun incrementFrequency(entry: Entry<K, V>) {
        val oldFreq = entry.frequency
        val keys = freqMap[oldFreq]!!
        keys.remove(entry.key)

        if (keys.isEmpty()) {
            freqMap.remove(oldFreq)
            if (minFreq == oldFreq) minFreq++
        }

        entry.frequency++
        freqMap.getOrPut(entry.frequency) { LinkedHashSet() }.add(entry.key)
    }

    private fun evict() {
        val keys = freqMap[minFreq]!!
        val evictKey = keys.iterator().next()  // first = least recently used at this frequency
        keys.remove(evictKey)
        if (keys.isEmpty()) freqMap.remove(minFreq)
        cache.remove(evictKey)
    }
}
```

### Complexity
```
get(): O(1)
put(): O(1)
Space: O(n)
```

### When LFU > LRU
```
LRU: Good when recent = relevant (feed, browsing history)
LFU: Good when frequency = relevance (popular items accessed repeatedly)

Example: Emoji keyboard
  - Most-used emojis should stay cached even if not used in last 5 minutes
  - LRU would evict a frequently-used emoji after browsing other categories
  - LFU keeps frequently-used emojis cached
```

---

## 3. Trie (Autocomplete)

### Problem
Implement autocomplete search that returns suggestions as user types.

### Why It Matters
- Search autocomplete (Amazon, Google, Spotify)
- Contact name search
- Command palette (Slack, Discord)
- Mention suggestions (@username in Venmo comments)

### Implementation

```kotlin
class Trie {
    private class Node {
        val children = HashMap<Char, Node>()
        var isEnd = false
        var word: String? = null
        var frequency = 0  // for ranking suggestions
    }

    private val root = Node()

    fun insert(word: String, frequency: Int = 1) {
        var node = root
        for (c in word.lowercase()) {
            node = node.children.getOrPut(c) { Node() }
        }
        node.isEnd = true
        node.word = word
        node.frequency = frequency
    }

    fun search(prefix: String, limit: Int = 10): List<String> {
        var node = root
        for (c in prefix.lowercase()) {
            node = node.children[c] ?: return emptyList()
        }

        val results = mutableListOf<Pair<String, Int>>()
        collectWords(node, results)
        return results
            .sortedByDescending { it.second }
            .take(limit)
            .map { it.first }
    }

    private fun collectWords(node: Node, results: MutableList<Pair<String, Int>>) {
        if (node.isEnd) {
            results.add(node.word!! to node.frequency)
        }
        for (child in node.children.values) {
            collectWords(child, results)
        }
    }

    fun delete(word: String): Boolean {
        fun deleteHelper(node: Node, index: Int): Boolean {
            if (index == word.length) {
                if (!node.isEnd) return false
                node.isEnd = false
                return node.children.isEmpty()
            }
            val c = word[index].lowercaseChar()
            val child = node.children[c] ?: return false
            if (deleteHelper(child, index + 1)) {
                node.children.remove(c)
                return !node.isEnd && node.children.isEmpty()
            }
            return false
        }
        deleteHelper(root, 0)
        return true
    }
}
```

### Complexity
```
Insert:  O(L) where L = word length
Search:  O(P + N) where P = prefix length, N = number of matches
Space:   O(W * L) where W = number of words, L = average length
```

### Android Usage Pattern

```kotlin
class SearchViewModel(private val repository: SearchRepository) : ViewModel() {
    private val _query = MutableStateFlow("")
    val suggestions: StateFlow<List<String>> = _query
        .debounce(200)  // wait 200ms after last keystroke
        .distinctUntilChanged()
        .mapLatest { query ->
            if (query.length < 2) emptyList()
            else {
                // 1. Check local trie first (instant)
                val local = localTrie.search(query, limit = 5)
                // 2. Fetch from server (slower, more complete)
                val remote = repository.searchSuggestions(query)
                // 3. Merge: local first, then remote (deduplicated)
                (local + remote).distinct().take(10)
            }
        }
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun onQueryChanged(text: String) { _query.value = text }
}
```

---

## 4. Min/Max Heap

### Problem
Maintain a collection where you can efficiently get/remove the minimum (or maximum) element.

### Why It Matters
- Task priority scheduling (WorkManager internals)
- Top-K problems (top K most liked posts)
- Merge K sorted streams (multi-source feed)
- Median finder (analytics)

### Implementation (Min Heap)

```kotlin
class MinHeap<T : Comparable<T>> {
    private val data = mutableListOf<T>()

    val size: Int get() = data.size
    val isEmpty: Boolean get() = data.isEmpty()

    fun peek(): T? = data.firstOrNull()

    fun insert(value: T) {
        data.add(value)
        siftUp(data.lastIndex)
    }

    fun extractMin(): T? {
        if (data.isEmpty()) return null
        val min = data[0]
        data[0] = data.last()
        data.removeAt(data.lastIndex)
        if (data.isNotEmpty()) siftDown(0)
        return min
    }

    private fun siftUp(index: Int) {
        var i = index
        while (i > 0) {
            val parent = (i - 1) / 2
            if (data[i] < data[parent]) {
                data[i] = data[parent].also { data[parent] = data[i] }
                i = parent
            } else break
        }
    }

    private fun siftDown(index: Int) {
        var i = index
        while (2 * i + 1 < data.size) {
            var smallest = 2 * i + 1
            if (smallest + 1 < data.size && data[smallest + 1] < data[smallest]) {
                smallest++
            }
            if (data[i] > data[smallest]) {
                data[i] = data[smallest].also { data[smallest] = data[i] }
                i = smallest
            } else break
        }
    }
}
```

### Complexity
```
insert():     O(log n)
extractMin(): O(log n)
peek():       O(1)
Space:        O(n)
```

---

## 5. Blocking Queue (Producer-Consumer)

### Problem
Multiple producers add items, multiple consumers process them. Producers block when queue is full, consumers block when queue is empty.

### Why It Matters
- Analytics event batching (produce events → consumer batches and sends)
- Image download queue (UI produces requests → background downloads)
- Log buffering (app produces logs → writer flushes to file)

### Implementation with Coroutines

```kotlin
class BoundedQueue<T>(private val capacity: Int) {
    private val queue = ArrayDeque<T>()
    private val mutex = Mutex()
    private val notFull = Channel<Unit>(Channel.CONFLATED)
    private val notEmpty = Channel<Unit>(Channel.CONFLATED)

    suspend fun put(item: T) {
        while (true) {
            mutex.withLock {
                if (queue.size < capacity) {
                    queue.addLast(item)
                    notEmpty.trySend(Unit)  // signal consumers
                    return
                }
            }
            notFull.receive()  // wait for space
        }
    }

    suspend fun take(): T {
        while (true) {
            mutex.withLock {
                if (queue.isNotEmpty()) {
                    val item = queue.removeFirst()
                    notFull.trySend(Unit)  // signal producers
                    return item
                }
            }
            notEmpty.receive()  // wait for items
        }
    }
}

// Simpler with Kotlin Channel:
val queue = Channel<AnalyticsEvent>(capacity = 100)

// Producer
launch { queue.send(AnalyticsEvent("screen_view", params)) }

// Consumer (batching)
launch {
    val batch = mutableListOf<AnalyticsEvent>()
    while (true) {
        val event = queue.receive()
        batch.add(event)
        // Drain remaining without blocking
        while (batch.size < 50) {
            val next = queue.tryReceive().getOrNull() ?: break
            batch.add(next)
        }
        api.sendBatch(batch.toList())
        batch.clear()
    }
}
```

---

## 6. Rate Limiter

### Problem
Limit the rate of operations (e.g., max 5 API calls per second).

### Why It Matters
- API rate limiting (prevent server abuse)
- UI event throttling (prevent rapid button taps)
- Background sync frequency limiting

### Token Bucket Implementation

```kotlin
class TokenBucketRateLimiter(
    private val maxTokens: Int,
    private val refillRate: Double,  // tokens per millisecond
) {
    private var tokens: Double = maxTokens.toDouble()
    private var lastRefill = System.currentTimeMillis()
    private val lock = Any()

    fun tryAcquire(): Boolean {
        synchronized(lock) {
            refill()
            return if (tokens >= 1) {
                tokens -= 1
                true
            } else {
                false
            }
        }
    }

    suspend fun acquire() {
        while (!tryAcquire()) {
            delay(10)  // wait and retry
        }
    }

    private fun refill() {
        val now = System.currentTimeMillis()
        val elapsed = now - lastRefill
        tokens = minOf(maxTokens.toDouble(), tokens + elapsed * refillRate)
        lastRefill = now
    }
}

// Usage: Max 5 requests per second
val limiter = TokenBucketRateLimiter(maxTokens = 5, refillRate = 5.0 / 1000)

suspend fun makeApiCall() {
    limiter.acquire()  // waits if rate exceeded
    api.call()
}
```

### Sliding Window Implementation

```kotlin
class SlidingWindowRateLimiter(
    private val maxRequests: Int,
    private val windowMs: Long,
) {
    private val timestamps = ArrayDeque<Long>()

    @Synchronized
    fun tryAcquire(): Boolean {
        val now = System.currentTimeMillis()
        // Remove expired timestamps
        while (timestamps.isNotEmpty() && timestamps.first() <= now - windowMs) {
            timestamps.removeFirst()
        }
        return if (timestamps.size < maxRequests) {
            timestamps.addLast(now)
            true
        } else {
            false
        }
    }
}
```

---

## 7. Debounce & Throttle

### Debounce
Wait until input stops for N milliseconds, then execute.

```kotlin
// Flow-based debounce (Kotlin built-in)
searchQuery
    .debounce(300)  // wait 300ms after last emission
    .collect { query -> search(query) }

// Manual implementation
class Debouncer(
    private val delayMs: Long,
    private val scope: CoroutineScope,
) {
    private var job: Job? = null

    fun debounce(action: suspend () -> Unit) {
        job?.cancel()
        job = scope.launch {
            delay(delayMs)
            action()
        }
    }
}

// Timeline:
// T=0    type "h"     → start timer (300ms)
// T=100  type "he"    → cancel timer, start new (300ms)
// T=200  type "hel"   → cancel timer, start new (300ms)
// T=500  (300ms idle) → EXECUTE search("hel")
```

### Throttle
Execute at most once per N milliseconds. Drop intermediate calls.

```kotlin
// First-emission throttle (throttleFirst in RxJava)
fun <T> Flow<T>.throttleFirst(windowMs: Long): Flow<T> = flow {
    var lastEmit = 0L
    collect { value ->
        val now = System.currentTimeMillis()
        if (now - lastEmit >= windowMs) {
            lastEmit = now
            emit(value)
        }
    }
}

// Usage: Prevent double-tap on buttons
buttonClicks
    .throttleFirst(500)  // ignore clicks within 500ms of last click
    .collect { navigateToNext() }

// Timeline:
// T=0    click → EXECUTE (first click always executes)
// T=100  click → IGNORED (within 500ms window)
// T=200  click → IGNORED
// T=600  click → EXECUTE (500ms since last execution)
```

### When to Use Which

```
Debounce:
  - Search autocomplete (wait for user to stop typing)
  - Form validation (validate after user stops editing)
  - Window resize events
  - Scroll-end detection

Throttle:
  - Button click (prevent double-tap)
  - Scroll position tracking (report position every 500ms, not every pixel)
  - API polling (check status at most every 5 seconds)
  - Analytics events (batch, don't spam)
```

---

# Concurrency Patterns

## 8. Thread-Safe Singleton

### Double-Checked Locking (Java/Kotlin)

```kotlin
class ApiClient private constructor() {
    companion object {
        @Volatile  // ensures visibility across threads
        private var instance: ApiClient? = null

        fun getInstance(): ApiClient {
            // First check (no lock — fast path)
            if (instance != null) return instance!!

            // Second check (with lock — slow path, only once)
            synchronized(this) {
                if (instance == null) {
                    instance = ApiClient()
                }
                return instance!!
            }
        }
    }
}

// Kotlin idiomatic (simpler, same safety):
class ApiClient private constructor() {
    companion object {
        val instance: ApiClient by lazy { ApiClient() }
        // lazy is thread-safe by default (LazyThreadSafetyMode.SYNCHRONIZED)
    }
}
```

### Why @Volatile Matters

```
Without @Volatile, the JVM can reorder instructions:

Thread A:
  1. Allocate memory for ApiClient
  2. Assign reference to instance ← instance is non-null but uninitialized!
  3. Initialize ApiClient fields

Thread B:
  4. Check instance != null → true (but object not fully constructed!)
  5. Use instance → CRASH or undefined behavior

@Volatile prevents this reordering:
  Forces writes to be visible to other threads in program order
```

---

## 9. Read-Write Lock

### Problem
Multiple readers can read simultaneously, but writers need exclusive access.

```kotlin
class ThreadSafeCache<K, V> {
    private val map = HashMap<K, V>()
    private val lock = ReentrantReadWriteLock()

    fun get(key: K): V? {
        lock.readLock().lock()
        try {
            return map[key]
        } finally {
            lock.readLock().unlock()
        }
    }

    fun put(key: K, value: V) {
        lock.writeLock().lock()
        try {
            map[key] = value
        } finally {
            lock.writeLock().unlock()
        }
    }

    // Multiple threads can call get() simultaneously
    // Only one thread can call put() at a time
    // put() waits for all get() calls to finish
}
```

---

## 10. CountDownLatch / Barrier

### Problem
Wait for multiple async operations to complete before proceeding.

```kotlin
// Kotlin coroutines equivalent (much simpler):
coroutineScope {
    val profile = async { api.getProfile() }
    val feed = async { api.getFeed() }
    val notifications = async { api.getNotifications() }

    // All three run concurrently
    // awaitAll waits for ALL to complete
    val results = awaitAll(profile, feed, notifications)
    // Now all results are available
}

// With error handling (supervisorScope):
supervisorScope {
    val profile = async { api.getProfile() }
    val feed = async { api.getFeed() }

    val profileResult = runCatching { profile.await() }
    val feedResult = runCatching { feed.await() }

    // One failure doesn't cancel the other
    updateUI(
        profile = profileResult.getOrNull(),
        feed = feedResult.getOrDefault(emptyList()),
    )
}
```

---

## 11. Actor Pattern

### Problem
Serialize access to mutable state without locks.

```kotlin
// Actor: Single coroutine processes messages sequentially
sealed interface CounterMsg {
    data object Increment : CounterMsg
    data object Decrement : CounterMsg
    data class GetCount(val response: CompletableDeferred<Int>) : CounterMsg
}

fun CoroutineScope.counterActor() = actor<CounterMsg> {
    var count = 0
    for (msg in channel) {
        when (msg) {
            CounterMsg.Increment -> count++
            CounterMsg.Decrement -> count--
            is CounterMsg.GetCount -> msg.response.complete(count)
        }
    }
}

// Usage:
val counter = scope.counterActor()
counter.send(CounterMsg.Increment)
counter.send(CounterMsg.Increment)
val result = CompletableDeferred<Int>()
counter.send(CounterMsg.GetCount(result))
println(result.await())  // 2

// No locks needed — all mutations happen in single coroutine
```

---

## 12. Mutex vs Synchronized

```kotlin
// synchronized: Blocks the thread
synchronized(lock) {
    // thread is blocked, cannot be used for other work
    sharedState.update()
}

// Mutex: Suspends the coroutine (thread is free for other coroutines)
val mutex = Mutex()
mutex.withLock {
    // coroutine is suspended, thread can run other coroutines
    sharedState.update()
}

// Rule:
// In coroutines → use Mutex (non-blocking)
// In traditional threading → use synchronized
// NEVER use synchronized inside a coroutine (blocks the dispatcher thread)
```

---

# Android-Specific Patterns

## 13. Event Bus / Observable Pattern

```kotlin
// Modern: SharedFlow as event bus
class EventBus {
    private val _events = MutableSharedFlow<AppEvent>(
        replay = 0,           // don't replay past events
        extraBufferCapacity = 64,
    )
    val events: SharedFlow<AppEvent> = _events.asSharedFlow()

    suspend fun emit(event: AppEvent) {
        _events.emit(event)
    }

    fun tryEmit(event: AppEvent): Boolean {
        return _events.tryEmit(event)
    }
}

sealed interface AppEvent {
    data class UserLoggedIn(val userId: String) : AppEvent
    data class UserLoggedOut(val reason: String) : AppEvent
    data class NetworkStatusChanged(val isConnected: Boolean) : AppEvent
    data class DeepLinkReceived(val uri: String) : AppEvent
}

// Subscribe in ViewModel:
viewModelScope.launch {
    eventBus.events.collect { event ->
        when (event) {
            is AppEvent.UserLoggedOut -> navigateToLogin()
            is AppEvent.NetworkStatusChanged -> updateOfflineBanner(event.isConnected)
            else -> {}
        }
    }
}
```

---

## 14. Pagination State Machine

```kotlin
data class PaginationState<T>(
    val items: List<T> = emptyList(),
    val isLoadingInitial: Boolean = false,
    val isLoadingMore: Boolean = false,
    val error: Throwable? = null,
    val hasMore: Boolean = true,
    val nextCursor: String? = null,
)

sealed interface PaginationAction {
    data object LoadInitial : PaginationAction
    data object LoadMore : PaginationAction
    data object Refresh : PaginationAction
    data object Retry : PaginationAction
}

class PaginatedFeedViewModel(
    private val repository: FeedRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(PaginationState<FeedItem>())
    val state: StateFlow<PaginationState<FeedItem>> = _state.asStateFlow()

    fun dispatch(action: PaginationAction) {
        when (action) {
            PaginationAction.LoadInitial -> loadInitial()
            PaginationAction.LoadMore -> loadMore()
            PaginationAction.Refresh -> refresh()
            PaginationAction.Retry -> retry()
        }
    }

    private fun loadInitial() {
        if (_state.value.isLoadingInitial) return
        viewModelScope.launch {
            _state.update { it.copy(isLoadingInitial = true, error = null) }
            repository.getFeed(cursor = null)
                .onSuccess { response ->
                    _state.update {
                        it.copy(
                            items = response.items,
                            isLoadingInitial = false,
                            hasMore = response.nextCursor != null,
                            nextCursor = response.nextCursor,
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(isLoadingInitial = false, error = e) }
                }
        }
    }

    private fun loadMore() {
        val current = _state.value
        if (current.isLoadingMore || !current.hasMore) return
        viewModelScope.launch {
            _state.update { it.copy(isLoadingMore = true) }
            repository.getFeed(cursor = current.nextCursor)
                .onSuccess { response ->
                    _state.update {
                        it.copy(
                            items = it.items + response.items,
                            isLoadingMore = false,
                            hasMore = response.nextCursor != null,
                            nextCursor = response.nextCursor,
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(isLoadingMore = false, error = e) }
                }
        }
    }

    private fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingInitial = true, error = null) }
            repository.getFeed(cursor = null)
                .onSuccess { response ->
                    _state.update {
                        PaginationState(
                            items = response.items,
                            hasMore = response.nextCursor != null,
                            nextCursor = response.nextCursor,
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(isLoadingInitial = false, error = e) }
                }
        }
    }

    private fun retry() {
        if (_state.value.items.isEmpty()) loadInitial() else loadMore()
    }
}
```

---

## 15. Retry with Exponential Backoff

```kotlin
suspend fun <T> retryWithBackoff(
    maxRetries: Int = 3,
    initialDelay: Long = 1000,
    maxDelay: Long = 30_000,
    factor: Double = 2.0,
    retryOn: (Throwable) -> Boolean = { it is IOException },
    block: suspend () -> T,
): T {
    var currentDelay = initialDelay
    repeat(maxRetries) { attempt ->
        try {
            return block()
        } catch (e: Throwable) {
            if (attempt == maxRetries - 1 || !retryOn(e)) throw e

            val jitter = (0..(currentDelay / 4)).random()
            delay(currentDelay + jitter)
            currentDelay = minOf((currentDelay * factor).toLong(), maxDelay)
        }
    }
    throw IllegalStateException("Unreachable")
}

// Usage:
val response = retryWithBackoff(
    maxRetries = 3,
    retryOn = { it is IOException || (it is HttpException && it.code() >= 500) },
) {
    api.getFeed()
}
```

---

## 16. Image Downsampling

```kotlin
fun decodeSampledBitmap(
    filePath: String,
    reqWidth: Int,
    reqHeight: Int,
): Bitmap {
    // Step 1: Read dimensions only (no pixel allocation)
    val options = BitmapFactory.Options().apply {
        inJustDecodeBounds = true
    }
    BitmapFactory.decodeFile(filePath, options)

    // Step 2: Calculate optimal sample size
    options.inSampleSize = calculateInSampleSize(options, reqWidth, reqHeight)

    // Step 3: Decode with downsampling
    options.inJustDecodeBounds = false
    return BitmapFactory.decodeFile(filePath, options)
}

fun calculateInSampleSize(
    options: BitmapFactory.Options,
    reqWidth: Int,
    reqHeight: Int,
): Int {
    val (height, width) = options.outHeight to options.outWidth
    var inSampleSize = 1

    if (height > reqHeight || width > reqWidth) {
        val halfHeight = height / 2
        val halfWidth = width / 2

        while (halfHeight / inSampleSize >= reqHeight &&
            halfWidth / inSampleSize >= reqWidth) {
            inSampleSize *= 2  // must be power of 2
        }
    }
    return inSampleSize
}

// Example:
// Original: 4000x3000 (48MB in ARGB_8888)
// Required: 400x300
// inSampleSize = 8 (4000/8 = 500, close to 400)
// Result: 500x375 (750KB — 64x smaller!)
```

---

## 17. Diff Algorithm

### How DiffUtil Works

```kotlin
// DiffUtil uses Eugene Myers' diff algorithm
// Time: O(N + D²) where D = number of edits, N = list size
// Space: O(N)

// For ListAdapter / LazyColumn:
class FeedDiffCallback : DiffUtil.ItemCallback<FeedItem>() {
    // Called first: Are these the same item? (check IDs)
    override fun areItemsTheSame(old: FeedItem, new: FeedItem): Boolean =
        old.id == new.id

    // Called if areItemsTheSame is true: Has the content changed?
    override fun areContentsTheSame(old: FeedItem, new: FeedItem): Boolean =
        old == new  // data class equals

    // Optional: What specifically changed? (for partial rebind)
    override fun getChangePayload(old: FeedItem, new: FeedItem): Any? {
        val changes = mutableSetOf<String>()
        if (old.likeCount != new.likeCount) changes.add("likes")
        if (old.commentCount != new.commentCount) changes.add("comments")
        return changes.ifEmpty { null }
    }
}

// In ViewHolder, handle partial updates:
override fun onBindViewHolder(holder: VH, position: Int, payloads: List<Any>) {
    if (payloads.isEmpty()) {
        onBindViewHolder(holder, position)  // full bind
    } else {
        val changes = payloads.first() as Set<String>
        if ("likes" in changes) holder.updateLikes(getItem(position).likeCount)
        if ("comments" in changes) holder.updateComments(getItem(position).commentCount)
    }
}
```

---

## 18. State Reducer Pattern

```kotlin
// Pure function: (currentState, action) → newState
fun reduce(state: FeedState, action: FeedAction): FeedState = when (action) {
    is FeedAction.Loading ->
        state.copy(isLoading = true, error = null)

    is FeedAction.Loaded ->
        state.copy(isLoading = false, items = action.items)

    is FeedAction.Error ->
        state.copy(isLoading = false, error = action.message)

    is FeedAction.LikeToggled -> {
        val updated = state.items.map { item ->
            if (item.id == action.itemId) item.copy(isLiked = !item.isLiked)
            else item
        }
        state.copy(items = updated)
    }

    is FeedAction.ItemRemoved ->
        state.copy(items = state.items.filter { it.id != action.itemId })
}

// Benefits:
// 1. Pure function — easy to test (no mocking needed)
// 2. Predictable — same input always produces same output
// 3. Time-travel debugging — replay actions to reproduce any state
// 4. Centralized state changes — no scattered mutations
```

---

# Classic Problems (Android Context)

## 19. Two Sum / HashMap Patterns

```kotlin
// Classic: Find two numbers that sum to target
fun twoSum(nums: IntArray, target: Int): IntArray {
    val seen = HashMap<Int, Int>()  // value → index
    for ((i, num) in nums.withIndex()) {
        val complement = target - num
        seen[complement]?.let { return intArrayOf(it, i) }
        seen[num] = i
    }
    throw IllegalArgumentException("No solution")
}

// Android context: Find duplicate entries in feed
fun findDuplicateStories(feed: List<FeedItem>): List<Pair<FeedItem, FeedItem>> {
    val seen = HashMap<String, FeedItem>()  // transaction_id → item
    val duplicates = mutableListOf<Pair<FeedItem, FeedItem>>()
    for (item in feed) {
        val existing = seen[item.transactionId]
        if (existing != null) {
            duplicates.add(existing to item)
        } else {
            seen[item.transactionId] = item
        }
    }
    return duplicates
}
```

---

## 20. Merge K Sorted Lists

### Problem
Merge feeds from multiple sources (friends feed, public feed, promoted) into one sorted stream.

```kotlin
fun mergeKSortedFeeds(feeds: List<List<FeedItem>>): List<FeedItem> {
    // Min-heap ordered by timestamp (newest first)
    val heap = PriorityQueue<IndexedFeedItem>(
        compareByDescending { it.item.timestamp }
    )

    // Initialize: Add first item from each feed
    for ((feedIndex, feed) in feeds.withIndex()) {
        if (feed.isNotEmpty()) {
            heap.add(IndexedFeedItem(feed[0], feedIndex, 0))
        }
    }

    val merged = mutableListOf<FeedItem>()
    while (heap.isNotEmpty()) {
        val (item, feedIndex, itemIndex) = heap.poll()
        merged.add(item)

        // Add next item from same feed
        val nextIndex = itemIndex + 1
        if (nextIndex < feeds[feedIndex].size) {
            heap.add(IndexedFeedItem(feeds[feedIndex][nextIndex], feedIndex, nextIndex))
        }
    }
    return merged
}

data class IndexedFeedItem(
    val item: FeedItem,
    val feedIndex: Int,
    val itemIndex: Int,
)

// Complexity: O(N log K) where N = total items, K = number of feeds
```

---

## 21. Serialize/Deserialize Tree (Parcelable)

```kotlin
// Custom tree structure that needs to survive process death
@Parcelize
data class CommentTree(
    val comment: Comment,
    val replies: List<CommentTree>,
) : Parcelable

// Flatten tree for RecyclerView display
fun CommentTree.flatten(depth: Int = 0): List<FlatComment> {
    val result = mutableListOf<FlatComment>()
    result.add(FlatComment(comment, depth))
    for (reply in replies) {
        result.addAll(reply.flatten(depth + 1))
    }
    return result
}

data class FlatComment(val comment: Comment, val depth: Int)

// Usage in RecyclerView:
// depth determines left padding/indentation
// This is how Reddit renders nested comments
```

---

## 22. Topological Sort (Build Dependencies)

```kotlin
// Problem: Determine initialization order for modules with dependencies
fun initOrder(modules: Map<String, List<String>>): List<String> {
    val inDegree = HashMap<String, Int>()
    val graph = HashMap<String, MutableList<String>>()

    for ((module, deps) in modules) {
        inDegree.getOrPut(module) { 0 }
        graph.getOrPut(module) { mutableListOf() }
        for (dep in deps) {
            graph.getOrPut(dep) { mutableListOf() }.add(module)
            inDegree[module] = (inDegree[module] ?: 0) + 1
        }
    }

    val queue: Queue<String> = LinkedList()
    for ((node, degree) in inDegree) {
        if (degree == 0) queue.add(node)
    }

    val order = mutableListOf<String>()
    while (queue.isNotEmpty()) {
        val node = queue.poll()
        order.add(node)
        for (neighbor in graph[node].orEmpty()) {
            inDegree[neighbor] = inDegree[neighbor]!! - 1
            if (inDegree[neighbor] == 0) queue.add(neighbor)
        }
    }

    if (order.size != inDegree.size) throw IllegalStateException("Circular dependency!")
    return order
}

// Android context: Module initialization order
val modules = mapOf(
    "Analytics" to listOf("Crashlytics"),      // Analytics depends on Crashlytics
    "FeatureFlags" to listOf("Network"),        // FeatureFlags depends on Network
    "Feed" to listOf("Network", "Analytics"),   // Feed depends on both
    "Network" to emptyList(),                    // Network has no dependencies
    "Crashlytics" to emptyList(),
)
// Result: [Network, Crashlytics, Analytics, FeatureFlags, Feed]
```

---

## 23. Sliding Window (Analytics Aggregation)

```kotlin
// Calculate rolling average of API response times
class SlidingWindowAverage(private val windowSize: Int) {
    private val window = ArrayDeque<Double>()
    private var sum = 0.0

    fun add(value: Double): Double {
        window.addLast(value)
        sum += value
        if (window.size > windowSize) {
            sum -= window.removeFirst()
        }
        return sum / window.size
    }
}

// Usage: Track API latency trends
val latencyTracker = SlidingWindowAverage(windowSize = 100)
// Each API call:
val avgLatency = latencyTracker.add(responseTimeMs)
if (avgLatency > 500) {
    // Alert: API is slow, consider degraded mode
}

// Maximum in sliding window (useful for detecting spikes)
class SlidingWindowMax(private val windowSize: Int) {
    private val window = ArrayDeque<Double>()
    private val maxDeque = ArrayDeque<Double>()  // monotonic decreasing

    fun add(value: Double): Double {
        window.addLast(value)
        while (maxDeque.isNotEmpty() && maxDeque.last() < value) {
            maxDeque.removeLast()
        }
        maxDeque.addLast(value)

        if (window.size > windowSize) {
            val removed = window.removeFirst()
            if (maxDeque.first() == removed) {
                maxDeque.removeFirst()
            }
        }
        return maxDeque.first()
    }
}
```

---

## 24. Graph BFS/DFS (Navigation Graph)

```kotlin
// Find shortest navigation path between two screens
fun findShortestPath(
    graph: Map<String, List<String>>,
    start: String,
    end: String,
): List<String>? {
    if (start == end) return listOf(start)

    val queue: Queue<String> = LinkedList()
    val visited = HashSet<String>()
    val parent = HashMap<String, String>()

    queue.add(start)
    visited.add(start)

    while (queue.isNotEmpty()) {
        val current = queue.poll()
        for (neighbor in graph[current].orEmpty()) {
            if (neighbor !in visited) {
                visited.add(neighbor)
                parent[neighbor] = current
                if (neighbor == end) {
                    // Reconstruct path
                    val path = mutableListOf(end)
                    var node = end
                    while (node != start) {
                        node = parent[node]!!
                        path.add(0, node)
                    }
                    return path
                }
                queue.add(neighbor)
            }
        }
    }
    return null  // no path found
}

// Android context: Deep link resolution
// "venmo://feed/story/123" → which screens to push on the back stack?
// Feed → StoryDetail (shortest path)
```

---

## 25. String Matching (Mention/Hashtag Parsing)

```kotlin
// Parse @mentions and #hashtags from text (like Venmo comments)
data class TextSegment(
    val text: String,
    val type: SegmentType,
    val metadata: String? = null,
)

enum class SegmentType { PLAIN, MENTION, HASHTAG, EMOJI, LINK }

fun parseRichText(input: String): List<TextSegment> {
    val segments = mutableListOf<TextSegment>()
    val pattern = Regex("(@[A-Za-z0-9_.]+)|(#[A-Za-z0-9_]+)|(https?://\\S+)")

    var lastEnd = 0
    for (match in pattern.findAll(input)) {
        // Add plain text before this match
        if (match.range.first > lastEnd) {
            segments.add(TextSegment(
                text = input.substring(lastEnd, match.range.first),
                type = SegmentType.PLAIN,
            ))
        }

        // Add the match
        val text = match.value
        val type = when {
            text.startsWith("@") -> SegmentType.MENTION
            text.startsWith("#") -> SegmentType.HASHTAG
            text.startsWith("http") -> SegmentType.LINK
            else -> SegmentType.PLAIN
        }
        segments.add(TextSegment(text = text, type = type, metadata = text.drop(1)))
        lastEnd = match.range.last + 1
    }

    // Add remaining plain text
    if (lastEnd < input.length) {
        segments.add(TextSegment(
            text = input.substring(lastEnd),
            type = SegmentType.PLAIN,
        ))
    }
    return segments
}

// Render in Compose:
@Composable
fun RichText(segments: List<TextSegment>, onMentionClick: (String) -> Unit) {
    val annotatedString = buildAnnotatedString {
        for (segment in segments) {
            when (segment.type) {
                SegmentType.MENTION -> {
                    pushStringAnnotation("mention", segment.metadata!!)
                    withStyle(SpanStyle(color = Color.Blue, fontWeight = FontWeight.Bold)) {
                        append(segment.text)
                    }
                    pop()
                }
                SegmentType.HASHTAG -> {
                    withStyle(SpanStyle(color = Color.Blue)) {
                        append(segment.text)
                    }
                }
                else -> append(segment.text)
            }
        }
    }

    ClickableText(text = annotatedString) { offset ->
        annotatedString.getStringAnnotations("mention", offset, offset)
            .firstOrNull()?.let { onMentionClick(it.item) }
    }
}
```

---

## 26. Interval Scheduling (Calendar/Booking)

```kotlin
// Find overlapping meetings (calendar app)
data class Meeting(val start: Int, val end: Int, val title: String)

fun findOverlaps(meetings: List<Meeting>): List<Pair<Meeting, Meeting>> {
    val sorted = meetings.sortedBy { it.start }
    val overlaps = mutableListOf<Pair<Meeting, Meeting>>()

    for (i in sorted.indices) {
        for (j in i + 1 until sorted.size) {
            if (sorted[j].start < sorted[i].end) {
                overlaps.add(sorted[i] to sorted[j])
            } else break  // no more overlaps possible (sorted)
        }
    }
    return overlaps
}

// Minimum meeting rooms needed (interval partitioning)
fun minRooms(meetings: List<Meeting>): Int {
    val events = mutableListOf<Pair<Int, Int>>()
    for (m in meetings) {
        events.add(m.start to 1)   // meeting starts
        events.add(m.end to -1)    // meeting ends
    }
    events.sortWith(compareBy({ it.first }, { it.second }))

    var rooms = 0
    var maxRooms = 0
    for ((_, delta) in events) {
        rooms += delta
        maxRooms = maxOf(maxRooms, rooms)
    }
    return maxRooms
}

// Android context: Airbnb availability check
// Given booked intervals, find if a new booking overlaps
fun isAvailable(bookings: List<Meeting>, newBooking: Meeting): Boolean {
    return bookings.none { existing ->
        newBooking.start < existing.end && newBooking.end > existing.start
    }
}
```

---

# Behavioral & System Design Coding

## 27. Design a Feed

```
Requirements clarification:
  - What content types? (text, image, video, ads)
  - Pagination? (cursor vs offset)
  - Real-time updates? (new posts while viewing)
  - Offline support?
  - Sorting? (chronological vs ranked)

Architecture:
  UI (Compose LazyColumn)
    └── FeedViewModel
        ├── StateFlow<PagingData<FeedItem>>
        ├── Handles: load, refresh, like, comment
        └── FeedRepository
            ├── RemoteMediator (network → Room)
            ├── PagingSource (Room → UI)
            └── FeedApi (Retrofit)

Key decisions:
  1. RemoteMediator for offline + pagination
  2. Cursor-based pagination (server-ranked)
  3. Optimistic likes (similar to Venmo)
  4. Pull-to-refresh invalidates RemoteMediator
  5. New posts: Banner "New posts available" (don't auto-scroll)
```

## 28. Design an Image Loader

```
Requirements:
  - Load images from URL
  - Memory cache (LRU) + disk cache
  - Placeholder + error images
  - Cancel on view recycled
  - Thread-safe

Architecture:
  ImageLoader
    ├── MemoryCache (LRU, bitmap key = url + size + transforms)
    ├── DiskCache (DiskLruCache, raw bytes)
    ├── NetworkFetcher (OkHttp, streaming download)
    ├── Decoder (BitmapFactory with inSampleSize)
    ├── TransformationPipeline (resize, crop, round corners)
    └── RequestManager (lifecycle-aware, cancel on destroy)

Request flow:
  1. Check MemoryCache → HIT → return Bitmap (main thread, instant)
  2. Check DiskCache → HIT → decode → MemoryCache → return (background thread)
  3. Network fetch → DiskCache → decode → MemoryCache → return (background thread)

Cancellation:
  - Each request has a Job (coroutine)
  - View recycled → cancel Job → cancel OkHttp call
  - Prevents wasted bandwidth and wrong images in RecyclerView
```

## 29. Design a Chat System

```
Architecture:
  UI (Compose)
    └── ChatViewModel
        ├── messages: StateFlow<List<Message>> (Room + WebSocket merge)
        ├── sendMessage(text) → optimistic insert + WebSocket send
        ├── loadHistory(cursor) → API call → Room insert
        └── ChatRepository
            ├── WebSocketManager (real-time messages)
            ├── MessageDao (Room, local persistence)
            ├── ChatApi (history, media upload)
            └── OfflineQueue (pending messages)

Key decisions:
  1. Room is source of truth (offline-first)
  2. WebSocket for real-time (FCM push as fallback)
  3. Optimistic send (show immediately, sync later)
  4. Bidirectional pagination (scroll up for history)
  5. Media: Upload separately, send URL in message
  6. Read receipts: Batch (don't send per-message in group)
  7. Typing indicators: Debounced, 10s timeout
```

## 30. Design an Analytics SDK

```
Architecture:
  App Code
    └── Analytics.track(event, properties)
        └── AnalyticsManager
            ├── EventQueue (Channel, bounded)
            ├── BatchProcessor (collects N events or T seconds)
            ├── PersistenceLayer (Room, survive crashes)
            ├── NetworkUploader (POST /events batch)
            └── ConfigManager (sampling rate, enabled events)

Key decisions:
  1. Write-behind: Events queued, batched, sent periodically
  2. Persistence: Events written to Room immediately (survive crash)
  3. Batching: Send every 30 seconds OR when 50 events accumulated
  4. Retry: Exponential backoff on failure, max 3 retries
  5. Sampling: Not all events sent (1% of high-volume events)
  6. Privacy: No PII in events, user can opt out
  7. Battery: Use WorkManager with CONNECTED + NOT_LOW_BATTERY constraints
  8. Size: SDK < 100KB, minimal dependencies

Flush triggers:
  - Timer (every 30s)
  - Batch size (50 events)
  - App backgrounded (flush immediately)
  - Critical events (payment, crash) flush immediately
```

---

## Quick Reference: Complexity Cheat Sheet

```
┌───────────────────────┬──────────┬──────────┬───────┐
│ Data Structure        │ Access   │ Search   │ Insert│
├───────────────────────┼──────────┼──────────┼───────┤
│ Array                 │ O(1)     │ O(n)     │ O(n)  │
│ HashMap               │ O(1)*    │ O(1)*    │ O(1)* │
│ Binary Search Tree    │ O(log n) │ O(log n) │O(log n)│
│ Heap                  │ O(1) top │ O(n)     │O(log n)│
│ Trie                  │ O(L)     │ O(L)     │ O(L)  │
│ LinkedList            │ O(n)     │ O(n)     │ O(1)  │
│ LRU Cache             │ O(1)     │ O(1)     │ O(1)  │
└───────────────────────┴──────────┴──────────┴───────┘
* amortized, worst case O(n) due to hash collisions

┌───────────────────────┬──────────┬───────────┐
│ Algorithm             │ Time     │ Space     │
├───────────────────────┼──────────┼───────────┤
│ Binary Search         │ O(log n) │ O(1)      │
│ BFS/DFS               │ O(V + E) │ O(V)      │
│ Topological Sort      │ O(V + E) │ O(V)      │
│ Merge Sort            │O(n log n)│ O(n)      │
│ Quick Sort            │O(n log n)│ O(log n)  │
│ Dijkstra              │O(E log V)│ O(V)      │
│ DiffUtil (Myers)      │ O(N+D²)  │ O(N)      │
│ Merge K Sorted        │O(N log K)│ O(K)      │
└───────────────────────┴──────────┴───────────┘
```
