---
title: "Exercise 5: TestSheet Data-Driven"
weight: 5
---

# Exercise 5: TestSheet Data-Driven Testing

> **Level:** Mid | **Time:** 2–3 hours | **Prerequisite:** [Exercise 3]({{< relref "03-table-line-items" >}})

## Objectives

- Create Excel TestSheet with 10 data rows
- Bind TestCase for 10 iterations
- Filter rows by Tags for smoke subset

---

## Part A — Create TestSheet

Create Excel file `TS_LAB05_StandardOrders.xlsx`:

| RowId | SoldToParty | Material | Quantity | Plant | ExpectedResult | Tags |
|-------|-------------|----------|----------|-------|----------------|------|
| 1 | 100001 | MAT-001 | 10 | 1000 | SUCCESS | smoke |
| 2 | 100002 | MAT-002 | 5 | 1000 | SUCCESS | smoke |
| 3 | 100003 | MAT-003 | 1 | 1000 | SUCCESS | regression |
| ... | ... | ... | ... | ... | ... | ... |
| 10 | INVALID | MAT-001 | 10 | 1000 | ERROR | negative |

Import to Commander → `03_TestSheets/TS_LAB05_StandardOrders`.

---

## Part B — Bind TestCase

1. Refactor create SO TestCase → `TC_LAB05_CreateSO_DDT`.
2. TestCase properties → TestSheet → `TS_LAB05_StandardOrders`.
3. Replace hardcoded values:

```
Input_SoldToParty  → {TestSheet.SoldToParty}
Table_Material     → {TestSheet.Material}
Table_Quantity     → {TestSheet.Quantity}
```

4. Add Verify based on ExpectedResult:

```vb
If TestSheet("ExpectedResult") = "SUCCESS" Then
    If Len(Buffer("BUF_SO_Number")) = 0 Then
        LogError("Expected success but no order created")
        StopExecution
    End If
ElseIf TestSheet("ExpectedResult") = "ERROR" Then
    ' Verify error message appears — do not expect BUF_SO_Number
    LogInfo("Negative test — expecting error")
End If
```

---

## Part C — Run All Iterations

1. Execute TestCase — confirm 10 iterations in log.
2. Review pass/fail per row in execution report.

---

## Part D — TestConfiguration

Create `TCFG_LAB05_QAS`:

| Key | Value |
|-----|-------|
| SAP_System | QAS |
| SAP_Client | 100 |
| Default_Plant | 1000 |

Use `{TestConfiguration("Default_Plant")}` for plant field.

---

## Validation Criteria

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | 10 iterations execute from one TestCase | ☐ |
| 2 | Row 10 (invalid customer) fails or passes as designed | ☐ |
| 3 | No hardcoded customer in TestCase | ☐ |
| 4 | TestConfiguration used for at least one field | ☐ |
| 5 | Can explain DDT vs 10 duplicate TestCases | ☐ |

---

## Extension Challenges

1. Create `EL_LAB05_Smoke` filtering Tags = smoke only (3 rows).
2. Add Environment column for DEV/QAS if you have both systems.

See [Data-Driven diagram]({{< relref "../diagrams" >}}#14-data-driven-test-execution).

---

> **Next:** [Exercise 6: API + GUI Hybrid]({{< relref "06-api-hybrid-odata" >}})
