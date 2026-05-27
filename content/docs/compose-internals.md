---
title: "Compose Internals Mastery"
weight: 7
---

# Compose Internals Mastery

> [!NOTE]
> **Full book-depth reference from *Jetpack Compose Internals* (Jorge Castillo).** All 7 chapters: compiler IR, slot table & change list, Composer/Applier, Recomposer lifecycle, Compose UI (multi-composition, LookaheadLayout, semantics), MVCC snapshots, effect handlers, custom Appliers. LazyColumn trace → [Compose Rendering]({{< relref "/docs/compose-rendering" >}}). Production patterns → [Compose Mastery]({{< relref "/docs/compose-mastery" >}}).

---

## Table of Contents

1. [Mental Model](#1-mental-model)
2. [Composable Contracts](#2-composable-contracts)
3. [Compose Compiler](#3-compose-compiler)
4. [Compose Runtime](#4-compose-runtime)
5. [Composition Lifecycle](#5-composition-lifecycle)
6. [Recomposer](#6-recomposer)
7. [Compose UI](#7-compose-ui)
8. [Measuring, Intrinsics & Lookahead](#8-measuring-intrinsics--lookahead)
9. [Modifiers, Draw & Semantics](#9-modifiers-draw--semantics)
10. [Snapshot System (MVCC)](#10-snapshot-system)
11. [Effects & Effect Handlers](#11-effects)
12. [Advanced Runtime (Custom Appliers)](#12-advanced-runtime)
13. [Interview Rapid-Fire](#13-interview-rapid-fire)

---

## 1. Mental Model

### Three Layers

```
YOUR CODE (@Composable)
        │
        ▼
┌───────────────────┐
│  Compose Compiler │  Kotlin compiler plugin (NOT kapt)
│  IR lowering      │  Injects Composer, groups, skipping, stability
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Compose Runtime  │  Slot table, Composer, Recomposer, Snapshots
│  (UI-agnostic)    │  Emits deferred Change list → Applier
└─────────┬─────────┘
          ▼
┌───────────────────┐
│  Compose UI       │  UiApplier → LayoutNode → Owner → pixels
│  (one client)     │  Also: Desktop, Web (DOM), Vector, Mosaic CLI
└───────────────────┘
```

Composable functions **do not return UI**. They **emit deferred changes** into a slot table during composition. Layout and draw happen later on the materialized tree.

### Emit → Record → Apply

```
Composition/recomposition:
  1. Execute @Composable bodies
  2. Each call "emits" → records Change lambdas (deferred, fast)
  3. Changes reference current slot table state
  4. When composition finishes → applyChanges() runs all Changes in batch
  5. Slot table updated + Applier mutates materialized tree
  6. RememberObserver callbacks (LaunchedEffect, DisposableEffect)
  7. SideEffects (Composer-recorded, not lifecycle-aware)
  8. Layout + draw (Compose UI Owner)
```

---

## 2. Composable Contracts

Six runtime contracts. Violating any breaks correctness or performance.

| Property | Meaning | Violation |
|----------|---------|-----------|
| **Calling context** | Only from `@Composable` or `setContent` | Compile error |
| **Idempotent** | Same inputs → same emitted tree | Flicker, wrong UI |
| **Side-effect free** | No uncontrolled I/O in body | Infinite loops, duplicate network |
| **Restartable** | Runtime may re-execute anytime | — (compiler enforces) |
| **Fast** | Microseconds per call | Jank on scroll/animation |
| **Positional identity** | Call site = slot identity | Wrong state after list reorder |

### Function Coloring

`@Composable` injects implicit `Composer` (like `suspend` injects `Continuation`). Regular and composable functions don't mix without an integration point: `setContent`, `ComposeView.setContent`, or **inline** lambdas (`Column { }` inlines content into your body).

**Execution order is NOT guaranteed.** `Header()` and `Footer()` may run in parallel. Never coordinate via shared mutable vars between sibling composables.

### Positional Memoization

```
Identity = source location + call order + explicit key()

Same function, same args, different call sites → different slot ids:
  Text("A")  // id 1
  Text("A")  // id 2

Loop without key → identity by ORDER → insert at top = O(n) recompose
Loop with key(talk.id) → identity by ID → O(1) updates

remember = manual positional memoization within enclosing composable's slot range
```

---

## 3. Compose Compiler

### Kotlin Compiler Plugin

Registered via `ComponentRegistrar` → hooks Kotlin frontend + IR pipeline. **Not kapt.**

```
FRONTEND  → static analysis (fast, inline in IDE)
IR        → lowering (inject Composer, groups, remember, lambdas)
BACKEND   → bytecode
```

### Annotations

| Annotation | Promise |
|------------|---------|
| `@Immutable` | All public state frozen after construction (stronger than `val`) |
| `@Stable` | Mutable internals OK if public API contract stable; or pure function |
| `@ReadOnlyComposable` | Read composition only — no writes |
| `@DisallowComposableCalls` | Block composable calls in non-inline lambda |
| `@NonRestartableComposable` / `@NonSkippableComposable` | Advanced opt-out |

Today `@Immutable` and `@Stable` are treated identically for skipping. Annotations exist for future semantic split.

### Static Checkers (Frontend)

```
✗ Composable inside try/catch
✗ Composable from non-@Composable lambda (unless inline chain resolves)
✗ Composable function references (unsupported)
✗ @Composable + suspend on same function
✗ @ReadOnlyComposable calling read-write composables
✗ Override breaking composable contract
```

Call checkers walk PSI tree upward from each composable call — handles inline lambdas, property accessors, try blocks.

### IR Lowering

```
1. Inject $composer, $changed into every @Composable
2. startRestartGroup(sourceKey) ... endRestartGroup()
3. Skipping: if stable params unchanged → skipToGroupEnd()
4. Comparison propagation: parent passes changed-param bitmask to children
5. Control-flow groups: if/when/loops → separate groups per branch
6. remember → cache(invalid, block) slot read/write
7. Lambda memoization: stable captures cached in slots
8. Live literals (debug): const → runtime state for Studio hot reload
9. Klib decoy generation: KMP ABI compatibility
10. Stability inference on data classes
```

### Stability

```
STABLE: primitives, String, enum, function types, all-stable data class, @Stable/@Immutable
UNSTABLE: var, List/Map/Set interfaces, external module types, custom getters with side effects

Report: ./gradlew assembleRelease -PcomposeCompilerReports=true
Fix: @Immutable, ImmutableList, compose-stability.conf
Look for: "restartable" but NOT "skippable"
```

---

## 4. Compose Runtime

### Slot Table + Gap Buffer

Flat array (cache-friendly), not a pointer tree.

```
[GroupStart, key, data, State, GroupEnd, GroupStart, ...]

Gap buffer (text-editor technique):
  [A, B, C, __gap__, D, E]  → local insert/delete = O(1)
  Random access → move gap O(k)

Stores: group markers, remembered values, mutableStateOf, CompositionLocals,
        lambdas, source info (debug), CompositionContext refs

Anchor: stable pointer to a group — updated when groups move/insert/delete
        before the anchor position
```

### List of Changes

Every composition/recomposition produces a **Change list** — deferred lambdas:

```kotlin
// Conceptual type:
typealias Change = (
    applier: Applier<*>,
    slots: SlotWriter,
    rememberManager: RememberManager
) -> Unit
```

```
Emit = record Change (NOT apply immediately) → composition stays fast
Apply = batch execute all Changes after composition completes

Change types map to Applier ops:
  insert, remove, move, clear, down/up navigation, reuse node, update property
```

**Reader/writer sync:** While composing, writer may be ahead of reader until apply. A **delta** tracks unrealized distance between reader and writer cursors.

### Composer — Feeding the Tree

`Layout` emits via `ReusableComposeNode`:

```kotlin
// Simplified flow:
currentComposer.startReusableNode()
currentComposer.createNode(factory)           // LayoutNode()
Updater(currentComposer).update { ... }     // set measurePolicy, density, etc.
currentComposer.startReplaceableGroup(key)
content()                                    // children
currentComposer.endReplaceableGroup()
currentComposer.endNode()
```

`remember` → `currentComposer.cache(invalid, calculation)` — read slot, compute if empty, write slot.

### Group Lifecycle

When Composer starts a group:

```
IF inserting:
  → write directly to slot table (or intermediate insertTable)

ELSE IF group exists at same key:
  → reuse (ReusableComposeNode optimization — skip create/init)

ELSE IF group moved:
  → record move operation

ELSE IF group new:
  → enter inserting mode

ELSE:
  → start reading existing group (recomposition walk)
```

Group types: restartable, replaceable, movable, reusable, defaults-wrapper (for default param remember blocks).

**Not all groups are restartable.** Only composables that **read snapshot state** get active `RecomposeScope` (`endRestartGroup()?.updateScope { }` returns non-null).

### RecomposeScope

```
Scope = smallest independently restartable region
State read during scope → scope invalidated on write
State read in inline Column {} → attributed to ENCLOSING scope

Manual invalidation: composer.currentRecomposeScope().invalidate()
Invalidated scopes → stack on Recomposer → recomposed next frame

Donut-hole skipping: stable unchanged param → skipToGroupEnd() → children never run
```

### Applier Contract

```kotlin
interface Applier<N> {
    val current: N
    fun down(node: N); fun up()
    fun insertTopDown(index: Int, instance: N)
    fun insertBottomUp(index: Int, instance: N)
    fun remove(index: Int, count: Int)
    fun move(from: Int, to: Int, count: Int)
    fun clear()
    fun onBeginChanges(); fun onEndChanges()
}
```

**Pick ONE insertion strategy per Applier — never both:**

```
Top-down insert B→R, A→B, C→B:
  If each insert notifies all ancestors → O(exponential) notifications

Bottom-up insert A,C→B, then B→R:
  Parent not attached yet → only notify direct parent → O(1) per insert

UiApplier: insertTopDown IGNORED, insertBottomUp → LayoutNode.insertAt()
```

Node navigation: record `down` ops in stack; play to Applier on apply. Early `up` cancels pending `down`.

### Subcomposition & CompositionContext

```
Composition tree (not flat):
  Root Composition (parent = Recomposer)
    └── Subcomposition (parent = CompositionContext of parent)
          └── Subcomposition ...

Linked via CompositionContext:
  - CompositionLocals propagate as if single tree
  - Invalidations propagate (parent CompositionLocal change → child recompose)
  - Shared Recomposer

Created via: rememberCompositionContext()
Used by: SubcomposeLayout, Dialog, Popup, AndroidView, VectorPainter

Each subcomposition = separate slot table + separate remember {} scope
Disposed independently → cancels LaunchedEffect, frees memory
```

---

## 5. Composition Lifecycle

### Creating a Composition

```kotlin
// Android entry:
Composition(UiApplier(owner.root), parentContext)  // parentContext = Recomposer
wrapped.setContent { MyApp() }

// Vector entry:
Composition(VectorApplier(vector.root), parentContext)
```

`Composition` creates its own `Composer`. `setContent` → `parent.composeInitial(this, content)` → delegates to `Recomposer.composeInitial`.

### Initial Composition (Recomposer)

```
1. Take MutableSnapshot of all StateObject values
2. Register read/write observers on snapshot
3. snapshot.enter { composition.composeContent(content) }
     - startRoot() → startGroup → invoke content → endGroup → endRoot()
     - Composable bodies emit Changes
4. snapshot.apply() → propagate writes to global state
5. composition.applyChanges()
     - applier.onBeginChanges()
     - execute each Change
     - applier.onEndChanges()
6. Dispatch RememberObserver.onRemembered (LaunchedEffect, DisposableEffect)
7. Run SideEffects (Composer-recorded, in order)
```

**Reentrant composition is forbidden** — second compose while first runs throws.

### Recomposition Apply Order

Same as initial, but Composer **walks existing slot table** — matches groups by key, reuses slots, records diffs only.

After apply:
- `RememberObserver.onForgotten` for removed remember values
- SideEffects run again
- Layout/draw if structure or size changed

---

## 6. Recomposer

### Spawning (Android)

```
ViewGroup.setContent
  → WindowRecomposerFactory.createRecomposer(rootView)
  → Links to ViewTreeLifecycleOwner (cancel on destroy — prevents leak)
  → PausableMonotonicFrameClock (pause frames when ON_STOP)
  → Recomposer(AndroidUiDispatcher + frame clock)
  → Lifecycle ON_CREATE: launch { recomposer.runRecomposeAndApplyChanges() }
  → ON_DESTROY: recomposer.cancel()
```

`AndroidUiDispatcher` + `Choreographer` + `MonotonicFrameClock` drive frame-aligned work. This context is default for **applyChanges** and **LaunchedEffect**.

### runRecomposeAndApplyChanges Loop

```
1. Register snapshot apply observer → snapshot invalidations → pending recompose list
2. Suspend until work available (invalidated scopes OR snapshot writes)
3. withFrameNanos { } — coalesce to next VSYNC
4. Dispatch frame callbacks (animations may create new invalidations)
5. Record snapshot invalidations as pending recompositions in Composer
6. For each invalidated Composition → recompose()
7. For trailing invalidations (e.g. CompositionLocal changed in parent, read in child)
8. For each Composition with pending changes → applyChanges()
9. Update Recomposer state
```

### Recomposer States

| State | Meaning |
|-------|---------|
| `Inactive` | Ignores invalidations until `runRecomposeAndApplyChanges` called |
| `InactivePendingWork` | Effects waiting for frame before Recomposer starts |
| `Idle` | Tracking invalidations, nothing to do |
| `PendingWork` | Performing or awaiting recomposition/apply |
| `ShuttingDown` | Cancelled, cleanup in progress |
| `ShutDown` | Dead — cannot reuse |

### Concurrent Recomposition

```kotlin
recomposer.runRecomposeConcurrentlyAndApplyChanges(recomposeCoroutineContext)
```

Invalidated compositions may recompose on background threads via `MutableSnapshot`. `apply()` merges to global; conflict → dispose snapshot, retry on Main. Compose UI doesn't use this by default; available for custom clients.

---

## 7. Compose UI

### Multiple Root Compositions

Each `setContent` / `ComposeView.setContent` = **independent root Composition** with own slot table and LayoutNode tree.

```
App with 3 Fragments (2 use setContent) + 1 Fragment with 3 ComposeViews
  → 5 independent root Compositions, NOT linked
```

Subcompositions **are** linked to parent via `CompositionContext`.

### ReusableComposeNode vs ComposeNode

```
ReusableComposeNode (Layout, Box, Column...):
  - Node fully described by factory + update lambda (no hidden state)
  - On key change: update in place instead of discard + recreate
  - Wraps children in replaceable group

ComposeNode (AndroidView):
  - Has hidden internal state (actual Android View)
  - Must use standard node — cannot reuse in place
```

### LayoutNode Attach Sequence

When `UiApplier.insertBottomUp` attaches a node:

```
1. Validate (no existing parent)
2. Invalidate Z-index sorted children list
3. Attach to parent + attach to Owner (AndroidComposeView)
4. Owner.invalidate() → schedule measure/layout/draw

Owner = AndroidComposeView (extends View)
  - Hooks layout, draw, input, accessibility
  - All LayoutNodes in tree share same Owner
  - setContent creates Owner, sets as root
```

### WrappedComposition

Decorator linking `Composition` to `AndroidComposeView`:
- Pipes `Context`, `LifecycleOwner`, `SavedStateRegistryOwner` as CompositionLocals
- Keyboard/accessibility side effects
- Lifecycle-aware disposal

### Subcomposition Use Cases

**1. Defer composition until measure** (SubcomposeLayout, LazyColumn, BoxWithConstraints):
- Initial composition during **layout phase**, not root composition
- Can recompose independently when layout params change
- Same node type (LayoutNode) as parent

**2. Different node type in subtree** (VectorPainter):
- `Icon` emits LayoutNode in main Composition
- `rememberVectorPainter` creates Subcomposition with `VectorApplier` → `VNode` tree
- Parent CompositionContext links them; Appliers differ

For LazyColumn end-to-end trace → [Compose Rendering]({{< relref "/docs/compose-rendering" >}}).

---

## 8. Measuring, Intrinsics & Lookahead

### Constraints

```kotlin
Constraints(minW, maxW, minH, maxH)  // packed in single Long + bitmasks

Exact:     min == max  (fillMaxSize)
Bounded:   min < max   (wrap content)
Unbounded: max = Infinity  (LazyColumn main axis)
```

```
LazyColumn child constraints:
  maxWidth = parent width (bounded)
  maxHeight = Infinity   (child picks own height)

LazyVerticalGrid cell:
  Constraints.fixedWidth(columnWidth)  // exact width, unbounded height
```

**Single-pass rule:** `measurable.measure(constraints)` once. Second measure with different constraints → crash.

### Three Pre-Calculation Strategies

| Technique | Purpose | Cost |
|-----------|---------|------|
| **SubcomposeLayout** | Defer composition until measure; conditional/lazy children | High — full sub-composition |
| **Intrinsics** | Query preferred size before real measure (e.g. `height(IntrinsicSize.Max)`) | Medium — extra measure lambda calls, same frame |
| **LookaheadLayout** | Pre-calculate target size/position for animations | Medium — cached lookahead pass; skipped when tree unchanged |

```
SubcomposeLayout  → "WHAT to compose" based on space (LazyColumn visible items)
Intrinsics        → "HOW BIG before committing" (Row matches tallest child)
LookaheadLayout   → "WHERE target WILL BE" for animated transitions
```

### LookaheadLayout Deep Dive

Two passes per layout when tree or state changes:

```
Pass 1 (lookahead): measure + place as if animation finished (animations skipped)
Pass 2 (actual):    use lookahead values to animate toward target

Scope modifiers:
  intermediateLayout { measurable, _, lookaheadSize ->
      // animate size toward lookaheadSize
  }
  onPlaced { coordinates ->
      // read lookahead vs current position for position animation
  }

intermediateLayout SKIPPED during lookahead pass (produces intermediate states only)
```

Powers shared element transitions, `animateContentSize`, morph animations. Modern API: `SharedTransitionLayout` builds on this.

---

## 9. Modifiers, Draw & Semantics

### Modifier Ingestion on LayoutNode

```
Modifier.padding().background().clickable()
  → Parsed into Modifier.Node linked list on LayoutNode
  → Each node implements role interfaces:
      LayoutModifierNode, DrawModifierNode, SemanticsModifierNode,
      PointerInputModifierNode, ParentDataModifierNode

New modifier set → chain rebuilt → may invalidate measure/layout/draw
Modifier.composed {} needs Composition context (remember inside)
Modifier.NodeElement → no composition overhead (preferred for lists)
```

Measure: outside-in. Draw: inside-out.

### Draw Pipeline

```
LayoutNode.draw()
  → Walk modifier chain (draw modifiers)
  → May use RenderNodeLayer (preferred, API 29+) or ViewLayer fallback
  → Records display list → GPU composite

graphicsLayer { } → separate RenderNode → alpha/translation = GPU-only, no recomposition

Snapshot state read during draw → Owner observes → invalidates layer on change
RootMeasurePolicy uses placeRelativeWithLayer for auto-observation
```

### Semantics — Two Trees

```
Layout tree:    visual hierarchy
Semantics tree: accessibility/testing metadata

MERGED tree:    mergeDescendants=true → TalkBack reads row as one unit
UNMERGED tree:  every node separate → testing framework granularity
```

```
Modifier.semantics(mergeDescendants = false) { contentDescription = "..." }

Each property has SemanticsPropertyKey with mergePolicy:
  ContentDescription → concat descendant descriptions into list
  Default policy     → keep parent, discard child

Changes → posted to main Handler → compare old/new trees
  Structural changes → conflated Channel → batched a11y events (100ms)
  Property changes     → requestSendAccessibilityEvent

Root LayoutNode gets default semantics + focus + keyInput modifiers
```

Material/foundation composables set semantics implicitly. **Custom layouts must add semantics manually.**

---

## 10. Snapshot System

### Why MVCC

Compose uses **optimistic Multi-Version Concurrency Control** (like DB MVCC):

```
Problem:  composition may run on multiple threads (concurrent recomposition)
Solution: each thread works on isolated snapshot; merge on apply

Properties: atomic, consistent, isolated (ACI — not durable, in-process only)
Category:   optimistic — detect conflicts at apply, merge or abort
```

### Core Types

```
StateObject     → holds linked list of StateRecords
StateRecord     → (snapshotId, value) — immutable copy-on-write
Snapshot        → point-in-time view of all StateObjects

GlobalSnapshot  → main thread default; never apply()'d, always advanced
MutableSnapshot → fork for isolated reads/writes; apply() merges to parent/global
```

### Reading State

```kotlin
// mutableStateOf getter (simplified):
get() = next.readable(this).value
// readable: walk StateRecord list, find highest valid snapshotId for current snapshot
//           notify readObserver → register recompose scope
```

### Writing State

```kotlin
set(value) = next.withCurrent { record ->
    if (!policy.equivalent(record.value, value)) {
        next.overwritable(this, record) { this.value = value }
        // copy-on-write: new record prepended to list
        // notify writeObserver → schedule invalidation
    }
}
```

`SnapshotMutationPolicy` controls equality (`structuralEqualityPolicy` default) and merge behavior.

### Open Snapshots & Record Reuse

```
Open snapshots set: monotonically increasing IDs
While snapshot open → its records invalid for other snapshots
Close snapshot → records become visible to new snapshots

GC: if record not visible in lowest open snapshot → reuse slot
Typical mutable state: only 1-2 records (performance critical)
```

### Apply Propagation

```
snapshot.apply():
  1. Detect write collisions on shared StateObjects
  2. Try optimistic merge (delegated to StateObject + policy)
  3. structuralEqualityPolicy + unique slot keys → collisions impossible in practice
  4. Prepend merged record with new snapshotId
  5. Close snapshot (remove from open set)
  6. Advance GlobalSnapshot (close + replace with new global)
  7. Notify apply observers → Recomposer wakes up

Nested MutableSnapshot: changes propagate to parent, not global directly
apply() after dispose() → throws
```

### Custom Merge Policy Example

```kotlin
// Counter policy — concurrent increments merge additively:
fun counterPolicy() = object : SnapshotMutationPolicy<Int> {
    override fun equivalent(a: Int, b: Int) = a == b
    override fun merge(previous: Int, current: Int, applied: Int) =
        current + (applied - previous)
}

// snapshot1: state += 10, snapshot2: state += 20 → apply both → 30
```

Auto-merge infrastructure exists; runtime relies on unique access paths to avoid conflicts instead.

---

## 11. Effects

### Two Side-Effect Systems

```
1. Composer SideEffect (runtime internal + SideEffect {} composable)
   - Recorded during composition
   - Runs AFTER applyChanges, every successful composition
   - NOT stored in slot table — discarded if composition aborts
   - NO lifecycle/cancellation

2. Effect Handlers (LaunchedEffect, DisposableEffect, etc.)
   - Stored in slot table via RememberObserver
   - Lifecycle-aware: onRemembered / onForgotten
   - Keyed restart on key change
   - LaunchedEffect uses Recomposer's coroutine context (Main by default)
```

### Handler Reference

| Handler | Runs | Cleanup | Storage |
|---------|------|---------|---------|
| `SideEffect` | Every successful compose | None | Composer list |
| `DisposableEffect` | Enter + key change | `onDispose` | RememberObserver |
| `LaunchedEffect` | Enter + key change | Coroutine cancel | RememberObserver |
| `rememberUpdatedState` | Updates ref each compose | None | Slot |
| `produceState` | Enter + key change | Coroutine cancel | RememberObserver |
| `derivedStateOf` | When read deps change | None | Snapshot state |
| `snapshotFlow` | State changes | Flow cancel | External |

### rememberUpdatedState

Long-lived `LaunchedEffect(Unit)` captures stale callbacks. Fix:

```kotlin
val currentOnTick by rememberUpdatedState(onTick)
LaunchedEffect(Unit) {
    while (true) { delay(1000); currentOnTick() }
}
```

### Rules

```
✗ Never network/DB/analytics in composable body
✓ LaunchedEffect(key) for async work tied to composition
✓ DisposableEffect for register/unregister pairs
✓ SideEffect for syncing Compose → non-Compose after every successful apply
✓ derivedStateOf when result equality ≠ source equality (filtering, isEmpty)
```

---

## 12. Advanced Runtime

### Runtime ≠ Compose UI

Any client library needs:

```
1. Tree type N (LayoutNode, VNode, DomNode, …)
2. Applier<N> implementation
3. @Composable emitters calling ReusableComposeNode/ComposeNode
4. Composition(Applier(root), parentContext) + setContent equivalent
5. Recomposer.runRecomposeAndApplyChanges()
```

### Vector Composition

```kotlin
Composition(VectorApplier(vector.root), rememberCompositionContext())
// VNode tree: Group, Path nodes
// Rendered via VectorPainter inside Icon/Image (LayoutNode in parent Composition)
// Subcomposition disposed via DisposableEffect onDispose { composition.dispose() }
```

### Compose Web / DOM

```
DomApplier → HTML element tree
Same compiler + runtime, different materialization
Compose for Web maintained separately from Compose UI
```

### Other Clients

```
Compose Desktop  → Skia rendering, same LayoutNode model
Mosaic (Jake Wharton) → terminal UI via custom Applier
Glance            → RemoteViews / AppWidget target
```

---

## 13. Interview Rapid-Fire

**Q: What happens when you call setContent?**
Creates `AndroidComposeView` (Owner), `Recomposer`, `Composition(UiApplier(root), recomposer)`, runs initial composition inside MutableSnapshot, applyChanges → LayoutNode tree attached → layout/draw.

**Q: Emit vs apply?**
Composition records deferred Changes (fast). applyChanges executes them in batch → updates slot table + Applier tree.

**Q: Why UiApplier bottom-up only?**
Avoids notifying all ancestors on each child insert. Top-down can be O(exponential) if ancestors react to every insert.

**Q: ReusableComposeNode vs ComposeNode?**
Reusable = no hidden state, update in place. ComposeNode = hidden state (AndroidView), must recreate.

**Q: Subcomposition vs root composition?**
Root = independent tree. Sub = linked via CompositionContext, shares Recomposer + CompositionLocals, own slot table.

**Q: Why LazyColumn doesn't compose all items?**
SubcomposeLayout — composes children during layout phase based on viewport. See [Compose Rendering]({{< relref "/docs/compose-rendering" >}}).

**Q: Intrinsics vs Lookahead vs Subcompose?**
Intrinsics = size preview. Lookahead = target layout for animation. Subcompose = deferred/conditional composition.

**Q: How does snapshot apply trigger recomposition?**
apply observer on Recomposer → pending invalidations → next frame → recompose affected scopes → applyChanges.

**Q: SideEffect vs LaunchedEffect?**
SideEffect = post-apply sync, no cleanup, not in slot table. LaunchedEffect = RememberObserver, coroutine, cancelled on leave.

**Q: Merged vs unmerged semantics?**
Merged = TalkBack reads parent as one node. Unmerged = full granularity for tests.

**Q: Can two snapshots write same state?**
Infrastructure supports merge policies; runtime avoids collisions via unique slot-table access paths. Custom `SnapshotMutationPolicy.merge` enables counters/CRDT-style types.

---

## Study Path

```
Week 1: §2-3 + enable compiler reports, fix skippable issues
Week 2: §4-7 + trace setContent → applyChanges in debugger/sources
Week 3: §8-10 + LazyColumn trace (Compose Rendering doc)
Week 4: §11-13 + Compose Mastery production patterns
```

---

> Source: *Jetpack Compose Internals* by Jorge Castillo (Leanpub, 2022). AOSP: [compose/runtime](https://cs.android.com/androidx/platform/frameworks/support/+/androidx-main:compose/runtime), [compose/compiler](https://cs.android.com/androidx/platform/frameworks/support/+/androidx-main:compose/compiler), [compose/ui](https://cs.android.com/androidx/platform/frameworks/support/+/androidx-main:compose/ui).
