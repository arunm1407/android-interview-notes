---
title: "Tosca Printable Checklist"
weight: 1
---

# Tosca Mastery Checklist — Noob to Staff

> **Interactive tracking:** Check boxes on this page — progress saves automatically in your browser. Full guide → [Tosca Mastery]({{< relref "/docs/tosca" >}}). Hands-on labs → [Exercises]({{< relref "exercises" >}}).

**Legend:** Complete each section in order. Mark `[x]` when you can **explain and demo** the topic, not just read it.

---

## Progress Summary

| Track | Target | Done |
|-------|--------|------|
| Junior fundamentals | 24 items | <span id="prep-summary-done">0 / 96</span> |
| Mid-level engine mastery | 28 items | _____ / 28 |
| Senior framework & delivery | 26 items | _____ / 26 |
| Staff strategy & interviews | 18 items | _____ / 18 |
| Hands-on exercises | 8 labs | _____ / 8 |
| **Total checklist items** | **96** | _____ / 96 |

**Target certification / interview date:** _______________

---

## Phase 1 — Junior (Weeks 1–2)

### Installation & Workspace

- [ ] Installed Tosca Commander and Engine (matching versions)
- [ ] Connected Engine in Execution Settings
- [ ] Created workspace folder structure (Modules, TestCases, TestSheets, ELs)
- [ ] SAP GUI launches from Engine machine
- [ ] Enabled SAP scripting (client + verified server parameter)

### First Objects

- [ ] Scanned first SAP Module (single T-code screen)
- [ ] Renamed Module attributes to business names
- [ ] Created TestCase from Module
- [ ] Ran single TestCase with F8 — pass
- [ ] Created ExecutionList with 2+ TestCases
- [ ] Ran ExecutionList — reviewed execution log

### Core Concepts (Can Explain Aloud)

- [ ] Module vs TestCase vs TestStep vs ExecutionList
- [ ] What a Buffer is and when to use it
- [ ] What a TestSheet is
- [ ] What a Recovery Scenario is
- [ ] Classic vs TBox Module — which to use for new work
- [ ] Difference between Commander and Engine

### Junior Exercises

- [ ] Completed [Exercise 1: First Scan]({{< relref "exercises/01-first-scan-and-testcase" >}})
- [ ] Completed [Exercise 2: Buffer Chain]({{< relref "exercises/02-buffer-and-chain" >}})

---

## Phase 2 — Mid-Level (Weeks 3–6)

### SAP GUI Deep Dive

- [ ] Automated table line items with steering parameters
- [ ] Buffered document number from status bar (regex)
- [ ] Created navigation library TestCase (T-code entry)
- [ ] Handled modal popup wnd[1] with separate Module
- [ ] Implemented WaitOn / WaitUntil (no blind sleeps)

### Recovery & Data

- [ ] Created REC_SAP_SystemMessage recovery
- [ ] Created scenario-specific recovery (credit block or incompletion)
- [ ] Attached recovery at correct level (Module vs TestCase)
- [ ] Built TestSheet with 5+ rows — data-driven TestCase works
- [ ] Created TestConfiguration for DEV and QAS
- [ ] Used `{TestSheet.Column}` and `{TestConfiguration.Key}` in TestSteps

### TBox

- [ ] Wrote TBox If/Else for conditional flow
- [ ] Wrote For loop for multi-row table entry
- [ ] Parsed status bar with UseRegEx into Buffer
- [ ] Used LogInfo at TestCase entry and exit

### API & Hybrid

- [ ] Imported OData service as API Module
- [ ] Created sales order via API POST
- [ ] Buffered response field from JSON
- [ ] Combined API setup + GUI verification in one TestCase
- [ ] Understood CSRF token flow for SAP OData

### Mid Exercises

- [ ] Completed [Exercise 3: Table Line Items]({{< relref "exercises/03-table-line-items" >}})
- [ ] Completed [Exercise 4: Recovery Scenarios]({{< relref "exercises/04-recovery-scenarios" >}})
- [ ] Completed [Exercise 5: TestSheet DDT]({{< relref "exercises/05-testsheet-data-driven" >}})
- [ ] Completed [Exercise 6: API Hybrid]({{< relref "exercises/06-api-hybrid-odata" >}})

### Mid Interview Readiness

- [ ] Can walk through VA01 → VL01N → VF01 automation
- [ ] Can explain 3-way match automation (ME21N → MIGO → MIRO)
- [ ] Can compare API vs GUI when to use which
- [ ] Read [Part 11]({{< relref "topics/11-interview-questions" >}}) basic + intermediate sections

---

## Phase 3 — Senior (Weeks 7–12)

### Framework Design

- [ ] Implemented 4-layer folder structure (Modules → Components → Business → Suites)
- [ ] Created TC_LIB_* component with input/output parameters
- [ ] Business TestCase uses TestCaseCall (no duplicated steps)
- [ ] Naming conventions documented and followed
- [ ] No hardcoded environment data in TestCases
- [ ] Requirement linked to at least one TestCase

### CI/CD & Reporting

- [ ] Exported workspace subset to Git
- [ ] Ran ExecutionList via Tosca CI CLI (command line)
- [ ] Jenkins or Azure pipeline triggered execution
- [ ] Results published (JUnit or Tosca report)
- [ ] Email/Teams notification on failure configured
- [ ] Secrets stored in vault — not in Git or TestSheets

### Maintenance

- [ ] Re-scanned Module after simulated UI change
- [ ] Performed impact analysis (which TCs use Module X)
- [ ] Quarantined flaky test — fixed — re-admitted to smoke EL
- [ ] Evaluated Vision AI on one Fiori or dynamic screen
- [ ] Documented maintenance ratio or pass rate trend

### Senior Exercises

- [ ] Completed [Exercise 7: Framework Refactor]({{< relref "exercises/07-framework-refactor" >}})
- [ ] Completed [Exercise 8: CI/CD Pipeline]({{< relref "exercises/08-cicd-pipeline" >}})

### Senior Interview Readiness

- [ ] Whiteboarded framework layers from memory ([diagram]({{< relref "diagrams" >}}))
- [ ] Explained hybrid API+GUI architecture
- [ ] Explained parallel execution with multiple SAP users
- [ ] Answered 10 advanced questions from [Part 11]({{< relref "topics/11-interview-questions" >}}) aloud

---

## Phase 4 — Staff / Lead

### Strategy & Governance

- [ ] Built ROI model (manual days vs license + infra)
- [ ] Drew test pyramid for SAP program
- [ ] Defined smoke vs full regression gate criteria
- [ ] Documented Automation Charter (naming, Git, gates, flaky policy)
- [ ] Designed risk-based subset selection approach
- [ ] Planned S/4 migration automation phases

### Organization

- [ ] Defined CoE vs federated roles for team
- [ ] Created onboarding path for new automation engineer
- [ ] Established metrics dashboard for release manager
- [ ] Prepared 2 STAR stories (framework built, S/4 or flaky war)

### Staff Interview Readiness

- [ ] Can justify Tosca vs Selenium for enterprise SAP
- [ ] Can design multi-region execution strategy
- [ ] Can explain when NOT to automate in GUI
- [ ] Completed all 80 questions in [Part 11]({{< relref "topics/11-interview-questions" >}}) — staff section

---

## Pre-Interview Night Checklist

- [ ] SAP scripting parameters memorized (`rdisp/gui_auto_accept_server`)
- [ ] Can draw Tosca architecture (Commander → CI → Engine → SAP) in 60 seconds
- [ ] Can explain Module → Component → Business → EL layers
- [ ] One OTC and one PTP flow with T-codes and validation points
- [ ] One hybrid API+GUI example ready
- [ ] One failure story with root cause and fix
- [ ] Tosca vs Certify vs Selenium — 3 bullet comparison ready

---

## 12-Week Study Schedule

| Week | Focus | Checklist Phase | Exercise |
|------|-------|-----------------|----------|
| 1 | Install, scan, first TC | Junior | Ex 1 |
| 2 | Modules, EL, naming | Junior | Ex 2 |
| 3 | SAP tables, waits | Mid | Ex 3 |
| 4 | Recovery scenarios | Mid | Ex 4 |
| 5 | TestSheets, configs | Mid | Ex 5 |
| 6 | TBox + API intro | Mid | Ex 6 |
| 7 | Framework layers | Senior | Ex 7 |
| 8 | Component library | Senior | Ex 7 cont. |
| 9 | Git export | Senior | Ex 8 |
| 10 | CI pipeline | Senior | Ex 8 cont. |
| 11 | Maintenance, Vision AI | Senior | Re-run full smoke EL |
| 12 | Staff strategy + mock interviews | Staff | Part 11 all levels |

---

> **Diagrams:** [Architecture Diagrams]({{< relref "diagrams" >}}) · **SAP domain:** [SAP SD/MM & HANA]({{< relref "/docs/sap-automation" >}})
