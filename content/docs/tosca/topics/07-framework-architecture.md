---
title: "Part 7: Framework Architecture & Design Patterns"
weight: 7
---

# Part 7: Framework Architecture & Design Patterns

> **Level:** Senior | **Prerequisite:** Parts 1–6 | **Next:** [Part 8: CI/CD]({{< relref "08-cicd-devops-reporting" >}})

---

## 7.1 What Is a Tosca Framework?

A framework is the **structured layer** between raw Tosca objects and maintainable enterprise automation:

```
┌─────────────────────────────────────────┐
│  ExecutionLists (Test Suites)           │  ← QA runs these
├─────────────────────────────────────────┤
│  Business TestCases (SD, MM scenarios)    │  ← Business-readable
├─────────────────────────────────────────┤
│  Component Library (Login, CreateSO...) │  ← Reusable flows
├─────────────────────────────────────────┤
│  Modules (Object Repository)            │  ← Technical UI map
├─────────────────────────────────────────┤
│  Infrastructure (Config, Recovery, Data)│  ← Cross-cutting
└─────────────────────────────────────────┘
```

---

## 7.2 Layered Architecture

### Layer 1: Object Layer (Modules)

- One module per screen/popup
- No business logic
- Stable technical mapping
- Owned by: **Automation engineers**

```
01_Modules/SAP/SD/VA01/
  M_SAP_VA01_Header
  M_SAP_VA01_LineItems
  M_SAP_VA01_PartnerPopup
```

### Layer 2: Component Layer (Library TestCases)

- Atomic reusable actions
- Parameters in/out
- No TestSheet binding (receive data via parameters)

```
02_Components/SAP/
  TC_LIB_SAP_Login
  TC_LIB_SAP_Logout
  TC_LIB_SD_CreateSalesOrder
  TC_LIB_SD_CreateDelivery
  TC_LIB_MM_CreatePO
  TC_LIB_MM_PostGR
```

### Layer 3: Business Layer (Scenario TestCases)

- Compose components into business flows
- Bound to TestSheets
- Named for business process

```
03_Business/SD/
  TC_SD_BP_001_StandardOTC
  TC_SD_BP_002_ThirdPartySales
  TC_SD_BP_003_MTO_Flow
```

### Layer 4: Suite Layer (ExecutionLists)

- Group by regression scope, release gate, module

```
04_Suites/
  EL_Smoke_Nightly
  EL_Regression_SD_Full
  EL_PreRelease_Mandatory
```

---

## 7.3 Naming Conventions (Enterprise Standard)

### Modules

```
M_<Engine>_<TCode>_<ScreenDescription>

M_SAP_VA01_HeaderData
M_WEB_Fiori_SalesOrderList
M_API_SalesOrder_POST
```

### TestCases

```
TC_<Layer>_<Module>_<ID>_<Description>

TC_LIB_SD_CreateSalesOrder
TC_SD_BP_001_StandardOTC
TC_MM_BP_010_PTP_Standard
```

### TestSheets

```
TS_<Module>_<Scenario>

TS_SD_StandardOrder_Positive
TS_MM_PTP_Negative
```

### Buffers

```
BUF_<Entity>_<Attribute>
```

### Recovery Scenarios

```
REC_<Scope>_<TriggerDescription>

REC_SAP_Generic_SystemMessage
REC_SD_CreditBlock_VA01
```

---

## 7.4 Component Design Rules

| Rule | Rationale |
|------|-----------|
| Single responsibility | One component = one business action |
| Parameterize everything | No hardcoded customers/materials |
| Return outputs via parameters | OrderNumber as output param |
| Fail fast with clear logs | LogInfo entry/exit with params |
| No TestSheet in components | Business layer binds data |
| Precondition login optional | Caller decides session state |

### Example Component Signature

```
TC_LIB_SD_CreateSalesOrder
  IN:  SoldToParty, Material, Quantity, SalesOrg, Plant
  OUT: OrderNumber
  PRE: TC_LIB_SAP_NavigateVA01 (optional)
```

---

## 7.5 Page Object Model vs Tosca Model

| POM (Selenium) | Tosca Equivalent |
|----------------|------------------|
| Page class | Module |
| WebElement | Module Attribute |
| Page method | Component TestCase |
| Test method | Business TestCase |
| properties file | TestConfiguration |

Tosca's model-based approach **is** POM — don't duplicate with extra abstraction unless needed.

---

## 7.6 Shared Infrastructure Objects

```
05_Infrastructure/
├── Configurations/
│   TCFG_DEV
│   TCFG_QAS
│   TCFG_PREPROD
├── Recovery/
│   REC_SAP_* (all generic)
├── XModules/
│   XM_ParseSAPMessage
│   XM_WaitForProcessing
│   XM_GenerateUniqueRef
└── Templates/
    API_JSON_CreateSO.json
```

---

## 7.7 Version Control Strategy

### Git Export Structure

```
tosca-automation/
├── modules/
├── components/
├── business/
├── testsheets/
├── executionlists/
├── recovery/
└── README.md
```

### Branching Model

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready, synced with QAS |
| `develop` | Integration branch |
| `feature/SD-123-new-pricing-test` | New TestCases |
| `hotfix/module-VA01-rescan` | UI fix after SAP patch |

### Export/import via Tosca CI

```bash
tosca_ci.cmd -project "Workspace.tws" -export "modules/SAP/VA01" -target "./git/modules/VA01"
```

---

## 7.8 Code Review Checklist (Senior)

- [ ] No hardcoded environment data
- [ ] Component has input/output parameters documented
- [ ] Recovery scenarios attached at correct level
- [ ] TestSheet uses Tags for filtering
- [ ] Naming follows convention
- [ ] No duplicate Modules for same screen
- [ ] Buffers cleared in precondition
- [ ] Screenshots on failure enabled
- [ ] Requirement linked (if ALM integrated)
- [ ] Execution time < 5 min per business TC (or justified)

---

## 7.9 Framework Migration (Brownfield)

### Phase 1: Stabilize (Weeks 1–4)

- Inventory existing TestCases
- Identify top 20 flaky tests
- Fix Modules + Recovery

### Phase 2: Refactor (Weeks 5–12)

- Extract TC_LIB_* components
- Consolidate duplicate Modules
- Introduce TestConfigurations

### Phase 3: Scale (Months 4–6)

- Git + CI pipeline
- ALM traceability
- Metrics dashboard
- Team training + conventions doc

---

## 7.10 Team Roles

| Role | Responsibility |
|------|----------------|
| **Automation Architect** | Framework design, standards, tool strategy |
| **SAP Automation Engineer** | Modules, SAP-specific components |
| **API Automation Engineer** | OData modules, hybrid flows |
| **Manual QA / BA** | TestSheet data, requirements mapping |
| **DevOps** | Engine VMs, CI, scheduling |
| **Basis** | SAP scripting, users, TDMS refresh |

---

## 7.11 Knowledge Check (Senior)

1. What are the four layers of a Tosca framework?
2. Why shouldn't components bind directly to TestSheets?
3. How does Tosca Module map to Selenium POM?
4. What goes in `05_Infrastructure` folder?
5. Describe brownfield migration Phase 1 focus.

<details>
<summary>Answers</summary>

1. Modules → Components → Business TestCases → ExecutionLists (+ Infrastructure cross-cutting).
2. Components stay reusable; business layer owns data binding — separation of concerns.
3. Module = Page, Attribute = Element, Component TC = Page method, Business TC = Test method.
4. Configurations, shared Recovery, XModules, API templates.
5. **Stabilize** — fix flakiness, inventory, top 20 failing tests before restructuring.

</details>

---

> **Next:** [Part 8: CI/CD, DevOps & Reporting]({{< relref "08-cicd-devops-reporting" >}})
