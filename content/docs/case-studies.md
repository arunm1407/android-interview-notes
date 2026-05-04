---
title: "Extended Case Studies"
weight: 3
---


# Extended Case Studies

> [!NOTE]
> **12 apps, cross-cutting pattern matrix.** Each covers core technical challenges, architecture decisions, caching strategies, offline behavior, and interview-ready talking points.

---

## Table of Contents

1. [Airbnb — Search, Maps & Booking](#1-airbnb)
2. [DoorDash / Uber Eats — Food Delivery](#2-doordash--uber-eats)
3. [Discord — Voice, Chat & Communities](#3-discord)
4. [Telegram — Cloud Messaging](#4-telegram)
5. [Notion — Collaborative Documents](#5-notion)
6. [YouTube — Video Platform](#6-youtube)
7. [Tinder / Dating Apps — Swipe & Match](#7-tinder--dating-apps)
8. [Zoom — Video Conferencing](#8-zoom)
9. [Duolingo — Gamified Learning](#9-duolingo)
10. [Reddit — Community Feed & Comments](#10-reddit)
11. [Robinhood — Stock Trading](#11-robinhood)
12. [Figma — Collaborative Design](#12-figma)

---

## 1. Airbnb

### Core Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Airbnb App                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  SEARCH & DISCOVERY                                  │
│  ┌─────────────────────────────────────────────────┐│
│  │  Search Input                                    ││
│  │  ├── Location autocomplete (debounced, cached)   ││
│  │  ├── Date picker (client-side calendar)          ││
│  │  ├── Guest count (local state)                   ││
│  │  └── Filters (price, amenities, type)            ││
│  │                                                  ││
│  │  Results                                          ││
│  │  ├── Map view (clustered pins)                   ││
│  │  ├── List view (paginated cards)                 ││
│  │  └── Split view (map + list synchronized)        ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  LISTING DETAIL                                      │
│  ├── Photo carousel (preloaded, cached)              │
│  ├── Pricing (dynamic — changes by date/demand)      │
│  ├── Availability calendar (fetched per listing)     │
│  ├── Reviews (paginated, cached 1hr)                 │
│  ├── Map embed (single marker + nearby POIs)         │
│  └── "Book Now" (pessimistic, server-validated)      │
│                                                      │
│  BOOKING FLOW                                        │
│  ├── Price breakdown (server-calculated, never cache)│
│  ├── Payment (Stripe tokenization)                   │
│  ├── Confirmation (idempotent booking request)       │
│  └── Trip details (synced to trip manager)           │
└─────────────────────────────────────────────────────┘
```

### Technical Deep Dives

```
1. MAP + LIST SYNCHRONIZATION
   Problem: Map pins and list cards must stay in sync as user pans/zooms
   Solution:
     - Map viewport change → debounce 300ms → API call with bounding box
     - Response contains listings within viewport
     - Same data renders both map pins and list cards
     - Scroll list → highlight corresponding pin on map
     - Tap pin → scroll list to corresponding card
     - Challenge: Map pan fires continuously → debounce + cancel in-flight requests

2. SEARCH RANKING
   Problem: Which listings to show first?
   Solution:
     - Server-side ranking ML model considers:
       → Price competitiveness for area
       → Review score + count
       → Host response rate
       → Listing quality score (photos, description completeness)
       → Personalization (past booking history, saved listings)
     - Client: Show ranked results, prefetch first 3 listing detail pages

3. DYNAMIC PRICING
   Problem: Price changes based on dates, demand, season
   Solution:
     - Prices NEVER cached on client (always fetched for selected dates)
     - Calendar availability: Fetched per listing, cached for current session
     - Price breakdown: Calculated server-side (cleaning fee, service fee, taxes)
     - Stale-while-revalidate for search results (show cached prices, refresh in background)

4. IMAGE-HEAVY UI
   Problem: Each listing has 5-30 high-res photos
   Solution:
     - Search results: Show first image only, lazy-load carousel on scroll
     - Listing detail: First 3 images loaded immediately, rest on demand
     - Image CDN with responsive sizing (?w=400 for thumbnails, ?w=1200 for detail)
     - Blurhash placeholders while loading
     - Swipe carousel: Preload next 2 images in each direction
     - Memory management: Release off-screen carousels in search results

5. BOOKING IDEMPOTENCY
   Problem: Network timeout during booking — is the stay reserved?
   Solution:
     - Idempotency key generated on "Confirm Booking" tap
     - Server: If key exists → return same booking confirmation
     - Price lock: Price guaranteed for 15 minutes after starting checkout
     - Availability lock: Short hold on dates during checkout (prevents double-booking)
     - Failure: Release hold, show error, let user retry
```

### Interview Talking Points
```
"For the map + list sync, I'd use a shared ViewModel that holds the current
viewport bounds and listing results. Both the map and list observe the same
StateFlow. When the map viewport changes, I'd debounce by 300ms, cancel any
in-flight request, and fetch listings for the new bounding box."

"Prices must never be cached because they change by date and demand. I'd cache
listing metadata (photos, description, amenities) aggressively but always
fetch pricing from the server for the user's selected dates."
```

---

## 2. DoorDash / Uber Eats

### Core Architecture

```
┌─────────────────────────────────────────────────────┐
│              Food Delivery App                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  HOME SCREEN                                         │
│  ├── Location bar (GPS + saved addresses)            │
│  ├── Search (restaurants + dishes + cuisines)         │
│  ├── Category chips (scrollable, cached)              │
│  ├── Restaurant cards (paginated, ranked by proximity)│
│  ├── Promotions banner (server-driven, A/B tested)   │
│  └── Reorder carousel (recent orders, local cache)   │
│                                                      │
│  RESTAURANT PAGE                                     │
│  ├── Menu (grouped by category, cached per session)  │
│  ├── Item customization (nested options)             │
│  ├── Cart (local state, synced to server)            │
│  └── Delivery estimate (real-time calculation)       │
│                                                      │
│  ORDER TRACKING (Real-Time)                          │
│  ├── Order status (WebSocket: placed→preparing→      │
│  │   picked_up→delivering→delivered)                 │
│  ├── Driver location (WebSocket, 4s intervals)       │
│  ├── ETA (recalculated on driver location update)    │
│  └── Chat with driver (in-app messaging)             │
└─────────────────────────────────────────────────────┘
```

### Technical Deep Dives

```
1. RESTAURANT RANKING
   Problem: Show most relevant restaurants for user's location and time
   Solution:
     - Server-side ranking considers:
       → Distance / delivery time
       → Restaurant rating
       → User's past orders (personalization)
       → Current promotions
       → Restaurant capacity (kitchen busy = longer prep time)
       → Time of day (breakfast places in morning)
     - Client receives pre-ranked list
     - Pull-to-refresh: Full re-rank with current location

2. MENU ARCHITECTURE
   Problem: Complex nested menus with customizations
   Solution:
     Data model:
       Restaurant
       ├── Category ("Popular", "Burgers", "Drinks")
       │   ├── Item ("Cheeseburger" - $12.99)
       │   │   ├── Required modifier group ("Size": S/M/L)
       │   │   ├── Optional modifier group ("Add-ons": lettuce, tomato)
       │   │   └── Special instructions (free text)
       │   └── Item ("Veggie Burger" - $14.99)
       └── Category ("Desserts")

     - Menu cached per restaurant (invalidated on restaurant update push)
     - Item availability: Real-time (items can sell out)
     - Price: Cached but re-validated at checkout

3. CART MANAGEMENT
   Problem: Cart must persist across app kills, sync across devices
   Solution:
     - Cart stored in Room (survives process death)
     - Cart scoped to one restaurant (adding from another = prompt to clear)
     - Price re-validation on checkout start
     - Item unavailability: Show warning, suggest alternatives
     - Promo code: Validated server-side, discount shown client-side

4. ORDER TRACKING STATE MACHINE
   States:
     PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP →
     DRIVER_ASSIGNED → PICKED_UP → DELIVERING → DELIVERED

   Implementation:
     - WebSocket connection opened when order placed
     - Server pushes state transitions
     - Each state triggers UI change (animation, map update, notification)
     - Offline: Polling fallback every 30 seconds
     - Push notification for key transitions (even if app in background)

5. DELIVERY ETA CALCULATION
   Problem: Accurate ETA that updates in real-time
   Solution:
     ETA = prep_time + travel_time

     prep_time:
       → Based on restaurant's current queue length
       → Adjusted by item complexity
       → ML model trained on historical data

     travel_time:
       → Distance (routing API)
       → Current traffic conditions
       → Driver's current speed/location
       → Recalculated every driver location update

     Display:
       → Show range ("25-35 min") not exact time
       → Update range as order progresses
       → Narrow range as driver gets closer
```

### Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| WebSocket for tracking | Real-time updates without polling overhead |
| Local cart in Room | Survives process death, fast access |
| Server-side ranking | Model too complex for on-device, needs real-time data |
| Menu caching with push invalidation | Menus change infrequently, push ensures freshness |
| ETA as range not exact | Under-promise, over-deliver; reduces customer complaints |

---

## 3. Discord

### Core Architecture

```
┌─────────────────────────────────────────────────────┐
│                Discord App                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  MESSAGING (Text Channels)                           │
│  ├── Channel list (cached in Room, synced via WS)    │
│  ├── Message history (paginated, bidirectional)      │
│  ├── Real-time messages (WebSocket / Gateway)        │
│  ├── Rich embeds (links, images, code blocks)        │
│  ├── Reactions (optimistic, similar to Venmo likes)  │
│  ├── Thread support (nested conversations)           │
│  └── Search (server-side Elasticsearch)              │
│                                                      │
│  VOICE / VIDEO                                       │
│  ├── Voice channels (WebRTC + custom transport)      │
│  ├── Screen share (MediaProjection API)              │
│  ├── Video (SFU architecture, not P2P for groups)    │
│  └── Noise suppression (on-device ML model)          │
│                                                      │
│  PRESENCE                                            │
│  ├── Online/Idle/DND/Offline status                  │
│  ├── Activity (playing game X, listening to Spotify) │
│  └── Typing indicators                               │
└─────────────────────────────────────────────────────┘
```

### Technical Deep Dives

```
1. GATEWAY (WebSocket) CONNECTION
   Problem: Maintain persistent connection for real-time events
   Solution:
     - Single WebSocket connection per client (Gateway)
     - Handles ALL real-time events:
       → New messages
       → Typing indicators
       → Presence updates
       → Channel/guild updates
       → Voice state changes
     - Heartbeat: Client sends heartbeat every ~41.25 seconds
     - If heartbeat missed → reconnect with resume (replay missed events)
     - Session resume: Send last received sequence number → server replays gap
     - If resume fails → full reconnect (re-fetch state)

   Reconnection strategy:
     Disconnect → Wait 1-5s (jitter) → Reconnect → Resume
     Resume fails → Full reconnect → Re-identify
     Repeated failures → Exponential backoff (max 60s)

2. MESSAGE HISTORY & CACHING
   Problem: Millions of messages per channel, must load fast
   Solution:
     - Last 50 messages cached in Room per channel
     - Scroll up: Cursor-based pagination (before: message_id)
     - Scroll down (jump to present): Fetch latest + cache
     - New messages: Append via WebSocket, persist to Room
     - Search: Server-side (too much data for local search)
     - Message edits/deletes: WebSocket event → update Room + UI
     - Pinned messages: Separate cached list per channel

3. VOICE ARCHITECTURE
   Problem: Low-latency voice for 1-25+ users
   Solution:
     Peer-to-peer (2 users):
       User A ←── WebRTC ──→ User B
       Direct connection, lowest latency

     SFU (3+ users):
       User A ──→ ┌─────┐ ──→ User B
       User B ──→ │ SFU │ ──→ User A
       User C ──→ │     │ ──→ User A, User B
                  └─────┘
       Each user sends ONE stream to server
       Server forwards to all others
       Better than mesh (N streams vs N² streams)

     Audio processing pipeline:
       Microphone → Noise suppression (ML) → Opus encode →
       Network → Opus decode → Jitter buffer → Speaker

     Jitter buffer:
       Network packets arrive at irregular intervals
       Buffer holds 20-80ms of audio to smooth out jitter
       Too small → choppy audio
       Too large → noticeable delay

4. PRESENCE SYSTEM
   Problem: Track online status for millions of users efficiently
   Solution:
     - Client sends presence update via Gateway
     - Server maintains presence in Redis
     - Guild members list: Paginated, shows online first
     - Lazy guilds: For large servers (>250 members), only load online members
       → Reduces initial data load significantly
     - Typing indicator:
       → Client sends "typing" event when user starts typing
       → Event expires after 10 seconds
       → Debounced: Don't spam typing events on every keystroke

5. RICH CONTENT RENDERING
   Problem: Messages contain text, code, embeds, images, videos, mentions
   Solution:
     - Custom Markdown parser (Discord-flavored)
     - Syntax highlighting for code blocks (on-device)
     - Link embeds: Fetched server-side (Open Graph), cached
     - Custom emojis: Loaded from CDN, LRU cached in memory
     - Mentions: Parsed and highlighted, tappable for user popup
     - Spoiler text: Rendered hidden until tapped
     - Message grouping: Consecutive messages from same user within 7 min
```

---

## 4. Telegram

### Core Architecture

```
1. CLOUD-NATIVE MESSAGING
   Key difference from WhatsApp: Messages stored on Telegram's servers
     → Access message history from any device
     → No need for local backup (server IS the backup)
     → Trade-off: Less private (server can access non-secret chats)

   Secret Chats: End-to-end encrypted, device-specific, no cloud storage

2. MTProto PROTOCOL
   Problem: Reliable messaging over unreliable mobile networks
   Solution: Custom protocol (not HTTP-based)
     - Binary serialization (TL schema) — smaller than JSON
     - Built-in encryption layer
     - Message acknowledgment system
     - Automatic reconnection with session resume
     - Multi-datacenter: Client connects to nearest DC

3. MEDIA OPTIMIZATION
   Problem: Fast media sharing (photos, videos, documents)
   Solution:
     - Progressive photo loading:
       → Tiny thumbnail (blur) sent with message (inline, ~1KB)
       → Low-res preview loaded quickly
       → Full resolution on tap
     - Video: Streaming playback (don't download full file first)
     - File size limit: 2GB (much higher than competitors)
     - CDN distribution: Media served from nearest datacenter

4. CHANNEL & GROUP ARCHITECTURE
   Problem: Channels with millions of subscribers
   Solution:
     - Channel posts: Broadcast model (one write, fan-out-on-read)
     - Comments on channel posts: Linked group (separate message thread)
     - Large groups (>200 members):
       → Slow mode: Rate-limit messages per user
       → Admin tools: Restrict who can post
       → Anti-spam: ML-based detection
     - Pagination: Channel history loaded on demand, not cached entirely

5. OFFLINE SUPPORT
   - SQLite database stores all messages locally
   - Message queue for offline sends (synced on reconnect)
   - Difference sync: On reconnect, server sends delta (only new messages)
     → Not full refresh, just the gap since last seen sequence
   - Update sequence: Each update has a pts (points) value
     → Client tracks last pts → requests updates since pts
     → If gap too large → full state sync
```

---

## 5. Notion

### Core Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Notion App                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  BLOCK-BASED DOCUMENT MODEL                          │
│  ┌─────────────────────────────────────────────────┐│
│  │  Page                                            ││
│  │  ├── Block (paragraph)                           ││
│  │  ├── Block (heading)                             ││
│  │  ├── Block (toggle)                              ││
│  │  │   ├── Block (nested paragraph)                ││
│  │  │   └── Block (nested image)                    ││
│  │  ├── Block (database — inline table)             ││
│  │  │   ├── Row (page with properties)              ││
│  │  │   └── Row (page with properties)              ││
│  │  ├── Block (embed — Figma, YouTube, etc.)        ││
│  │  └── Block (code — with syntax highlighting)     ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Every block has:                                    │
│  - ID (UUID)                                         │
│  - Type (paragraph, heading, image, database, etc.)  │
│  - Content (text, URL, etc.)                         │
│  - Children (nested blocks)                          │
│  - Properties (for database items)                   │
│  - Parent reference                                  │
└─────────────────────────────────────────────────────┘
```

### Technical Deep Dives

```
1. BLOCK TREE ARCHITECTURE
   Problem: Documents are trees of blocks that can be deeply nested
   Solution:
     - Each block is a node with parent + children references
     - Lazy loading: Only load visible blocks + 1 level deep
     - Expand toggle: Fetch children on demand
     - Database views: Server computes filtered/sorted results
     - Block operations: Insert, delete, move, update (each is an operation)

2. REAL-TIME COLLABORATION
   Problem: Multiple users editing same page simultaneously
   Solution:
     - Operational Transform (OT) for text within blocks
     - Block-level locking for structural changes (move, delete)
     - Cursor presence: Show other users' cursor positions
     - WebSocket for real-time updates
     - Conflict resolution:
       → Text edits: OT merges automatically
       → Block moves: Last write wins (rare conflict)
       → Concurrent delete + edit: Delete wins

3. OFFLINE SUPPORT
   Problem: Full editing capability offline with sync
   Solution:
     - SQLite stores block tree locally
     - Operations queue: All edits recorded as operations
     - On reconnect: Operations replayed to server in order
     - Server resolves conflicts and sends canonical state
     - If conflict detected: Server version wins, local changes merged where possible

4. DATABASE (TABLE) VIEWS
   Problem: Same data displayed as table, board, calendar, gallery, timeline
   Solution:
     - Data layer: Rows are pages with properties (typed fields)
     - View layer: Filter + sort + group + display config
     - Each view is a separate configuration pointing to same data
     - Views computed:
       → Simple views: Client-side (filter/sort in memory)
       → Complex views (relations, rollups): Server-computed
     - Pagination: Load 50 rows at a time, virtual scrolling for large databases

5. SEARCH
   Problem: Search across all pages, databases, and blocks
   Solution:
     - Server-side full-text search (indexed on write)
     - Recent pages: Cached locally for instant access
     - Quick Find (Cmd+K): Local cache of page titles + server search
     - Search results: Snippet with highlighted match
     - Scoping: Search within current page, workspace, or all
```

---

## 6. YouTube

### Core Architecture

```
1. VIDEO PLAYER
   Problem: Smooth playback with quality adaptation
   Solution:
     - ExoPlayer with DASH/HLS adaptive streaming
     - Quality levels: 144p → 240p → 360p → 480p → 720p → 1080p → 4K
     - ABR algorithm: Monitor bandwidth + buffer level
       → Buffer > 30s: Try higher quality
       → Buffer < 10s: Drop to lower quality
       → Buffer < 5s: Emergency drop to lowest
     - Preload: Buffer first 5 seconds of video before showing play button
     - Seek: Load I-frame at seek position instantly, then load full quality

2. FEED RECOMMENDATION
   Problem: Infinite personalized feed
   Solution:
     - Server-side ranking (deep learning model)
     - Signals: Watch history, search history, subscriptions, demographics
     - Candidate generation → Ranking → Filtering (content policy)
     - Client: Cursor-based pagination, prefetch next 5 thumbnails
     - "Not interested" feedback: Immediate local filter + server model update

3. COMMENT SYSTEM
   Problem: Videos with millions of comments
   Solution:
     - Top-level comments: Paginated (cursor-based)
     - Replies: Load on demand ("View X replies" button)
     - Sort: "Top comments" (server-ranked) or "Newest first"
     - Optimistic posting (similar to Venmo comments)
     - Real-time comment count: Approximate (eventual consistency)
     - Spam filtering: Server-side ML, held for review

4. OFFLINE / DOWNLOADS
   - Premium feature: Download for offline viewing
   - DRM (Widevine): Encrypted storage, license with TTL
   - Quality selectable (720p default, user can change)
   - Storage management: Auto-delete after 30 days
   - Downloaded video metadata cached in Room

5. PICTURE-IN-PICTURE (PiP)
   Problem: Continue watching while using other apps
   Solution:
     - PiP mode triggered on home button or swipe up
     - ExoPlayer continues in floating window
     - Minimal controls: Play/pause, close, expand
     - Orientation: Landscape video → landscape PiP
     - Transition: Smooth animation from full-screen to PiP
```

---

## 7. Tinder / Dating Apps

### Core Architecture

```
1. CARD STACK / SWIPE UI
   Problem: Smooth swipe animations with preloaded content
   Solution:
     - Card stack: Top 3-5 cards rendered, rest queued
     - Swipe right (like) / left (pass) / up (super like)
     - Physics-based animation: Card follows finger, snaps on release
     - Decision threshold: >40% screen width → auto-complete swipe
     - Preloading: Next 3 profiles fully loaded (images + bio)
     - Image preloading: First photo of next 10 profiles prefetched

2. MATCHING ALGORITHM
   Problem: Show profiles most likely to result in mutual match
   Solution:
     - Server-side ranking (ELO-like score + ML)
     - Factors:
       → Location (distance-based filtering)
       → Attractiveness score (based on swipe ratios — controversial)
       → Preference matching (age, gender, interests)
       → Activity: Boost recently active users
       → Anti-pattern: Penalize users who swipe right on everyone
     - Client receives pre-ranked stack of ~100 profiles
     - Request more when stack < 20 remaining

3. REAL-TIME MATCHING
   Problem: Instant notification when both users swipe right
   Solution:
     - Swipe event sent to server immediately
     - Server checks if other user already liked → MATCH
     - Match notification via push + WebSocket (if app open)
     - Match animation plays on both devices (nearly) simultaneously
     - Chat channel created instantly on match

4. CHAT
   - Similar to WhatsApp architecture (simpler — 1:1 only)
   - GIF support (Giphy API integration)
   - Read receipts
   - "Unmatch" = soft delete (messages hidden, not deleted from server)

5. LOCATION HANDLING
   Problem: Need location for matching but privacy concerns
   Solution:
     - Approximate location only (city/neighborhood, not exact address)
     - Location updated:
       → On app open
       → Significant location change (>1km)
       → NOT continuously in background (battery concern)
     - "Passport" feature: Set location to any city
     - Distance shown as approximate ("5 miles away", not "4.7 miles")
```

---

## 8. Zoom

### Core Architecture

```
1. VIDEO CONFERENCING
   Architecture:
     Small meetings (2 people): Peer-to-peer (WebRTC)
     Medium meetings (3-49): SFU (Selective Forwarding Unit)
     Large meetings (50+): MCU (Multipoint Control Unit)

     P2P:
       User A ←──── WebRTC ────→ User B
       Lowest latency, no server cost

     SFU:
       Each user sends 1 stream → Server → forwards to all others
       Server selects which streams to forward based on:
         → Active speaker detection
         → Gallery view layout
         → Client bandwidth capability

     MCU:
       Server receives all streams → composites into single stream → sends to each user
       Lower client bandwidth (receives 1 stream instead of N)
       Higher server cost (transcoding)

2. ADAPTIVE QUALITY
   Problem: Maintain video quality across varying network conditions
   Solution:
     - Simulcast: Client sends 3 quality levels simultaneously
       → High (720p), Medium (360p), Low (180p)
       → Server selects which to forward per recipient
     - Recipient with poor bandwidth → receives Low quality
     - Bandwidth estimation: Continuous RTCP feedback
     - Graceful degradation:
       → Reduce resolution before reducing framerate
       → Reduce framerate before dropping video
       → Audio always prioritized over video

3. SCREEN SHARING
   Problem: High-resolution screen content at acceptable quality
   Solution:
     - Android MediaProjection API captures screen
     - Optimized for text (higher bitrate for screen vs camera)
     - Content detection: Screen share uses different codec settings
       → Text: Higher resolution, lower framerate (5-10 fps OK)
       → Video content: Lower resolution, higher framerate
     - Annotation layer on top of shared screen

4. VIRTUAL BACKGROUND
   Problem: Replace background without green screen
   Solution:
     - On-device ML model (segmentation)
     - Separates person from background per frame
     - Replace background with image or blur
     - GPU acceleration (RenderScript / GPU compute shader)
     - Performance: ~15ms per frame on modern devices
     - Fallback: Disable if device too slow (measure inference time)

5. AUDIO PROCESSING
   Pipeline:
     Mic → AEC (Echo Cancel) → ANS (Noise Suppress) →
     AGC (Auto Gain Control) → Encode (Opus) → Network →
     Decode → Jitter Buffer → Mix → Speaker

     AEC: Removes echo from speaker playing back to mic
     ANS: ML-based noise suppression (keyboard, dog barking)
     AGC: Normalize volume levels across participants
     Jitter buffer: Smooth out packet arrival timing
```

---

## 9. Duolingo

### Core Architecture

```
1. LESSON ENGINE
   Problem: Interactive language lessons with various exercise types
   Solution:
     - Exercise types:
       → Translation (tap words to build sentence)
       → Listening (play audio, type what you hear)
       → Speaking (speech recognition)
       → Matching (connect pairs)
       → Fill-in-blank
     - Lesson structure: ~15 exercises per lesson, ~5 minutes
     - Adaptive difficulty: ML model adjusts based on user performance
     - Spaced repetition: Review words at optimal intervals

2. OFFLINE LESSONS
   Problem: Users want to learn on planes/subway (no network)
   Solution:
     - Pre-download: Next 3-5 lessons cached locally
     - Audio files: Preloaded with lesson data
     - Lesson completion: Stored locally, synced on reconnect
     - XP (points): Accumulated locally, synced to server
     - Streak: Maintained locally with server validation
     - Downloaded content: Updated when online, TTL-based refresh

3. STREAK & GAMIFICATION
   Problem: Keep users motivated with daily practice
   Solution:
     - Daily streak counter (server-authoritative)
     - Streak freeze: Purchase protection (stored on server)
     - Timezone handling: User's local timezone determines "day"
     - Leaderboard: Weekly, resets Monday
       → Leagues: Bronze → Silver → Gold → ... → Diamond
       → Promotion: Top 10 move up, bottom 5 move down
     - Notifications: Precisely timed push to maintain streak
       → ML model predicts optimal reminder time per user

4. SPEECH RECOGNITION
   Problem: Evaluate pronunciation on-device
   Solution:
     - On-device speech-to-text (Google Speech API or custom model)
     - Phoneme-level scoring (not just word-level)
     - Lenient grading: Accept close pronunciations
     - Fallback: Skip speaking exercises if mic unavailable
     - Audio: Played via TTS (text-to-speech) for target language

5. A/B TESTING
   - Heavily A/B tested (thousands of simultaneous experiments)
   - Every UI change, exercise type, notification copy tested
   - Client receives experiment assignments on app launch
   - Cached locally for consistency within session
   - Events tagged with experiment variant for analysis
```

---

## 10. Reddit

### Core Architecture

```
1. FEED ALGORITHM
   Feeds:
     - Home: Subscribed subreddits, ranked
     - Popular: Trending across all subreddits
     - New: Chronological
     - Rising: Posts gaining traction

   Ranking (Wilson score interval):
     - Considers: Upvotes, downvotes, age, engagement
     - "Hot" formula weights recency heavily (newer = higher)
     - "Best" uses Wilson score (statistically rigorous confidence)
     - "Top" pure vote count (for time period)

2. COMMENT TREE
   Problem: Deeply nested threaded comments (unlike flat comment lists)
   Solution:
     - Tree structure: Each comment has parent_id
     - Initial load: Top 200 comments, depth-limited to 10 levels
     - "Load more comments" / "Continue this thread" for deep/hidden branches
     - Collapse/expand threads (client-side state)
     - Sort: Best, Top, New, Controversial, Q&A
     - Challenge: Efficient rendering of deeply nested layouts
       → RecyclerView with dynamic indentation
       → OR Compose with recursive composables (depth-limited)

3. VOTING SYSTEM
   Problem: Real-time vote counts with millions of concurrent voters
   Solution:
     - Optimistic UI update (tap upvote → score changes immediately)
     - Server: Vote recorded, score eventually consistent
     - Vote fuzzing: Reddit adds random noise to displayed score
       → Prevents exact manipulation, real score tracked internally
     - Undo: Tap again to remove vote (optimistic, API call)

4. MEDIA HANDLING
   - Image posts: Hosted on Reddit's CDN (i.redd.it)
   - Video: Reddit's own player (HLS streaming)
   - External links: Link preview card (Open Graph metadata)
   - Gallery posts: Multiple images, swipeable carousel
   - GIF: Converted to MP4 for efficiency (smaller file, seekable)

5. SUBREDDIT ARCHITECTURE
   - Each subreddit: Custom rules, CSS/theme, moderators
   - Subreddit feed: Independent pagination from home feed
   - Cross-posting: Share post across subreddits
   - Flairs: Tags for categorization (client renders with colors)
   - Community awards: Custom emojis/badges per subreddit
```

---

## 11. Robinhood

### Core Architecture

```
1. REAL-TIME STOCK PRICES
   Problem: Display live stock prices with minimal latency
   Solution:
     - WebSocket connection for subscribed stock tickers
     - Subscribe to watchlist + currently viewed stock
     - Price updates: Every 1 second during market hours
     - After hours: Reduced frequency (every 5 seconds)
     - Market closed: Show last closing price + after-hours
     - Sparkline chart: Rendered from price history (client-side)
       → Intraday: 1 data point per minute
       → Week/Month/Year: Aggregated candles

2. ORDER EXECUTION
   Problem: Financial transactions must be exactly-once
   Solution:
     - Pessimistic: NEVER show order as filled before server confirms
     - Order flow:
       1. Client sends order (buy/sell, market/limit, quantity)
       2. Server validates (sufficient funds, market hours, restrictions)
       3. Order sent to execution venue (market maker)
       4. Execution confirmation → server updates → push to client
       5. Portfolio updated with new position
     - Idempotency: Order request has unique client-side ID
     - Price disclaimer: "Price may differ from displayed" (market orders)
     - Limit orders: Server monitors, executes when price reached

3. PORTFOLIO ARCHITECTURE
   Problem: Real-time portfolio value across multiple positions
   Solution:
     - Positions cached locally (Room)
     - Current value = Σ(quantity × current price) for each position
     - Current price: From WebSocket stream
     - P&L calculation: Client-side (current value - cost basis)
     - Chart: Daily P&L from historical portfolio values
     - Refresh: Full portfolio sync on app launch, incremental via WebSocket

4. SECURITY
   - Biometric authentication on app open
   - Session token with short TTL (5 minutes idle = re-auth)
   - Certificate pinning (financial data)
   - Root detection (block on rooted devices)
   - No screenshots allowed (FLAG_SECURE on portfolio screens)
   - PII encryption at rest

5. REGULATORY COMPLIANCE
   - Pattern Day Trader (PDT) detection: Client-side counter + server enforcement
   - Fractional shares: Display precision (up to 6 decimal places)
   - Tax lot tracking: Each purchase tracked separately for tax reporting
   - Order warnings: Volatile stock warnings, penny stock warnings
```

---

## 12. Figma

### Mobile Architecture (View & Comment)

```
1. CANVAS RENDERING
   Problem: Render complex vector designs on mobile
   Solution:
     - Custom rendering engine (not native Android Views or Compose)
     - GPU-accelerated (OpenGL ES / Vulkan)
     - Tile-based rendering: Only render visible portions
     - Level-of-detail: Simplify shapes when zoomed out
     - Pan/zoom: Smooth 60fps with gesture handling

2. REAL-TIME COLLABORATION (Design File)
   Problem: Multiple designers editing simultaneously
   Solution:
     - CRDT-based sync (Figma's custom CRDT implementation)
     - Each change is an operation (move, resize, recolor, add text)
     - Operations commute: Order doesn't matter → no conflicts
     - Server broadcasts operations to all connected clients
     - On mobile: View-only or limited editing
     - Cursor presence: See where collaborators are working

3. COMMENT SYSTEM
   Problem: Comments pinned to specific locations on canvas
   Solution:
     - Comments have canvas coordinates (x, y relative to frame)
     - Rendering: Overlay comment pins on canvas at correct position
     - Thread model: Comment + replies
     - Resolution status: Open → Resolved
     - Notification: Push when new comment on your file
     - Offline: Comments queued, synced on reconnect

4. FILE BROWSING
   - File thumbnails: Generated server-side, cached on client
   - Project/team navigation: Tree structure, cached with TTL
   - Search: Server-side, results include file preview thumbnails
   - Recent files: Cached locally for instant access
   - Starred files: Synced list, locally cached
```

---

## Cross-Cutting Patterns Across All Case Studies

### Common Architecture Decisions

```
┌──────────────────┬────────────────────────────────────────────────┐
│ Pattern          │ Apps That Use It                               │
├──────────────────┼────────────────────────────────────────────────┤
│ Optimistic UI    │ Discord, Reddit, YouTube, Venmo, Tinder       │
│ Pessimistic UI   │ Robinhood, Airbnb (booking), DoorDash (order) │
│ WebSocket        │ Discord, DoorDash, Robinhood, Notion, Figma   │
│ Cursor pagination│ All of them                                    │
│ Offline-first    │ Telegram, Notion, Spotify, Duolingo           │
│ ABR streaming    │ YouTube, Netflix, Spotify                      │
│ SFU (voice/video)│ Discord, Zoom                                  │
│ CRDT/OT          │ Notion, Figma                                  │
│ ML on-device     │ Zoom (background), Duolingo (speech), Discord │
│ Feature flags    │ All of them                                    │
│ Idempotency      │ Robinhood, Airbnb, DoorDash                   │
│ Write-behind     │ Uber, Duolingo (XP), YouTube (watch history)  │
└──────────────────┴────────────────────────────────────────────────┘
```

### The "Which Pattern For Which Feature" Matrix

```
Feature         │ Optimistic │ Pessimistic │ Real-Time │ Cache Strategy
────────────────┼────────────┼─────────────┼───────────┼─────────────────
Like/React      │ ✓          │             │           │ Memory + sync
Comment         │ ✓          │             │           │ Memory + pending guard
Payment         │            │ ✓           │           │ Never cache
Booking         │            │ ✓           │           │ Price: never. Meta: cache
Send message    │ ✓          │             │ ✓ (WS)    │ Room + sync
Stock price     │            │             │ ✓ (WS)    │ Memory only (volatile)
Feed            │            │             │           │ Room + Memory + TTL
Search          │            │             │           │ Recent: local. Results: session
Profile         │            │             │           │ Room + Memory + TTL(5min)
Order tracking  │            │             │ ✓ (WS)    │ Local state machine
Voice/video     │            │             │ ✓ (WebRTC)│ No cache (real-time)
File download   │            │             │           │ Disk + DRM license
```
