---
title: "Part 3: SAP GUI Automation Deep Dive"
weight: 3
---

# Part 3: SAP GUI Automation Deep Dive

> **Level:** Mid | **Prerequisite:** [Part 2]({{< relref "02-modules-testcases-building-blocks" >}}) | **Next:** [Part 4: API/Web/Mobile]({{< relref "04-api-web-mobile-engines" >}})

---

## 3.1 SAP Scripting Prerequisites

Tosca SAP engine uses **SAP GUI Scripting API** — without it, scan and execute fail silently or with "scripting disabled" errors.

### Server-Side (Basis Team)

```
Transaction RZ11 → parameter rdisp/gui_auto_accept_server = 1
Transaction RZ11 → parameter sapgui/user_script = 1 (if needed)
```

### Client-Side (Engine Machine)

1. SAP Logon → Options → Scripting → **Enable scripting**
2. Uncheck "Notify when script attaches" (for unattended runs)
3. Install SAP GUI version compatible with server (match patch levels)

### Verification Script (SAP GUI Scripting toolbar)

```vb
' In SAP GUI Scripting console — if this works, Tosca will work
Set session = SAPGUI.GetScriptingEngine.Children(0).Children(0)
session.findById("wnd[0]/tbar[0]/okcd").text = "/nVA01"
session.findById("wnd[0]").sendVKey 0
```

---

## 3.2 Session & Window Management

### SAP Window Hierarchy

```
GuiApplication
└── GuiConnection
    └── GuiSession (wnd[0])
        ├── GuiTitlebar
        ├── GuiMenubar
        ├── GuiToolbar
        ├── GuiUserArea (screen content)
        └── GuiStatusbar
```

### Common Window Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `wnd[1]` popup not found | Modal dialog | Separate Module for popup; Recovery Scenario |
| Wrong session attached | Multiple SAP sessions | Close extra sessions; single session policy |
| Session timeout | Idle too long | Precondition re-login TestCase |
| "Screen not found" | Wrong T-code state | Add navigation TestSteps before action |

### Navigation TestCase Pattern

```
TC_LIB_NavigateToVA01
  1. Verify on SAP Easy Access (or login)
  2. Input T-code: /nVA01
  3. SendKeys: Enter
  4. WaitOn: Input_SoldToParty visible
```

---

## 3.3 Table Operations (Critical for SD/MM)

SAP line-item tables (VA01, ME21N, MIGO) are the #1 flakiness source.

### Table Steering Parameters

| Parameter | Purpose |
|-----------|---------|
| **Row** | Which row to act on (0-based or 1-based per config) |
| **Column** | Material, Quantity, Plant columns |
| **Dynamic Row** | `{TBox SetRow()}` for multiple line items |

### Adding Line Items — Pattern

```
TestStep 1: Click "New Item" button (or tab to table)
TestStep 2: Table_Material [Row=0] → Input → MAT-001
TestStep 3: Table_Quantity [Row=0] → Input → 10
TestStep 4: Table_Plant   [Row=0] → Input → 1000
TestStep 5: SendKeys → Enter (confirm row)
```

### Multi-Row via TBox Loop

```vb
' TBox block before table TestSteps
Dim materials
materials = Split("{TestSheet.Materials}", ";")
Dim i
For i = 0 To UBound(materials)
    {SetSteeringParameter("Table_LineItems", "Row", i)}
    {TestStep("Table_Material", "Input", materials(i))}
Next
```

### Table Verification

| Verify Type | Example |
|-------------|---------|
| Cell value | Material in row 0 = MAT-001 |
| Row count | Line items = 3 |
| Row exists | Contains material MAT-002 |

---

## 3.4 Buffering Document Numbers

### Status Bar Pattern (Most Reliable)

After save, SAP shows: *"Standard Order 1234567890 has been saved"*

```
TestStep: StatusBar → Buffer → OrderNumber
  Action: Buffer
  Operator: *
  Value: has been saved
  
TBox Expression on buffer:
{UseRegEx("Standard Order ([0-9]+)", Buffer("StatusBar"), "OrderNumber")}
```

### Field Buffer Pattern

Display mode (VA03) — buffer from read-only field:

```
TestStep: Field_SalesOrderNumber → Buffer → OrderNumber
  Action: Buffer
  Operator: Verify not empty
```

### Using Buffered Values

```
Subsequent TestStep:
  Input_OrderReference → Input → {Buffer("OrderNumber")}
```

---

## 3.5 Recovery Scenarios for SAP

### Common SAP Popups

| Popup | Trigger | Recovery Action |
|-------|---------|-----------------|
| System messages | Any save | Click green check / Enter |
| Credit block | VA01 save | Buffer flag, click Continue or abort |
| Incompletion log | Missing data | Fill mandatory fields or override |
| Express & Save | Customizing | Click Save |
| "Changes were made" | Navigation | Click Yes |
| License warning | Non-prod | Click Continue |
| Modal wnd[1] | Various | Module-specific button click |

### Recovery Scenario Structure

```
Recovery: REC_SAP_SystemMessage
  Trigger: Module M_SAP_Common_Popups → Attribute Popup_Text
  Condition: Contains "Information"
  Action: Click Button_Continue
  
Recovery: REC_SAP_CreditBlock
  Trigger: StatusBar contains "credit block"
  Action: 
    Buffer CreditBlock = Yes
    Click Continue (if testing release flow)
```

### Attachment Level

| Attach To | Scope |
|-----------|-------|
| Module | All TestCases using this Module |
| TestCase | Only this scenario |
| ExecutionList | All tests in suite |

**Best practice:** Common popups → Module level. Scenario-specific → TestCase level.

---

## 3.6 S/4HANA & Fiori Considerations

### ECC vs S/4 UI Mix

Many S/4 projects still use GUI T-codes for SD/MM. Test strategy:

| UI | Tosca Engine | Notes |
|----|--------------|-------|
| SAP GUI T-codes | SAP Engine | Same as ECC with table changes |
| Fiori Launchpad | Web Engine | OData-backed tiles |
| Fiori apps (embedded) | Web Engine | Often easier than GUI |
| Deprecated T-codes | API Engine | Create via OData, verify in Fiori |

### S/4 Table Changes Affecting Automation

| ECC | S/4 | Impact |
|-----|-----|--------|
| MKPF/MSEG | MATDOC | Validation queries change, not GUI |
| VF01 screens | Often simplified | Re-scan billing modules |
| BP vs Customer | Business Partner | Master data TestSheets update |

### Fiori + GUI Hybrid TestCase

```
1. API: Create sales order via OData
2. Web: Open Fiori app "Manage Sales Orders" → verify order visible
3. GUI: VL01N delivery (if no Fiori equivalent)
```

See [Part 4]({{< relref "04-api-web-mobile-engines" >}}) for API/Web details.

---

## 3.7 MM Automation Highlights (ME21N, MIGO, MIRO)

### ME21N Line Items

Same table patterns as VA01. Additional validations:

- Account assignment category (K, F, P)
- Tax code per line
- Delivery date and plant

### MIGO Goods Movement

| Movement | T-code path | Key field |
|----------|-------------|-----------|
| GR 101 | MIGO → A01 → R01 → PO | PO number, qty |
| GI 601 | MIGO → A04 → R09 | Delivery ref |

Buffer material document number from header after post.

### MIRO 3-Way Match

```
Precondition: PO exists with GR posted
MIRO: Enter PO → verify invoice amount → post
Verify: Message "Invoice document X posted"
Buffer: InvoiceDocNumber
Post-check: FBL3N or API for cleared GR/IR
```

---

## 3.8 SD Automation Highlights (VA01, VL01N, VF01)

### Standard OTC Automation Chain

```
TC_SD_010_CreateSO     → Buffer OrderNumber
TC_SD_020_CreateDelivery → Input OrderNumber from Buffer
TC_SD_030_PostGI       → Verify goods issue
TC_SD_040_CreateBilling → Buffer BillingDoc
TC_SD_050_VerifyFI     → FB03 or table verify
```

### Delivery Creation (VL01N)

- Reference document: Order
- Shipping point determination — may need TestSheet plant/shipping point
- Pick quantity vs. order quantity

### Billing (VF01)

- Select delivery to bill
- Verify pricing copied from order
- Buffer billing document → verify accounting document in FI

---

## 3.9 Performance & Stability

| Technique | Benefit |
|-----------|---------|
| `{TBox WaitUntil}` vs fixed delay | Faster, less flaky |
| Single SAP session | Avoids wrong-window errors |
| Dedicated engine VM | Consistent performance |
| Disable SAP GUI animations | Faster rendering |
| Close unused sessions | Memory leak prevention |
| Batch similar tests in one login | Reduce login overhead |

### Wait Patterns

```vb
' Wait for processing (preferred)
{TBox WaitUntil("StatusBar", "*", "saved", 60000)}

' Avoid
{TBox Wait(10000)}  ' blind 10s delay
```

---

## 3.10 Troubleshooting Guide

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Object not found | UI changed | Re-scan attribute; Vision AI |
| Scripting error | Scripting disabled | Enable client + server |
| Table row not editable | Wrong row index | Check steering parameter |
| Stale buffer | Previous run failed | Clear buffers in Precondition |
| Session lost | SAP timeout | Re-login recovery |
| Wrong data saved | TestSheet row mismatch | Verify TestSheet binding |
| Flaky on CI only | Screen resolution | Set VM resolution 1920×1080 |

---

## 3.11 Knowledge Check (Mid)

1. What RZ11 parameter enables server-side SAP scripting?
2. How do you add 5 line items to VA01 without 5 duplicate TestSteps?
3. Where is the most reliable place to buffer a sales order number?
4. When attach Recovery at Module vs TestCase level?
5. How does S/4 MATDOC affect GUI automation vs data validation?

<details>
<summary>Answers</summary>

1. `rdisp/gui_auto_accept_server = 1`
2. TBox loop with `SetSteeringParameter` for row index, or TestSheet-driven iterations.
3. **Status bar** after save — parse with regex into Buffer.
4. **Module** for generic popups (system messages); **TestCase** for scenario-specific (credit block handling).
5. GUI screens may look similar; **validation queries** must use MATDOC not MKPF/MSEG. Automation modules may need re-scan but logic unchanged.

</details>

---

> **Next:** [Part 4: API, Web & Mobile Engines]({{< relref "04-api-web-mobile-engines" >}})
