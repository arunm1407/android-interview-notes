---
title: "Part 10: Staff-Level Architecture & Strategy"
weight: 10
---

# Part 10: Staff-Level Architecture & Strategy

> **Level:** Staff / Principal / Lead | **Prerequisite:** Parts 1–9 | **Next:** [Part 11: Interview Questions]({{< relref "11-interview-questions" >}})

---

## 10.1 Staff Role — What Changes?

| Senior | Staff |
|--------|-------|
| Builds framework components | Defines **platform strategy** |
| Fixes flaky tests | Sets **quality gates** and metrics |
| Integrates Jenkins | Designs **multi-region execution** |
| Trains juniors on Tosca | Aligns automation with **business risk** |
| Maintains Modules | Negotiates **license, headcount, ROI** with leadership |

---

## 10.2 Automation Strategy Canvas

Answer these before writing TestCase #1:

| Question | Staff-Level Answer Framework |
|----------|---------------------------|
| What business risk are we reducing? | Revenue-impacting OTC failures, compliance, go-live |
| Manual cost today? | X testers × Y days × $Z per release |
| Target automation coverage? | 70% regression, 100% smoke, 0% of exploratory |
| Tool choice justified? | Tosca for SAP-native + model reuse + ALM at enterprise scale |
| Build vs buy vs outsource? | Build core framework in-house; outsource data setup if needed |
| 3-year TCO? | Licenses + engines + VMs + 2 FTE vs manual cost avoidance |

---

## 10.3 Test Pyramid for SAP Landscapes

```
                    ┌─────────┐
                    │ Manual  │  Exploratory, UX, new features
                    │   E2E   │
                   ┌┴─────────┴┐
                   │ GUI Tosca │  Critical paths, popups, credit
                   │  E2E      │  blocks, document flow UI
                  ┌┴───────────┴┐
                  │ API Tosca   │  OData setup, assertions, bulk
                  │ Integration │
                 ┌┴─────────────┴┐
                 │ Unit (ABAP)   │  Dev-owned — not Tosca scope
                 └───────────────┘
```

**Staff insight:** Push **down** over time — more API, less GUI — without losing business confidence.

---

## 10.4 Organization Design

### Centralized CoE (Center of Excellence)

```
        Automation CoE (3–5 engineers)
              │
    ┌─────────┼─────────┐
    SD squad  MM squad  FICO squad
    (manual)  (manual)  (manual)
```

**Pros:** Standards, reuse, career path.  
**Cons:** Bottleneck if CoE too small.

### Federated (Embedded)

```
Each SAP module team has 1 automation engineer
Shared architecture guild sets standards
```

**Pros:** Domain knowledge.  
**Cons:** Inconsistent frameworks without strong guild.

### Recommended Hybrid

- **CoE owns:** Framework, CI, Modules standards, ALM, metrics
- **Federated owns:** Business TestCases, TestSheets, requirements mapping

---

## 10.5 Risk-Based Test Selection

Not all 2,000 TestCases run every night.

| Factor | Weight |
|--------|--------|
| Requirement business criticality | High |
| Historical defect density in area | High |
| Change impact from transport | High |
| Last execution result | Medium |
| Execution cost (time) | Medium |

### Tosca Risk-Based Optimization

```
Tosca Analytics + change logs from SAP transport
    → Select subset EL_RiskBased_Release_2025.06
    → 400 tests instead of 2000
    → 80% defect detection at 20% cost (validated quarterly)
```

---

## 10.6 Multi-Environment Strategy

```
DEV     → Developer smoke (API-heavy, fast)
QAS     → Full regression (GUI + API)
PREPROD → Mandatory gate (subset + E2E)
PRD     → Synthetic monitoring only (read-only, no create)
```

### Environment Parity Rules

- Same TestCases, different TestConfigurations
- Never point automation at PRD for create transactions
- TDMS refresh QAS monthly; DEV weekly script reset

---

## 10.7 Global / Multi-Region Execution

```
Region EU: Engines in Frankfurt → SAP EU QAS
Region US: Engines in Virginia → SAP US QAS
Region APAC: Engines in Singapore → SAP APAC QAS

Central Git repo → regional CI pipelines → aggregated dashboard
```

### Challenges

- Different chart of accounts / org structures → regional TestSheets
- Time zone scheduling — EL runs local off-hours
- Data privacy — no cross-region test data

---

## 10.8 Tosca Licensing & TCO (Staff Conversations)

| Cost Driver | Typical Range |
|-------------|---------------|
| Commander licenses | Per seat |
| Engine licenses | Per concurrent execution |
| NEO/Cloud | Consumption-based |
| TDS | Add-on |
| Vision AI | Add-on |
| VMs | $500–1500/engine/month |

### ROI Model

```
Manual regression: 5 testers × 3 days × 8 releases = 120 tester-days/year
Automated: 6 hours × 8 releases = 48 machine-hours + 0.5 FTE maintenance

Savings = (120 × daily rate) - (license + infra + 0.5 FTE)
Payback period: typically 12–18 months at enterprise scale
```

---

## 10.9 Governance & Standards Document

Staff delivers **Automation Charter** containing:

1. Naming conventions (Part 7)
2. Layer architecture (Part 7)
3. Git branching model (Part 7)
4. CI gate criteria (Part 8)
5. Flaky test policy (Part 9)
6. Security — no PRD writes (Part 8)
7. ALM traceability requirements (Part 8)
8. Onboarding path (Part 1 learning path)
9. Escalation — when manual QA overrides automation pass
10. Quarterly health review agenda

---

## 10.10 S/4 Program — Staff Test Strategy

Large S/4 migration program:

| Phase | Automation Focus |
|-------|------------------|
| Discover | Process inventory, tool selection, POC |
| Prepare | Framework build, API-first for new APIs |
| Explore | Parallel run ECC automation + build S/4 Modules |
| Realize | Risk-based regression, data migration validation |
| Deploy | Cutover smoke EL, hypercare monitoring |
| Run | Steady state — optimize pyramid |

### Data Migration Validation at Scale

```
API/ SQL reconciliation:
  ECC open SO count = S/4 open SO count
  Trial balance match
  Open PO/GR/IR match
  
Tosca executes comparison TestCases
Report to program steering committee
```

---

## 10.11 Failure Stories — Staff Lessons

### Story 1: "We automated everything in GUI"

**Situation:** 800 GUI TestCases, 18-hour EL, still flaky.  
**Action:** API layer for setup/assert; GUI cut to 200 critical paths.  
**Result:** 5-hour EL, 96% pass rate, team morale restored.

### Story 2: "No Git — workspace on shared drive"

**Situation:** Two engineers overwrite each other's Modules.  
**Action:** Git + PR review + Tosca CI import/export.  
**Result:** Zero overwrite incidents, audit trail for SOX.

### Story 3: "Automation passed, production failed"

**Situation:** Test data in QAS didn't match PRD config (pricing procedure).  
**Action:** Config comparison TestCases + TDMS from PRD-like source.  
**Result:** Caught pricing bug in gate 2.

---

## 10.12 Hiring & Interviewing (Staff Builds Team)

| Level | Interview Focus |
|-------|-----------------|
| Junior | Part 1–2 concepts, simple SAP flow |
| Mid | Tables, buffers, API hybrid |
| Senior | Framework design, CI/CD, maintenance |
| Staff | Strategy, ROI, org design, S/4 program |

Use [Part 11 Interview Questions]({{< relref "11-interview-questions" >}}) calibrated by level.

---

## 10.13 Knowledge Check (Staff)

1. How justify Tosca license cost to CFO?
2. Draw test pyramid for SAP — what goes where?
3. Centralized CoE vs federated — when pick each?
4. What is risk-based test selection?
5. Why never run create transactions on PRD?

<details>
<summary>Answers</summary>

1. ROI model: manual tester-days avoided vs license + infra; payback 12–18 months; defect cost avoidance.
2. **Unit** ABAP (dev); **API** bulk/setup/assert; **GUI** critical UI/popups; **Manual** exploratory.
3. **CoE** for enterprise standards at scale; **Federated** when strong domain squads + architecture guild.
4. Run subset weighted by business risk + change impact — not full 2000 tests every time.
5. Data corruption, compliance, performance impact — PRD is read-only synthetic monitoring only.

</details>

---

> **Next:** [Part 11: Interview Questions — Complete Bank]({{< relref "11-interview-questions" >}})
