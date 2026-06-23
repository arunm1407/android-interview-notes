---
title: "SAP SD/MM & HANA Automation"
weight: 8
---

# SAP SD / MM & HANA Automation — Interview Guide

> Basics to Advanced | Domain knowledge for SAP functional testers and automation engineers

> [!TIP]
> **Quick navigation:** [SAP SD](#sap-sd-sales--distribution) | [SAP MM](#sap-mm-materials-management) | [SAP HANA](#sap-hana-automation) | [Integration Scenarios](#cross-module-integration-scenarios) | [Basic Q&A](#interview-questions-basic) | [Intermediate Q&A](#interview-questions-intermediate) | [Advanced Q&A](#interview-questions-advanced)

> [!NOTE]
> **Tricentis Tosca** has its own complete guide — [Tosca Mastery]({{< relref "/docs/tosca" >}}) (11 parts, noob → staff, 80+ interview Q&A). This page covers **SAP domain knowledge** only.

---

## SAP SD (Sales & Distribution)

### Core Concepts
- **Order-to-Cash (OTC):** Inquiry → Quotation → Sales Order → Delivery → Pick/Pack → Goods Issue → Billing → Payment
- **Key T-codes:** VA01/VA02/VA03 (Sales Order), VL01N/VL02N/VL03N (Delivery), VF01/VF02/VF03 (Billing), VK11/VK12 (Pricing)
- **Document flow:** Preceding and subsequent documents linked via document flow (VBFA table)
- **Organizational structure:** Client → Company Code → Sales Org → Distribution Channel → Division

### Order Types & Scenarios
| Scenario | Description | Test Focus |
|----------|-------------|------------|
| Standard Order (OR) | Normal sales flow | Full OTC validation |
| Third Party (TAS) | Vendor ships directly to customer | PO creation in MM, no stock movement |
| Sales BOM | Header + component materials | Component availability, pricing rollup |
| Make-to-Order (MTO) | Production triggered from SO | PP integration, planned order |
| Make-to-Stock (MTS) | Ship from existing stock | ATP check, reservation |
| Consignment | Stock at customer site | Special stock (W), settlement billing |
| Returns (RE) | Customer return order | Credit memo, return delivery |

### Pricing & Credit
- **Condition types:** PR00 (price), K004 (material discount), MWST (tax), KF00 (freight)
- **Pricing procedure:** Access sequence → Condition records → Determination in sales doc
- **Credit management:** Static/dynamic credit check, credit control area, risk category
- **Output determination:** Print, EDI, email — NAST table stores output records

### SD Integration Points (Automation Must-Verify)
```
Sales Order (VA01)
    ├── MM: ATP check, stock reservation, third-party PO
    ├── PP: MTO planned order / production order
    ├── FICO: Revenue account, COGS, tax posting, credit limit
    ├── WM: Transfer order for picking
    └── LE: Shipment, transportation planning
```

### Common SD Defects in Testing
- Wrong pricing procedure / missing condition records
- Credit block not triggered or not released
- Incomplete document flow (delivery not created, billing block)
- Output not generated (missing partner function, output condition)
- Incompletion log not cleared before save

---

## SAP MM (Materials Management)

### Core Concepts
- **Procure-to-Pay (PTP):** Purchase Requisition → RFQ → Purchase Order → Goods Receipt → Invoice Verification → Payment
- **Key T-codes:** ME21N/ME22N/ME23N (PO), MIGO (Goods Movement), MIRO (Invoice), MB51 (Material Doc List)
- **Master data:** Material master (MM01), Vendor master (XK01), Info record (ME11), Source list (ME01)

### Procurement Process
| Step | T-code | What to Validate |
|------|--------|------------------|
| PR creation | ME51N | Account assignment, release strategy |
| PO creation | ME21N | Price from info record, tax code, delivery date |
| GR | MIGO 101 | Stock increase, accounting document (BSX/WRX) |
| Invoice | MIRO | 3-way match (PO + GR + Invoice), price variance |
| Payment | F110 | Open item cleared |

### Inventory & Valuation
- **Movement types:** 101 (GR), 102 (GR reversal), 201 (GI to cost center), 301/311 (transfer)
- **Valuation classes:** Control G/L accounts in automatic account determination (OBYC)
- **Special stock:** Consignment (K), Subcontracting (O), Project stock (Q)

### MM Integration with SD
- **ATP (Available-to-Promise):** SD checks MM stock during order creation
- **Third-party processing:** SD creates MM PO automatically (item category TAS)
- **Intercompany:** STO (stock transport order) between plants/company codes
- **Batch management:** Batch determination in delivery based on MM batch strategy

### Common MM Defects in Testing
- Account assignment category mismatch (K, F, P, etc.)
- Tax code not determined on PO line item
- GR/IR clearing account not balanced after MIRO
- Release strategy blocking PO without proper workflow
- Negative stock or wrong storage location

---

## SAP HANA Automation

> **Note:** SAP HANA (High-Performance Analytic Appliance) — in-memory database platform. Often tested alongside S/4HANA migrations and embedded analytics.

### What HANA Changes for Test Automation
| Area | ECC (Traditional) | S/4HANA / HANA |
|------|-------------------|----------------|
| Database | Any DB (Oracle, DB2) | SAP HANA only |
| Transactions | Classic GUI T-codes | Fiori apps + some T-codes |
| Tables | Many aggregate/index tables removed | Simplified data model (e.g., MATDOC replaces MKPF/MSEG) |
| Reporting | BW-heavy | Embedded analytics, CDS views |
| UI automation | SAP GUI Scripting | Fiori (web) + SAP GUI |

### HANA-Relevant Automation Scenarios
1. **Data migration validation:** Compare record counts and key fields ECC vs S/4HANA post-migration
2. **CDS view validation:** Query CDS views via Open SQL or HANA Studio to verify reporting data
3. **Fiori app testing:** Web-based automation (Tosca web engine, Selenium) for launchpad tiles
4. **Performance testing:** HANA in-memory advantage — validate response times on high-volume postings
5. **Simplification item checks:** Verify deprecated T-codes replaced (e.g., FK10N → FBL5N)

### Key HANA Tools for QA
- **SAP HANA Studio / DBeaver:** SQL queries against HANA DB
- **SAP GUI Scripting / Tosca SAP Engine:** Classic transaction automation
- **Fiori Launchpad:** Web UI for S/4HANA apps
- **Transaction ST05 / SAT:** SQL trace and runtime analysis for performance defects
- **Table comparison tools:** LTMC, LTMOM for migration reconciliation

### HANA Automation Interview Topics
- Difference between row store and column store
- How HANA affects regression scope during S/4 conversion
- Validating universal journal (ACDOCA) postings vs classic FI tables
- CDS-based analytical queries vs traditional ABAP reports
- Test data strategy: HANA memory constraints vs large-volume test sets

### Sample HANA Validation Queries
```sql
-- Verify material document count after goods receipt automation
SELECT COUNT(*) FROM MATDOC WHERE BWART = '101' AND BUDAT = CURRENT_DATE;

-- Check sales order header created by automation run
SELECT VBELN, ERDAT, NETWR, WAERK FROM VBAK WHERE ERDAT = CURRENT_DATE;

-- FICO posting validation in universal journal
SELECT BELNR, GJAHR, RBUKRS, RHCUR, HSL
FROM ACDOCA
WHERE AWREF = '<sales_order_number>';
```

---

## Tricentis Tosca → See Dedicated Guide

Tosca content moved to a **standalone deep resource**:

**[Tosca Mastery — Complete Guide]({{< relref "/docs/tosca" >}})**

| Part | Topic |
|------|-------|
| 1–2 | Fundamentals, Modules, TestCases |
| 3–6 | SAP GUI, API/Web, TBox, Data-driven |
| 7–9 | Framework design, CI/CD, Vision AI |
| 10–11 | Staff architecture, 80+ interview Q&A |

---

## Cross-Module Integration Scenarios

### Scenario 1: Standard OTC (SD + MM + FICO)
```
1. Create material with stock (MM01 + MIGO 101)
2. Create sales order (VA01) → verify ATP
3. Create delivery (VL01N) → pick & post GI
4. Create billing (VF01) → verify accounting doc (FI)
5. Verify: Document flow complete, stock reduced, revenue posted
```

### Scenario 2: Third-Party Sales (SD + MM)
```
1. Create sales order with item category TAS (VA01)
2. Verify MM PO auto-created (ME23N)
3. Post vendor invoice (MIRO)
4. Create outbound delivery & billing
5. Verify: No stock movement, PO history updated, margin correct
```

### Scenario 3: MTO Flow (SD + PP + MM)
```
1. Create MTO sales order (VA01, strategy 20)
2. Verify planned order / production order (MD04, CO01)
3. Confirm production (CO15) + GR for finished goods
4. Deliver and bill
5. Verify: Make-to-order costing, no ATP from free stock
```

---

## Interview Questions: Basic

### SAP SD
1. **What is the Order-to-Cash process?**
   - Sales order → delivery → goods issue → billing → payment. Each step creates a document linked via document flow.

2. **What T-codes do you use for sales order, delivery, and billing?**
   - VA01/VA02/VA03, VL01N/VL02N/VL03N, VF01/VF02/VF03.

3. **What is a sales area?**
   - Combination of Sales Organization + Distribution Channel + Division. Required for all SD transactions.

4. **What is ATP and where is it checked?**
   - Available-to-Promise. Checked during sales order creation against MM stock and planned receipts.

5. **What is the difference between billing block and delivery block?**
   - Delivery block prevents delivery creation; billing block prevents invoice creation. Both can be set manually or by system.

### SAP MM
6. **What is the PTP process?**
   - PR → PO → GR → Invoice verification → Payment.

7. **What is a 3-way match?**
   - Matching PO quantity/price, goods receipt quantity, and invoice quantity/price in MIRO.

8. **What is the difference between PR and PO?**
   - PR is an internal request; PO is a legal document sent to vendor.

9. **What movement type is used for goods receipt against PO?**
   - 101 (and 102 for reversal).

10. **What is an info record?**
    - Links material + vendor + purchasing org with price and delivery terms.

### SAP HANA
11. **What is SAP HANA?**
    - In-memory database and application platform. Column-oriented storage enables fast analytics and simplified data models in S/4HANA.

12. **How does S/4HANA differ from ECC for testers?**
    - Simplified tables, Fiori UI, CDS views, universal journal (ACDOCA), some T-codes deprecated.

### Tosca (see [full Q&A bank]({{< relref "/docs/tosca/topics/11-interview-questions" >}}))
13. **What is a Module in Tosca?** — Object repository for UI controls or API endpoints; reused across TestCases.

14. **TestCase vs ExecutionList?** — TestCase = one scenario; ExecutionList = batch suite.

15. **Dynamic order numbers?** — Buffer from status bar; reuse via `Buffer("OrderNumber")`.

---

## Interview Questions: Intermediate

### SAP SD
16. **How do you test pricing determination?**
    - Verify condition types in pricing procedure, maintain condition records (VK11), create order and check net price, discounts, tax, and surcharges.

17. **Explain third-party sales process and how you would automate it.**
    - SO with TAS item category triggers MM PO. Automate VA01 → verify PO in ME23N → MIRO → VL01N → VF01. Validate no stock posting.

18. **What is variant configuration and how do you test it?**
    - CU51/CU50 for configurable materials. Test characteristic values, dependencies, and pricing based on configuration.

19. **How do you test credit management?**
    - Set credit limit, create orders exceeding limit, verify block. Test release via VKM1/VKM3.

20. **What tables store sales order header and item data?**
    - VBAK (header), VBAP (item), VBUK (header status), VBUP (item status).

### SAP MM
21. **How do you test release strategy on purchase orders?**
    - Create PR/PO above threshold, verify it enters blocked status, release via ME28, confirm PO is actionable.

22. **What is GR/IR clearing and how do you validate it?**
    - After GR and invoice, WRX and BSX accounts should clear through GR/IR. Check FBL3N for open items.

23. **How do you test batch-managed materials?**
    - Create batch (MSC1N), assign to GR, verify batch determination in delivery.

24. **Explain STO (stock transport order) testing.**
    - Create PO with document type NB between plants, GR at receiving plant, verify in-transit if configured.

### SAP HANA / S4
25. **How would you validate data after an S/4HANA migration?**
    - Reconciliation reports: record counts, open SO/PO balances, FI trial balance, compare key fields ECC vs S/4.

26. **What is MATDOC and why does it matter for testing?**
    - Single table replacing MKPF/MSEG in S/4. Material document queries must target MATDOC post-migration.

27. **How do you automate Fiori apps vs SAP GUI?**
    - Fiori: Tosca web engine or API testing via OData services. GUI: Tosca SAP automation engine.

### Tosca (see [Parts 6–8]({{< relref "/docs/tosca" >}}))
28–32. Framework design, Recovery Scenarios, ALM/Jira integration, TestSheets, TBox — covered in depth in the [Tosca Mastery guide]({{< relref "/docs/tosca" >}}).

---

## Interview Questions: Advanced

### SAP SD + MM Integration
33. **Walk me through automating a full OTC cycle with validations at each step.**
    - VA01: buffer SO#, verify pricing. VL01N: verify pick qty, post GI, check MKPF/MATDOC. VF01: verify billing value, FI doc (BKPF/BSEG or ACDOCA). MM: stock reduced via MB52.

34. **How do you test intercompany sales?**
    - SO in selling company code, PO/STO in receiving, intercompany billing, verify elimination entries in FI.

35. **How do you handle SAP GUI scripting issues in automation?**
    - Enable scripting server-side, check modal dialogs, use recovery scenarios, avoid hardcoded session IDs, run with single session.

### SAP HANA
36. **How do you performance-test a high-volume posting scenario on HANA?**
    - ST05/SAT traces, measure MIGO/VA01 posting time, monitor HANA memory, compare with baseline, use batch input vs direct input.

37. **Explain how you would test CDS-based Fiori analytical apps.**
    - Validate CDS view output via SE16H/SQL, compare with app UI totals, test filters and currency conversion.

### Tosca Architecture (see [Parts 8–10]({{< relref "/docs/tosca" >}}))
38–42. CI/CD, upgrade maintenance, hybrid API+GUI, test data strategy, stakeholder metrics — full answers in [Tosca Mastery]({{< relref "/docs/tosca" >}}).

---

## Quick Reference: Key T-Codes Cheat Sheet

| Module | Transaction | Purpose |
|--------|-------------|---------|
| SD | VA01 | Create sales order |
| SD | VL01N | Create delivery |
| SD | VF01 | Create billing doc |
| SD | VK12 | Change condition record |
| SD | VKM3 | Release credit block |
| MM | ME21N | Create purchase order |
| MM | MIGO | Goods movement |
| MM | MIRO | Invoice verification |
| MM | MB52 | Stock overview |
| FI | FB03 | Display accounting doc |
| FI | FBL5N | Customer line items |
| PP | MD04 | Stock/requirements list |
| PP | CO01 | Create production order |
| Basis | SM37 | Background job monitor |
| Basis | ST22 | ABAP dump analysis |

---

## STAR Story Prompts (Behavioral + Technical)

Use these to prepare 2-minute answers:

1. **"Tell me about an automation framework you built."**
   - Situation: manual regression taking 5 days. Task: automate SAP SD. Action: Tosca modules + 350 TestCases + ALM traceability. Result: 65% cycle time reduction.

2. **"Describe a critical defect you caught before go-live."**
   - Focus on cross-module integration (SD-FICO pricing, MM GR/IR mismatch).

3. **"How did you handle a failed UAT and what did you change?"**
   - Show root cause analysis, test coverage gap, process improvement.

---

> **Prep tip:** For SAP questions, practice with (1) business context, (2) T-codes/steps, (3) validation points. For Tosca tool questions, use the [Tosca Interview Bank]({{< relref "/docs/tosca/topics/11-interview-questions" >}}).
