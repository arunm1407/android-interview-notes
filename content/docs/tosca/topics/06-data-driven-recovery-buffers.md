---
title: "Part 6: Data-Driven Testing, Recovery & Buffers"
weight: 6
---

# Part 6: Data-Driven Testing, Recovery & Buffers

> **Level:** Mid | **Prerequisite:** [Part 5]({{< relref "05-tbox-scripting-advanced" >}}) | **Next:** [Part 7: Framework]({{< relref "07-framework-architecture" >}})

---

## 6.1 Data-Driven Testing (DDT) Overview

**One TestCase + many data rows = many test iterations** without duplicating TestCases.

```
TestCase: TC_SD_010_CreateSalesOrder
    ↕ bound to
TestSheet: TS_SD_SalesOrders (50 rows)
    =
50 automated tests
```

---

## 6.2 TestSheet Creation

### From Excel

1. Create Excel with columns: `SoldTo`, `Material`, `Qty`, `Plant`, `ExpectedResult`
2. Commander → TestSheets → Import
3. Link to TestCase: TestCase properties → TestSheet → select `TS_SD_SalesOrders`

### Column Naming Conventions

```
TS_<Module>_<Scenario>_<Env>

Columns:
  RowId          — unique identifier
  SoldToParty    — input
  Material       — input
  Quantity       — input
  ExpectedStatus — verification
  Environment    — DEV/QAS filter
  Tags           — smoke, regression, MTO
```

### Referencing in TestSteps

```
Input: {TestSheet.SoldToParty}
Verify: {TestSheet.ExpectedStatus}
```

---

## 6.3 TestSheet Strategies

### Strategy 1: One Master Sheet per Module

```
TS_SD_AllScenarios — 200 rows, Tags column filters smoke vs full
```

### Strategy 2: Sheet per Scenario Type

```
TS_SD_StandardOrder
TS_SD_ThirdParty
TS_SD_Returns
TS_SD_CreditBlock
```

**Recommended for large teams** — easier ownership.

### Strategy 3: Environment-Specific Sheets

```
TS_SD_StandardOrder_DEV
TS_SD_StandardOrder_QAS
```

Or single sheet with `Environment` column + ExecutionList filter.

---

## 6.4 Dynamic Test Data with TDS

**Tosca Test Data Service (TDS)** generates synthetic data:

| Capability | Use Case |
|------------|----------|
| Synthetic customer numbers | Avoid collision in shared QAS |
| Masked copy from PRD | Realistic but anonymized |
| Combination generation | Pairwise testing |
| SAP TDMS integration | Refresh QAS with masked subset |

### TDS Workflow

```
1. Define data model (Customer, Material, SO)
2. Generate N combinations
3. Export to TestSheet
4. Bind to TestCase
5. Post-run cleanup job (optional)
```

---

## 6.5 Buffer Architecture

### Buffer Naming Convention

```
BUF_<DocumentType>_<Field>

Examples:
  BUF_SO_Number
  BUF_DEL_Number
  BUF_BILL_Number
  BUF_MATDOC_Number
  BUF_CreditBlock_Flag
  BUF_LastError_Message
```

### Buffer Lifecycle

```
Precondition TestCase:
  Clear all BUF_* buffers

TestCase execution:
  Set buffers at each document creation

Postcondition TestCase:
  Log buffers for report
  Optional: API cleanup using buffered IDs
```

### Cross-TestCase Buffer Passing

**Option A:** Sequential ExecutionList (buffers persist in same session)

```
EL_OTC_Chain:
  1. TC_CreateSO      → sets BUF_SO_Number
  2. TC_CreateDelivery → reads BUF_SO_Number
  3. TC_Billing       → reads BUF_DEL_Number
```

**Option B:** TestSheet column for pre-created data

```
Row: PreCreatedSO = 1234567890  (created by API setup job)
```

**Option C:** TestCase output parameters via TestCaseCall

---

## 6.6 Recovery Scenarios — Advanced

### Recovery Priority

When multiple recoveries match, Tosca evaluates in order. Design from **specific → generic**:

```
1. REC_CreditBlock_Specific     (exact message match)
2. REC_IncompletionLog_VA01     (screen-specific)
3. REC_SAP_SystemMessage_Generic
4. REC_SAP_UnknownModal_LogAndContinue
```

### Conditional Recovery with TBox

```vb
' Inside Recovery Scenario
If InStr(Buffer("PopupText"), "credit") > 0 Then
    Buffer("CreditBlock") = "Yes"
    TestStep("Button_Continue", "Click", "")
Else
    LogWarning("Unhandled popup: " + Buffer("PopupText"))
    TakeScreenshot()
End If
```

### Recovery Testing

**Test your recoveries deliberately:**

```
TC_Negative_TriggerCreditBlock → verify REC_CreditBlock fires
TC_Negative_SystemMessage      → verify generic recovery
```

---

## 6.7 Test Configurations

**TestConfiguration** objects store environment params:

| Parameter | Example |
|-----------|---------|
| Environment | QAS |
| SAP_System | QAS_100 |
| SAP_Client | 100 |
| SAP_User | AUTO_TEST |
| BaseURL_OData | https://qas.example.com/sap/opu/odata/... |
| Default_Plant | 1000 |
| Default_SalesOrg | 1000 |

Reference in TestSteps:

```
{TestConfiguration("SAP_Client")}
```

Switch configuration in ExecutionList for DEV vs QAS runs.

---

## 6.8 Negative & Edge Case Data

| Category | TestSheet Examples |
|----------|-------------------|
| Invalid customer | SoldTo = 9999999999 → expect error |
| Zero quantity | Qty = 0 |
| Credit exceeded | Order value > credit limit |
| Wrong plant | Plant not in sales area |
| Blocked material | Material with status block |
| Past delivery date | Date in past |

Tag rows: `Tags = negative, credit, smoke`

---

## 6.9 Data Cleanup Strategies

| Strategy | When |
|----------|------|
| No cleanup | DEV — refresh weekly |
| API delete/archive | QAS — after each run |
| Prefix pattern | Create SO with PO ref `AUTO_*` — batch delete job |
| Dedicated test client | Client 999 — reset from copy |
| Rollback transport | Rare — not for automation |

---

## 6.10 ExecutionList + TestSheet Filtering

Run subset of rows:

```
ExecutionList: EL_SD_Smoke
  TestCase: TC_SD_010
  TestSheet filter: Tags contains "smoke"
  
ExecutionList: EL_SD_Credit
  TestSheet filter: Tags contains "credit"
```

Reduces runtime without maintaining separate TestCases.

---

## 6.11 Knowledge Check (Mid)

1. How turn one TestCase into 100 tests?
2. When use TDS vs static Excel TestSheet?
3. How pass order number from TC1 to TC2 in ExecutionList?
4. Why order Recovery Scenarios specific → generic?
5. What belongs in TestConfiguration vs TestSheet?

<details>
<summary>Answers</summary>

1. Bind TestSheet with 100 rows — each row = one iteration.
2. **TDS** for synthetic/masked dynamic data; **Excel** for fixed known scenarios.
3. Buffer in TC1 persists to TC2 in same engine session; or TestSheet pre-seeded SO.
4. Specific recoveries match first — prevents generic handler swallowing special cases.
5. **TestConfiguration** = environment infra (system, client, URLs). **TestSheet** = per-test business data (customer, material).

</details>

---

> **Next:** [Part 7: Framework Architecture & Design Patterns]({{< relref "07-framework-architecture" >}})
