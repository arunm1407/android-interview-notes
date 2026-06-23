---
title: "Exercise 4: Recovery Scenarios"
weight: 4
---

# Exercise 4: Recovery Scenarios

> **Level:** Mid | **Time:** 2–3 hours | **Prerequisite:** [Exercise 3]({{< relref "03-table-line-items" >}})

## Objectives

- Create generic system message recovery
- Create scenario-specific recovery
- Attach recoveries at Module and TestCase levels
- Deliberately trigger and verify recovery fires

---

## Part A — Scan Common Popup Module

1. Trigger a **system information popup** in SAP (save any doc if messages appear).
2. Scan modal → `M_SAP_Common_SystemPopup`.
3. Capture: message text area, Continue/Enter button.

---

## Part B — Generic Recovery

Create `REC_SAP_SystemMessage_Generic`:

| Property | Value |
|----------|-------|
| Trigger Module | M_SAP_Common_SystemPopup |
| Condition | Popup visible OR message contains "Information" |
| Action | Click Continue / SendVKey Enter |

Attach to **Module** `M_SAP_VA01_InitialScreen` (or all SD modules).

---

## Part C — Credit Block Recovery (If Available)

1. Use TestSheet row with customer over credit limit OR configure low limit in VKM1.
2. Attempt VA01 save → credit block popup appears.
3. Scan popup → `M_SAP_CreditBlock_Popup`.
4. Create `REC_SD_CreditBlock`:

```vb
Buffer("BUF_CreditBlock") = "Yes"
LogWarning("Credit block detected")
' Either click Continue to test release flow, or StopExecution
```

Attach at **TestCase** level for credit-specific tests only.

---

## Part D — Test Recoveries

| TestCase | Expected |
|----------|----------|
| TC_LAB04_TriggerSystemMsg | Generic recovery dismisses popup, TC continues |
| TC_LAB04_TriggerCreditBlock | BUF_CreditBlock=Yes, controlled pass/fail |

---

## Validation Criteria

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Generic recovery attached at Module level | ☐ |
| 2 | System message no longer fails TestCase | ☐ |
| 3 | Credit recovery sets buffer correctly | ☐ |
| 4 | Recovery priority: specific before generic | ☐ |
| 5 | Can whiteboard [recovery flow diagram]({{< relref "../diagrams" >}}) | ☐ |

---

## Extension Challenges

1. Add recovery for "Express and Save" customizing popup.
2. Log unhandled popup text + screenshot in generic fallback recovery.

---

> **Next:** [Exercise 5: TestSheet Data-Driven]({{< relref "05-testsheet-data-driven" >}})
