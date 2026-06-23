---
title: "Caching & Sync Patterns"
weight: 11
---


# Caching & Sync Patterns

> [!NOTE]
> **20 patterns, 4 case studies.** Each pattern includes concept, how it works, when to use it, tradeoffs, real-world examples, and how to discuss it in an interview.

---

## Table of Contents

1. [Optimistic Updates](#1-optimistic-updates)
2. [Pessimistic Updates](#2-pessimistic-updates)
3. [Cache-Aside (Lazy Loading)](#3-cache-aside-lazy-loading)
4. [Read-Through Cache](#4-read-through-cache)
5. [Write-Through Cache](#5-write-through-cache)
6. [Write-Behind (Write-Back) Cache](#6-write-behind-write-back-cache)
7. [Store Sync / Single Source of Truth](#7-store-sync--single-source-of-truth)
8. [Event Sourcing](#8-event-sourcing)
9. [CQRS (Command Query Responsibility Segregation)](#9-cqrs)
10. [Conflict Resolution Strategies](#10-conflict-resolution-strategies)
11. [Cache Invalidation Strategies](#11-cache-invalidation-strategies)
12. [Offline-First Architecture](#12-offline-first-architecture)
13. [Pagination & Incremental Loading](#13-pagination--incremental-loading)
14. [Pub/Sub & Reactive Streams](#14-pubsub--reactive-streams)
15. [Circuit Breaker Pattern](#15-circuit-breaker-pattern)
16. [Retry with Exponential Backoff](#16-retry-with-exponential-backoff)
17. [Idempotency](#17-idempotency)
18. [Distributed Caching](#18-distributed-caching)
19. [Consistency Models](#19-consistency-models)
20. [Real-World Case Studies](#20-real-world-case-studies)

---

## 1. Optimistic Updates

### Concept
Update the UI immediately before the server confirms. Assume success; roll back on failure.

### How It Works

```
Step 1: User taps "Post Comment"
Step 2: Generate a temporary local ID (e.g., "temp_uuid_abc123")
Step 3: Insert comment into local state immediately → UI updates instantly
Step 4: Send POST request to server asynchronously
Step 5a (Success): Server returns real comment with server ID
        → Replace temp comment with server version
        → Remove temp ID from pending set
Step 5b (Failure): Server returns error
        → Remove temp comment from local state
        → Remove temp ID from pending set
        → Optionally show error toast
```

### Visual Flow

```
Timeline:
  0ms    User taps send
  1ms    Local state updated, UI shows comment ← user sees this immediately
  ...    Network request in flight
  300ms  Server responds SUCCESS
         → temp swapped for real, user doesn't notice
  OR
  300ms  Server responds FAILURE
         → comment disappears, user sees error
```

### The Pending Guard Problem

When you have optimistic updates AND a store that syncs from the server, they can conflict:

```
Problem without guard:
  T=0ms    User posts comment, temp inserted locally
  T=50ms   Store refreshes from server (doesn't have new comment yet)
           → Store sync OVERWRITES local state → temp comment DISAPPEARS
  T=300ms  Server confirms... but temp is already gone

Solution (pendingCommentIds):
  T=0ms    User posts comment, temp inserted, ID added to pendingIds
  T=50ms   Store refreshes → pendingIds is non-empty → SKIP store merge
  T=300ms  Server confirms → swap temp → remove from pendingIds
  T=350ms  Next store refresh → pendingIds empty → merge normally
```

### When to Use
- Non-critical writes where rollback is acceptable
- Social features: likes, comments, reactions, follows
- UI where perceived speed matters more than guaranteed consistency
- Actions that almost always succeed (>99% success rate)

### When NOT to Use
- Financial transactions (money transfer, payment)
- Destructive operations (delete account, remove data)
- Operations that depend on server-side validation (stock trading, auction bidding)
- When rollback would confuse the user (e.g., "you sent $500" then "actually no")

### Tradeoffs

| Pro | Con |
|-----|-----|
| Instant UI feedback | Complex rollback logic |
| Better perceived performance | Risk of showing false state |
| Works well on slow networks | Need temp ID management |
| Reduces perceived latency | Merge conflicts with store sync |

### Real-World Examples
- **Instagram/Twitter**: Likes appear instantly, reverted silently on failure
- **Slack**: Messages appear immediately with a subtle "sending" indicator
- **Venmo Feed** (this codebase): Comments use optimistic insert with pending ID guard
- **Gmail**: "Undo Send" — the email appears sent immediately but is actually queued

### Interview Talking Points
- "I'd use optimistic updates here because the success rate is >99% and perceived speed is critical for user engagement"
- "The key challenge is coordinating optimistic state with a centralized store — I'd use a pending set to guard against premature overwrites"
- "For rollback, I'd remove the item and show a non-intrusive error, like a snackbar with retry"

---

## 2. Pessimistic Updates

### Concept
Wait for server confirmation before updating the UI. Show a loading state while waiting.

### How It Works

```
Step 1: User taps "Transfer $500"
Step 2: Show loading spinner / disable button
Step 3: Send POST request to server
Step 4a (Success): Server confirms → Update UI → Show success
Step 4b (Failure): Server rejects → Show error → UI unchanged
```

### When to Use
- Financial transactions
- Irreversible actions (delete, send money, submit order)
- Operations requiring server-side validation
- When data integrity > perceived performance

### Tradeoffs

| Pro | Con |
|-----|-----|
| No rollback needed | Slower perceived UX |
| Simpler implementation | Loading states required |
| User sees truth only | Feels sluggish on slow networks |
| Safer for critical ops | Button/form disabling complexity |

### Real-World Examples
- **Venmo/PayPal**: Payment confirmation waits for server
- **Amazon**: "Place Order" shows processing before confirmation
- **Banks**: Wire transfer shows pending until confirmed

### Interview Talking Points
- "For money movement, I'd never use optimistic updates — the risk of showing a false success is too high"
- "I'd pair this with idempotency tokens to prevent double-submission if the user retries"

---

## 3. Cache-Aside (Lazy Loading)

### Concept
Application checks the cache first. On miss, fetches from the data source, populates the cache, then returns.

### How It Works

```
Read path:
  App → Check Cache → HIT → Return cached data
                    → MISS → Query Database/API
                           → Store result in cache
                           → Return data

Write path (cache-aside does NOT handle writes):
  App → Write to Database → Invalidate cache entry
```

### Pseudocode

```kotlin
fun getUserProfile(userId: String): UserProfile {
    // 1. Check cache
    val cached = cache.get("user:$userId")
    if (cached != null) return cached

    // 2. Cache miss — fetch from source
    val profile = database.query("SELECT * FROM users WHERE id = ?", userId)

    // 3. Populate cache with TTL
    cache.set("user:$userId", profile, ttl = 5.minutes)

    return profile
}

fun updateUserProfile(userId: String, update: ProfileUpdate) {
    // Write directly to DB
    database.update("users", userId, update)
    // Invalidate cache so next read fetches fresh
    cache.delete("user:$userId")
}
```

### When to Use
- Read-heavy workloads (read:write ratio > 10:1)
- Data that can tolerate some staleness
- When you want explicit control over what gets cached

### When NOT to Use
- Write-heavy workloads (cache constantly invalidated)
- When strong consistency is required
- When cache stampede is a concern (many concurrent misses)

### Tradeoffs

| Pro | Con |
|-----|-----|
| Simple to implement | First request always slow (cold miss) |
| Only caches what's actually read | Stale data possible between write and invalidation |
| App controls caching logic | Cache stampede risk on popular keys |
| Works with any data store | N+1 cache miss problem with lists |

### Cache Stampede Problem

```
Scenario: Cache entry for popular item expires
  T=0    100 concurrent requests arrive
         All see MISS → all hit database simultaneously
         Database overwhelmed

Solutions:
  1. Locking: First request acquires lock, others wait
  2. Probabilistic early expiration: Refresh before TTL expires
  3. Background refresh: Never let the cache go empty
```

### Real-World Examples
- **CDN caching**: Web pages cached at edge, origin hit on miss
- **Mobile apps**: User profile cached locally, refreshed on app launch
- **API gateways**: Response caching with TTL

---

## 4. Read-Through Cache

### Concept
The cache itself is responsible for loading data on a miss. The application only talks to the cache, never directly to the data source.

### How It Works

```
App → Cache.get(key) → HIT → Return
                     → MISS → Cache fetches from DB internally
                             → Cache stores it
                             → Cache returns to app
```

### Difference from Cache-Aside
- **Cache-Aside**: App fetches from DB on miss, then populates cache
- **Read-Through**: Cache fetches from DB on miss automatically

```
Cache-Aside:     App → Cache (miss) → App → DB → App → Cache.set()
Read-Through:    App → Cache (miss) → Cache → DB → Cache.set() → App
```

### When to Use
- When you want to decouple the app from the data loading logic
- When multiple services share the same cache with consistent loading behavior
- When you want the cache layer to manage retries, timeouts, and fallbacks

### Tradeoffs

| Pro | Con |
|-----|-----|
| Simpler app code | Cache layer more complex |
| Consistent loading behavior | Less flexibility per-caller |
| Single place for retry/fallback logic | Harder to debug cache internals |

---

## 5. Write-Through Cache

### Concept
Every write goes to both the cache AND the data store synchronously. The write is only confirmed when both succeed.

### How It Works

```
Write path:
  App → Cache.set(key, value) → Cache writes to DB synchronously
                               → Both succeed → Return success
                               → Either fails → Return failure

Read path:
  App → Cache.get(key) → Always a HIT (because writes always update cache)
```

### When to Use
- When you need strong consistency between cache and store
- Settings, configuration, user preferences
- When reads are frequent and writes are infrequent
- When you can tolerate slightly slower writes

### Tradeoffs

| Pro | Con |
|-----|-----|
| Cache always consistent | Higher write latency (2 writes) |
| No stale reads | Write throughput limited |
| Simple mental model | Over-caches rarely-read data |

### Real-World Examples
- **User settings**: Write to cache + DB on save, always read from cache
- **Feature flags**: Updated rarely, read on every request
- **Session stores**: Session data written through to persistent store

---

## 6. Write-Behind (Write-Back) Cache

### Concept
Writes go to the cache immediately. The cache asynchronously flushes to the data store later, often in batches.

### How It Works

```
Write path:
  App → Cache.set(key, value) → Return success immediately
                               → Background: batch flush to DB every N seconds

Read path:
  App → Cache.get(key) → Return (cache is the primary store)
```

### Batching Example

```
T=0ms    Write A → cache updated, queued for flush
T=50ms   Write B → cache updated, queued for flush
T=100ms  Write C → cache updated, queued for flush
T=5000ms Flush timer fires → Batch write {A, B, C} to DB in single transaction
```

### When to Use
- Write-heavy workloads (analytics, counters, logs)
- When write latency matters more than durability
- When you can tolerate some data loss on crash
- When batching writes improves backend throughput

### When NOT to Use
- Financial data (risk of data loss)
- When you need immediate read-after-write consistency from another service
- When the data store must be the source of truth at all times

### Tradeoffs

| Pro | Con |
|-----|-----|
| Extremely fast writes | Data loss risk on crash |
| Reduces DB load via batching | Complex recovery logic |
| Great for high-throughput writes | Inconsistency window between cache and DB |
| Smooths write spikes | Harder to debug |

### Real-World Examples
- **Analytics event batching**: Buffer events in memory, flush every 30s
- **Venmo feed**: Reaction counts might batch-update to reduce API calls
- **Gaming**: Player state saved periodically, not on every action
- **OS file systems**: Write-back page cache in Linux

---

## 7. Store Sync / Single Source of Truth

### Concept
One centralized data store acts as the canonical source. All UI components subscribe to this store and stay in sync reactively.

### How It Works (Android/Kotlin example)

```
                        ┌──────────────┐
                        │  Feed Store  │ ← Single source of truth
                        │ (StateFlow)  │
                        └──────┬───────┘
                               │ emits updates
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              Card VM 1   Card VM 2   Card VM 3
              (collects)  (collects)  (collects)
                    │          │          │
                    ▼          ▼          ▼
                 Card UI   Card UI   Card UI
```

### The Merge Problem

When a ViewModel has local state (optimistic updates) AND subscribes to the store:

```kotlin
// Store emits new data
storyService.entries.collect { storeComments ->
    // Problem: store doesn't have our optimistic comment yet
    // If we blindly replace, we lose the temp comment

    // Solution: merge
    val storeIds = storeComments.map { it.id }.toSet()
    val localOnly = _comments.value.filter { it.id !in storeIds }
    _comments.value = (storeComments + localOnly).sortedByDescending { it.createdAt }
}
```

### When to Use
- Multiple screens showing the same data
- Real-time or near-real-time updates
- When consistency across the UI is critical

### Tradeoffs

| Pro | Con |
|-----|-----|
| UI always consistent | Complex merge logic |
| Single place to update data | Subscription management overhead |
| Natural for reactive frameworks | Memory usage (keeping all data in store) |
| Easy to add new subscribers | Potential for update storms |

### Architecture Patterns

```
Unidirectional Data Flow (Redux/MVI style):
  Action → Reducer → Store → UI → Action → ...

Reactive Streams (Kotlin Flow / RxJava / Combine):
  Store (StateFlow) → ViewModel (collect) → UI (Compose State)

Key principle: data flows DOWN, events flow UP
```

### Real-World Examples
- **Redux** (React): Single store, reducers, selectors
- **Kotlin Flow + StateFlow** (Android): This codebase's pattern
- **SwiftUI + Combine** (iOS): @Published properties in ObservableObjects
- **Vuex/Pinia** (Vue): Centralized state management

---

## 8. Event Sourcing

### Concept
Instead of storing current state, store a log of all events (state changes). Current state is derived by replaying events.

### How It Works

```
Traditional (State-based):
  Database stores: { balance: 150 }
  Update: SET balance = 150

Event Sourcing:
  Event log stores:
    1. AccountCreated { balance: 0 }
    2. Deposited { amount: 200 }
    3. Withdrew { amount: 50 }
  Current state = replay(events) → { balance: 150 }
```

### Why This Matters

```
With state-based: "Why is the balance 150?" → No idea, we only have current state
With event sourcing: "Why is the balance 150?" → Created at 0, deposited 200, withdrew 50
```

### Snapshots (Performance Optimization)

```
Problem: Replaying 1 million events on every read is slow

Solution: Periodic snapshots
  Event 1 → Event 2 → ... → Event 10000 → SNAPSHOT { balance: 5000 }
  → Event 10001 → Event 10002 → ...

  To rebuild: Load snapshot + replay events after snapshot
```

### When to Use
- Audit trails required (finance, healthcare, legal)
- Undo/redo functionality
- Debugging: reproduce exact state at any point in time
- Collaborative editing

### When NOT to Use
- Simple CRUD apps (massive overkill)
- When storage cost is a concern
- When the event schema changes frequently (migration pain)

### Tradeoffs

| Pro | Con |
|-----|-----|
| Complete audit trail | Storage grows unbounded |
| Natural undo/redo | Complex to query current state |
| Debug any historical state | Event schema evolution is hard |
| Append-only = fast writes | Eventually consistent reads |

### Real-World Examples
- **Git**: Commits are events, working tree is derived state
- **Bank ledgers**: Every transaction recorded, balance derived
- **Google Docs**: Operations log enables collaborative editing and version history
- **Kafka**: Distributed event log used as backbone for event sourcing

---

## 9. CQRS (Command Query Responsibility Segregation)

### Concept
Separate the read model (queries) from the write model (commands). They can use different data stores, schemas, and scaling strategies.

### How It Works

```
Traditional:
  App → Same Model → Same Database (reads and writes)

CQRS:
  Commands (writes) → Write Model → Write Database
  Queries (reads)   → Read Model  → Read Database (optimized for reads)
                                     ↑
                            Sync via events/projections
```

### Detailed Flow

```
1. User submits a comment (COMMAND)
   → Validate → Write to event store → Publish event

2. Event processor receives "CommentAdded" event
   → Updates read-optimized view (denormalized, cached)

3. User loads comments (QUERY)
   → Read from optimized read store → Return fast
```

### When to Use
- Read and write patterns are vastly different
- Read-heavy with complex queries (dashboards, reports)
- When you need different scaling for reads vs writes
- Combined with Event Sourcing

### Tradeoffs

| Pro | Con |
|-----|-----|
| Reads and writes scale independently | Eventually consistent |
| Read model optimized for queries | Increased complexity |
| Write model optimized for validation | Two models to maintain |
| Natural fit with Event Sourcing | Harder to reason about |

---

## 10. Conflict Resolution Strategies

### Why Conflicts Happen

```
Scenario: Two users edit the same comment simultaneously

User A reads: "Hello"     User B reads: "Hello"
User A writes: "Hello!"   User B writes: "Hello World"
                    ↓
            Which one wins?
```

### Strategy 1: Last Write Wins (LWW)

```
Most recent timestamp wins.
Simple but can lose data.

User A writes at T=100: "Hello!"
User B writes at T=101: "Hello World"
Result: "Hello World" (User A's change lost)
```

Use when: Data loss is acceptable, simplicity is priority

### Strategy 2: First Write Wins

```
First write is accepted, subsequent writes are rejected.
Writer must re-read and retry.

User A writes at T=100: "Hello!" → ACCEPTED
User B writes at T=101: "Hello World" → REJECTED (must re-read and retry)
```

Use when: Preventing accidental overwrites matters

### Strategy 3: Merge

```
Automatically merge non-conflicting changes.
Flag true conflicts for manual resolution.

User A changes: "Hello" → "Hello!"     (added !)
User B changes: "Hello" → "Hello World" (added World)
Merged: "Hello World!"
```

Use when: Collaborative editing (Google Docs, Git)

### Strategy 4: Operational Transform (OT) / CRDTs

```
Transform operations so they can be applied in any order.

OT: Transform(Op_A, Op_B) → Op_A', Op_B'
    Apply in either order, same result.

CRDTs (Conflict-free Replicated Data Types):
    Mathematically guaranteed to converge.
    Examples: G-Counter, LWW-Register, OR-Set
```

Use when: Real-time collaboration, distributed systems without coordination

### Interview Talking Points
- "For this system, I'd use LWW with timestamps because data conflicts are rare and the simplicity tradeoff is worth it"
- "For collaborative editing, I'd consider CRDTs because they guarantee convergence without a central coordinator"

---

## 11. Cache Invalidation Strategies

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

### Strategy 1: TTL (Time-To-Live)

```
Cache entry expires after a fixed duration.

cache.set("user:123", profile, ttl = 5.minutes)

After 5 minutes → entry evicted → next read is a cache miss
```

- Simple, predictable
- Stale data during TTL window
- Good default for most cases

### Strategy 2: Event-Based Invalidation

```
When data changes, publish an event to invalidate caches.

UserUpdated event → cache.delete("user:123")
                  → All services with this cached value evict it
```

- More responsive than TTL
- Requires event infrastructure
- Risk of missed events (use at-least-once delivery)

### Strategy 3: Version-Based (ETag)

```
Each cached entry has a version/ETag.
On read, check if version is current.

cache.get("user:123") → { data: ..., version: 7 }
server.checkVersion("user:123", 7) → "current" → use cached
                                    → "stale" → re-fetch
```

- No stale reads
- Extra network call to validate
- HTTP uses this (304 Not Modified)

### Strategy 4: Tag-Based Invalidation

```
Tag cache entries with logical groups.

cache.set("feed:page1", data, tags = ["feed", "user:123"])
cache.set("feed:page2", data, tags = ["feed", "user:456"])

// When user 123 changes:
cache.invalidateByTag("user:123")
// → feed:page1 evicted, feed:page2 untouched
```

- Precise invalidation
- Flexible grouping
- Used by CDNs (Fastly, CloudFront)

### Eviction Policies (when cache is full)

| Policy | Description | Best For |
|--------|-------------|----------|
| **LRU** (Least Recently Used) | Evict least recently accessed | General purpose |
| **LFU** (Least Frequently Used) | Evict least frequently accessed | Skewed access patterns |
| **FIFO** (First In First Out) | Evict oldest entry | Simple, predictable |
| **Random** | Evict random entry | Surprisingly effective |

---

## 12. Offline-First Architecture

### Concept
The app works fully offline. Local database is the primary store. Sync with server when connectivity is available.

### Architecture

```
                    ┌─────────────────┐
                    │   Server (API)  │
                    └────────┬────────┘
                             │ sync when online
                    ┌────────┴────────┐
                    │   Sync Engine   │ ← handles conflicts, queues, retries
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │  Local Database │ ← Room, SQLite, Realm
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │   App / UI      │ ← always reads from local DB
                    └─────────────────┘
```

### Sync Strategies

```
Pull Sync: App periodically fetches changes from server
  Pro: Simple, server controls data
  Con: Not real-time, wasted bandwidth if no changes

Push Sync: Server pushes changes via WebSocket/SSE/Push Notification
  Pro: Real-time updates
  Con: Requires persistent connection infrastructure

Hybrid: Push notification triggers a pull sync
  Pro: Best of both — real-time trigger, reliable pull
  Con: More complex but industry standard
```

### Conflict Resolution for Offline

```
User edits document offline.
Meanwhile, server version has changed.

On sync:
  1. Detect conflict (local version != server version)
  2. Apply strategy:
     - Auto-merge if possible
     - Keep both versions, let user choose
     - Last-write-wins with timestamp
     - Server-wins (simpler, safer)
```

### Real-World Examples
- **Google Docs**: Offline editing with sync on reconnect
- **Notion**: Local-first with background sync
- **Git**: Fully offline, sync on push/pull

---

## 13. Pagination & Incremental Loading

### Offset-Based Pagination

```
GET /feed?offset=0&limit=20   → items 1-20
GET /feed?offset=20&limit=20  → items 21-40

Problem: If item inserted while paginating:
  Page 1: items 1-20
  New item inserted at position 5
  Page 2: items 21-40... but item 20 is now item 21 → DUPLICATED
```

### Cursor-Based Pagination

```
GET /feed?limit=20            → items 1-20, cursor="abc123"
GET /feed?after=abc123&limit=20 → items 21-40, cursor="def456"

Cursor = pointer to the last item seen (usually encoded ID + timestamp)
Pro: No duplicates or skips when items are inserted/deleted
Con: Can't jump to "page 5", only next/previous
```

### Keyset Pagination (Best for large datasets)

```
GET /feed?created_before=2024-01-15T10:30:00&limit=20

Uses an indexed column as the cursor.
  Pro: O(1) performance regardless of offset (no OFFSET scan)
  Con: Only works with sortable, unique columns
```

### Infinite Scroll vs. Load More

```
Infinite Scroll:
  - Auto-loads next page when user reaches bottom
  - Better for browsing (social feeds, search results)
  - Risk: user can't reach footer, scroll position lost on back navigation

Load More Button:
  - User explicitly requests next page
  - Better for content where users want to stop and think
  - Preserves scroll position naturally
```

### Bidirectional Pagination (Chat)

```
Chat apps need to load history (scroll up) AND new messages (real-time):

  ← Older messages    [visible viewport]    Newer messages →
  Load on scroll up    Current view         WebSocket/push

Gap handling: If user was offline, load messages between
last-seen cursor and current to fill the gap.
```

---

## 14. Pub/Sub & Reactive Streams

### Pub/Sub Pattern

```
Publishers → Message Broker → Subscribers

Publisher doesn't know who subscribes.
Subscriber doesn't know who publishes.
Broker handles routing.

Example:
  FeedService.publishEvent("CommentAdded", { storyId: "123", comment: {...} })
      → Broker routes to:
          - NotificationService (sends push notification)
          - FeedCacheService (invalidates cached feed)
          - AnalyticsService (records event)
```

### Reactive Streams (Client-Side)

```kotlin
// Kotlin Flow (used in this codebase)
storyService.entries              // Publisher: emits feed updates
    .mapNotNull { entries ->      // Operator: transform
        entries.find { it.id == storyId }?.comments
    }
    .collect { comments ->        // Subscriber: react to updates
        _comments.value = comments
    }
```

### Hot vs Cold Streams

```
Cold Stream: Starts producing when subscribed. Each subscriber gets its own sequence.
  Example: Database query → Flow { emit(db.query()) }
  Each collector triggers a new query.

Hot Stream: Produces regardless of subscribers. Shared across all subscribers.
  Example: StateFlow, SharedFlow
  All collectors see the same emissions.
  Late subscribers miss past events (unless replay is configured).
```

### Backpressure

```
Problem: Producer is faster than consumer

Producer: 1000 events/sec → Consumer: 100 events/sec
          900 events/sec accumulating in buffer → OOM

Solutions:
  1. Buffer (risk OOM)          - buffer(capacity = 1000)
  2. Drop oldest                - conflate() in Kotlin Flow
  3. Drop latest                - buffer(BUFFER_OVERFLOW.DROP_LATEST)
  4. Slow down producer         - not always possible
  5. Sample/throttle            - sample(100.milliseconds)
```

---

## 15. Circuit Breaker Pattern

### Concept
Prevent cascading failures by "breaking the circuit" to a failing dependency.

### States

```
     ┌─────────┐     failures > threshold     ┌──────────┐
     │ CLOSED  │ ──────────────────────────── │   OPEN   │
     │ (normal)│                               │ (failing)│
     └────┬────┘                               └────┬─────┘
          │                                         │
          │ requests pass through                   │ requests fail immediately
          │                                         │ (no network call)
          │                                         │
          │         timeout expires                 │
          │    ┌────────────────┐                    │
          └─── │  HALF-OPEN    │ ───────────────────┘
               │ (testing)     │
               └───────────────┘
               Allow limited requests through
               Success → CLOSED
               Failure → OPEN
```

### When to Use
- Calling external APIs that might go down
- Database connections that might timeout
- Any dependency where retrying a known-failing call wastes resources

### Real-World Examples
- **Netflix Hystrix**: Circuit breaker for microservice calls
- **Android OkHttp**: Can implement circuit breaker for API calls
- **Mobile apps**: Stop hitting a down API endpoint, show cached data instead

---

## 16. Retry with Exponential Backoff

### Concept
On failure, retry with increasing delays to avoid overwhelming a recovering service.

### How It Works

```
Attempt 1: Fails → Wait 1 second
Attempt 2: Fails → Wait 2 seconds
Attempt 3: Fails → Wait 4 seconds
Attempt 4: Fails → Wait 8 seconds
Attempt 5: Fails → Give up, show error

Formula: delay = base * 2^attempt + random_jitter
```

### Why Jitter Matters

```
Without jitter:
  1000 clients retry at T=1s, T=2s, T=4s → synchronized thundering herd

With jitter:
  Client A retries at T=1.2s, T=2.7s, T=4.1s
  Client B retries at T=0.8s, T=2.3s, T=5.0s
  → Retries spread out, server recovers gradually
```

### Implementation Considerations

```
- Set a MAX_RETRIES (don't retry forever)
- Set a MAX_DELAY cap (e.g., 60 seconds)
- Only retry on retryable errors (5xx, timeout, network error)
- Don't retry on 4xx (client error — won't succeed on retry)
- Use idempotency tokens to prevent duplicate actions on retry
```

---

## 17. Idempotency

### Concept
An operation that produces the same result whether executed once or multiple times.

### Why It Matters

```
Problem:
  User taps "Pay $50" → Network timeout → Did it go through?
  User taps again → Now they might have paid $100

Solution (idempotency key):
  Request 1: POST /pay { amount: 50, idempotency_key: "uuid-abc" }
             → Server processes, returns 200
  Request 2: POST /pay { amount: 50, idempotency_key: "uuid-abc" }
             → Server recognizes key, returns same 200 (no second charge)
```

### Implementation

```
Server side:
  1. Receive request with idempotency key
  2. Check if key exists in idempotency store
     → EXISTS: Return stored response (don't re-process)
     → NEW: Process request, store response with key, return
  3. Key expires after TTL (e.g., 24 hours)

Client side:
  1. Generate UUID for each user action
  2. Attach to every mutating request
  3. Reuse same UUID on retries
```

### Naturally Idempotent Operations
- `GET /user/123` — always returns same user (idempotent by nature)
- `PUT /user/123 { name: "Arun" }` — sets to same value (idempotent)
- `DELETE /user/123` — already deleted? Same result (idempotent)

### NOT Naturally Idempotent
- `POST /comments { text: "hello" }` — creates duplicate on retry
- `POST /pay { amount: 50 }` — charges twice on retry
- `PATCH /counter { increment: 1 }` — increments twice on retry

---

## 18. Distributed Caching

### Single-Node Cache vs Distributed Cache

```
Single-Node (in-process):
  App ↔ HashMap/LRU Cache (same process)
  Pro: Fastest, no network hop
  Con: Lost on restart, not shared across instances

Distributed:
  App Instance 1 ─┐
  App Instance 2 ──┼── Network ── Cache Cluster (Redis/Memcached)
  App Instance 3 ─┘
  Pro: Shared, survives restarts, scales independently
  Con: Network latency, serialization overhead
```

### Redis vs Memcached

| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data structures | Strings, Lists, Sets, Hashes, Sorted Sets | Strings only |
| Persistence | Yes (RDB, AOF) | No |
| Replication | Yes (master-replica) | No |
| Pub/Sub | Yes | No |
| Lua scripting | Yes | No |
| Multi-threaded | Single-threaded (6.0+ has I/O threads) | Multi-threaded |
| Use case | Feature-rich caching, sessions, queues | Simple key-value caching |

### Consistent Hashing (for cache distribution)

```
Problem: 3 cache servers, key "user:123" → hash("user:123") % 3 = server 1
         Add 4th server → hash("user:123") % 4 = server 0 → DIFFERENT SERVER
         All cache keys remapped → cache storm

Solution: Consistent hashing
  Servers placed on a ring (0 to 2^32)
  Keys hashed to ring, routed to next clockwise server
  Adding/removing server only affects adjacent keys (~1/N keys remapped)
```

---

## 19. Consistency Models

### Strong Consistency

```
After a write completes, all subsequent reads return the new value.

Write: x = 5 → acknowledged
Read (any node): x = 5 ← guaranteed

Pro: Simple reasoning, no surprises
Con: Higher latency (must wait for all replicas)
Example: Traditional SQL databases, ZooKeeper
```

### Eventual Consistency

```
After a write, reads MAY return old value temporarily.
Given enough time with no new writes, all reads will return the latest value.

Write: x = 5 → acknowledged
Read (node A): x = 5 ← updated
Read (node B): x = 3 ← stale (hasn't received update yet)
... time passes ...
Read (node B): x = 5 ← eventually consistent

Pro: High availability, low latency
Con: Stale reads possible
Example: DNS, DynamoDB, Cassandra
```

### Causal Consistency

```
Operations that are causally related are seen in order.
Concurrent (unrelated) operations may be seen in any order.

User A posts: "What time is the meeting?"      → T=1
User B replies: "3pm"                           → T=2 (caused by T=1)

All observers see T=1 before T=2 (causal order preserved)
But unrelated posts from User C may appear in any order.
```

### Read-Your-Own-Writes Consistency

```
After a write, the SAME USER always reads their own update.
Other users may see stale data temporarily.

User A writes: x = 5
User A reads: x = 5 ← guaranteed (session/sticky routing)
User B reads: x = 3 ← might be stale (different replica)
```

### CAP Theorem

```
In a distributed system, you can only guarantee 2 out of 3:
  C - Consistency: All nodes see the same data at the same time
  A - Availability: Every request receives a response
  P - Partition Tolerance: System works despite network failures

Since network partitions WILL happen (P is mandatory):
  → Choose CP: Consistent but may be unavailable during partition (banks, ZooKeeper)
  → Choose AP: Available but may return stale data during partition (DNS, Cassandra)
```

---

## 20. Real-World Case Studies

### Case Study 1: Venmo Feed Comments (This Codebase)

```
Patterns used:
  ✓ Optimistic Update — comment appears before server confirms
  ✓ Store Sync — init block subscribes to storyService.entries
  ✓ Pending Guard — pendingCommentIds prevents store from clobbering optimistic state
  ✓ Lazy Initialization — CommentsViewModel created only when user opens comments
  ✓ Pessimistic for count — commentCount synced back to card only after confirm

Data flow:
  User types → local StateFlow → UI updates instantly
  Send → temp comment inserted → API call → swap or rollback
  Store update → merge with local state (skip if pending)
  Dismiss → sync count back to card
```

### Case Study 2: Instagram Feed

```
Patterns used:
  ✓ Cache-Aside — feed cached in SQLite, fetched from API on miss/refresh
  ✓ Optimistic Updates — likes, comments appear instantly
  ✓ Cursor-Based Pagination — infinite scroll with cursor
  ✓ Write-Behind — view counts batched and synced periodically
  ✓ CDN Caching — images served from edge caches
  ✓ Eventual Consistency — like counts may differ slightly across users
```

### Case Study 3: Slack Messages

```
Patterns used:
  ✓ Optimistic Updates — message appears with "sending" state
  ✓ WebSocket (Pub/Sub) — real-time message delivery
  ✓ Offline Queue — messages queued when offline, sent on reconnect
  ✓ Cursor-Based Pagination — message history loads on scroll up
  ✓ Event Sourcing — message edits/deletes tracked as events
  ✓ Read-Your-Own-Writes — your messages always visible to you immediately
```

### Case Study 4: Uber/Lyft Real-Time Location

```
Patterns used:
  ✓ Write-Behind — driver location updates batched (every 4 seconds)
  ✓ Pub/Sub — rider subscribes to driver's location channel
  ✓ Geospatial Caching — nearby driver positions cached in Redis (GEOADD)
  ✓ Eventual Consistency — position may lag by a few seconds
  ✓ Circuit Breaker — fallback to last known position if location service fails
```

---

## Quick Reference: Choosing the Right Pattern

### "When should I use...?"

| Situation | Pattern |
|-----------|---------|
| User action needs instant feedback | Optimistic Update |
| Money/irreversible action | Pessimistic Update |
| Read-heavy, write-infrequent data | Cache-Aside with TTL |
| Multiple screens showing same data | Store Sync / Single Source of Truth |
| Need full audit history | Event Sourcing |
| Read and write have different scale needs | CQRS |
| Must work offline | Offline-First + Sync Engine |
| Calling flaky external service | Circuit Breaker + Retry with Backoff |
| Retrying a payment or mutation | Idempotency Keys |
| High-write counters/analytics | Write-Behind with Batching |
| Real-time multi-user updates | Pub/Sub + WebSocket |
| Infinite scroll feed | Cursor-Based Pagination |
| Multiple app instances sharing cache | Distributed Cache (Redis) |

### The Consistency Spectrum

```
Strong ←───────────────────────────────────────→ Eventual
  |              |                |                  |
  SQL DB      Read-Your-Writes  Causal           DynamoDB
  ZooKeeper   (session sticky)  (Kafka ordering)  Cassandra
  |              |                |                  |
  Slowest     Moderate          Fast               Fastest
  Most safe   Per-user safe     Causally safe      Most available
```

---

## Interview Tips

1. **Always state the tradeoff**: "I'd choose X because Y, accepting the tradeoff of Z"
2. **Start simple**: Don't propose Event Sourcing + CQRS for a to-do app
3. **Name the pattern**: Interviewers want to hear "optimistic update" not just the mechanics
4. **Know when NOT to use a pattern**: This impresses more than knowing when to use it
5. **Connect to real systems**: "This is how Instagram handles likes" shows depth
6. **Quantify when possible**: "With a 99.5% success rate, optimistic updates lose less than 1 in 200 actions"
7. **Draw the data flow**: Visual diagrams communicate faster than words in system design rounds
