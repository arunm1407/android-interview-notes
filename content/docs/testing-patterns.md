---
title: "Testing Patterns"
weight: 16
---

# Testing Patterns for Android

> [!TIP]
> **Quick navigation:** [Unit Testing](#part-1--unit-testing-foundations) | [Mocking](#part-2--mocking-strategies) | [Compose UI](#part-3--compose-ui-testing) | [Espresso](#part-4--espresso-legacy-views) | [Integration](#part-5--integration--e2e-testing) | [Anti-Patterns](#part-6--testing-anti-patterns--best-practices) | [Architecture](#part-7--test-architecture-patterns) | [Quick Ref](#part-8--interview-quick-reference)

---

## Part 1 — Unit Testing Foundations

### Testing ViewModels

```kotlin
@ExtendWith(MockitoExtension::class)
class FeedViewModelTest {

    @Mock lateinit var repository: FeedRepository
    private lateinit var vm: FeedViewModel

    // Replace Dispatchers.Main with a test dispatcher
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @BeforeEach
    fun setup() {
        vm = FeedViewModel(repository)
    }

    @Test
    fun `load feed - success - emits items`() = runTest {
        val items = listOf(FeedItem(id = "1", text = "hello"))
        whenever(repository.getFeed()).thenReturn(Result.success(items))

        vm.loadFeed()

        val state = vm.uiState.value
        assertEquals(items, state.items)
        assertFalse(state.isLoading)
        assertNull(state.error)
    }

    @Test
    fun `load feed - failure - emits error`() = runTest {
        whenever(repository.getFeed())
            .thenReturn(Result.failure(IOException("network")))

        vm.loadFeed()

        val state = vm.uiState.value
        assertTrue(state.items.isEmpty())
        assertFalse(state.isLoading)
        assertEquals("network", state.error)
    }
}
```

### MainDispatcherRule (Reusable)

```kotlin
class MainDispatcherRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : TestWatcher() {

    override fun starting(description: Description) {
        Dispatchers.setMain(dispatcher)
    }

    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
```

**Why `UnconfinedTestDispatcher` vs `StandardTestDispatcher`:**

| Dispatcher | Behavior | Use When |
|---|---|---|
| `UnconfinedTestDispatcher` | Executes eagerly, no manual advancing | Simple state assertions |
| `StandardTestDispatcher` | Requires `advanceUntilIdle()` / `advanceTimeBy()` | Testing timing, delays, debounce |

### Testing Flows

```kotlin
@Test
fun `search query - debounces and emits results`() = runTest {
    val scheduler = TestCoroutineScheduler()
    val dispatcher = StandardTestDispatcher(scheduler)

    val vm = SearchViewModel(repository, dispatcher)

    // Collect emissions
    val results = mutableListOf<List<String>>()
    val job = launch(UnconfinedTestDispatcher()) {
        vm.searchResults.toList(results)
    }

    vm.onQueryChanged("k")
    scheduler.advanceTimeBy(100)  // still within debounce
    vm.onQueryChanged("ko")
    scheduler.advanceTimeBy(100)
    vm.onQueryChanged("kot")
    scheduler.advanceTimeBy(300)  // debounce fires

    assertEquals(1, results.size)  // only one emission
    assertEquals(listOf("kotlin"), results[0])

    job.cancel()
}
```

### Testing StateFlow with Turbine

```kotlin
@Test
fun `counter increments`() = runTest {
    val vm = CounterViewModel()

    vm.state.test {
        assertEquals(0, awaitItem())   // initial

        vm.increment()
        assertEquals(1, awaitItem())

        vm.increment()
        assertEquals(2, awaitItem())

        cancelAndIgnoreRemainingEvents()
    }
}
```

**Turbine cheat sheet:**

| Method | Purpose |
|---|---|
| `awaitItem()` | Wait for next emission |
| `awaitError()` | Wait for error terminal event |
| `awaitComplete()` | Wait for completion |
| `expectNoEvents()` | Assert nothing was emitted |
| `cancelAndIgnoreRemainingEvents()` | Clean teardown |
| `cancelAndConsumeRemainingEvents()` | Capture leftover events |

---

### Testing Repositories

```kotlin
@Test
fun `repository - cache hit - no network call`() = runTest {
    val cache = FakeCache(mapOf("feed" to cachedItems))
    val api = mock<FeedApi>()
    val repo = FeedRepository(api, cache)

    val result = repo.getFeed()

    assertEquals(cachedItems, result.getOrNull())
    verifyNoInteractions(api)
}

@Test
fun `repository - cache miss - fetches from network`() = runTest {
    val cache = FakeCache(emptyMap())
    val api = mock<FeedApi>()
    whenever(api.getFeed()).thenReturn(networkItems)
    val repo = FeedRepository(api, cache)

    val result = repo.getFeed()

    assertEquals(networkItems, result.getOrNull())
    verify(api).getFeed()
}
```

**Prefer fakes over mocks for data layers:**

```kotlin
class FakeCache(initial: Map<String, Any> = emptyMap()) : Cache {
    private val store = initial.toMutableMap()
    override suspend fun get(key: String) = store[key]
    override suspend fun put(key: String, value: Any) { store[key] = value }
    override suspend fun evict(key: String) { store.remove(key) }
}
```

---

## Part 2 — Mocking Strategies

### Mockito-Kotlin Patterns

```kotlin
// Basic stubbing
whenever(api.getUser("123")).thenReturn(user)

// Suspend function stubbing
whenever(api.getUser("123")).thenSuspendReturn(user)
// OR use coEvery with MockK:
coEvery { api.getUser("123") } returns user

// Argument capture
val captor = argumentCaptor<String>()
verify(api).getUser(captor.capture())
assertEquals("123", captor.firstValue)

// Verify call count
verify(api, times(1)).getUser(any())
verify(api, never()).deleteUser(any())

// Verify ordering
inOrder(cache, api) {
    verify(cache).get("feed")   // cache checked first
    verify(api).getFeed()       // then network
}
```

### When to Use Fakes vs Mocks

| Aspect | Fakes | Mocks |
|---|---|---|
| **Setup** | More upfront code | Quick one-liners |
| **Readability** | Self-documenting behavior | Requires reading stub setup |
| **Brittleness** | Resilient to refactors | Breaks if method signatures change |
| **Verification** | State-based (check final state) | Interaction-based (verify calls) |
| **Best for** | Repositories, caches, DAOs | APIs, analytics, loggers |

### Mocking Android Framework Classes

```kotlin
// Use Robolectric for Android classes
@RunWith(RobolectricTestRunner::class)
class NotificationHelperTest {
    @Test
    fun `builds notification with correct channel`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val helper = NotificationHelper(context)

        val notification = helper.buildFeedNotification("New payment")

        assertEquals("feed_channel", notification.channelId)
        assertEquals("New payment", notification.extras.getString(EXTRA_TEXT))
    }
}
```

---

## Part 3 — Compose UI Testing

### Basic Compose Test

```kotlin
@get:Rule
val composeTestRule = createComposeRule()

@Test
fun `feed card displays sender and amount`() {
    composeTestRule.setContent {
        FeedCard(
            sender = "Alice",
            amount = "$25.00",
            note = "Coffee"
        )
    }

    composeTestRule
        .onNodeWithText("Alice")
        .assertIsDisplayed()

    composeTestRule
        .onNodeWithText("$25.00")
        .assertIsDisplayed()

    composeTestRule
        .onNodeWithText("Coffee")
        .assertIsDisplayed()
}
```

### Semantic Matchers

```kotlin
// By test tag
composeTestRule.onNodeWithTag("feed_list").assertIsDisplayed()

// By content description
composeTestRule.onNodeWithContentDescription("Profile picture").performClick()

// By text (substring)
composeTestRule.onNodeWithText("Alice", substring = true)

// Multiple matches
composeTestRule.onAllNodesWithTag("feed_item").assertCountEquals(5)

// Hierarchical
composeTestRule
    .onNodeWithTag("feed_card")
    .onChildren()
    .filterToOne(hasText("$25.00"))
    .assertIsDisplayed()
```

### Testing User Interactions

```kotlin
@Test
fun `like button toggles state`() {
    var liked = false
    composeTestRule.setContent {
        LikeButton(
            isLiked = liked,
            onToggle = { liked = !liked }
        )
    }

    composeTestRule.onNodeWithTag("like_button")
        .assertIsOff()          // custom semantic
        .performClick()

    assertTrue(liked)
}

@Test
fun `feed list scrolls to load more`() {
    composeTestRule.setContent {
        FeedScreen(viewModel = fakeViewModel)
    }

    composeTestRule.onNodeWithTag("feed_list")
        .performScrollToIndex(19)  // scroll to bottom

    // Verify load-more was triggered
    assertEquals(2, fakeViewModel.loadCallCount)
}
```

### Testing Navigation

```kotlin
@Test
fun `tapping feed card navigates to detail`() {
    val navController = TestNavHostController(
        ApplicationProvider.getApplicationContext()
    )

    composeTestRule.setContent {
        NavHost(navController, startDestination = "feed") {
            composable("feed") {
                FeedScreen(
                    onCardTap = { id -> navController.navigate("detail/$id") }
                )
            }
            composable("detail/{id}") { DetailScreen() }
        }
    }

    composeTestRule.onNodeWithTag("feed_card_1").performClick()

    assertEquals("detail/1", navController.currentDestination?.route)
}
```

### Screenshot Testing with Compose

```kotlin
@Test
fun `feed card matches golden`() {
    composeTestRule.setContent {
        FeedCard(sender = "Alice", amount = "$25.00", note = "Coffee")
    }

    composeTestRule.onNodeWithTag("feed_card")
        .captureToImage()
        .assertAgainstGolden(goldenRule, "feed_card_default")
}

// Dark mode variant
@Test
fun `feed card dark mode matches golden`() {
    composeTestRule.setContent {
        VenmoTheme(darkTheme = true) {
            FeedCard(sender = "Alice", amount = "$25.00", note = "Coffee")
        }
    }

    composeTestRule.onNodeWithTag("feed_card")
        .captureToImage()
        .assertAgainstGolden(goldenRule, "feed_card_dark")
}
```

---

## Part 4 — Espresso (Legacy Views)

### Basic Espresso Test

```kotlin
@Test
fun feedList_displaysItems() {
    val scenario = launchActivity<FeedActivity>()

    onView(withId(R.id.feed_recycler))
        .check(matches(isDisplayed()))

    onView(withText("Alice paid Bob"))
        .check(matches(isDisplayed()))
}
```

### Common Espresso Patterns

```kotlin
// Click
onView(withId(R.id.like_button)).perform(click())

// Type text
onView(withId(R.id.search_input))
    .perform(typeText("coffee"), closeSoftKeyboard())

// RecyclerView actions
onView(withId(R.id.feed_recycler))
    .perform(
        RecyclerViewActions.actionOnItemAtPosition<ViewHolder>(
            3, click()
        )
    )

// Scroll to item
onView(withId(R.id.feed_recycler))
    .perform(
        RecyclerViewActions.scrollToHolder(
            withHolderTitle("Alice paid Bob")
        )
    )

// Wait for IdlingResource
IdlingRegistry.getInstance().register(networkIdling)
onView(withId(R.id.feed_recycler)).check(matches(isDisplayed()))
IdlingRegistry.getInstance().unregister(networkIdling)
```

### Custom Matchers

```kotlin
fun withHolderTitle(title: String): Matcher<RecyclerView.ViewHolder> {
    return object : BoundedMatcher<RecyclerView.ViewHolder, FeedViewHolder>(
        FeedViewHolder::class.java
    ) {
        override fun describeTo(description: Description) {
            description.appendText("with title: $title")
        }
        override fun matchesSafely(holder: FeedViewHolder): Boolean {
            return holder.titleView.text.toString() == title
        }
    }
}
```

---

## Part 5 — Integration & E2E Testing

### Room Database Testing

```kotlin
@RunWith(AndroidJUnit4::class)
class FeedDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var dao: FeedDao

    @Before
    fun setup() {
        db = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).allowMainThreadQueries().build()
        dao = db.feedDao()
    }

    @After
    fun teardown() {
        db.close()
    }

    @Test
    fun insertAndQuery_returnsItems() = runTest {
        val items = listOf(
            FeedEntity(id = "1", sender = "Alice", amount = 2500),
            FeedEntity(id = "2", sender = "Bob", amount = 1000)
        )
        dao.insertAll(items)

        val result = dao.getAll()
        assertEquals(2, result.size)
        assertEquals("Alice", result[0].sender)
    }

    @Test
    fun upsert_updatesExisting() = runTest {
        dao.insert(FeedEntity(id = "1", sender = "Alice", amount = 2500))
        dao.insert(FeedEntity(id = "1", sender = "Alice", amount = 3000))

        val result = dao.getById("1")
        assertEquals(3000, result?.amount)
    }
}
```

### OkHttp MockWebServer

```kotlin
class FeedApiTest {

    private val server = MockWebServer()
    private lateinit var api: FeedApi

    @Before
    fun setup() {
        server.start()
        api = Retrofit.Builder()
            .baseUrl(server.url("/"))
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
            .create(FeedApi::class.java)
    }

    @After
    fun teardown() {
        server.shutdown()
    }

    @Test
    fun `getFeed - 200 - parses response`() = runTest {
        server.enqueue(
            MockResponse()
                .setResponseCode(200)
                .setBody("""{"items": [{"id": "1", "sender": "Alice"}]}""")
        )

        val response = api.getFeed()

        assertTrue(response.isSuccessful)
        assertEquals("Alice", response.body()!!.items[0].sender)

        val request = server.takeRequest()
        assertEquals("GET", request.method)
        assertEquals("/feed", request.path)
    }

    @Test
    fun `getFeed - 401 - returns error`() = runTest {
        server.enqueue(MockResponse().setResponseCode(401))

        val response = api.getFeed()

        assertFalse(response.isSuccessful)
        assertEquals(401, response.code())
    }

    @Test
    fun `getFeed - timeout - throws`() = runTest {
        server.enqueue(
            MockResponse()
                .setBodyDelay(10, TimeUnit.SECONDS)
        )

        assertThrows<SocketTimeoutException> {
            api.getFeed()
        }
    }
}
```

### WorkManager Testing

```kotlin
@RunWith(AndroidJUnit4::class)
class SyncWorkerTest {

    private lateinit var context: Context

    @Before
    fun setup() {
        context = ApplicationProvider.getApplicationContext()
        val config = Configuration.Builder()
            .setMinimumLoggingLevel(Log.DEBUG)
            .setExecutor(SynchronousExecutor())
            .build()
        WorkManagerTestInitHelper.initializeTestWorkManager(context, config)
    }

    @Test
    fun syncWorker_succeeds() {
        val request = OneTimeWorkRequestBuilder<SyncWorker>()
            .setInputData(workDataOf("feed_id" to "123"))
            .build()

        val workManager = WorkManager.getInstance(context)
        workManager.enqueue(request).result.get()

        val info = workManager.getWorkInfoById(request.id).get()
        assertEquals(WorkInfo.State.SUCCEEDED, info.state)
    }

    @Test
    fun syncWorker_retries_on_network_error() {
        val worker = TestListenableWorkerBuilder<SyncWorker>(context)
            .setInputData(workDataOf("feed_id" to "123"))
            .build()

        val result = runBlocking { worker.doWork() }
        assertEquals(ListenableWorker.Result.retry(), result)
    }
}
```

---

## Part 6 — Testing Anti-Patterns & Best Practices

### Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Testing implementation, not behavior | Breaks on refactor | Assert on observable state |
| `Thread.sleep()` in tests | Flaky, slow | Use `Turbine`, `advanceTimeBy()`, `IdlingResource` |
| Mocking everything | Tests prove nothing | Use fakes for data, mocks for boundaries |
| One giant test method | Hard to diagnose failures | One assertion per test |
| Shared mutable state between tests | Order-dependent failures | Fresh setup in `@Before` |
| Testing private methods | Couples to implementation | Test through public API |
| Ignoring `@After` cleanup | Resource leaks, flaky CI | Always close DB, cancel scopes |

### Test Naming Convention

```
test_[unit]_with[condition]_should[expected]

// Examples:
test_feedViewModel_withEmptyResponse_shouldShowPlaceholder
test_paymentCard_withNegativeAmount_shouldShowRefundBadge
test_searchDebounce_withRapidInput_shouldEmitOnce
```

### Test Structure (AAA)

```kotlin
@Test
fun `descriptive name`() {
    // Arrange — set up preconditions
    val repo = FakeRepository(items = emptyList())
    val vm = FeedViewModel(repo)

    // Act — perform the action
    vm.loadFeed()

    // Assert — verify the outcome
    assertTrue(vm.uiState.value.isEmpty)
}
```

### Flaky Test Checklist

1. **Time-dependent?** Use `TestCoroutineScheduler` or `advanceTimeBy()`
2. **Network-dependent?** Use `MockWebServer` or fakes
3. **Order-dependent?** Ensure fresh state in `@Before`
4. **Animation-dependent?** Disable animations in test config
5. **Race condition?** Use `runTest` with `UnconfinedTestDispatcher`
6. **Large test?** Break into focused, independent tests

---

## Part 7 — Test Architecture Patterns

### Robot Pattern (Readable UI Tests)

```kotlin
// Define the robot
class FeedRobot(private val rule: ComposeTestRule) {
    fun scrollToCard(index: Int) = apply {
        rule.onNodeWithTag("feed_list")
            .performScrollToIndex(index)
    }

    fun tapCard(id: String) = apply {
        rule.onNodeWithTag("feed_card_$id").performClick()
    }

    fun assertCardVisible(sender: String) = apply {
        rule.onNodeWithText(sender).assertIsDisplayed()
    }

    fun assertEmptyState() = apply {
        rule.onNodeWithTag("empty_state").assertIsDisplayed()
    }
}

// Use in tests — reads like a script
@Test
fun `feed shows cards and navigates on tap`() {
    val feed = FeedRobot(composeTestRule)

    feed.assertCardVisible("Alice")
        .scrollToCard(5)
        .assertCardVisible("Bob")
        .tapCard("123")
    // verify navigation...
}
```

### Shared Test Fixtures

```kotlin
object FeedFixtures {
    fun payment(
        id: String = "1",
        sender: String = "Alice",
        receiver: String = "Bob",
        amount: Long = 2500,
        note: String = "Coffee"
    ) = FeedItem(
        id = id,
        type = FeedItemType.PAYMENT,
        sender = User(name = sender),
        receiver = User(name = receiver),
        amount = Amount(cents = amount),
        note = note
    )

    fun emptyFeed() = FeedState(items = emptyList(), hasMore = false)

    fun feedWithItems(count: Int = 10) = FeedState(
        items = (1..count).map { payment(id = "$it") },
        hasMore = true
    )
}
```

### Test Doubles Decision Tree

```
Need to test behavior?
├── YES: Does the dependency have complex state?
│   ├── YES → Use a Fake (in-memory implementation)
│   └── NO → Use a Mock (verify interactions)
└── NO: Just need a valid object?
    └── Use a Stub (hardcoded return values)
```

---

## Part 8 — Interview Quick Reference

### "How do you test X?" — Quick Answers

| Component | Strategy | Key Tool |
|---|---|---|
| ViewModel | Test state transitions, mock repo | `runTest`, Turbine |
| Repository | Fake cache + MockWebServer | Fakes, MockWebServer |
| Room DAO | In-memory DB, test queries | `Room.inMemoryDatabaseBuilder` |
| Compose UI | Semantic tree assertions | `createComposeRule()` |
| Navigation | TestNavHostController | Compose Navigation testing |
| WorkManager | TestListenableWorkerBuilder | WorkManager testing lib |
| Coroutines | Control dispatchers and time | `StandardTestDispatcher` |
| Retrofit | Mock server responses | `MockWebServer` |
| SharedPreferences/DataStore | Use test implementations | Fake/in-memory store |

### Testing Pyramid for Android

```
            ╱╲
           ╱  ╲          E2E / UI Tests (10%)
          ╱    ╲         Espresso, Compose UI tests
         ╱──────╲        Full app, real device/emulator
        ╱        ╲
       ╱          ╲       Integration Tests (20%)
      ╱            ╲      Room + DAO, MockWebServer
     ╱──────────────╲     Real components, fake boundaries
    ╱                ╲
   ╱                  ╲    Unit Tests (70%)
  ╱                    ╲   ViewModels, Repositories, UseCases
 ╱────────────────────────╲ Fast, isolated, run on JVM
```

### Key Libraries

| Library | Purpose | Dependency |
|---|---|---|
| JUnit 5 | Test framework | `testImplementation("org.junit.jupiter:junit-jupiter")` |
| Mockito-Kotlin | Mocking | `testImplementation("org.mockito.kotlin:mockito-kotlin")` |
| MockK | Kotlin-first mocking | `testImplementation("io.mockk:mockk")` |
| Turbine | Flow testing | `testImplementation("app.cash.turbine:turbine")` |
| Robolectric | Android on JVM | `testImplementation("org.robolectric:robolectric")` |
| MockWebServer | HTTP mocking | `testImplementation("com.squareup.okhttp3:mockwebserver")` |
| Compose Testing | UI assertions | `androidTestImplementation(compose.ui-test-junit4)` |
| Espresso | View UI testing | `androidTestImplementation(androidx.test.espresso:espresso-core)` |
| Truth | Fluent assertions | `testImplementation("com.google.truth:truth")` |

### Common Interview Questions

**Q: How do you avoid flaky tests in CI?**
> Disable animations, use `IdlingResource` or Turbine, control time with test dispatchers, use fakes instead of real network, run in isolated processes.

**Q: What's the difference between `runTest` and `runBlocking`?**
> `runTest` auto-advances virtual time (delays skip instantly), replaces `Dispatchers.Main`, and fails on uncaught exceptions. `runBlocking` blocks the real thread — never use it in tests that involve `delay()`.

**Q: How do you test a ViewModel that uses SavedStateHandle?**
> Pass `SavedStateHandle(mapOf("key" to "value"))` directly in the constructor — no need for mocking.

**Q: How do you achieve test isolation in Koin?**
> Use `startKoin` in `@Before` and `stopKoin()` in `@After`, or use `KoinTestRule`. Override modules with `loadKoinModules(testModule)`.

**Q: How do you test offline-first behavior?**
> Use a fake repository that returns cached data first, then simulate network availability changes with a fake connectivity monitor. Verify the UI updates as data sources change.
