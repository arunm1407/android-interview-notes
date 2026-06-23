---
title: "Exercise 1: First Scan & TestCase"
weight: 1
---

# Exercise 1: First Scan & TestCase

> **Level:** Junior | **Time:** 2–3 hours | **Prerequisite:** SAP sandbox access, Tosca installed

## Objectives

By the end of this lab you will:

- Scan a SAP GUI screen into a Module
- Rename attributes to business-friendly names
- Create and run a TestCase that creates a display-only or create flow
- Create an ExecutionList and interpret the execution log

## Prerequisites

- [ ] SAP scripting enabled (see [Part 3]({{< relref "../topics/03-sap-gui-automation" >}}))
- [ ] Test customer number and material available in sandbox
- [ ] Read [Part 1]({{< relref "../topics/01-fundamentals-getting-started" >}})

---

## Part A — Scan VA01 Header Screen

1. Log into SAP on the **Engine machine** (not only Commander machine if they differ).
2. Navigate to transaction **VA01**.
3. In Commander: `01_Modules/SAP/SD/` → right-click → **Scan** → **SAP**.
4. Select the SAP session window showing VA01 initial screen.
5. Save Module as: `M_SAP_VA01_InitialScreen`

### Rename These Attributes (minimum)

| Original (example) | Rename to |
|--------------------|-----------|
| Order type field | `Input_OrderType` |
| Sold-to party | `Input_SoldToParty` |
| Sales org | `Input_SalesOrg` |
| Distribution channel | `Input_DistChannel` |
| Division | `Input_Division` |
| Continue/Enter equivalent | `Button_Continue` |

---

## Part B — Create TestCase

1. Right-click Module → **Create TestCase**.
2. Name: `TC_LAB01_CreateSO_Initial`
3. Delete unnecessary TestSteps — keep only:

| Step | Action | Value |
|------|--------|-------|
| Input_OrderType | Input | OR |
| Input_SoldToParty | Input | *your test customer* |
| Input_SalesOrg | Input | *your sales org* |
| Input_DistChannel | Input | *your channel* |
| Input_Division | Input | *your division* |
| Button_Continue | Click | — |

4. Press **F8** — TestCase should reach line-item screen or show validation error you can fix.

---

## Part C — ExecutionList

1. Create `EL_LAB01_Smoke` under `04_ExecutionLists/`.
2. Add `TC_LAB01_CreateSO_Initial`.
3. Run with **Ctrl + F8**.
4. Open execution log — note duration, pass/fail, screenshots.

---

## Validation Criteria

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Module scan captured at least 5 attributes | ☐ |
| 2 | All attributes renamed (no cryptic IDs in TestCase) | ☐ |
| 3 | TestCase runs without "object not found" | ☐ |
| 4 | ExecutionList completes with green status | ☐ |
| 5 | Can explain Module vs TestCase to a colleague | ☐ |

---

## Extension Challenges

1. Scan the **line-item screen** as separate Module `M_SAP_VA01_LineItems`.
2. Add TestStep to input one material and quantity.
3. Add Verify on status bar after save (prepare for Exercise 2).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Scan finds nothing | Scripting disabled — check client options |
| Wrong window scanned | Close extra SAP sessions |
| Validation error on customer | Use known valid master data from MM/SD team |

---

> **Next:** [Exercise 2: Buffer & Document Chain]({{< relref "02-buffer-and-chain" >}})
