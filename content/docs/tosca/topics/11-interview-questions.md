---
title: "Part 11: Interview Questions — Complete Bank"
weight: 11
---

# Part 11: Interview Questions — Complete Bank

> **80+ questions** from Junior to Staff, with model answers. Pair with [SAP domain guide]({{< relref "/docs/sap-automation" >}}) for SD/MM/HANA functional questions.

---

## Basic (Junior / Noob)

### Tosca Fundamentals

**1. What is Tricentis Tosca?**

Model-based test automation platform supporting SAP GUI, Web, API, Mobile, and Desktop. Separates object repository (Modules) from test logic (TestCases) for reuse at enterprise scale.

**2. What is a Module?**

Reusable object repository representing UI controls or API endpoints. Scanned once, referenced by many TestCases.

**3. What is the difference between TestCase and ExecutionList?**

TestCase = single test scenario. ExecutionList = collection of TestCases executed as a batch/suite.

**4. What is a TestStep?**

Single action on a Module attribute: Input, Click, Verify, Buffer, WaitOn.

**5. What components are needed to run tests on a remote machine?**

Tosca Commander (design), Tosca Engine (execution agent), application under test (SAP GUI/browser), network connectivity.

**6. What is a Buffer?**

Runtime variable storing values during execution — e.g., sales order number buffered from status bar for use in VL01N.

**7. What is a TestSheet?**

External data source (Excel/CSV) enabling data-driven testing — each row = one test iteration.

**8. What is a Recovery Scenario?**

Automated handler for unexpected popups/errors during test execution — e.g., SAP system message dialog.

**9. What is TBox?**

Tosca's scripting language for conditional logic, loops, string manipulation, and API calls beyond standard TestSteps.

**10. What is the difference between Classic and TBox Module?**

Classic = legacy scan mode. TBox Module = modern default with full TBox expression support. Use TBox for new development.

---

## Intermediate (Mid-Level)

### SAP Automation

**11. How enable SAP GUI Scripting for Tosca?**

Server: `rdisp/gui_auto_accept_server = 1` in RZ11. Client: SAP Logon → Options → Scripting → Enable. Verify on Engine machine.

**12. How handle SAP table line items in Tosca?**

Use table Module attributes with steering parameters (Row, Column). Loop with TBox `SetSteeringParameter` for multiple rows.

**13. How buffer a sales order number reliably?**

Buffer from status bar after save; parse with regex: `UseRegEx("Standard Order ([0-9]+)", msg, 1)`.

**14. What are common SAP popups requiring Recovery Scenarios?**

System messages, credit blocks, incompletion log, Express & Save, "changes were made" confirmation.

**15. How test third-party sales (TAS) in Tosca?**

VA01 with TAS item → verify MM PO in ME23N → MIRO → delivery/billing. Validate no stock movement.

### API & Hybrid

**16. How create sales order via OData in Tosca?**

Import API_SALES_ORDER_SRV from Swagger/API Hub → POST with JSON body → buffer response order number → optional GUI verify in VA03.

**17. What is CSRF token handling in SAP OData?**

GET request to service returns `x-csrf-token` header and session cookie — include both in subsequent POST.

**18. When use API vs GUI testing?**

API for fast setup, bulk data, backend assertions. GUI for popups, complex screens, credit blocks, visual document flow.

**19. How automate Fiori apps in Tosca?**

Web Engine scan of Fiori Launchpad/app. Handle dynamic IDs with Vision AI. Combine with OData API for setup.

### Data-Driven & Framework

**20. How implement data-driven testing?**

Create TestSheet with columns → bind to TestCase → reference `{TestSheet.ColumnName}` in TestSteps → each row runs one iteration.

**21. What is TestConfiguration?**

Environment parameter object — SAP system, client, user, URLs — switch between DEV/QAS without changing TestCases.

**22. What is TestCaseCall?**

Reuse a TestCase as subroutine with input/output parameters — e.g., login library called by all scenarios.

**23. How design reusable login component?**

`TC_LIB_SAP_Login` with parameters: System, Client, User, Password. Called as precondition or TestCaseCall.

**24. What naming convention for TestCases?**

`TC_<Layer>_<Module>_<ID>_<Description>` — e.g., `TC_SD_BP_001_StandardOTC`.

---

## Advanced (Senior)

### Framework & Architecture

**25. How design a layered Tosca framework for SAP SD?**

Modules (object layer) → Component library (TC_LIB_*) → Business TestCases (TC_SD_BP_*) → ExecutionLists. Shared infrastructure for config, recovery, XModules.

**26. Why separate Component and Business TestCases?**

Components are parameterized and reusable without TestSheet binding. Business layer owns scenario composition and data.

**27. How manage test data across DEV/QAS environments?**

TestConfigurations for infra params; TestSheets with environment column or separate sheets; TDMS for QAS refresh; never hardcode.

**28. How integrate Tosca with Jira/ALM?**

Link Requirements to TestCases in Commander; execute via CI; push results via Tosca connector or webhook; defects auto-created on failure.

**29. How set up Tosca in CI/CD pipeline?**

Git export/import via Tosca CI CLI; Jenkins/Azure DevOps trigger on commit; engine executes EL; JUnit results published; email on failure.

**30. How run tests in parallel?**

Multiple Engine VMs, each with unique SAP user and separate test data partition. Split ExecutionLists by module or row range.

### Maintenance

**31. How maintain tests after SAP upgrade?**

Impact analysis from simplification list → re-scan affected Modules → update Recovery for new popups → baseline compare → phased EL validation.

**32. What is Tosca Vision AI?**

AI-based control identification when technical IDs change — useful for Fiori and dynamic web. Configure confidence threshold.

**33. How handle flaky tests?**

Identify intermittent failures → quarantine from smoke EL → root cause (wait, data, recovery) → fix → re-admit after 5 consecutive passes.

**34. How perform impact analysis before Module change?**

Search all TestCase references to Module; run affected subset; use Tosca Analytics for failure trends.

**35. Describe hybrid API + GUI TestCase architecture.**

API creates SO (fast) → GUI creates delivery (complex UI) → API verifies stock and billing status → optional GUI display verify.

---

## Staff / Lead

**36. How justify Tosca investment to leadership?**

ROI: manual regression days × releases × cost vs license + infra + maintenance FTE. Defect leakage reduction. Faster release cycles. Typical payback 12–18 months.

**37. What is risk-based test selection?**

Execute weighted subset based on business criticality, change impact, defect history — not full suite every run. Tosca Analytics supports this.

**38. Design test strategy for S/4HANA migration program.**

Phase-based: POC → framework → parallel ECC/S4 Modules → API migration validation → cutover smoke EL → hypercare. Data reconciliation TestCases.

**39. Centralized CoE vs federated automation team?**

CoE for standards, CI, architecture. Federated for domain TestCases. Hybrid recommended at scale.

**40. What metrics report to release manager?**

Pass rate, cycle time vs manual baseline, flaky rate, new failures by category (module/data/defect), automation coverage %, defects found pre-UAT.

**41. Why not automate 100% in GUI?**

18-hour runs, high maintenance, misses API-level bugs faster caught by OData. Pyramid: API integration + GUI critical paths + manual exploratory.

**42. How govern automation across 5 SAP regions?**

Central Git, regional TestConfigurations and TestSheets, regional engines, aggregated dashboard, automation charter with naming/CI/gate standards.

---

## Tosca vs Other Tools

**43. Tosca vs Selenium for SAP?**

Tosca: native SAP engine, model reuse, Recovery, ALM, less coding. Selenium: free, requires custom SAP scripting wrapper, higher build effort for enterprise SAP.

**44. Tosca vs WorkSoft Certify?**

Both strong in SAP GUI. Tosca stronger in API, Vision AI, modern CI. Certify strong in process mining integration. Tosca more common in greenfield S/4 programs.

**45. Tosca vs UFT?**

UFT legacy, VBScript, declining SAP focus. Tosca modern model-based, better CI/CD and API. New projects typically choose Tosca.

---

## Scenario-Based (Walkthrough)

**46. Walk through automating full OTC cycle.**

Create SO (VA01, buffer) → delivery (VL01N, GI) → billing (VF01) → verify FI doc. Validations: document flow, stock (MB52/MATDOC), pricing, ACDOCA posting. Modular components for each step.

**47. How automate ME21N → MIGO → MIRO PTP flow?**

Component: Create PO → buffer PO# → MIGO GR 101 → buffer mat doc → MIRO invoice → verify 3-way match message → GR/IR clearing check.

**48. Credit block scenario automation?**

TestSheet row exceeding limit → VA01 save → Recovery or verify block message → buffer CreditBlock=Yes → VKM3 release (if testing release) → continue OTC.

**49. How validate S/4 data migration with Tosca?**

API/SQL TestCases comparing record counts, open document balances, trial balance between ECC snapshot and S/4. Report to steering committee.

**50. Failed UAT but automation passed — what do you change?**

Root cause analysis: test data gap, missing config in QAS, assertion too weak, wrong environment. Add TestCases, strengthen verifies, align TDMS with PRD-like config.

---

## TBox & Technical Deep

**51. TBox example: conditional credit block handling.**

```vb
If InStr(Buffer("StatusBar"), "credit block") > 0 Then
    Buffer("CreditBlock") = "Yes"
    TestStep("TC_LIB_ReleaseCredit")
Else
    LogInfo("No credit block")
End If
```

**52. TBox example: loop 5 table rows.**

```vb
Dim i
For i = 0 To 4
    SetSteeringParameter("Table_Items", "Row", CStr(i))
    TestStep("Table_Material", "Input", TestSheet("Mat_" + CStr(i)))
Next
```

**53. What is an XModule?**

Custom TBox module encapsulating reusable logic — like a function library (login, parse SAP message, generate unique reference).

**54. How avoid hardcoded waits?**

Use `WaitUntil`, `WaitOn` attribute visible, status bar contains — not `TBoxWait(10000)`.

**55. How version control Tosca objects?**

Export subsets to Git via Tosca CI; PR review; import on engine before execution. Tag releases aligned with SAP transports.

---

## Quick-Fire Round (56–80)

| # | Question | Short Answer |
|---|----------|--------------|
| 56 | What is Tosca Engine? | Runtime agent executing tests |
| 57 | What is Tosca NEO? | Containerized cloud-native engine |
| 58 | What is TDS? | Test Data Service — synthetic/masked data |
| 59 | What is steering parameter? | Dynamic row/column for tables |
| 60 | What is precondition TestCase? | Runs before main TestCase |
| 61 | What is postcondition? | Cleanup TestCase after execution |
| 62 | What is requirement traceability? | Link TestCase to business requirement |
| 63 | What is Express & Save popup? | SAP customizing dialog — Recovery handles |
| 64 | What is document flow? | SD chain SO→Delivery→Billing linked |
| 65 | ATP checked where? | VA01 against MM stock |
| 66 | Movement type for GR? | 101 |
| 67 | What is 3-way match? | PO + GR + Invoice in MIRO |
| 68 | What is MATDOC? | S/4 unified material document table |
| 69 | What is ACDOCA? | Universal journal for FI postings |
| 70 | FBL5N used for? | Customer line items display |
| 71 | What is item category TAS? | Third-party order — triggers MM PO |
| 72 | What is consignment stock? | Special stock at customer (W) |
| 73 | What is release strategy? | PO approval workflow — ME28 release |
| 74 | What is GR/IR account? | WRX/BSX clearing after MIRO |
| 75 | What is Fiori Launchpad? | S/4 web entry point — Web Engine |
| 76 | What is OData? | RESTful SAP API protocol |
| 77 | What is SAP API Business Hub? | Catalog of SAP OData APIs |
| 78 | What is TDMS? | SAP test data migration — masking |
| 79 | What is smoke ExecutionList? | Fast critical path suite — nightly gate |
| 80 | What is flaky test? | Intermittent pass/fail without code change |

---

## STAR Story Prompts

### Story 1: Framework Built

**Situation:** Manual SAP SD regression took 5 days per release, 4 testers.  
**Task:** Build Tosca automation to cut cycle time.  
**Action:** Layered framework — 45 Modules, 80 components, 350 business TestCases, Jenkins nightly, ALM traceability.  
**Result:** 65% cycle time reduction, 2 production defects caught in gate, team redeployed to exploratory testing.

### Story 2: S/4 Migration

**Situation:** ECC automation 600 TestCases, S/4 upgrade broke 40%.  
**Task:** Restore automation for go-live gate in 8 weeks.  
**Action:** Impact analysis, API replacement for 15 deprecated T-codes, Fiori Web Modules, risk-based EL, daily steering report.  
**Result:** Gate passed at 96% pass rate, zero P1 automation gaps at cutover.

### Story 3: Flaky Test War

**Situation:** Smoke EL 85% pass rate, team ignoring results.  
**Task:** Restore confidence in automation.  
**Action:** Quarantine policy, fixed 23 root causes (wait/recovery/data), Vision AI for 8 Fiori modules, metrics dashboard.  
**Result:** Smoke at 98% for 3 months consecutive, release gate re-enabled.

---

## Answer Framework (Any Question)

Structure every interview answer as:

1. **Business context** — why this matters (OTC, compliance, release risk)
2. **Technical approach** — Tosca objects, engines, T-codes
3. **Validation points** — what you assert (document flow, FI, stock)
4. **Scale/maintenance** — framework, CI, metrics (for senior+)

---

> **Back to:** [Tosca Mastery Home]({{< relref "/docs/tosca" >}}) | **SAP Domain:** [SAP SD/MM & HANA]({{< relref "/docs/sap-automation" >}})
