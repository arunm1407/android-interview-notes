---
title: "Part 4: API, Web & Mobile Engines"
weight: 4
---

# Part 4: API, Web & Mobile Engines

> **Level:** Mid | **Prerequisite:** [Part 3]({{< relref "03-sap-gui-automation" >}}) | **Next:** [Part 5: TBox]({{< relref "05-tbox-scripting-advanced" >}})

---

## 4.1 Why Multi-Engine Testing?

| Approach | Speed | Coverage | Maintenance |
|----------|-------|----------|-------------|
| GUI only | Slow | Full UI | High |
| API only | Fast | No UI bugs | Low |
| **Hybrid** | Balanced | Best ROI | Medium |

**Staff-level insight:** Use API for **setup** and **assertions**, GUI for **critical UI paths** only.

---

## 4.2 API Engine Overview

### Supported Protocols

- REST (JSON/XML)
- SOAP (WSDL)
- OData (SAP S/4 APIs)
- GraphQL (via custom modules)

### API Module Creation

```
1. Modules → Scan → API
2. Import from:
   - Swagger/OpenAPI URL
   - WSDL file
   - Postman collection
   - SAP API Business Hub export
3. Tosca generates:
   - Service module (endpoints)
   - Method modules (GET/POST/PATCH)
   - Schema attributes (request/response fields)
```

---

## 4.3 SAP OData Automation

### Common S/4 OData Services

| Service | Use Case |
|---------|----------|
| `API_SALES_ORDER_SRV` | Create/read sales orders |
| `API_PURCHASEORDER_PROCESS_SRV` | PO operations |
| `API_BUSINESS_PARTNER` | BP master data |
| `API_MATERIAL_STOCK_SRV` | Stock verification |
| `API_BILLING_DOCUMENT_SRV` | Billing docs |

### Create Sales Order via API — TestCase Flow

```
TestStep 1: Authenticate → Buffer CSRF token + session cookie
TestStep 2: POST /A_SalesOrder
  Body: {JSON from TestSheet or template}
TestStep 3: Verify Response status = 201
TestStep 4: Buffer SalesOrder number from response JSON
TestStep 5: GUI TestCaseCall → VA03 verify order displayed
```

### Sample OData Payload (Template)

```json
{
  "SalesOrderType": "OR",
  "SalesOrganization": "1000",
  "DistributionChannel": "10",
  "OrganizationDivision": "00",
  "SoldToParty": "{TestSheet.SoldTo}",
  "to_Item": [
    {
      "Material": "{TestSheet.Material}",
      "RequestedQuantity": "{TestSheet.Quantity}",
      "RequestedQuantityUnit": "EA"
    }
  ]
}
```

### CSRF Token Handling

```vb
' TBox — fetch token before POST
{APIRequest("GET", "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder", "")}
{Buffer("CSRFToken") = ResponseHeader("x-csrf-token")}
{Buffer("Cookie") = ResponseHeader("Set-Cookie")}
```

---

## 4.4 API TestCase Design Patterns

### Pattern: Setup-Execute-Verify

```
[API]  Create test data (SO, PO, material)
[GUI]  Execute business action under test
[API]  Verify backend state (status, quantities, FI doc)
[GUI]  Optional — verify user-visible result
```

### Pattern: API-Only Regression

For nightly runs where UI is stable:

```
EL_API_Nightly:
  TC_API_CreateSO_VerifyStatus
  TC_API_PostGR_VerifyStock
  TC_API_CreateBilling_VerifyJournal
```

Runs in minutes vs. hours of GUI.

### Pattern: Contract Testing

```
Verify OData metadata unchanged after upgrade
Assert response schema matches Module attributes
Fail fast if API breaking change detected
```

---

## 4.5 Web Engine (Fiori & Web Apps)

### Scanning Fiori Apps

1. Open Fiori Launchpad in Chrome/Edge
2. Navigate to target app (e.g., "Manage Sales Orders")
3. Commander → Scan → Web
4. Capture: tiles, search fields, tables, action buttons

### Fiori-Specific Challenges

| Challenge | Mitigation |
|-----------|------------|
| Dynamic IDs | Use stable CSS/XPath; Vision AI |
| i18n labels | Buffer language-independent IDs |
| Lazy-loaded tables | WaitOn row visible |
| Shell bar navigation | Separate navigation Module |
| Logout/session | API token + web cookie sync |

### Web Wait Strategies

```
WaitOn: Table_FirstRow → Visible → 30s timeout
WaitOn: Spinner → Not Visible
{TBox WaitUntil URL contains "SalesOrder"}
```

---

## 4.6 Mobile Engine

### Supported

- Native iOS/Android via Appium
- Mobile web (browser on device)

### Typical Enterprise Use

- Customer mobile apps (not core SAP)
- Fiori on mobile browser
- Warehouse apps integrated with SAP

### Module Scan on Mobile

Connect device/emulator → Scan → Mobile → interact with app → attributes captured.

**Note:** Most SAP automation roles focus on SAP GUI + API + Fiori web; mobile is secondary unless your product includes a native app.

---

## 4.7 Hybrid TestCase Architecture

```
TestCase: TC_Hybrid_OTC_Standard
├── Block 1 [API Engine]
│   ├── POST Create Sales Order
│   └── Buffer OrderNumber
├── Block 2 [SAP Engine]
│   ├── TC_LIB_NavigateToVL01N
│   ├── Create delivery with Buffer OrderNumber
│   └── Post goods issue
├── Block 3 [API Engine]
│   ├── GET stock — verify reduction
│   └── GET billing status
└── Block 4 [SAP Engine — optional]
    └── VF03 display billing doc
```

### Engine Switching in Commander

Each TestStep or TestCase block specifies **Engine**. Mixed engines in one TestCase is supported.

---

## 4.8 Authentication Patterns

| System | Method | Tosca Handling |
|--------|--------|----------------|
| SAP OData | Basic / OAuth / Cookie | Connection in API module |
| Fiori | SAML / OAuth | Web login Module + cookie reuse |
| External REST | Bearer token | Buffer token from auth endpoint |
| SAP GUI | User/password | Login TestCase library |

### OAuth2 Pattern

```
1. POST /oauth/token → Buffer access_token
2. All subsequent API calls: Header Authorization = Bearer {Buffer access_token}
3. Refresh token before expiry in long ExecutionLists
```

---

## 4.9 API vs GUI — Decision Matrix

| Test What | Use |
|-----------|-----|
| Pricing calculation in backend | API verify response |
| Credit block popup behavior | GUI |
| Bulk data setup (100 materials) | API or TDMS |
| Fiori tile navigation | Web |
| VL01N picking workflow | GUI |
| FI posting correctness | API (ACDOCA query) or GUI FB03 |
| Regression after UI redesign | API for data; Vision AI for GUI |

---

## 4.10 Knowledge Check (Mid)

1. Why hybrid API+GUI reduces regression time?
2. How get CSRF token for SAP OData POST?
3. When use Web engine vs SAP engine for S/4?
4. What is contract testing in API context?
5. Name two S/4 OData services for SD and MM.

<details>
<summary>Answers</summary>

1. API fast for setup/assertions; GUI only where UI logic matters — cuts hours to minutes.
2. GET request to service root; read `x-csrf-token` header; include in POST with session cookie.
3. **Web** for Fiori apps/tiles; **SAP** for classic T-codes still in use.
4. Verify API response structure/schema unchanged after upgrade — fail before GUI tests run.
5. `API_SALES_ORDER_SRV` (SD), `API_PURCHASEORDER_PROCESS_SRV` (MM).

</details>

---

> **Next:** [Part 5: TBox Scripting & Advanced Logic]({{< relref "05-tbox-scripting-advanced" >}})
