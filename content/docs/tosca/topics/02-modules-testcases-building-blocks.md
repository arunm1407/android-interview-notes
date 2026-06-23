---
title: "Part 2: Modules, TestCases & Building Blocks"
weight: 2
---

# Part 2: Modules, TestCases & Building Blocks

> **Level:** Junior → Mid | **Prerequisite:** [Part 1]({{< relref "01-fundamentals-getting-started" >}}) | **Next:** [Part 3: SAP GUI]({{< relref "03-sap-gui-automation" >}})

---

## 2.1 Module Deep Dive

### Module Types

| Type | When to Use |
|------|-------------|
| **Standard Module** | Classic scan — older projects |
| **TBox Module** | Modern default — TBox expressions, flexible actions |
| **ApiEngine Module** | REST/SOAP from Swagger/WSDL |
| **WebModule** | HTML/DOM elements |
| **Mobile Module** | iOS/Android via Appium bridge |

### Module Anatomy

```
Module: M_SAP_VA01_CreateSalesOrder
├── TechnicalId: SAP
├── Engine: SAP
├── Attributes:
│   ├── Input_SoldToParty     [ControlType: GuiTextField]
│   ├── Input_Material        [ControlType: GuiTextField]
│   ├── Table_LineItems       [ControlType: GuiGridView]
│   ├── Button_Save           [ControlType: GuiButton]
│   └── StatusBar_Message     [ControlType: GuiStatusbar]
└── Recovery Scenarios: [attached list]
```

### Attribute Properties

| Property | Purpose |
|----------|---------|
| **BusinessAssociation** | Links attribute to business term |
| **Cardinality** | Single vs. multiple instances |
| **Steering Parameter** | Dynamic row/column for tables |
| **Constraint** | Required/optional for TestCase generation |

---

## 2.2 Scan Strategies

### Full Scan vs. Incremental Scan

| Strategy | Use When |
|----------|----------|
| **Full re-scan** | Major SAP upgrade, many broken attributes |
| **Incremental scan** | New fields added to existing screen |
| **Manual attribute** | Single new button not picked up by scan |

### Multi-Screen Modules

**Anti-pattern:** One module for entire VA01 flow including popups.

**Best practice:** Separate modules per logical screen:

```
M_SAP_VA01_HeaderData
M_SAP_VA01_LineItems
M_SAP_VA01_PartnerSelection    (popup)
M_SAP_VA01_IncompletionLog     (popup)
M_SAP_Common_SystemMessages    (shared recovery)
```

---

## 2.3 TestStep Actions Reference

### Standard Actions

| Action | Description | Example |
|--------|-------------|---------|
| **Input** | Type value into field | Customer number |
| **Select** | Choose from dropdown | Sales doc type OR |
| **Click** | Button/link | Save |
| **Verify** | Assert value/state | Status = "Complete" |
| **Buffer** | Store runtime value | Order number |
| **WaitOn** | Wait for attribute state | Table row appears |
| **Check Error** | Verify error message | Credit block message |
| **SendKeys** | Keyboard shortcut | F8, Enter, Ctrl+S |

### Verify Operators

| Operator | Use Case |
|----------|----------|
| `=` | Exact match |
| `*` | Contains |
| `!=` | Not equal |
| `~` | Regex match |
| `>` / `<` | Numeric comparison |

---

## 2.4 TestCase Design Patterns

### Pattern 1: Atomic TestCase

One business action, one verification.

```
TC_SD_010_CreateSalesOrder
  → Creates SO, buffers number, verifies saved

TC_SD_020_CreateDelivery
  → Uses Buffer("OrderNumber"), creates delivery
```

**Pros:** Reusable, easy to debug, parallel-friendly.  
**Cons:** More TestCases to manage.

### Pattern 2: End-to-End TestCase

Full business flow in one TestCase.

```
TC_SD_E2E_001_StandardOTC
  → VA01 → VL01N → VF01 with checkpoints
```

**Pros:** Business-readable, good for smoke.  
**Cons:** Long runtime, hard to pinpoint failure.

### Pattern 3: Business Component (Reusable TestCase)

TestCase called from other TestCases via **TestCaseCall**.

```
TC_LIB_LoginSAP          (called by all)
TC_LIB_CreateSalesOrder  (parameterized)
TC_LIB_VerifyDocumentFlow
```

**Recommended for frameworks** — see Part 7.

---

## 2.5 TestCase Properties

| Property | Purpose |
|----------|---------|
| **TestCase Design** | Visual step editor |
| **Reusable** | Allow TestCaseCall from others |
| **Parameters** | Input/output parameters for calls |
| **Precondition** | TestCase to run before this one |
| **Postcondition** | Cleanup TestCase |

### Parameterized TestCase Example

```
TC_LIB_CreateSalesOrder
  Parameters:
    - SoldToParty (Input)
    - Material (Input)
    - Quantity (Input)
    - OrderNumber (Output) ← buffered and returned
```

---

## 2.6 Requirements & Traceability

```
Requirement: REQ_SD_001 — User can create standard sales order
    └── TestCase: TC_SD_010_CreateSalesOrder
    └── TestCase: TC_SD_E2E_001_StandardOTC
```

### ALM Integration Flow

1. Import requirements from HP ALM / Jira / Azure DevOps
2. Link TestCases to requirements in Commander
3. Execute ExecutionList
4. Results sync back — pass/fail per requirement
5. **Coverage report:** % requirements covered by automation

---

## 2.7 ExecutionList Design

### Structure

```
EL_Regression_SD_Smoke          (15 min — nightly)
EL_Regression_SD_Full           (4 hr — weekly)
EL_Regression_MM_Smoke
EL_Regression_CrossModule_OTC
EL_PreRelease_Gate              (must pass before transport)
```

### ExecutionList Settings

| Setting | Smoke | Full Regression |
|---------|-------|-----------------|
| Parallel execution | 1 thread | 4–8 threads (separate SAP users) |
| Retry failed | 0 | 1 |
| Abort on failure | Yes | No |
| Mail on completion | Team channel | Detailed report |

### Multiple SAP Users for Parallel Runs

```
Engine 1 → SAP user AUTO01 → EL_SD_Part1
Engine 2 → SAP user AUTO02 → EL_SD_Part2
```

Each user needs: unlocked account, appropriate authorizations, separate test data.

---

## 2.8 Classic vs. TBox Modules

| Aspect | Classic | TBox |
|--------|---------|------|
| Expressions | Limited | Full TBox language |
| API calls in TestCase | Separate | Inline `{API...}` |
| Conditionals | Via TBox blocks | Native If/Else |
| New projects | Legacy | **Use TBox** |

**Migration tip:** Don't mix Classic and TBox for the same screen — pick one.

---

## 2.9 Module Maintenance Basics

### When Attributes Break

1. Run TestCase → identify failing TestStep
2. Open Module → locate attribute
3. Re-scan attribute OR full module
4. Verify **TechnicalId** still valid
5. Re-run TestCase
6. If Vision AI enabled — check if self-healed

### Versioning Modules

```
M_SAP_VA01_CreateSalesOrder_v2   ← after S/4 upgrade
```

Keep old version until all TestCases migrated.

---

## 2.10 Knowledge Check (Junior → Mid)

1. When would you split one Module into multiple Modules?
2. What is the difference between atomic and E2E TestCase patterns?
3. How do Requirements improve stakeholder reporting?
4. Why run parallel ExecutionLists with different SAP users?
5. What is a TestCaseCall and when use it?

<details>
<summary>Answers</summary>

1. Different screens/popups, different reuse needs, or when scan becomes too large/unstable.
2. **Atomic** = one action (debuggable). **E2E** = full flow (business-readable smoke).
3. Map automation coverage to business needs; show pass/fail per requirement to PM/Ops.
4. SAP locks documents per user; parallel needs isolated sessions and data.
5. **TestCaseCall** reuses a TestCase as a subroutine — login, create SO, cleanup libraries.

</details>

---

> **Next:** [Part 3: SAP GUI Automation Deep Dive]({{< relref "03-sap-gui-automation" >}})
