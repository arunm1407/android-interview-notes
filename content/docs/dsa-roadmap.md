---
title: "DSA Roadmap (Google L4)"
weight: 2
---

# DSA Roadmap — Google L4 One-Stop Guide

> **14 patterns · 120+ LeetCode problems · 12-week plan.** Study in pattern order. For each problem: clarify → brute force → optimize → code → test → complexity. Pair with [Coding Patterns]({{< relref "/docs/coding-patterns" >}}) for Kotlin implementations with Android context.
>
> **Also see:** [Printable Checklist]({{< relref "/docs/dsa-checklist" >}}) (interactive checkboxes) · [NeetCode 150 Cross-Reference]({{< relref "/docs/neetcode-crossref" >}})

---

## How to Use This Guide

| Symbol | Meaning |
|--------|---------|
| ⭐ | Must-do for Google (do twice) |
| 🟢 Easy | Warm-up / template learning |
| 🟡 Medium | Core interview difficulty |
| 🔴 Hard | Stretch / senior signal |

**Daily rhythm (Mon–Fri):**
1. Read pattern template (10 min)
2. Solve 1 problem untimed with notes (45 min)
3. Re-solve same problem timed next day OR solve #2 timed (25 min)
4. Say time/space complexity + edge cases aloud (5 min)

**Weekly rhythm:**
- **Mon–Thu:** 1 new pattern or continue current pattern
- **Fri:** 2 random mediums from past 2 weeks (timed)
- **Sat:** 1 mock interview (Pramp / interviewing.io / peer)
- **Sun:** Re-do failed problems only

**Target before applying:** ~40 easy · ~100 medium · ~20 hard · 8+ full coding mocks

---

## Pattern Index

| # | Pattern | Week | Problems |
|---|---------|------|----------|
| 1 | [Arrays & Hashing](#1-arrays--hashing) | 1 | 12 |
| 2 | [Two Pointers](#2-two-pointers) | 1 | 10 |
| 3 | [Sliding Window](#3-sliding-window) | 1–2 | 10 |
| 4 | [Stack & Monotonic Stack](#4-stack--monotonic-stack) | 2 | 10 |
| 5 | [Binary Search](#5-binary-search) | 2 | 10 |
| 6 | [Linked List](#6-linked-list) | 2–3 | 9 |
| 7 | [Trees (BFS / DFS)](#7-trees-bfs--dfs) | 3 | 14 |
| 8 | [Heap / Priority Queue](#8-heap--priority-queue) | 4 | 8 |
| 9 | [Backtracking](#9-backtracking) | 4–5 | 10 |
| 10 | [Tries](#10-tries) | 5 | 5 |
| 11 | [Graphs](#11-graphs) | 5–6 | 12 |
| 12 | [Dynamic Programming](#12-dynamic-programming) | 6–8 | 18 |
| 13 | [Greedy & Intervals](#13-greedy--intervals) | 8 | 10 |
| 14 | [Bit Manipulation & Math](#14-bit-manipulation--math) | 9 | 8 |
| — | [Design & Concurrency](#15-design--concurrency) | 9–10 | 8 |
| — | [Mixed Review Sets](#16-mixed-review-sets-google-frequency) | 10–12 | — |

---

## 1. Arrays & Hashing

**Template:** Use `HashMap`/`HashSet` for O(1) lookup, frequency counts, or deduplication.

**Signals:** "Find pair/complement", "count frequency", "group by key", "duplicate detection"

**Kotlin tools:** `HashMap`, `HashSet`, `IntArray` for fixed-range frequency (26 letters)

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Contains Duplicate | [leetcode.com/problems/contains-duplicate](https://leetcode.com/problems/contains-duplicate/) |
| ⭐ | 🟢 | Valid Anagram | [leetcode.com/problems/valid-anagram](https://leetcode.com/problems/valid-anagram/) |
| ⭐ | 🟢 | Two Sum | [leetcode.com/problems/two-sum](https://leetcode.com/problems/two-sum/) |
| ⭐ | 🟡 | Group Anagrams | [leetcode.com/problems/group-anagrams](https://leetcode.com/problems/group-anagrams/) |
| ⭐ | 🟡 | Top K Frequent Elements | [leetcode.com/problems/top-k-frequent-elements](https://leetcode.com/problems/top-k-frequent-elements/) |
| ⭐ | 🟡 | Product of Array Except Self | [leetcode.com/problems/product-of-array-except-self](https://leetcode.com/problems/product-of-array-except-self/) |
| | 🟡 | Encode and Decode Strings | [leetcode.com/problems/encode-and-decode-strings](https://leetcode.com/problems/encode-and-decode-strings/) |
| | 🟡 | Longest Consecutive Sequence | [leetcode.com/problems/longest-consecutive-sequence](https://leetcode.com/problems/longest-consecutive-sequence/) |
| | 🟡 | Subarray Sum Equals K | [leetcode.com/problems/subarray-sum-equals-k](https://leetcode.com/problems/subarray-sum-equals-k/) |
| | 🟡 | First Missing Positive | [leetcode.com/problems/first-missing-positive](https://leetcode.com/problems/first-missing-positive/) |
| | 🔴 | Trapping Rain Water | [leetcode.com/problems/trapping-rain-water](https://leetcode.com/problems/trapping-rain-water/) |
| | 🔴 | Minimum Window Subsequence | [leetcode.com/problems/minimum-window-subsequence](https://leetcode.com/problems/minimum-window-subsequence/) |

**Android tie-in:** Frequency maps for analytics aggregation; hash maps in DiffUtil key lookups → [Coding Patterns #19]({{< relref "/docs/coding-patterns" >}})

---

## 2. Two Pointers

**Template:** Left/right pointers on sorted array, or fast/slow on linked structures.

**Signals:** Sorted input, palindrome, in-place removal, pair sum in sorted array

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Valid Palindrome | [leetcode.com/problems/valid-palindrome](https://leetcode.com/problems/valid-palindrome/) |
| ⭐ | 🟡 | Two Sum II | [leetcode.com/problems/two-sum-ii-input-array-is-sorted](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) |
| ⭐ | 🟡 | 3Sum | [leetcode.com/problems/3sum](https://leetcode.com/problems/3sum/) |
| ⭐ | 🟡 | Container With Most Water | [leetcode.com/problems/container-with-most-water](https://leetcode.com/problems/container-with-most-water/) |
| | 🟡 | Remove Duplicates from Sorted Array | [leetcode.com/problems/remove-duplicates-from-sorted-array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/) |
| | 🟡 | Move Zeroes | [leetcode.com/problems/move-zeroes](https://leetcode.com/problems/move-zeroes/) |
| | 🟡 | Sort Colors | [leetcode.com/problems/sort-colors](https://leetcode.com/problems/sort-colors/) |
| | 🟡 | Boats to Save People | [leetcode.com/problems/boats-to-save-people](https://leetcode.com/problems/boats-to-save-people/) |
| | 🔴 | Trapping Rain Water | [leetcode.com/problems/trapping-rain-water](https://leetcode.com/problems/trapping-rain-water/) |
| | 🔴 | 4Sum | [leetcode.com/problems/4sum](https://leetcode.com/problems/4sum/) |

---

## 3. Sliding Window

**Template:** Expand `right`, shrink `left` while maintaining invariant (count, sum, unique chars).

**Signals:** "Longest/shortest subarray/substring where…", contiguous subarray

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Best Time to Buy and Sell Stock | [leetcode.com/problems/best-time-to-buy-and-sell-stock](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/) |
| ⭐ | 🟡 | Longest Substring Without Repeating Characters | [leetcode.com/problems/longest-substring-without-repeating-characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/) |
| ⭐ | 🟡 | Longest Repeating Character Replacement | [leetcode.com/problems/longest-repeating-character-replacement](https://leetcode.com/problems/longest-repeating-character-replacement/) |
| ⭐ | 🟡 | Minimum Window Substring | [leetcode.com/problems/minimum-window-substring](https://leetcode.com/problems/minimum-window-substring/) |
| ⭐ | 🟡 | Permutation in String | [leetcode.com/problems/permutation-in-string](https://leetcode.com/problems/permutation-in-string/) |
| | 🟡 | Max Consecutive Ones III | [leetcode.com/problems/max-consecutive-ones-iii](https://leetcode.com/problems/max-consecutive-ones-iii/) |
| | 🟡 | Fruit Into Baskets | [leetcode.com/problems/fruit-into-baskets](https://leetcode.com/problems/fruit-into-baskets/) |
| | 🟡 | Subarray Product Less Than K | [leetcode.com/problems/subarray-product-less-than-k](https://leetcode.com/problems/subarray-product-less-than-k/) |
| | 🔴 | Sliding Window Maximum | [leetcode.com/problems/sliding-window-maximum](https://leetcode.com/problems/sliding-window-maximum/) |
| | 🔴 | Minimum Window Subsequence | [leetcode.com/problems/minimum-window-subsequence](https://leetcode.com/problems/minimum-window-subsequence/) |

**Android tie-in:** Session analytics windows → [Coding Patterns #23]({{< relref "/docs/coding-patterns" >}})

---

## 4. Stack & Monotonic Stack

**Template:** LIFO for matching/nesting; monotonic stack for next greater/smaller element.

**Signals:** Valid parentheses, nested structure, "next greater element", histogram area

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Valid Parentheses | [leetcode.com/problems/valid-parentheses](https://leetcode.com/problems/valid-parentheses/) |
| ⭐ | 🟡 | Min Stack | [leetcode.com/problems/min-stack](https://leetcode.com/problems/min-stack/) |
| ⭐ | 🟡 | Evaluate Reverse Polish Notation | [leetcode.com/problems/evaluate-reverse-polish-notation](https://leetcode.com/problems/evaluate-reverse-polish-notation/) |
| ⭐ | 🟡 | Daily Temperatures | [leetcode.com/problems/daily-temperatures](https://leetcode.com/problems/daily-temperatures/) |
| ⭐ | 🟡 | Largest Rectangle in Histogram | [leetcode.com/problems/largest-rectangle-in-histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/) |
| | 🟡 | Generate Parentheses | [leetcode.com/problems/generate-parentheses](https://leetcode.com/problems/generate-parentheses/) |
| | 🟡 | Decode String | [leetcode.com/problems/decode-string](https://leetcode.com/problems/decode-string/) |
| | 🟡 | Asteroid Collision | [leetcode.com/problems/asteroid-collision](https://leetcode.com/problems/asteroid-collision/) |
| | 🔴 | Trapping Rain Water | [leetcode.com/problems/trapping-rain-water](https://leetcode.com/problems/trapping-rain-water/) |
| | 🔴 | Basic Calculator | [leetcode.com/problems/basic-calculator](https://leetcode.com/problems/basic-calculator/) |

---

## 5. Binary Search

**Template:** Search sorted space; `while (left <= right)` or `while (left < right)` for min/max answer.

**Signals:** Sorted array, "find min/max that satisfies", rotated sorted, search on answer

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Binary Search | [leetcode.com/problems/binary-search](https://leetcode.com/problems/binary-search/) |
| ⭐ | 🟡 | Search in Rotated Sorted Array | [leetcode.com/problems/search-in-rotated-sorted-array](https://leetcode.com/problems/search-in-rotated-sorted-array/) |
| ⭐ | 🟡 | Find Minimum in Rotated Sorted Array | [leetcode.com/problems/find-minimum-in-rotated-sorted-array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/) |
| ⭐ | 🟡 | Koko Eating Bananas | [leetcode.com/problems/koko-eating-bananas](https://leetcode.com/problems/koko-eating-bananas/) |
| ⭐ | 🟡 | Search a 2D Matrix | [leetcode.com/problems/search-a-2d-matrix](https://leetcode.com/problems/search-a-2d-matrix/) |
| | 🟡 | Time Based Key-Value Store | [leetcode.com/problems/time-based-key-value-store](https://leetcode.com/problems/time-based-key-value-store/) |
| | 🟡 | Find Peak Element | [leetcode.com/problems/find-peak-element](https://leetcode.com/problems/find-peak-element/) |
| | 🔴 | Median of Two Sorted Arrays | [leetcode.com/problems/median-of-two-sorted-arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/) |
| | 🔴 | Split Array Largest Sum | [leetcode.com/problems/split-array-largest-sum](https://leetcode.com/problems/split-array-largest-sum/) |
| | 🔴 | Minimum Speed to Arrive on Time | [leetcode.com/problems/minimum-speed-to-arrive-on-time](https://leetcode.com/problems/minimum-speed-to-arrive-on-time/) |

---

## 6. Linked List

**Template:** Dummy head node; fast/slow pointers; reverse in-place.

**Signals:** Cycle detection, merge lists, reorder, remove nth from end

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Reverse Linked List | [leetcode.com/problems/reverse-linked-list](https://leetcode.com/problems/reverse-linked-list/) |
| ⭐ | 🟡 | Merge Two Sorted Lists | [leetcode.com/problems/merge-two-sorted-lists](https://leetcode.com/problems/merge-two-sorted-lists/) |
| ⭐ | 🟡 | Linked List Cycle | [leetcode.com/problems/linked-list-cycle](https://leetcode.com/problems/linked-list-cycle/) |
| ⭐ | 🟡 | Remove Nth Node From End of List | [leetcode.com/problems/remove-nth-node-from-end-of-list](https://leetcode.com/problems/remove-nth-node-from-end-of-list/) |
| ⭐ | 🟡 | Reorder List | [leetcode.com/problems/reorder-list](https://leetcode.com/problems/reorder-list/) |
| ⭐ | 🔴 | Merge K Sorted Lists | [leetcode.com/problems/merge-k-sorted-lists](https://leetcode.com/problems/merge-k-sorted-lists/) |
| | 🟡 | Copy List with Random Pointer | [leetcode.com/problems/copy-list-with-random-pointer](https://leetcode.com/problems/copy-list-with-random-pointer/) |
| | 🔴 | Reverse Nodes in k-Group | [leetcode.com/problems/reverse-nodes-in-k-group](https://leetcode.com/problems/reverse-nodes-in-k-group/) |
| | 🔴 | LRU Cache | [leetcode.com/problems/lru-cache](https://leetcode.com/problems/lru-cache/) |

**Android tie-in:** Multi-source feed merge → [Coding Patterns #20]({{< relref "/docs/coding-patterns" >}})

---

## 7. Trees (BFS / DFS)

**Template:** DFS (pre/in/post order) for path/sum/validation; BFS (queue) for level-order/shortest depth.

**Signals:** Tree traversal, path sum, LCA, serialize, validate BST

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Maximum Depth of Binary Tree | [leetcode.com/problems/maximum-depth-of-binary-tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/) |
| ⭐ | 🟢 | Same Tree | [leetcode.com/problems/same-tree](https://leetcode.com/problems/same-tree/) |
| ⭐ | 🟢 | Invert Binary Tree | [leetcode.com/problems/invert-binary-tree](https://leetcode.com/problems/invert-binary-tree/) |
| ⭐ | 🟡 | Binary Tree Level Order Traversal | [leetcode.com/problems/binary-tree-level-order-traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/) |
| ⭐ | 🟡 | Validate Binary Search Tree | [leetcode.com/problems/validate-binary-search-tree](https://leetcode.com/problems/validate-binary-search-tree/) |
| ⭐ | 🟡 | Lowest Common Ancestor of BST | [leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/) |
| ⭐ | 🟡 | Binary Tree Maximum Path Sum | [leetcode.com/problems/binary-tree-maximum-path-sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/) |
| ⭐ | 🟡 | Serialize and Deserialize Binary Tree | [leetcode.com/problems/serialize-and-deserialize-binary-tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/) |
| | 🟡 | Subtree of Another Tree | [leetcode.com/problems/subtree-of-another-tree](https://leetcode.com/problems/subtree-of-another-tree/) |
| | 🟡 | Construct Binary Tree from Preorder and Inorder | [leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal](https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/) |
| | 🟡 | Kth Smallest Element in BST | [leetcode.com/problems/kth-smallest-element-in-a-bst](https://leetcode.com/problems/kth-smallest-element-in-a-bst/) |
| | 🟡 | Lowest Common Ancestor of Binary Tree | [leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree](https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/) |
| | 🔴 | Binary Tree Right Side View | [leetcode.com/problems/binary-tree-right-side-view](https://leetcode.com/problems/binary-tree-right-side-view/) |
| | 🔴 | Count Good Nodes in Binary Tree | [leetcode.com/problems/count-good-nodes-in-binary-tree](https://leetcode.com/problems/count-good-nodes-in-binary-tree/) |

**Android tie-in:** Parcelable tree serialization → [Coding Patterns #21]({{< relref "/docs/coding-patterns" >}})

---

## 8. Heap / Priority Queue

**Template:** `PriorityQueue` for top-K, merge K sorted, median stream.

**Signals:** "K largest/smallest", "merge sorted lists/arrays", running median

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟡 | Kth Largest Element in an Array | [leetcode.com/problems/kth-largest-element-in-an-array](https://leetcode.com/problems/kth-largest-element-in-an-array/) |
| ⭐ | 🟡 | Top K Frequent Elements | [leetcode.com/problems/top-k-frequent-elements](https://leetcode.com/problems/top-k-frequent-elements/) |
| ⭐ | 🔴 | Find Median from Data Stream | [leetcode.com/problems/find-median-from-data-stream](https://leetcode.com/problems/find-median-from-data-stream/) |
| ⭐ | 🔴 | Merge K Sorted Lists | [leetcode.com/problems/merge-k-sorted-lists](https://leetcode.com/problems/merge-k-sorted-lists/) |
| | 🟡 | Last Stone Weight | [leetcode.com/problems/last-stone-weight](https://leetcode.com/problems/last-stone-weight/) |
| | 🟡 | K Closest Points to Origin | [leetcode.com/problems/k-closest-points-to-origin](https://leetcode.com/problems/k-closest-points-to-origin/) |
| | 🔴 | Task Scheduler | [leetcode.com/problems/task-scheduler](https://leetcode.com/problems/task-scheduler/) |
| | 🔴 | Design Twitter | [leetcode.com/problems/design-twitter](https://leetcode.com/problems/design-twitter/) |

**Kotlin:** `PriorityQueue()` with custom `compareBy { }`

---

## 9. Backtracking

**Template:** Choose → explore → unchoose (recursion + base case + pruning).

**Signals:** Permutations, combinations, subsets, N-Queens, word search

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟡 | Subsets | [leetcode.com/problems/subsets](https://leetcode.com/problems/subsets/) |
| ⭐ | 🟡 | Combination Sum | [leetcode.com/problems/combination-sum](https://leetcode.com/problems/combination-sum/) |
| ⭐ | 🟡 | Permutations | [leetcode.com/problems/permutations](https://leetcode.com/problems/permutations/) |
| ⭐ | 🟡 | Subsets II | [leetcode.com/problems/subsets-ii](https://leetcode.com/problems/subsets-ii/) |
| ⭐ | 🟡 | Combination Sum II | [leetcode.com/problems/combination-sum-ii](https://leetcode.com/problems/combination-sum-ii/) |
| | 🟡 | Palindrome Partitioning | [leetcode.com/problems/palindrome-partitioning](https://leetcode.com/problems/palindrome-partitioning/) |
| | 🟡 | Letter Combinations of a Phone Number | [leetcode.com/problems/letter-combinations-of-a-phone-number](https://leetcode.com/problems/letter-combinations-of-a-phone-number/) |
| | 🟡 | Word Search | [leetcode.com/problems/word-search](https://leetcode.com/problems/word-search/) |
| | 🔴 | N-Queens | [leetcode.com/problems/n-queens](https://leetcode.com/problems/n-queens/) |
| | 🔴 | Word Break II | [leetcode.com/problems/word-break-ii](https://leetcode.com/problems/word-break-ii/) |

---

## 10. Tries

**Template:** Prefix tree with `children: Array<Map>` or 26-char array per node.

**Signals:** Autocomplete, prefix search, word dictionary with wildcards

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟡 | Implement Trie (Prefix Tree) | [leetcode.com/problems/implement-trie-prefix-tree](https://leetcode.com/problems/implement-trie-prefix-tree/) |
| ⭐ | 🟡 | Design Add and Search Words Data Structure | [leetcode.com/problems/design-add-and-search-words-data-structure](https://leetcode.com/problems/design-add-and-search-words-data-structure/) |
| ⭐ | 🔴 | Word Search II | [leetcode.com/problems/word-search-ii](https://leetcode.com/problems/word-search-ii/) |
| | 🟡 | Replace Words | [leetcode.com/problems/replace-words](https://leetcode.com/problems/replace-words/) |
| | 🔴 | Palindrome Pairs | [leetcode.com/problems/palindrome-pairs](https://leetcode.com/problems/palindrome-pairs/) |

**Android tie-in:** Search/autocomplete → [Coding Patterns #3]({{< relref "/docs/coding-patterns" >}})

---

## 11. Graphs

**Template:** Build adjacency list; BFS for shortest path (unweighted); DFS for connectivity; topological sort for dependencies; Union-Find for dynamic connectivity.

**Signals:** Islands, course prerequisites, shortest path, connected components

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Number of Islands | [leetcode.com/problems/number-of-islands](https://leetcode.com/problems/number-of-islands/) |
| ⭐ | 🟡 | Clone Graph | [leetcode.com/problems/clone-graph](https://leetcode.com/problems/clone-graph/) |
| ⭐ | 🟡 | Course Schedule | [leetcode.com/problems/course-schedule](https://leetcode.com/problems/course-schedule/) |
| ⭐ | 🟡 | Course Schedule II | [leetcode.com/problems/course-schedule-ii](https://leetcode.com/problems/course-schedule-ii/) |
| ⭐ | 🟡 | Pacific Atlantic Water Flow | [leetcode.com/problems/pacific-atlantic-water-flow](https://leetcode.com/problems/pacific-atlantic-water-flow/) |
| ⭐ | 🟡 | Number of Connected Components in an Undirected Graph | [leetcode.com/problems/number-of-connected-components-in-an-undirected-graph](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/) |
| ⭐ | 🟡 | Graph Valid Tree | [leetcode.com/problems/graph-valid-tree](https://leetcode.com/problems/graph-valid-tree/) |
| ⭐ | 🟡 | Word Ladder | [leetcode.com/problems/word-ladder](https://leetcode.com/problems/word-ladder/) |
| | 🟡 | Rotting Oranges | [leetcode.com/problems/rotting-oranges](https://leetcode.com/problems/rotting-oranges/) |
| | 🟡 | Redundant Connection | [leetcode.com/problems/redundant-connection](https://leetcode.com/problems/redundant-connection/) |
| | 🔴 | Network Delay Time | [leetcode.com/problems/network-delay-time](https://leetcode.com/problems/network-delay-time/) |
| | 🔴 | Cheapest Flights Within K Stops | [leetcode.com/problems/cheapest-flights-within-k-stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/) |

**Android tie-in:** Navigation graph BFS/DFS → [Coding Patterns #24]({{< relref "/docs/coding-patterns" >}}); Gradle deps → [Coding Patterns #22]({{< relref "/docs/coding-patterns" >}})

---

## 12. Dynamic Programming

**Study order:** 1D linear → knapsack → LCS/LIS → grid → interval DP.

**Template:** Define `dp[i]` meaning; recurrence relation; base cases; iteration vs memoization.

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Climbing Stairs | [leetcode.com/problems/climbing-stairs](https://leetcode.com/problems/climbing-stairs/) |
| ⭐ | 🟢 | Min Cost Climbing Stairs | [leetcode.com/problems/min-cost-climbing-stairs](https://leetcode.com/problems/min-cost-climbing-stairs/) |
| ⭐ | 🟡 | House Robber | [leetcode.com/problems/house-robber](https://leetcode.com/problems/house-robber/) |
| ⭐ | 🟡 | House Robber II | [leetcode.com/problems/house-robber-ii](https://leetcode.com/problems/house-robber-ii/) |
| ⭐ | 🟡 | Coin Change | [leetcode.com/problems/coin-change](https://leetcode.com/problems/coin-change/) |
| ⭐ | 🟡 | Longest Increasing Subsequence | [leetcode.com/problems/longest-increasing-subsequence](https://leetcode.com/problems/longest-increasing-subsequence/) |
| ⭐ | 🟡 | Longest Common Subsequence | [leetcode.com/problems/longest-common-subsequence](https://leetcode.com/problems/longest-common-subsequence/) |
| ⭐ | 🟡 | Word Break | [leetcode.com/problems/word-break](https://leetcode.com/problems/word-break/) |
| ⭐ | 🟡 | Decode Ways | [leetcode.com/problems/decode-ways](https://leetcode.com/problems/decode-ways/) |
| ⭐ | 🟡 | Unique Paths | [leetcode.com/problems/unique-paths](https://leetcode.com/problems/unique-paths/) |
| ⭐ | 🟡 | Jump Game | [leetcode.com/problems/jump-game](https://leetcode.com/problems/jump-game/) |
| | 🟡 | Partition Equal Subset Sum | [leetcode.com/problems/partition-equal-subset-sum](https://leetcode.com/problems/partition-equal-subset-sum/) |
| | 🟡 | Target Sum | [leetcode.com/problems/target-sum](https://leetcode.com/problems/target-sum/) |
| | 🟡 | Maximum Product Subarray | [leetcode.com/problems/maximum-product-subarray](https://leetcode.com/problems/maximum-product-subarray/) |
| | 🟡 | Edit Distance | [leetcode.com/problems/edit-distance](https://leetcode.com/problems/edit-distance/) |
| | 🔴 | Burst Balloons | [leetcode.com/problems/burst-balloons](https://leetcode.com/problems/burst-balloons/) |
| | 🔴 | Regular Expression Matching | [leetcode.com/problems/regular-expression-matching](https://leetcode.com/problems/regular-expression-matching/) |
| | 🔴 | Best Time to Buy and Sell Stock IV | [leetcode.com/problems/best-time-to-buy-and-sell-stock-iv](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iv/) |

> **Spend 2 full weeks here.** DP is the #1 reason strong Android candidates fail coding rounds.

---

## 13. Greedy & Intervals

**Template:** Sort intervals by start or end; greedy choice at each step.

**Signals:** Meeting rooms, merge intervals, non-overlapping, jump game greedy

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟡 | Merge Intervals | [leetcode.com/problems/merge-intervals](https://leetcode.com/problems/merge-intervals/) |
| ⭐ | 🟡 | Insert Interval | [leetcode.com/problems/insert-interval](https://leetcode.com/problems/insert-interval/) |
| ⭐ | 🟡 | Non-overlapping Intervals | [leetcode.com/problems/non-overlapping-intervals](https://leetcode.com/problems/non-overlapping-intervals/) |
| ⭐ | 🟡 | Meeting Rooms II | [leetcode.com/problems/meeting-rooms-ii](https://leetcode.com/problems/meeting-rooms-ii/) |
| ⭐ | 🟡 | Jump Game | [leetcode.com/problems/jump-game](https://leetcode.com/problems/jump-game/) |
| | 🟡 | Meeting Rooms | [leetcode.com/problems/meeting-rooms](https://leetcode.com/problems/meeting-rooms/) |
| | 🟡 | Gas Station | [leetcode.com/problems/gas-station](https://leetcode.com/problems/gas-station/) |
| | 🟡 | Hand of Straights | [leetcode.com/problems/hand-of-straights](https://leetcode.com/problems/hand-of-straights/) |
| | 🔴 | Minimum Number of Arrows to Burst Balloons | [leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons](https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/) |
| | 🔴 | Employee Free Time | [leetcode.com/problems/employee-free-time](https://leetcode.com/problems/employee-free-time/) |

**Android tie-in:** Calendar/booking → [Coding Patterns #26]({{< relref "/docs/coding-patterns" >}})

---

## 14. Bit Manipulation & Math

**Template:** XOR for pairs, bit masks, shift for powers of two.

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟢 | Number of 1 Bits | [leetcode.com/problems/number-of-1-bits](https://leetcode.com/problems/number-of-1-bits/) |
| ⭐ | 🟢 | Counting Bits | [leetcode.com/problems/counting-bits](https://leetcode.com/problems/counting-bits/) |
| ⭐ | 🟡 | Missing Number | [leetcode.com/problems/missing-number](https://leetcode.com/problems/missing-number/) |
| ⭐ | 🟡 | Reverse Bits | [leetcode.com/problems/reverse-bits](https://leetcode.com/problems/reverse-bits/) |
| ⭐ | 🟡 | Sum of Two Integers | [leetcode.com/problems/sum-of-two-integers](https://leetcode.com/problems/sum-of-two-integers/) |
| | 🟡 | Single Number | [leetcode.com/problems/single-number](https://leetcode.com/problems/single-number/) |
| | 🟡 | Reverse Integer | [leetcode.com/problems/reverse-integer](https://leetcode.com/problems/reverse-integer/) |
| | 🟡 | Pow(x, n) | [leetcode.com/problems/powx-n](https://leetcode.com/problems/powx-n/) |

---

## 15. Design & Concurrency

**Common in Google Android-flavored rounds.** Implement from scratch in Kotlin.

| Status | Diff | Problem | Link |
|--------|------|---------|------|
| ⭐ | 🟡 | LRU Cache | [leetcode.com/problems/lru-cache](https://leetcode.com/problems/lru-cache/) |
| ⭐ | 🟡 | Min Stack | [leetcode.com/problems/min-stack](https://leetcode.com/problems/min-stack/) |
| ⭐ | 🟡 | Time Based Key-Value Store | [leetcode.com/problems/time-based-key-value-store](https://leetcode.com/problems/time-based-key-value-store/) |
| ⭐ | 🔴 | LFU Cache | [leetcode.com/problems/lfu-cache](https://leetcode.com/problems/lfu-cache/) |
| ⭐ | 🔴 | Design Hit Counter | [leetcode.com/problems/design-hit-counter](https://leetcode.com/problems/design-hit-counter/) |
| | 🔴 | Design Search Autocomplete System | [leetcode.com/problems/design-search-autocomplete-system](https://leetcode.com/problems/design-search-autocomplete-system/) |
| | 🔴 | Design In-Memory File System | [leetcode.com/problems/design-in-memory-file-system](https://leetcode.com/problems/design-in-memory-file-system/) |
| | — | (No LC) Rate Limiter, Blocking Queue | [Coding Patterns #5–6]({{< relref "/docs/coding-patterns" >}}) |

---

## 16. Mixed Review Sets (Google Frequency)

After week 8, rotate these sets weekly. **Do both problems in 45 min total.**

### Set A — Hash + Window
1. [Two Sum](https://leetcode.com/problems/two-sum/)
2. [Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)

### Set B — Tree + Graph
1. [Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/)
2. [Course Schedule](https://leetcode.com/problems/course-schedule/)

### Set C — DP + Greedy
1. [Coin Change](https://leetcode.com/problems/coin-change/)
2. [Merge Intervals](https://leetcode.com/problems/merge-intervals/)

### Set D — Linked List + Heap
1. [Merge K Sorted Lists](https://leetcode.com/problems/merge-k-sorted-lists/)
2. [Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/)

### Set E — Design
1. [LRU Cache](https://leetcode.com/problems/lru-cache/)
2. [Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/)

### Set F — Hard stretch
1. [Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/)
2. [Word Ladder](https://leetcode.com/problems/word-ladder/)

---

## 12-Week Day-by-Day Schedule

Problems listed by name — click pattern section above for links.

### Week 1 — Arrays, Two Pointers, Window (start)

| Day | Problems (in order) |
|-----|---------------------|
| Mon | Contains Duplicate → Valid Anagram → Two Sum |
| Tue | Group Anagrams → Two Sum II → Valid Palindrome |
| Wed | 3Sum → Container With Most Water |
| Thu | Best Time to Buy and Sell Stock → Longest Substring Without Repeating Characters |
| Fri | **Timed review:** Two Sum + 3Sum (45 min) |
| Sat | Product of Array Except Self (untimed deep dive) |
| Sun | Re-do any failed from Mon–Fri |

### Week 2 — Window, Stack, Binary Search

| Day | Problems |
|-----|----------|
| Mon | Longest Repeating Character Replacement → Minimum Window Substring |
| Tue | Valid Parentheses → Min Stack |
| Wed | Daily Temperatures → Evaluate Reverse Polish Notation |
| Thu | Binary Search → Search in Rotated Sorted Array |
| Fri | **Timed review:** Longest Substring + Valid Parentheses |
| Sat | Koko Eating Bananas → Search a 2D Matrix |
| Sun | Re-do failures |

### Week 3 — Linked List, Trees (intro)

| Day | Problems |
|-----|----------|
| Mon | Reverse Linked List → Merge Two Sorted Lists |
| Tue | Linked List Cycle → Remove Nth Node From End |
| Wed | Reorder List → Maximum Depth → Same Tree → Invert Tree |
| Thu | Binary Tree Level Order → Validate BST |
| Fri | **Timed review:** Merge Two Sorted Lists + Validate BST |
| Sat | Lowest Common Ancestor of BST |
| Sun | Re-do failures |

### Week 4 — Trees, Heap

| Day | Problems |
|-----|----------|
| Mon | Binary Tree Maximum Path Sum → Subtree of Another Tree |
| Tue | Serialize and Deserialize Binary Tree |
| Wed | Kth Largest Element → Top K Frequent Elements |
| Thu | Last Stone Weight → K Closest Points to Origin |
| Fri | **Timed review:** Level Order + Kth Largest |
| Sat | Merge K Sorted Lists (hard — 45 min cap) |
| Sun | Re-do failures |

### Week 5 — Backtracking, Trie, Graph (start)

| Day | Problems |
|-----|----------|
| Mon | Subsets → Subsets II |
| Tue | Combination Sum → Combination Sum II |
| Wed | Permutations → Word Search |
| Thu | Implement Trie → Design Add and Search Words |
| Fri | **Timed review:** Subsets + Permutations |
| Sat | Number of Islands → Clone Graph |
| Sun | Re-do failures |

### Week 6 — Graphs

| Day | Problems |
|-----|----------|
| Mon | Course Schedule → Course Schedule II |
| Tue | Pacific Atlantic Water Flow → Rotting Oranges |
| Wed | Number of Connected Components → Graph Valid Tree |
| Thu | Word Ladder → Redundant Connection |
| Fri | **Timed review:** Course Schedule + Number of Islands |
| Sat | Network Delay Time (stretch) |
| Sun | Re-do failures |

### Week 7 — DP (1D)

| Day | Problems |
|-----|----------|
| Mon | Climbing Stairs → Min Cost Climbing Stairs → House Robber |
| Tue | House Robber II → Decode Ways |
| Wed | Coin Change → Word Break |
| Thu | Longest Increasing Subsequence → Jump Game |
| Fri | **Timed review:** Coin Change + House Robber |
| Sat | Partition Equal Subset Sum |
| Sun | Re-do all failed DP |

### Week 8 — DP (2D + classic)

| Day | Problems |
|-----|----------|
| Mon | Unique Paths → Longest Common Subsequence |
| Tue | Edit Distance → Maximum Product Subarray |
| Wed | Target Sum → Best Time to Buy and Sell Stock IV (skim) |
| Thu | Merge Intervals → Insert Interval → Non-overlapping Intervals |
| Fri | **Timed review:** LIS + Merge Intervals |
| Sat | Meeting Rooms II |
| Sun | Re-do failed DP |

### Week 9 — Bit Manipulation, Design, Intervals

| Day | Problems |
|-----|----------|
| Mon | Missing Number → Single Number → Number of 1 Bits |
| Tue | Counting Bits → Reverse Bits → Sum of Two Integers |
| Wed | LRU Cache (implement twice — morning & evening) |
| Thu | Min Stack → Time Based Key-Value Store |
| Fri | **Timed review:** LRU Cache + Meeting Rooms II |
| Sat | LFU Cache (stretch) |
| Sun | Mixed Set A + Set B |

### Week 10 — Mocks + weak patterns

| Day | Activity |
|-----|----------|
| Mon | Mixed Set C — timed |
| Tue | Mixed Set D — timed |
| Wed | Full mock #1 (random medium + medium) |
| Thu | Mixed Set E — timed |
| Fri | Full mock #2 |
| Sat | Word Search II + Find Median from Data Stream |
| Sun | Re-do top 5 all-time failures |

### Week 11 — Hard stretch + design

| Day | Activity |
|-----|----------|
| Mon | Mixed Set F — timed |
| Tue | Trapping Rain Water + Sliding Window Maximum |
| Wed | Full mock #3 |
| Thu | Median of Two Sorted Arrays (study solution) |
| Fri | Full mock #4 |
| Sat | Implement Rate Limiter + Debounce from [Coding Patterns]({{< relref "/docs/coding-patterns" >}}) |
| Sun | Light review — no new problems |

### Week 12 — Polish (apply / interview week)

| Day | Activity |
|-----|----------|
| Mon | 3 ⭐ mediums from weakest pattern |
| Tue | LRU Cache + Serialize Binary Tree from memory |
| Wed | Full mock #5 |
| Thu | 2 graph + 1 DP timed |
| Fri | Full mock #6 |
| Sat | Rest or 1 easy warm-up only |
| Sun | Rest — review templates only |

---

## Android + DSA Combined Weekly Map

Run **in parallel** with the 12-week DSA schedule above.

| Week | Android focus (from this site) |
|------|--------------------------------|
| 1–2 | [System Design]({{< relref "/docs/system-design" >}}) Parts 1–2 + [Caching Patterns]({{< relref "/docs/caching-patterns" >}}) |
| 3–4 | [Deep Dives]({{< relref "/docs/deep-dives" >}}) Coroutines + [Compose Mastery]({{< relref "/docs/compose-mastery" >}}) Parts 1–2 |
| 5–6 | [Mobile System Design]({{< relref "/docs/mobile-system-design" >}}) — chat + image loader exercises |
| 7–8 | [Compose Rendering]({{< relref "/docs/compose-rendering" >}}) + [Testing Patterns]({{< relref "/docs/testing-patterns" >}}) |
| 9–10 | [Compose Internals]({{< relref "/docs/compose-internals" >}}) snapshots + recomposition chapters |
| 11–12 | [Behavioral]({{< relref "/docs/behavioral" >}}) + 2 full system design mocks |

---

## Interview Day Checklist

**Before coding:**
- [ ] Repeat problem back in your own words
- [ ] Ask about input size, duplicates, negative numbers, empty input
- [ ] State brute force + complexity before optimizing

**While coding:**
- [ ] Name the pattern out loud ("This is sliding window because…")
- [ ] Use meaningful variable names (`left`, `right`, `freqMap`)
- [ ] Keep talking — silence is a red flag at Google

**After coding:**
- [ ] Walk through example dry-run
- [ ] Test edge cases: empty, single element, all same, max constraints
- [ ] State time and space complexity

---

## Quick Links

| Resource | URL |
|----------|-----|
| NeetCode 150 (pattern playlists) | [neetcode.io/practice](https://neetcode.io/practice) |
| LeetCode Top Interview 150 | [leetcode.com/studyplan/top-interview-150](https://leetcode.com/studyplan/top-interview-150/) |
| LeetCode 75 | [leetcode.com/studyplan/leetcode-75](https://leetcode.com/studyplan/leetcode-75/) |
| Mock interviews | [interviewing.io](https://interviewing.io/) · [pramp.com](https://www.pramp.com/) |
| Your Kotlin implementations | [Coding Patterns]({{< relref "/docs/coding-patterns" >}}) |
| Behavioral prep | [Behavioral Interview]({{< relref "/docs/behavioral" >}}) |

---

> **⭐ problems = 80 must-do** before Google L4 phone screen. Complete all ⭐ at least twice (once untimed, once timed) before applying.
>
> Track progress → [Printable Checklist]({{< relref "/docs/dsa-checklist" >}}) · NeetCode mapping → [NeetCode 150 Cross-Reference]({{< relref "/docs/neetcode-crossref" >}})
