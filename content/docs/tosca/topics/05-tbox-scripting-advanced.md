---
title: "Part 5: TBox Scripting & Advanced Logic"
weight: 5
---

# Part 5: TBox Scripting & Advanced Logic

> **Level:** Mid → Senior | **Prerequisite:** [Part 4]({{< relref "04-api-web-mobile-engines" >}}) | **Next:** [Part 6: Data-Driven]({{< relref "06-data-driven-recovery-buffers" >}})

---

## 5.1 What Is TBox?

TBox is Tosca's **embedded scripting language** (VBScript-inspired). Use it when TestStep actions alone aren't enough:

- Conditional branching
- Loops over table rows
- String/date manipulation
- Regex parsing of status bar messages
- Dynamic TestStep execution
- API calls inline
- Logging and custom validations

---

## 5.2 TBox Syntax Basics

### Expressions in TestSteps

Use curly braces for inline expressions:

```
Input field value: {Buffer("OrderNumber")}
Input field value: {TestSheet.Customer}
Input field value: {Today()}
```

### TBox Blocks

Insert **TBox Script** block in TestCase for multi-line logic:

```vb
Dim orderNum
orderNum = Buffer("OrderNumber")
LogInfo("Processing order: " + orderNum)

If Len(orderNum) <> 10 Then
    LogError("Invalid order number length")
    StopExecution
End If
```

---

## 5.3 Buffer Operations

### Set Buffer

```vb
Buffer("CreditBlock") = "No"
Buffer("RunId") = {UniqueId()}
```

### Read Buffer

```vb
Dim so
so = Buffer("OrderNumber")
LogInfo("SO: " + so)
```

### Clear Buffers (Precondition)

```vb
Buffer("OrderNumber") = ""
Buffer("DeliveryNumber") = ""
Buffer("BillingNumber") = ""
```

### Parse Status Bar with Regex

```vb
Dim msg, orderNum
msg = Buffer("StatusBar")
orderNum = UseRegEx("Standard Order ([0-9]+)", msg, 1)
Buffer("OrderNumber") = orderNum
LogInfo("Buffered SO: " + orderNum)
```

---

## 5.4 Conditional Logic

### If / ElseIf / Else

```vb
If Buffer("CreditBlock") = "Yes" Then
    LogInfo("Credit block detected — running release flow")
    TestStep("TC_LIB_ReleaseCreditBlock")
Else
    LogInfo("No credit block — continuing OTC")
End If
```

### Select Case (Environment Branch)

```vb
Select Case TestConfiguration("Environment")
    Case "DEV"
        Buffer("SoldTo") = "100001"
    Case "QAS"
        Buffer("SoldTo") = "200001"
    Case Else
        LogError("Unknown environment")
        StopExecution
End Select
```

---

## 5.5 Loops

### For Loop — Table Rows

```vb
Dim i, rowCount
rowCount = CInt(TestSheet("LineItemCount"))
For i = 0 To rowCount - 1
    SetSteeringParameter("Table_Items", "Row", CStr(i))
    TestStep("Table_Material", "Input", TestSheet("Material_" + CStr(i)))
    TestStep("Table_Qty", "Input", TestSheet("Qty_" + CStr(i)))
Next
```

### For Each — Split CSV

```vb
Dim materials, mat
materials = Split(TestSheet("Materials"), ";")
For Each mat In materials
    ' add line item logic
Next
```

### Do While — Retry Pattern

```vb
Dim attempt, maxAttempts, success
maxAttempts = 3
attempt = 0
success = False

Do While attempt < maxAttempts And Not success
    attempt = attempt + 1
    LogInfo("Attempt " + CStr(attempt))
    On Error Resume Next
    TestStep("Button_Save", "Click", "")
    If Buffer("LastError") = "" Then
        success = True
    End If
    On Error GoTo 0
    If Not success Then
        TBoxWait(2000)
    End If
Loop
```

---

## 5.6 String & Date Functions

| Function | Example |
|----------|---------|
| `Len()` | Validate field length |
| `Mid()`, `Left()`, `Right()` | Substring |
| `Replace()` | Clean formatted numbers |
| `UCase()`, `LCase()` | Case normalization |
| `Trim()` | Remove whitespace |
| `Split()` | Parse delimited data |
| `Today()` | Current date |
| `DateAdd()` | Delivery date + 7 days |
| `FormatDate()` | SAP date format YYYYMMDD |

### SAP Date Format Example

```vb
Dim deliveryDate
deliveryDate = FormatDate(DateAdd("d", 7, Today()), "yyyyMMdd")
Buffer("DeliveryDate") = deliveryDate
```

---

## 5.7 API Calls in TBox

```vb
' GET with auth header
Dim response
response = APIRequest(
    "GET",
    "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('" + Buffer("OrderNumber") + "')",
    "",
    "Authorization: Bearer " + Buffer("Token")
)
Buffer("OrderStatus") = JSONPath(response, "$.d.OverallSDProcessStatus")

If Buffer("OrderStatus") <> "C" Then
    LogError("Order not complete: " + Buffer("OrderStatus"))
    StopExecution
End If
```

---

## 5.8 Dynamic TestStep Execution

```vb
' Run different verification based on order type
If TestSheet("OrderType") = "OR" Then
    TestStep("TC_VERIFY_StandardOrder")
ElseIf TestSheet("OrderType") = "RE" Then
    TestStep("TC_VERIFY_ReturnOrder")
End If
```

### TestCaseCall with Parameters

```vb
CallTestCase("TC_LIB_CreateSalesOrder", Array(
    Array("SoldToParty", TestSheet("SoldTo")),
    Array("Material", TestSheet("Material")),
    Array("Quantity", TestSheet("Qty")),
    Array("OrderNumber", "Output")
))
Buffer("OrderNumber") = OutputParameter("OrderNumber")
```

---

## 5.9 Logging & Debugging

| Function | Use |
|----------|-----|
| `LogInfo()` | Normal flow tracing |
| `LogWarning()` | Recoverable issues |
| `LogError()` | Failures |
| `StopExecution` | Abort TestCase |
| `TakeScreenshot()` | Manual screenshot in TBox |

### Debug Best Practice

```vb
LogInfo("=== TC_SD_010 START ===")
LogInfo("Environment: " + TestConfiguration("Environment"))
LogInfo("TestSheet row: " + TestSheet("RowId"))
' ... steps ...
LogInfo("=== TC_SD_010 END — SO: " + Buffer("OrderNumber") + " ===")
```

---

## 5.10 Error Handling

```vb
On Error Resume Next
TestStep("Button_Save", "Click", "")
Dim errMsg
errMsg = Buffer("LastError")
On Error GoTo 0

If errMsg <> "" Then
    LogError("Save failed: " + errMsg)
    TakeScreenshot()
    If InStr(errMsg, "credit block") > 0 Then
        Buffer("CreditBlock") = "Yes"
    Else
        StopExecution
    End If
End If
```

---

## 5.11 Custom Modules via TBox

Create **XModule** (custom TBox module) for reusable logic:

```
XModule: XM_LoginSAP
  Input: User, Password, Client, System
  Output: SessionActive
  
XModule: XM_ParseSAPMessage
  Input: StatusBarText
  Output: DocumentNumber, MessageType
```

Use across TestCases like standard Modules.

---

## 5.12 TBox Anti-Patterns

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| 200-line TBox block | Split into XModules / TestCaseCalls |
| Hardcoded sleep `Wait(30000)` | `WaitUntil` on attribute |
| Copy-paste TBox across TestCases | Shared XModule library |
| No logging | LogInfo at entry/exit + key buffers |
| Business logic only in TBox | Keep UI in TestSteps, logic in TBox |

---

## 5.13 Knowledge Check (Mid → Senior)

1. How parse order number from status bar text?
2. When use `StopExecution` vs Recovery Scenario?
3. How loop 10 table rows without duplicating TestSteps?
4. What is an XModule?
5. How branch TestCase flow based on TestSheet order type?

<details>
<summary>Answers</summary>

1. `UseRegEx("Standard Order ([0-9]+)", msg, 1)` into Buffer.
2. **StopExecution** for hard failures; **Recovery** for expected popups that can be dismissed.
3. `For` loop with `SetSteeringParameter("Table", "Row", i)`.
4. Custom reusable TBox module — like function library.
5. `If TestSheet("OrderType") = "OR" Then TestStep("TC_VERIFY_Standard")`.

</details>

---

> **Next:** [Part 6: Data-Driven Testing, Recovery & Buffers]({{< relref "06-data-driven-recovery-buffers" >}})
