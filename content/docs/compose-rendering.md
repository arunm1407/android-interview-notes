---
title: "Compose Rendering: How a List Screen Draws"
weight: 21
---

# Compose Rendering: How a List Screen Actually Draws

> [!NOTE]
> **End-to-end walkthrough.** Takes a concrete `LazyColumn` screen and traces every step — from `@Composable` function call to pixels on the glass. Covers composition, SubcomposeLayout, constraint propagation, text measurement, relayout when text grows, scroll-driven recomposition, and item recycling.

---

## Table of Contents

1. [The Example Screen](#1-the-example-screen)
2. [Phase 1 — Composition: Building the Tree](#2-phase-1--composition-building-the-tree)
3. [SubcomposeLayout: How LazyColumn Defers Work](#3-subcomposelayout-how-lazycolumn-defers-work)
4. [Phase 2 — Layout: Measuring and Placing](#4-phase-2--layout-measuring-and-placing)
5. [Text Measurement Deep Dive](#5-text-measurement-deep-dive)
6. [Phase 2b — Placement: Positioning Nodes](#6-phase-2b--placement-positioning-nodes)
7. [Phase 3 — Draw: Pixels on Screen](#7-phase-3--draw-pixels-on-screen)
8. [What Happens When Text Size Increases](#8-what-happens-when-text-size-increases)
9. [Relayout Propagation: The Full Chain](#9-relayout-propagation-the-full-chain)
10. [Scrolling: How New Items Appear](#10-scrolling-how-new-items-appear)
11. [Performance: Keys, ContentType, Prefetch](#11-performance-keys-contenttype-prefetch)
12. [Interview Cheat Sheet](#12-interview-cheat-sheet)

---

## 1. The Example Screen

We'll trace every rendering step for this screen:

```kotlin
@Composable
fun FeedScreen(viewModel: FeedViewModel) {
    val items by viewModel.items.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(
            items = items,
            key = { it.id },
            contentType = { it.type },
        ) { item ->
            FeedCard(item)
        }
    }
}

@Composable
fun FeedCard(item: FeedItem) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = item.userName,
                style = MaterialTheme.typography.titleMedium,
            )
            Text(
                text = item.description,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}
```

```
What the user sees:
┌──────────────────────────────┐
│  ┌────────────────────────┐  │
│  │ Alice                  │  │
│  │ Paid Bob for lunch     │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Charlie                │  │
│  │ Paid Dana for coffee   │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ Eve                    │  │
│  │ Paid Frank for dinner  │  │
│  └────────────────────────┘  │
│           ...                │
└──────────────────────────────┘
```

---

## 2. Phase 1 — Composition: Building the Tree

### What Actually Happens When `setContent { FeedScreen(vm) }` Runs

```
Step 1: Recomposer schedules initial composition

  Recomposer (coroutine on Dispatchers.Main)
    → Creates a Composition object
    → Composition has a SlotTable (empty) and an Applier (UiApplier)

Step 2: Execute @Composable functions top-down

  FeedScreen(vm)
    → Composer.startRestartGroup(key=0x1A3F)
    → collectAsStateWithLifecycle reads Flow → creates MutableState<List<FeedItem>>
    → LazyColumn composable called
    → Composer.endRestartGroup() → registers restart scope

Step 3: Build LayoutNode tree

  Each composable that produces UI creates a LayoutNode:

  LayoutNode (root)
  └── LayoutNode (LazyColumn — SubcomposeLayout)
      ├── LayoutNode (FeedCard #0)     ← only visible items!
      │   └── LayoutNode (Card)
      │       └── LayoutNode (Column)
      │           ├── LayoutNode (Text: "Alice")
      │           └── LayoutNode (Text: "Paid Bob for lunch")
      ├── LayoutNode (FeedCard #1)
      │   └── ...
      └── LayoutNode (FeedCard #2)
          └── ...

KEY INSIGHT: LazyColumn does NOT compose all 100 items.
It only composes items visible on screen (~3-5 items).
This happens via SubcomposeLayout (explained in section 3).
```

### The Slot Table After Composition

```
Slot Table (flat array):

Index:  [0]        [1]        [2]        [3]        [4]      ...
Data:   Group:     State:     Group:     Group:     State:
        FeedScreen items[]    LazyColumn FeedCard0  "Alice"

Groups encode the call tree:
  Group(FeedScreen) {
      State(items = [...])
      Group(LazyColumn) {
          Group(FeedCard) {
              State("Alice")
              State("Paid Bob for lunch")
          }
          Group(FeedCard) { ... }
      }
  }

The slot table IS the composition tree.
It's a flat array, not a pointer-based tree, for cache locality.
Each group has: key, data slots, child count, parent index.
```

---

## 3. SubcomposeLayout: How LazyColumn Defers Work

### Why LazyColumn Can't Use Regular Layout

```
Regular Layout (Column, Row, Box):
  1. COMPOSITION: compose ALL children → build full LayoutNode tree
  2. LAYOUT: measure all children
  3. DRAW: draw all children

Problem for lists: 1000 items → 1000 LayoutNodes created upfront = slow + memory waste

SubcomposeLayout (LazyColumn, LazyRow, BoxWithConstraints):
  1. COMPOSITION: compose ONLY the SubcomposeLayout node itself (no children yet)
  2. LAYOUT: receive constraints → NOW compose children on-demand
  3. DRAW: draw only what was composed

The key difference: composition of children happens DURING the layout phase.
```

### How LazyColumn Decides What to Compose

```
Layout phase begins → LazyColumn receives constraints:
  maxWidth = 1080px, maxHeight = 1920px

LazyColumn's measure policy runs:

  fun measure(constraints: Constraints): MeasureResult {
      val viewportHeight = constraints.maxHeight  // 1920px

      // 1. Determine which items are visible
      var offset = 0
      var firstVisible = scrollState.firstVisibleItemIndex
      var firstVisibleOffset = scrollState.firstVisibleItemScrollOffset

      // 2. Compose + measure items until viewport is filled
      val visibleItems = mutableListOf<LazyListItem>()
      var currentOffset = -firstVisibleOffset

      while (currentOffset < viewportHeight && index < itemCount) {
          // THIS IS THE KEY: subcompose() composes a single item
          val itemContent = subcompose(key = items[index].key) {
              // This @Composable block runs NOW, during layout
              itemContentFactory(items[index])
          }

          // Measure the just-composed item
          val placeable = itemContent.first().measure(
              Constraints(maxWidth = constraints.maxWidth)
          )

          visibleItems.add(LazyListItem(index, placeable, currentOffset))
          currentOffset += placeable.height + spacingPx
          index++
      }

      // 3. Return placement instructions
      return layout(constraints.maxWidth, constraints.maxHeight) {
          visibleItems.forEach { item ->
              item.placeable.place(0, item.offset)
          }
      }
  }

Timeline:
  compose FeedCard#0 → measure → height=200px → offset=0
  compose FeedCard#1 → measure → height=180px → offset=208 (200+8 spacing)
  compose FeedCard#2 → measure → height=220px → offset=396
  compose FeedCard#3 → measure → height=190px → offset=624
  ...until currentOffset >= 1920px (viewport filled)
  STOP composing — remaining items don't exist in the tree yet
```

### SubcomposeLayout Internals

```
SubcomposeLayout maintains its own SubcomposeState:

  class SubcomposeState {
      // Separate compositions for each item
      val compositions: MutableMap<Any, Composition> = mutableMapOf()

      fun subcompose(key: Any, content: @Composable () -> Unit): List<Measurable> {
          val existing = compositions[key]
          if (existing != null) {
              // Item was already composed (e.g., still visible after scroll)
              // Update composition if content changed
              existing.setContent(content)
          } else {
              // New item — create a new sub-composition
              val composition = Composition(subcomposerFactory, applier)
              composition.setContent(content)
              compositions[key] = composition
          }
          return measurablesFor(key)
      }

      fun disposeUnused(activeKeys: Set<Any>) {
          // Items scrolled off-screen — dispose their compositions
          val toRemove = compositions.keys - activeKeys
          toRemove.forEach { key ->
              compositions[key]?.dispose()  // removes LayoutNodes, clears state
              compositions.remove(key)
          }
      }
  }

IMPORTANT: Each sub-composed item has its OWN Composition.
  - Has its own slot table slice
  - State (remember { }) is scoped to the item
  - Disposing = clearing remember state + removing LayoutNodes
  - This is why key matters — wrong key = wrong state
```

---

## 4. Phase 2 — Layout: Measuring and Placing

### Constraints Flow DOWN, Sizes Flow UP

```
Layout is a single-pass tree walk (unlike View system which can multi-pass):

MEASURE PASS (top-down constraints, bottom-up sizes):

  Root: constraints = (0..1080, 0..1920)  ← screen size
  │
  ├── fillMaxSize() modifier:
  │   Overrides constraints to EXACT: (1080x1920)
  │
  └── LazyColumn LayoutNode:
      receives: Constraints(minW=1080, maxW=1080, minH=1920, maxH=1920)
      │
      ├── contentPadding(16.dp = 48px):
      │   Shrinks available width: 1080 - 48*2 = 984px
      │
      └── For each visible item, subcompose then measure:

          FeedCard#0: receives Constraints(minW=0, maxW=984, minH=0, maxH=∞)
          │
          ├── fillMaxWidth() modifier:
          │   Forces: Constraints(minW=984, maxW=984, minH=0, maxH=∞)
          │
          └── Card LayoutNode:
              │ measures its child with same width, adds elevation/shape
              │
              └── Column LayoutNode:
                  │ measures children sequentially
                  │
                  ├── padding(16.dp) modifier:
                  │   Shrinks: maxW = 984 - 32 = 952px
                  │
                  ├── Text("Alice") LayoutNode:
                  │   receives: Constraints(minW=0, maxW=952, minH=0, maxH=∞)
                  │   TextLayoutResult → measures text → intrinsic size
                  │   REPORTS: width=120px, height=56px
                  │
                  └── Text("Paid Bob for lunch") LayoutNode:
                      receives: Constraints(minW=0, maxW=952, minH=0, maxH=∞)
                      TextLayoutResult → measures text → intrinsic size
                      REPORTS: width=340px, height=48px

          SIZES FLOW BACK UP:
            Text("Alice") = 120x56
            Text("Paid Bob...") = 340x48
            Column inner = 952 x (56 + 48) = 952x104
            Column + padding = 984 x (104 + 32) = 984x136
            Card = 984x136 + shape/elevation
            FeedCard#0 reports to LazyColumn: 984x140
```

### The Single-Pass Guarantee

```
Compose FORBIDS measuring a child twice with different constraints.

Why? The View system's measure/remeasure pattern causes exponential blowup:
  RelativeLayout with 3 children → up to 8 measure passes
  Nested RelativeLayouts → O(2^depth) measurements

Compose enforces single-pass:
  val placeable = measurable.measure(constraints)  // OK
  val placeable2 = measurable.measure(otherConstraints)  // CRASH!
  // IllegalStateException: "measure() may not be called multiple times"

Escape hatch: intrinsicMeasurements
  Modifier.width(IntrinsicSize.Max)
  → Asks children for their PREFERRED size without actually measuring
  → Then measures once with the computed constraint
  → Still single-pass for the actual measure call
```

---

## 5. Text Measurement Deep Dive

### How Text Actually Measures

```
Text("Paid Bob for lunch", style = bodyMedium)

Step 1: Resolve TextStyle
  bodyMedium → fontSize=14.sp, fontWeight=Normal, letterSpacing=0.25.sp
  14.sp × density(e.g. 2.75) = 38.5px font size

Step 2: Create ParagraphStyle → pass to Android's TextPaint
  TextPaint {
      textSize = 38.5f
      typeface = Typeface.create("Roboto", NORMAL)
      letterSpacing = 0.25.sp.toPx() / textSize
  }

Step 3: Layout the text using Android's StaticLayout (under the hood)
  StaticLayout.Builder
      .obtain(text, 0, text.length, textPaint, maxWidth=952px)
      .setLineSpacing(...)
      .setIncludeFontPadding(false)  // Compose defaults
      .build()

Step 4: StaticLayout computes:
  - How many lines (based on text length vs available width)
  - Where line breaks occur (word-wrap boundaries)
  - Height of each line (font metrics: ascent + descent + leading)
  - Total paragraph height

  "Paid Bob for lunch" at 38.5px in 952px width:
    Line 1: "Paid Bob for lunch" (fits in one line)
    Width used: 340px
    Height: ascent(32px) + descent(8px) + leading(8px) = 48px

Step 5: Report Placeable size
  width = min(maxWidth, textWidth) = min(952, 340) = 340px
  height = totalLineHeight = 48px

BUT the parent (Column with fillMaxWidth) constrains minWidth=952:
  → Final reported width = 952px (stretched to fill)
  → Text is left-aligned within 952px wide area
```

### What Happens With Longer Text (Multi-Line)

```
Text("Paid Bob for a really expensive fancy dinner at the new Italian restaurant downtown")

Same 952px maxWidth, but text is longer:

  StaticLayout line-breaks:
    Line 1: "Paid Bob for a really expensive fancy"   (930px, fits)
    Line 2: "dinner at the new Italian restaurant"    (890px, fits)
    Line 3: "downtown"                                 (180px)

  Height = 3 lines × 48px/line = 144px (was 48px for short text)

  The Text node reports: width=952, height=144

THIS CHANGE PROPAGATES UP:
  Column inner height: 56 (title) + 144 (body) = 200px (was 104px)
  Column + padding: 200 + 32 = 232px (was 136px)
  Card: 232px + extras = ~236px (was ~140px)
  FeedCard#0 reports to LazyColumn: 984x236

LazyColumn sees this item is now taller:
  → Items below shift down
  → Fewer items fit on screen
  → Last item might scroll off-screen (disposed)
```

---

## 6. Phase 2b — Placement: Positioning Nodes

### After All Children Are Measured, Place Them

```
Placement is the second half of the layout phase.
Each parent decides WHERE to put its children.

LazyColumn placement:
  layout(width = 1080, height = 1920) {
      // contentPadding offset
      val startPadding = 48  // 16.dp

      item0.place(x = startPadding, y = startPadding + 0)
      item1.place(x = startPadding, y = startPadding + item0.height + spacing)
      item2.place(x = startPadding, y = startPadding + item0.height + item1.height + 2*spacing)
      // ...
  }

Column (inside Card) placement:
  layout(width = 952, height = 104) {
      titleText.place(x = 0, y = 0)       // "Alice" at top
      bodyText.place(x = 0, y = 56)       // "Paid Bob..." below title
  }

The result is absolute coordinates for every LayoutNode:

  LayoutNode tree with positions:
  Root (0, 0, 1080, 1920)
  └── LazyColumn (0, 0, 1080, 1920)
      ├── FeedCard#0 (48, 48, 1032, 188)
      │   └── Card (0, 0, 984, 140)
      │       └── Column (16, 16, 968, 120)
      │           ├── Text:Alice (0, 0, 952, 56)
      │           └── Text:PaidBob (0, 56, 952, 104)
      ├── FeedCard#1 (48, 196, 1032, 376)
      │   └── ...
      └── FeedCard#2 (48, 384, 1032, ...)
          └── ...
```

---

## 7. Phase 3 — Draw: Pixels on Screen

### How Each Node Draws

```
Draw traversal is top-down through the LayoutNode tree.
Each node has an associated RenderNode (hardware-accelerated display list).

Draw order for FeedCard#0:

  1. Card draws:
     → canvas.drawRoundRect(bounds, cornerRadius, paint)  // card background
     → canvas.drawShadow(elevation)                        // shadow/elevation

  2. Column draws:
     → No visual output (Column is just a layout container)
     → But it sets up clip and offset for children

  3. Text("Alice") draws:
     → TextPainter.paint(canvas, textLayoutResult)
     → Internally: canvas.drawText("Alice", x, baseline, textPaint)
     → Uses Android's hardware-accelerated text rendering (Skia → GPU)

  4. Text("Paid Bob for lunch") draws:
     → Same as above, at its offset position

Each node records drawing commands into a DisplayList (RenderNode):
  RenderNode {
      setPosition(left, top, right, bottom)
      beginRecording(width, height)
      // canvas draw commands recorded here
      endRecording()
  }

The RenderThread (separate from Main thread) then:
  1. Walks the RenderNode tree
  2. Sends GPU commands via OpenGL ES / Vulkan
  3. GPU composites and displays the frame
  4. Main thread is FREE during GPU rendering
```

### Hardware Layers and Caching

```
When a node has graphicsLayer { }, Compose creates a separate RenderNode:

  Modifier.graphicsLayer {
      alpha = 0.5f
      translationY = offset
  }

  → Own RenderNode → draw commands cached as GPU texture
  → Changing alpha/translation → GPU re-composites (no re-draw!)
  → This is why graphicsLayer changes are so cheap:
    No composition, no measure, no draw — just GPU matrix operations

Without graphicsLayer:
  alpha change → re-DRAW the entire composable (re-record canvas commands)

With graphicsLayer:
  alpha change → GPU applies alpha to cached texture (sub-millisecond)
```

---

## 8. What Happens When Text Size Increases

### Scenario: User Changes System Font Size (or Dynamic Type)

```
User goes to Settings → Display → Font Size → changes from "Default" to "Large"

System broadcasts: Configuration change (fontScale changes from 1.0 to 1.3)

Two paths depending on app setup:

Path A: Activity recreates (default)
  → onCreate again → full composition from scratch
  → All measurements use new fontScale
  → Entire tree rebuilt — nothing interesting here

Path B: Activity handles configChanges (or Compose density changes)
  → LocalDensity updates (fontScale 1.0 → 1.3)
  → This is a CompositionLocal change
  → Every composable reading LocalDensity gets invalidated
  → THIS is where it gets interesting ↓
```

### Scenario: A State Change Makes Text Longer

```
More realistic interview scenario:
  User taps "Show More" → description text goes from 1 line to 5 lines

// ViewModel
fun onShowMoreClicked(itemId: String) {
    _items.update { list ->
        list.map {
            if (it.id == itemId) it.copy(description = it.fullDescription)
            else it
        }
    }
}
```

### Step-by-Step: What the Framework Does

```
STEP 1: STATE CHANGE
  MutableStateFlow._value changes
  → collectAsStateWithLifecycle converts to Compose State
  → Snapshot system records: "items State was written"
  → All scopes that READ items are invalidated

STEP 2: RECOMPOSITION SCHEDULED
  Recomposer adds FeedScreen to the invalidation queue
  → On the next frame (VSYNC), recomposition begins

STEP 3: RECOMPOSITION RUNS (Composition Phase)
  FeedScreen re-executes:
    val items by viewModel.items.collectAsStateWithLifecycle()
    → items list has changed → LazyColumn sees new data

  LazyColumn's items() block:
    The item factory is called for the changed item
    → FeedCard(item) recomposes for the item with new description

  FeedCard recomposes:
    → Text(item.description) gets new text: "Really long description..."
    → Text creates a new TextLayoutRequest

  Other FeedCards: $changed bitmask shows their item didn't change
    → Composer.skipToGroupEnd() — SKIPPED entirely
    → No work done for unchanged items

STEP 4: LAYOUT PHASE RE-RUNS (for affected nodes only)
  The Text node with new text → needs remeasure
    → StaticLayout computes: 1 line → 5 lines
    → Old height: 48px → New height: 240px

  Size change propagates UP:
    Text reports new height → Column remeasures
    Column reports new height → Card remeasures
    Card reports new height → FeedCard reports new height
    FeedCard reports new height → LazyColumn remeasures

  LazyColumn sees item got taller:
    → Items BELOW the changed item shift down
    → Last visible item might no longer fit
    → If so: dispose its composition (scroll off screen)
    → Or: one more item might now fit (compose a new one)

STEP 5: DRAW PHASE (only affected regions)
  Only the changed FeedCard and items below it re-draw
  Unchanged items above: cached RenderNode → no re-draw

TOTAL WORK:
  ✅ Recompose: 1 FeedCard (others skipped)
  ✅ Remeasure: Text → Column → Card → FeedCard → LazyColumn
  ✅ Reposition: items below the changed one
  ✅ Redraw: changed card + repositioned cards
  ❌ Did NOT recompose all 100 items
  ❌ Did NOT remeasure unchanged items
```

---

## 9. Relayout Propagation: The Full Chain

### How Invalidation Travels Through the Tree

```
When a leaf node's size changes, layout invalidation travels UP to the root,
then remeasurement travels DOWN from the first affected ancestor.

INVALIDATION (bottom-up):
  Text node size changed
    → marks itself as needsRemeasure = true
    → marks parent Column as needsRemeasure = true
    → marks parent Card as needsRemeasure = true
    → marks parent FeedCard as needsRemeasure = true
    → marks parent LazyColumn as needsRemeasure = true
    → marks Root as needsRelayout = true

  NOT every ancestor needs remeasure:
  If the parent has FIXED constraints (e.g., fillMaxWidth)
  and the child got TALLER but not wider:
    → Parent width unchanged (no horizontal remeasure needed)
    → Parent height may change (vertical remeasure needed)
    → Compose tracks both dimensions independently

REMEASUREMENT (top-down, only flagged nodes):
  Root: needsRelayout? → dispatch to children
    LazyColumn: needsRemeasure?
      → re-run measure policy
      → subcompose(item0) → already composed, check if needs remeasure
        FeedCard#0: needsRemeasure?
          Card: needsRemeasure?
            Column: needsRemeasure?
              Text("Alice"): NOT flagged → SKIP (keep cached size)
              Text(description): flagged → remeasure
                → StaticLayout with new text → new height
              → Column height = title.height + newBody.height
            → Card height = Column.height + padding
          → FeedCard height = Card.height
        → LazyColumn records new height for item0

      FeedCard#1: needsRemeasure? NO → use cached size
      FeedCard#2: needsRemeasure? NO → use cached size
      → But their POSITIONS change (item0 got taller)
      → needsReplace = true → place() with new y-offsets

    LazyColumn: re-run placement with updated offsets
      item0.place(48, 48)      // same position
      item1.place(48, 332)     // was 196, now 332 (item0 grew)
      item2.place(48, 520)     // shifted down
```

### The LayoutNode Flags

```
Each LayoutNode tracks what work it needs:

  class LayoutNode {
      var needsRemeasure: Boolean = false
      var needsRelayout: Boolean = false   // placement only
      var needsRedraw: Boolean = false

      // When child reports new size:
      fun onChildSizeChanged() {
          if (this.needsRemeasure) return  // already scheduled
          this.needsRemeasure = true
          parent?.onChildSizeChanged()     // propagate up
      }
  }

  Optimization: If a child changes size but the parent's constraints
  were EXACT (e.g., fillMaxSize), the parent's OWN size won't change.
  → Parent marks needsRelayout (re-place children)
  → But does NOT propagate further up (grandparent unaffected)

  Example:
    LazyColumn has fillMaxSize() → its size is ALWAYS 1080x1920
    Even when items inside change height, LazyColumn's size stays the same
    → Only LazyColumn needs relayout, root does NOT need remeasure
    → Propagation stops at LazyColumn
```

---

## 10. Scrolling: How New Items Appear

### Scroll Event to New Pixels: Frame-by-Frame

```
User drags finger up (scroll down):

FRAME 1: Touch event received
  MotionEvent(ACTION_MOVE, dy = -30px)
  → LazyColumn's ScrollableState updates offset
  → scroll offset: 0 → 30px

  LazyColumn's measure policy re-runs:
    firstVisibleItemIndex = 0
    firstVisibleItemScrollOffset = 30px  // item0 shifted up 30px

    item0: was at y=48, now at y=18 (48-30)
    item1: was at y=196, now at y=166
    item2: was at y=384, now at y=354
    ...

    Check: Does a new item fit at the bottom?
      lastItemBottom = item2.bottom = 354 + 190 = 544
      viewportBottom = 1920
      Gap = 1920 - 544 = 1376px → YES, more items fit

    subcompose(item3) → compose FeedCard#3 → measure → place
    subcompose(item4) → compose FeedCard#4 → measure → place
    ...until viewport filled

    Check: Has item0 scrolled completely off the top?
      item0.bottom = 18 + 140 = 158 → still visible
      → Keep item0

FRAME 2: Touch continues (dy = -30px more)
  scroll offset: 30 → 60px
  → same process, items shift up by 30px more

...

FRAME N: item0 scrolled off screen
  item0.bottom = 48 - totalScroll + 140 < 0  → NOT visible
  → LazyColumn does NOT subcompose item0 anymore
  → item0's Composition is DISPOSED
    → remember { } state is lost
    → LayoutNodes removed from tree
    → DisposableEffect.onDispose() runs
    → LaunchedEffect coroutine is cancelled
```

### Prefetching (LazyColumn Optimization)

```
LazyColumn doesn't wait until an item is visible to compose it.
It PREFETCHES items that are about to become visible.

  class LazyListPrefetchStrategy {
      // After layout, check which items are NEAR the viewport edge
      fun onScroll(delta: Int, visibleItems: List<LazyListItem>) {
          val scrollingDown = delta > 0
          if (scrollingDown) {
              val lastVisible = visibleItems.last()
              val nextIndex = lastVisible.index + 1
              // Schedule composition of next item on IDLE frames
              prefetchScheduler.schedule(nextIndex)
          }
      }
  }

  Prefetch runs during frame idle time (after draw, before next VSYNC):
    1. Subcompose the prefetch item → build its LayoutNodes
    2. Pre-measure it (using estimated constraints)
    3. When it actually becomes visible → just place it (no compose/measure delay)

  Result: Smooth scrolling even with complex items
  Without prefetch: visible stutter as items compose on-demand
```

---

## 11. Performance: Keys, ContentType, Prefetch

### Why `key` Matters for Lists

```kotlin
// WITHOUT key:
items(items) { item -> FeedCard(item) }

// What happens when item at index 2 is deleted:
//   Index 0: was FeedCard(Alice) → still FeedCard(Alice) ✓
//   Index 1: was FeedCard(Bob) → still FeedCard(Bob) ✓
//   Index 2: was FeedCard(Charlie) → now FeedCard(Dana) ✗ MISMATCH
//   Index 3: was FeedCard(Dana) → now FeedCard(Eve) ✗ MISMATCH
//   Index N-1: was FeedCard(Zara) → GONE → dispose
//
// Compose identifies items by INDEX → items 2..N all recompose
// All remember {} state shifts (wrong state in wrong card)

// WITH key:
items(items, key = { it.id }) { item -> FeedCard(item) }

// Same deletion:
//   key="alice": FeedCard(Alice) → still here ✓ SKIP
//   key="bob": FeedCard(Bob) → still here ✓ SKIP
//   key="charlie": GONE → dispose composition
//   key="dana": FeedCard(Dana) → still here ✓ SKIP (was index 3, now index 2)
//   ...
//
// Only 1 disposal, 0 recompositions — O(1) vs O(n)
// remember {} state stays with the correct item
```

### Why `contentType` Matters

```kotlin
items(
    items = items,
    key = { it.id },
    contentType = { it.type },  // "transaction", "promo", "social"
) { item ->
    when (item) {
        is Transaction -> TransactionCard(item)
        is Promo -> PromoCard(item)
        is Social -> SocialCard(item)
    }
}

// Without contentType:
//   Item scrolls off → composition disposed
//   New item scrolls on → compose from scratch
//   Every. Single. Time.

// With contentType:
//   LazyColumn maintains a POOL of compositions per content type:
//
//   Pool["transaction"]: [Composition#1, Composition#2]  ← recycled
//   Pool["promo"]: [Composition#5]                       ← recycled
//
//   Transaction scrolls off → composition returned to "transaction" pool
//   New transaction scrolls on → grab from pool → update with new data
//   MUCH cheaper than creating a new composition

// Analogy: RecyclerView's viewType → ViewHolder recycling
// contentType = viewType for Compose
```

### Measuring Scroll Performance

```
Key metrics (check with Android Studio Profiler):

1. Frame rendering time (must be < 16ms for 60fps)
   Layout Inspector → Show Recomposition Counts

2. Recomposition count per scroll frame
   Should be ~0 for non-changed items
   If items recompose on scroll → stability issue

3. Composition count during fast fling
   Prefetch should handle most items
   Spike in composition = missing prefetch or heavy items

4. Memory during scroll
   Stable memory = proper disposal
   Growing memory = leaked compositions or state

Debug tools:
  Modifier.debugInspectorInfo { }
  Layout Inspector → recomposition highlights
  Compose compiler reports → stability
  systrace / Perfetto → frame timing
```

---

## 12. Interview Cheat Sheet

### "How does Compose render a list?" — The Answer

```
1. LazyColumn uses SubcomposeLayout
   → Only composes items that are visible (not all N items)
   → Composition of children happens DURING the layout phase

2. Three-phase pipeline:
   COMPOSITION: Build LayoutNode tree (slot table)
   LAYOUT: Constraints flow down, sizes flow up (single-pass)
   DRAW: Canvas commands → RenderNode → GPU

3. When data changes:
   → Snapshot system detects State write
   → Invalidates the recomposition scope (FeedScreen)
   → Recomposition: only changed items re-execute (others skip)
   → Layout: only affected items remeasure, positions recalculated
   → Draw: only affected regions repainted

4. When items scroll:
   → New items subcomposed on-demand (with prefetch for smoothness)
   → Off-screen items disposed (state cleared)
   → key preserves identity across reorderings
   → contentType enables composition recycling
```

### "What happens when text gets larger?" — The Answer

```
1. Text node remeasures with StaticLayout
   → More lines → taller height reported

2. Size change propagates up:
   Text → Column → Card → FeedCard → LazyColumn
   Each ancestor checks: did MY size change?
   LazyColumn: fixed size (fillMaxSize) → propagation STOPS here

3. LazyColumn re-places all items below the changed one
   → Items shift down
   → Bottom items may scroll off (disposed)
   → Or new space opens up (nothing happens)

4. Only the DRAW phase re-runs for changed + shifted items
   Items above the change: untouched (cached RenderNode)
```

### "How is this different from RecyclerView?" — The Answer

```
RecyclerView:
  - ViewHolder pattern: inflate XML → bind data → recycle ViewHolder
  - ViewType → ViewHolder pool (explicit recycling)
  - DiffUtil computes list changes
  - Adapter notifies: notifyItemInserted/Removed/Changed
  - Prefetch via LayoutManager.setItemPrefetchEnabled

LazyColumn:
  - SubcomposeLayout: compose → measure → draw (declarative)
  - contentType → Composition pool (implicit recycling)
  - Snapshot system detects state changes automatically
  - No explicit notify calls — recomposition handles it
  - Prefetch via LazyListPrefetchStrategy

Performance comparison:
  RecyclerView: Faster initial render (ViewHolder is a View — cheaper than Composition)
  LazyColumn: Simpler updates (no DiffUtil, no Adapter boilerplate)
  Both: O(visible items) work per frame, O(1) scroll per item

When RecyclerView wins:
  - Very long lists (10,000+ items) with simple items
  - ViewHolder recycling is more battle-tested

When LazyColumn wins:
  - Complex items with conditional content
  - Nested scrolling scenarios
  - Shared element transitions
  - Simpler code with less boilerplate
```

### Key Numbers to Know

```
Target frame budget:    16ms (60fps) / 8ms (120fps)
Text measure cost:      0.1-0.5ms per Text node (depends on length)
Composition cost:       0.5-2ms per moderately complex item
Layout cost:            0.1-0.3ms per item (single-pass)
Draw cost:              0.1-0.2ms per item (hardware-accelerated)
graphicsLayer change:   <0.1ms (GPU-only, no recomposition/relayout)
Prefetch window:        ~2 items ahead of scroll direction
SubcomposeLayout overhead: ~0.2ms per subcomposition vs regular Layout
```
