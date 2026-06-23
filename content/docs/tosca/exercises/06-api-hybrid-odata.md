---
title: "Exercise 6: API + GUI Hybrid"
weight: 6
---

# Exercise 6: API + GUI Hybrid (OData)

> **Level:** Mid | **Time:** 4–5 hours | **Prerequisite:** [Exercise 2]({{< relref "02-buffer-and-chain" >}}), API access to sandbox

## Objectives

- Import SAP OData service as API Module
- Create sales order via POST
- Verify order in SAP GUI (VA03)
- Combine API and SAP engines in one TestCase

---

## Part A — Import API Module

1. Obtain service metadata URL, e.g.:
   `https://<host>/sap/opu/odata/sap/API_SALES_ORDER_SRV/$metadata`
2. Commander → Scan → **API** → Import from URL/Swagger.
3. Save as `M_API_SalesOrder_Srv`.

Identify:

- GET (for CSRF token fetch)
- POST `A_SalesOrder` create method

---

## Part B — Authentication & CSRF

Create `TC_LIB_API_Auth` (or TBox block):

```vb
' Step 1: GET service root for CSRF
{APIRequest("GET", "/sap/opu/odata/sap/API_SALES_ORDER_SRV/", "")}
Buffer("CSRFToken") = ResponseHeader("x-csrf-token")
Buffer("SessionCookie") = ResponseHeader("Set-Cookie")
LogInfo("CSRF obtained")
```

Configure connection with sandbox user/password in API connection settings.

---

## Part C — POST Create Sales Order

JSON body template (adjust org data):

```json
{
  "SalesOrderType": "OR",
  "SalesOrganization": "1000",
  "DistributionChannel": "10",
  "OrganizationDivision": "00",
  "SoldToParty": "{TestSheet.SoldToParty}",
  "to_Item": [
    {
      "Material": "{TestSheet.Material}",
      "RequestedQuantity": "{TestSheet.Quantity}",
      "RequestedQuantityUnit": "EA"
    }
  ]
}
```

Buffer response:

```vb
Buffer("BUF_SO_Number") = JSONPath(ResponseBody, "$.d.SalesOrder")
LogInfo("API created SO: " + Buffer("BUF_SO_Number"))
```

---

## Part D — GUI Verification Block

Same TestCase, switch to **SAP Engine**:

1. TestCaseCall or steps from `TC_LAB02_DisplaySO`
2. Verify header data matches TestSheet

---

## Part E — Hybrid TestCase Structure

```
TC_LAB06_Hybrid_CreateAndVerify
├── [API] TC_LIB_API_Auth
├── [API] POST A_SalesOrder → buffer SO
└── [SAP] VA03 display verify
```

See [Hybrid diagram]({{< relref "../diagrams" >}}#5-hybrid-api--gui-testcase).

---

## Validation Criteria

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | API POST returns 201 Created | ☐ |
| 2 | Buffered SO number matches VA03 display | ☐ |
| 3 | Single TestCase uses two engines | ☐ |
| 4 | CSRF token handled correctly | ☐ |
| 5 | API-only run completes in < 30 seconds | ☐ |

---

## Extension Challenges

1. Add API GET to verify `OverallSDProcessStatus` after GUI delivery.
2. Compare total time: full GUI create vs hybrid create.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 403 CSRF | Missing GET before POST |
| 401 Unauthorized | Check API user S_ICF auth |
| Empty SalesOrder in response | Check JSON path / response structure |

---

> **Next:** [Exercise 7: Framework Refactor]({{< relref "07-framework-refactor" >}})
