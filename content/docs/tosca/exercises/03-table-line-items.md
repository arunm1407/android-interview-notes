---
title: "Exercise 3: Table Line Items"
weight: 3
---

# Exercise 3: Table Line Items

> **Level:** Mid | **Time:** 3–4 hours | **Prerequisite:** [Exercise 2]({{< relref "02-buffer-and-chain" >}})

## Objectives

- Automate SAP GUI table entry in VA01 line items
- Use steering parameters for row index
- Add 3 line items via TBox loop

---

## Part A — Table Module

1. Scan VA01 line-item grid → `M_SAP_VA01_LineItems`.
2. Identify attributes:
   - `Table_Material`
   - `Table_Quantity`
   - `Table_Plant` (if visible)
3. Set **Steering Parameter** `Row` on table attributes.

---

## Part B — Single Row (Manual)

Create TestSteps for Row 0:

| Step | Row | Action | Value |
|------|-----|--------|-------|
| Table_Material | 0 | Input | MAT-001 |
| Table_Quantity | 0 | Input | 10 |
| SendKeys | — | Enter | — |

Verify row appears in table (optional Verify on cell value).

---

## Part C — Three Rows via TBox

Add TBox block **before** table steps:

```vb
Dim materials, qtys, i
materials = Split("MAT-001;MAT-002;MAT-003", ";")
qtys = Split("10;5;20", ";")

For i = 0 To 2
    SetSteeringParameter("Table_Material", "Row", CStr(i))
    SetSteeringParameter("Table_Quantity", "Row", CStr(i))
    TestStep("Table_Material", "Input", materials(i))
    TestStep("Table_Quantity", "Input", qtys(i))
    TestStep("SendKeys", "Enter", "")
Next

LogInfo("Added 3 line items")
```

---

## Part D — Full TestCase

Combine header (Exercise 1) + 3 line items + Save + Buffer from Exercise 2.

Name: `TC_LAB03_CreateSO_ThreeItems`

---

## Validation Criteria

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Single row entry works with Row=0 | ☐ |
| 2 | TBox loop adds 3 distinct materials | ☐ |
| 3 | Order saves without incompletion log | ☐ |
| 4 | VA03 shows 3 line items | ☐ |
| 5 | No fixed `Wait(10000)` — uses WaitOn if needed | ☐ |

---

## Extension Challenges

1. Drive materials from TestSheet column (preview Exercise 5).
2. Repeat same pattern on **ME21N** PO line items.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Row 1 overwrites row 0 | Confirm Enter after each row |
| Wrong column edited | Re-scan table columns |
| Plant mandatory | Add plant column or default from config |

---

> **Next:** [Exercise 4: Recovery Scenarios]({{< relref "04-recovery-scenarios" >}})
