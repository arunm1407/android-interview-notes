---
title: "Exercise 7: Framework Refactor"
weight: 7
---

# Exercise 7: Framework Refactor

> **Level:** Senior | **Time:** 6–8 hours | **Prerequisite:** Exercises 1–6 complete

## Objectives

- Restructure lab work into 4-layer framework
- Extract component library with parameters
- Refactor business TestCase using TestCaseCall only
- Document naming conventions

---

## Part A — Folder Migration

Reorganize workspace:

```
01_Modules/SAP/SD/VA01/     ← existing modules
02_Components/
    TC_LIB_SAP_Login
    TC_LIB_SAP_NavigateTCode
    TC_LIB_SD_CreateSalesOrder
    TC_LIB_SD_DisplaySalesOrder
03_Business/SD/
    TC_SD_BP_LAB_StandardOTC
04_ExecutionLists/
    EL_Regression_SD_Lab
05_Infrastructure/
    TCFG_QAS
    REC_SAP_SystemMessage_Generic
```

---

## Part B — Component: Create Sales Order

`TC_LIB_SD_CreateSalesOrder`:

**Input parameters:**

| Param | Type |
|-------|------|
| SoldToParty | In |
| Material | In |
| Quantity | In |
| Plant | In |

**Output parameters:**

| Param | Type |
|-------|------|
| OrderNumber | Out |

**Internal flow:** Navigate VA01 → header → line item → save → buffer → set output param.

Mark TestCase as **Reusable**.

---

## Part C — Business TestCase

`TC_SD_BP_LAB_StandardOTC`:

```
1. TestCaseCall TC_LIB_SAP_Login (if needed)
2. TestCaseCall TC_LIB_SD_CreateSalesOrder
     IN: from TestSheet
     OUT: OrderNumber → Buffer
3. TestCaseCall TC_LIB_SD_DisplaySalesOrder
     IN: OrderNumber from Buffer
4. Verify sold-to, material, quantity
```

**Rule:** No direct Module TestSteps in business layer — only TestCaseCalls.

---

## Part D — Naming & Documentation

Create `FRAMEWORK_README.txt` in workspace root:

```markdown
# Naming Conventions
- Modules: M_<Engine>_<TCode>_<Screen>
- Components: TC_LIB_<Area>_<Action>
- Business: TC_<Module>_BP_<ID>_<Name>
- Buffers: BUF_<Entity>_<Field>
- Recovery: REC_<Scope>_<Trigger>
```

---

## Validation Criteria

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | 4-layer folder structure implemented | ☐ |
| 2 | Business TC has zero direct Module steps | ☐ |
| 3 | CreateSO component used by 2+ business TCs | ☐ |
| 4 | Naming doc exists and is followed | ☐ |
| 5 | Can draw [framework diagram]({{< relref "../diagrams" >}}) from memory | ☐ |
| 6 | Peer can add new business TC without copying steps | ☐ |

---

## Extension Challenges

1. Add `TC_LIB_MM_CreatePO` component — second domain reuse of login/navigate libs.
2. Link business TC to Requirement object for traceability.
3. Code review another team's TestCase against your checklist ([Part 7]({{< relref "../topics/07-framework-architecture" >}})).

---

> **Next:** [Exercise 8: CI/CD Pipeline]({{< relref "08-cicd-pipeline" >}})
