---
title: "Architecture Diagrams"
weight: 2
---

# Tosca Architecture Diagrams

> Visual reference for interviews, design reviews, and onboarding. Pair with [Part 1]({{< relref "topics/01-fundamentals-getting-started" >}}) and [Hands-on Exercises]({{< relref "exercises" >}}).

---

## 1. Tosca Platform Overview

```mermaid
flowchart TB
    subgraph IDE["Tosca Commander (IDE)"]
        M[Modules]
        TC[TestCases]
        TS[TestSheets]
        EL[ExecutionLists]
        REQ[Requirements]
    end

    subgraph CI["CI/CD Layer"]
        GIT[Git Repository]
        JEN[Jenkins / Azure DevOps]
        TCI[Tosca CI CLI]
    end

    subgraph RUN["Execution Layer"]
        ENG1[Tosca Engine VM 1]
        ENG2[Tosca Engine VM 2]
        NEO[Tosca NEO / Cloud]
    end

    subgraph AUT["Applications Under Test"]
        SAP[SAP GUI]
        WEB[Fiori / Web]
        API[OData / REST]
    end

    M --> TC
    TS --> TC
    TC --> EL
    REQ --> TC

    IDE -->|export/import| GIT
    GIT --> JEN --> TCI
    TCI --> ENG1
    TCI --> ENG2
    TCI --> NEO

    ENG1 --> SAP
    ENG1 --> WEB
    ENG2 --> API
    NEO --> WEB
```

---

## 2. Model-Based Testing vs Record-and-Playback

```mermaid
flowchart LR
    subgraph Model["Tosca Model-Based"]
        SCAN1[Scan once] --> MOD[Module Repository]
        MOD --> TC1[TestCase A]
        MOD --> TC2[TestCase B]
        MOD --> TC3[TestCase C]
        UI1[UI changes] --> MOD
        MOD -.->|update 1 module| TC1
        MOD -.->|update 1 module| TC2
    end

    subgraph Record["Record-and-Playback"]
        REC1[Record script 1]
        REC2[Record script 2]
        REC3[Record script 3]
        UI2[UI changes] --> REC1
        UI2 --> REC2
        UI2 --> REC3
    end
```

**Interview line:** One Module update propagates to all TestCases — that's the reuse advantage.

---

## 3. Framework Layer Architecture

```mermaid
flowchart TB
    subgraph L4["Layer 4 — Suites"]
        EL1[EL_Smoke_Nightly]
        EL2[EL_Regression_SD]
        EL3[EL_PreRelease_Gate]
    end

    subgraph L3["Layer 3 — Business TestCases"]
        BP1[TC_SD_BP_001 Standard OTC]
        BP2[TC_SD_BP_002 Third Party]
        BP3[TC_MM_BP_010 PTP]
    end

    subgraph L2["Layer 2 — Component Library"]
        LIB1[TC_LIB_SAP_Login]
        LIB2[TC_LIB_SD_CreateSO]
        LIB3[TC_LIB_SD_CreateDelivery]
        LIB4[TC_LIB_MM_PostGR]
    end

    subgraph L1["Layer 1 — Modules"]
        M1[M_SAP_VA01_Header]
        M2[M_SAP_VL01N_Delivery]
        M3[M_API_SalesOrder_POST]
    end

    subgraph INF["Infrastructure"]
        CFG[TestConfigurations]
        REC[Recovery Scenarios]
        XM[XModules / TBox]
    end

    EL1 --> BP1
    EL2 --> BP1
    EL2 --> BP2
    EL3 --> BP3

    BP1 --> LIB1
    BP1 --> LIB2
    BP1 --> LIB3
    BP3 --> LIB4

    LIB2 --> M1
    LIB3 --> M2
    BP2 --> M3

    REC --> M1
    CFG --> BP1
    XM --> LIB2
```

---

## 4. Standard OTC Automation Flow (SAP SD)

```mermaid
sequenceDiagram
    participant TC as TestCase
    participant VA01 as VA01 Create SO
    participant VL01N as VL01N Delivery
    participant VF01 as VF01 Billing
    participant FI as FI Document
    participant BUF as Buffers

    TC->>VA01: Create sales order
    VA01-->>BUF: Buffer OrderNumber
    TC->>VL01N: Reference OrderNumber
    VL01N-->>BUF: Buffer DeliveryNumber
    Note over VL01N: Post goods issue
    TC->>VF01: Bill delivery
    VF01-->>BUF: Buffer BillingNumber
    TC->>FI: Verify accounting doc
    FI-->>TC: Assert revenue posted
```

---

## 5. Hybrid API + GUI TestCase

```mermaid
flowchart LR
    subgraph SETUP["Block 1 — API Engine"]
        A1[GET CSRF Token]
        A2[POST Create Sales Order]
        A3[Buffer OrderNumber]
    end

    subgraph GUI["Block 2 — SAP Engine"]
        G1[Navigate VL01N]
        G2[Create Delivery]
        G3[Post Goods Issue]
    end

    subgraph VERIFY["Block 3 — API Engine"]
        V1[GET Stock Level]
        V2[GET Billing Status]
        V3[Assert ACDOCA Posting]
    end

    A1 --> A2 --> A3 --> G1 --> G2 --> G3 --> V1 --> V2 --> V3
```

**Staff insight:** API blocks run in seconds; GUI only where popups and complex screens matter.

---

## 6. Buffer Lifecycle Across ExecutionList

```mermaid
stateDiagram-v2
    [*] --> ClearBuffers: Precondition TC
    ClearBuffers --> CreateSO: TC_SD_010
    CreateSO --> HasSO: BUF_SO_Number set
    HasSO --> CreateDel: TC_SD_020
    CreateDel --> HasDel: BUF_DEL_Number set
    HasDel --> Billing: TC_SD_040
    Billing --> HasBill: BUF_BILL_Number set
    HasBill --> Verify: TC_SD_050
    Verify --> [*]: Postcondition log

    note right of ClearBuffers
        TC_LIB_ClearAllBuffers
    end note
```

---

## 7. Recovery Scenario Decision Flow

```mermaid
flowchart TD
    START[TestStep executes] --> ERR{Unexpected popup?}
    ERR -->|No| NEXT[Continue TestCase]
    ERR -->|Yes| REC{Recovery matched?}

    REC -->|Credit block| R1[Buffer CreditBlock=Yes<br/>Click Continue or abort]
    REC -->|System message| R2[Click green check / Enter]
    REC -->|Incompletion log| R3[Fill mandatory fields]
    REC -->|Unknown modal| R4[Log + Screenshot<br/>Fail or generic handler]

    R1 --> NEXT
    R2 --> NEXT
    R3 --> NEXT
    R4 --> FAIL[TestCase fails]

    NEXT --> DONE{More steps?}
    DONE -->|Yes| START
    DONE -->|No| PASS[TestCase pass]
```

**Priority order:** Specific recoveries first → generic system message last.

---

## 8. CI/CD Pipeline

```mermaid
flowchart LR
    DEV[Developer push] --> GIT[Git main]
    GIT --> PIPE[Jenkins Pipeline]
    PIPE --> IMP[Import workspace subset]
    IMP --> EXEC[Tosca CI execute EL]
    EXEC --> ENG[Engine farm]
    ENG --> RES[Results XML]
    RES --> JUNIT[Publish JUnit]
    RES --> ALM[Sync ALM / Jira]
    RES --> MAIL[Email / Teams alert]
    JUNIT --> GATE{Pass rate OK?}
    GATE -->|Yes| PROMOTE[Allow transport]
    GATE -->|No| BLOCK[Block release]
```

---

## 9. Distributed Execution

```mermaid
flowchart TB
    JEN[Jenkins Master] --> S1[Split EL by module]
    S1 --> E1[Engine VM 1<br/>SAP User AUTO01]
    S1 --> E2[Engine VM 2<br/>SAP User AUTO02]
    S1 --> E3[Engine VM 3<br/>SAP User AUTO03]
    S1 --> E4[Engine VM 4<br/>API-only EL]

    E1 --> R1[Results Part 1]
    E2 --> R2[Results Part 2]
    E3 --> R3[Results Part 3]
    E4 --> R4[Results Part 4]

    R1 --> AGG[Aggregate Dashboard]
    R2 --> AGG
    R3 --> AGG
    R4 --> AGG
```

---

## 10. Test Pyramid for SAP Landscapes

```mermaid
flowchart TB
    subgraph PYRAMID["SAP Test Pyramid"]
        MAN[Manual Exploratory<br/>New features, UX]
        GUI[Tosca GUI E2E<br/>Credit blocks, popups, doc flow UI]
        API[Tosca API Integration<br/>OData setup, assertions, bulk]
        UNIT[ABAP Unit Tests<br/>Developer-owned]
    end

    MAN --- GUI
    GUI --- API
    API --- UNIT

    style MAN fill:#f9f,stroke:#333
    style GUI fill:#bbf,stroke:#333
    style API fill:#bfb,stroke:#333
    style UNIT fill:#ffb,stroke:#333
```

---

## 11. S/4 Migration Automation Phases

```mermaid
gantt
    title S/4 Automation Program Timeline
    dateFormat  YYYY-MM
    section Discover
    Tool POC & framework design    :a1, 2025-01, 2M
    section Prepare
    Component library build        :a2, after a1, 3M
    section Explore
    Parallel ECC + S4 modules      :a3, after a2, 4M
    section Realize
    Risk-based regression          :a4, after a3, 3M
    section Deploy
    Cutover smoke EL               :milestone, after a4, 0M
    Hypercare monitoring           :a5, after a4, 2M
```

---

## 12. Self-Healing Identification Layers

```mermaid
flowchart TD
    STEP[TestStep runs] --> L1{Technical ID match?}
    L1 -->|Yes| OK[Execute action]
    L1 -->|No| L2{Alt properties?}
    L2 -->|Yes| OK
    L2 -->|No| L3{Vision AI match?}
    L3 -->|Yes| OK
    L3 -->|No| L4{Recovery Scenario?}
    L4 -->|Yes| OK
    L4 -->|No| FAIL[Fail + screenshot]

    style L1 fill:#cfc
    style L2 fill:#ffc
    style L3 fill:#ccf
    style L4 fill:#fcc
```

---

## 13. Procure-to-Pay (MM) Automation Flow

```mermaid
flowchart LR
    ME21N[ME21N Create PO] --> BUF1[Buffer PO Number]
    BUF1 --> MIGO[MIGO GR 101]
    MIGO --> BUF2[Buffer Mat Doc]
    BUF2 --> MIRO[MIRO Invoice]
    MIRO --> VERIFY[Verify 3-way match]
    VERIFY --> FBL3N[GR/IR cleared]

    style VERIFY fill:#bfb
```

Cross-reference: [SAP MM guide]({{< relref "/docs/sap-automation" >}}#sap-mm-materials-management).

---

## 14. Data-Driven Test Execution

```mermaid
flowchart TB
    TS[TestSheet 50 rows] --> TC[Single TestCase]
    TC --> I1[Iteration 1: Customer A]
    TC --> I2[Iteration 2: Customer B]
    TC --> I3[Iteration N...]
    I1 --> R1[Pass/Fail row 1]
    I2 --> R2[Pass/Fail row 2]
    I3 --> RN[Pass/Fail row N]
    R1 --> REP[Execution Report]
    R2 --> REP
    RN --> REP
```

---

## Quick Reference — ASCII (Print-Friendly)

### Tosca Object Hierarchy

```
ExecutionList
└── TestCase (business scenario)
    ├── TestStep → Module Attribute → Action
    ├── TestSheet (data rows)
    ├── Recovery Scenario (attached)
    └── TBox Script (logic)
Module
└── Attribute (button, field, table cell, API field)
```

### SAP Scripting Enablement

```
Server (RZ11):  rdisp/gui_auto_accept_server = 1
Client (Logon): Scripting → Enable
Engine VM:      SAP GUI installed + scripting on
Verify:         Scripting console can drive wnd[0]
```

---

> **Practice:** Turn each diagram into a 2-minute whiteboard explanation.  
> **Next:** [Hands-on Exercises]({{< relref "exercises" >}}) · [Printable Checklist]({{< relref "tosca-checklist" >}})
