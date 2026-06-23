---
title: "Exercise 2: Buffer & Document Chain"
weight: 2
---

# Exercise 2: Buffer & Document Chain

> **Level:** Junior | **Time:** 3 hours | **Prerequisite:** [Exercise 1]({{< relref "01-first-scan-and-testcase" >}})

## Objectives

- Complete a sales order save in VA01
- Buffer order number from status bar using regex
- Chain two TestCases in an ExecutionList using the same buffer session

## Prerequisites

- Module for VA01 with line items and Save button
- Status bar attribute captured in Module

---

## Part A — Buffer Order Number

1. Extend TestCase `TC_LAB02_CreateSO_Save`:
   - Complete header + one line item
   - Click Save
2. Add TestStep on **StatusBar** attribute:

| Property | Value |
|----------|-------|
| Action | Buffer |
| Operator | * (contains) |
| Value | has been saved |

3. Add **TBox Script** block after save:

```vb
Dim msg, orderNum
msg = Buffer("StatusBar")
orderNum = UseRegEx("Standard Order ([0-9]+)", msg, 1)
Buffer("BUF_SO_Number") = orderNum
LogInfo("Created SO: " + orderNum)
```

4. Add Verify TestStep: `BUF_SO_Number` is not empty (via TBox or verify step).

---

## Part B — Display Order in VA03

1. Scan VA03 display screen → `M_SAP_VA03_Display`.
2. Create `TC_LAB02_DisplaySO`:
   - Navigate to VA03 (T-code `/nVA03` in ok-code field)
   - Input `{Buffer("BUF_SO_Number")}` into order field
   - Click Display
   - Verify sold-to party matches TestCase input

---

## Part C — ExecutionList Chain

Create `EL_LAB02_SO_Chain`:

```
1. TC_LAB02_CreateSO_Save     → sets BUF_SO_Number
2. TC_LAB02_DisplaySO         → reads BUF_SO_Number
```

**Important:** Run both in **same engine session** without closing SAP.

---

## Validation Criteria

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Status bar regex extracts 10-digit order number | ☐ |
| 2 | LogInfo shows correct number in execution log | ☐ |
| 3 | VA03 displays same order without manual input | ☐ |
| 4 | Chain fails if TC1 fails (expected behavior) | ☐ |
| 5 | Can explain buffer lifecycle across TestCases | ☐ |

---

## Extension Challenges

1. Add `TC_LIB_ClearBuffers` precondition that clears all `BUF_*` buffers.
2. Buffer delivery number in VL01N (preview Exercise 3 chain: SO → Delivery).

---

## Diagram Reference

See [Buffer Lifecycle diagram]({{< relref "../diagrams" >}}#6-buffer-lifecycle-across-executionlist).

---

> **Next:** [Exercise 3: Table Line Items]({{< relref "03-table-line-items" >}})
