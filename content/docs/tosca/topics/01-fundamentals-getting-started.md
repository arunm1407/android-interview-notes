---
title: "Part 1: Fundamentals & Getting Started"
weight: 1
---

# Part 1: Fundamentals & Getting Started

> **Level:** Junior / Noob | **Prerequisite:** None | **Next:** [Part 2: Modules & TestCases]({{< relref "02-modules-testcases-building-blocks" >}})

---

## 1.1 What Problem Does Tosca Solve?

Manual SAP regression takes days. Scripted tools break on every UI change. Tosca's model-based approach:

1. **Scan** the application once → create a **Module** (object repository)
2. **Build TestCases** from Module attributes — no re-recording when one field moves
3. **Reuse** the same Module across 50 TestCases
4. **Recover** from popups automatically via Recovery Scenarios
5. **Scale** execution via ExecutionLists + distributed engines

---

## 1.2 Tosca Product Landscape

| Component | Role |
|-----------|------|
| **Tosca Commander** | Desktop IDE — design, scan, organize, execute locally |
| **Tosca Engine** | Runtime agent — executes tests on a machine with SAP GUI / browser |
| **Tosca NEO** | Containerized engine for cloud/Kubernetes deployments |
| **Tosca Cloud** | SaaS execution and analytics |
| **Tosca CI** | CLI for Jenkins/Azure DevOps/GitLab — headless execution |
| **TDS (Test Data Service)** | Synthetic/masked test data generation |
| **Tosca Analytics** | Risk coverage, flakiness, execution trends |

---

## 1.3 Installation & Workspace Setup

### Minimum Requirements (Typical Enterprise)

- Windows VM or physical (SAP GUI runs on Windows)
- Tosca Commander license
- At least one Tosca Engine license (can share for small teams)
- SAP GUI for Windows with Scripting enabled
- Network access to SAP system (DEV/QAS)

### First-Time Setup Checklist

```
□ Install Tosca Commander (match version with Engine — e.g., 2023.2)
□ Install Tosca Engine on execution machine
□ Configure Workspace — shared network drive OR Git-backed export
□ Connect Engine in Commander: Execution → Execution Settings
□ Verify SAP GUI launches from Engine machine
□ Enable SAP Scripting (see Part 3)
□ Create folder structure in workspace (see Part 7)
```

### Workspace Folder Structure (Starter)

```
Workspace/
├── 01_Modules/
│   ├── SAP/
│   ├── Web/
│   └── API/
├── 02_TestCases/
│   ├── SD/
│   ├── MM/
│   └── CrossModule/
├── 03_TestSheets/
├── 04_ExecutionLists/
├── 05_RecoveryScenarios/
├── 06_Requirements/
└── 07_Configurations/
```

---

## 1.4 Commander UI Tour

| Pane | Purpose |
|------|---------|
| **Project Tree** | Left — all objects (Modules, TestCases, etc.) |
| **Details View** | Center — TestSteps, attributes, properties |
| **Properties** | Right — selected object metadata |
| **TestCase Design** | Drag TestSteps, configure actions |
| **Module Attribute** | Individual control in a Module |

### Key Shortcuts

| Action | Shortcut |
|--------|----------|
| Scan | `Ctrl + F12` (context-dependent) |
| Run TestCase | `F8` |
| Run ExecutionList | `Ctrl + F8` |
| Create TestCase from Module | Right-click Module → "Create TestCase" |

---

## 1.5 Your First Module (SAP GUI Scan)

### Steps

1. Open SAP GUI manually, navigate to **VA01** (Create Sales Order)
2. In Commander: **Modules** → right-click → **Scan** → **SAP**
3. Select the SAP session window
4. Tosca captures: menu bar, toolbar, input fields, tables, status bar
5. Name the Module: `M_SAP_VA01_CreateSalesOrder`
6. Review attributes — each field/button is an **attribute** with technical ID

### What Gets Captured

| Attribute Type | Example in VA01 |
|----------------|-----------------|
| Input field | Sold-to Party, Ship-to Party, PO Number |
| Dropdown | Sales Document Type (OR, RE, etc.) |
| Table | Line items grid |
| Button | Save, Back, Exit |
| Status bar | Message area (for buffering order number) |

### Naming Attributes

Rename cryptic technical names to business names:

```
❌ txtRF05A-AUT01-0100-E
✅ Input_SoldToParty

❌ btn[0]
✅ Button_Save
```

---

## 1.6 Your First TestCase

### Manual TestCase Creation

1. Right-click Module → **Create TestCase**
2. Tosca generates TestSteps for each attribute action
3. Delete unnecessary steps (keep only what the scenario needs)
4. Configure actions:

| TestStep | Action | Value |
|----------|--------|-------|
| Input_SalesDocType | Input | OR |
| Input_SoldToParty | Input | `{TestSheet.SoldTo}` or hardcoded for first test |
| Input_Material | Input | MAT-001 |
| Input_Quantity | Input | 10 |
| Button_Save | Click | — |
| StatusBar | Verify | *contains* "has been saved" |

5. Press **F8** to run

---

## 1.7 Your First ExecutionList

1. **ExecutionLists** → Create → `EL_Smoke_SD`
2. Drag TestCases into the list
3. Set execution settings: Engine, SAP connection, screenshot on failure
4. Run with **Ctrl + F8**

### Execution Settings That Matter

| Setting | Recommendation |
|---------|----------------|
| **Engine** | Dedicated VM, not your laptop |
| **Screenshot** | On failure + on buffer steps |
| **Timeout** | 30–60s per TestStep for SAP |
| **Continue on fail** | OFF for smoke; ON for full regression |
| **Log level** | Info for debug, Warning for CI |

---

## 1.8 Object Types Reference

| Object | Contains | Created By |
|--------|----------|------------|
| Module | Attributes (controls) | Scan or manual |
| TestCase | TestSteps | From Module or scratch |
| TestStep | Action on one attribute | Auto or manual |
| TestSheet | Rows of test data | Excel import |
| ExecutionList | TestCase references | Manual |
| Requirement | Business requirement link | Manual or ALM sync |
| Recovery Scenario | Conditional popup handler | Manual |
| TestConfiguration | Environment params | Manual |

---

## 1.9 Common Beginner Mistakes

| Mistake | Fix |
|---------|-----|
| Scanning entire SAP Easy Access instead of one T-code | Scan only the target screen after navigation |
| Hardcoding production data | Use TestSheets from day one |
| One giant TestCase for full OTC | Split into TC_CreateSO, TC_CreateDelivery, TC_Billing |
| Running on laptop while SAP session locked | Dedicated engine VM with unlocked session |
| Ignoring status bar for buffers | Always buffer document numbers from status bar |
| Not versioning workspace | Export to Git weekly (Part 8) |

---

## 1.10 Knowledge Check (Junior)

1. What is the difference between a Module and a TestCase?
2. Why is model-based testing better than record-and-playback for SAP?
3. What three components do you need to run a test remotely?
4. Where do you store reusable UI object definitions?
5. What is an ExecutionList used for?

<details>
<summary>Answers</summary>

1. **Module** = object repository (what the UI *is*). **TestCase** = test scenario (what you *do*).
2. When SAP UI changes, you update one Module attribute — not 50 recorded scripts.
3. Commander (design), Engine (execute), SAP GUI (application under test).
4. **Modules** folder in workspace.
5. Batch execution of multiple TestCases as a test suite.

</details>

---

> **Next:** [Part 2: Modules, TestCases & Building Blocks]({{< relref "02-modules-testcases-building-blocks" >}})
