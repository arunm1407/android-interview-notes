---
title: "Part 8: CI/CD, DevOps & Reporting"
weight: 8
---

# Part 8: CI/CD, DevOps & Reporting

> **Level:** Senior | **Prerequisite:** [Part 7]({{< relref "07-framework-architecture" >}}) | **Next:** [Part 9: Maintenance]({{< relref "09-maintenance-vision-ai" >}})

---

## 8.1 CI/CD Architecture

```
Developer commits → Git (GitHub/Azure DevOps)
        ↓
   Jenkins / Azure Pipeline triggered
        ↓
   Tosca CI pulls subset from Git
        ↓
   Tosca Engine(s) execute ExecutionList
        ↓
   Results → ALM/Jira + Email/Teams + Dashboard
```

---

## 8.2 Tosca CI CLI Essentials

### Common Commands

```bash
# Execute ExecutionList
tosca_ci.cmd ^
  -project "D:\Tosca\Workspace.tws" ^
  -executionList "EL_Smoke_Nightly" ^
  -config "TCFG_QAS" ^
  -results "D:\Results\smoke_%DATE%.xml"

# Export workspace subset to Git
tosca_ci.cmd ^
  -project "D:\Tosca\Workspace.tws" ^
  -export "04_Suites/EL_Smoke_Nightly" ^
  -target ".\git\suites\smoke"

# Import from Git
tosca_ci.cmd ^
  -project "D:\Tosca\Workspace.tws" ^
  -import ".\git\modules\VA01"
```

### Exit Codes for Pipeline

| Exit Code | Meaning | Pipeline Action |
|-----------|---------|-----------------|
| 0 | All passed | Green |
| 1 | Test failures | Red, notify team |
| 2 | Infrastructure error | Red, alert DevOps |
| 3 | License/engine unavailable | Red, ops ticket |

---

## 8.3 Jenkins Pipeline Example

```groovy
pipeline {
    agent { label 'tosca-engine' }
    
    parameters {
        choice(name: 'EXECUTION_LIST', choices: ['EL_Smoke', 'EL_Regression_SD'], description: 'Suite to run')
        choice(name: 'ENV', choices: ['QAS', 'DEV'], description: 'Target environment')
    }
    
    stages {
        stage('Checkout Git') {
            steps {
                git branch: 'main', url: 'https://github.com/arunm1407/tosca-automation.git'
            }
        }
        stage('Import to Workspace') {
            steps {
                bat 'tosca_ci.cmd -project "%WORKSPACE%\\Workspace.tws" -import ".\\git"'
            }
        }
        stage('Execute Tests') {
            steps {
                bat '''
                    tosca_ci.cmd ^
                      -project "%WORKSPACE%\\Workspace.tws" ^
                      -executionList "%EXECUTION_LIST%" ^
                      -config "TCFG_%ENV%" ^
                      -results "%WORKSPACE%\\results\\junit.xml"
                '''
            }
        }
        stage('Publish Results') {
            steps {
                junit 'results/junit.xml'
                archiveArtifacts artifacts: 'results/**/*', fingerprint: true
            }
        }
    }
    post {
        failure {
            emailext subject: "Tosca Failed: ${env.EXECUTION_LIST}",
                     body: "Check ${env.BUILD_URL}",
                     to: 'you@example.com'
        }
    }
}
```

---

## 8.4 Azure DevOps Integration

```
Pipeline YAML → self-hosted agent with Tosca Engine
             → Tosca CI task (or script)
             → Publish Test Results (JUnit format)
             → Link to Azure Test Plans (requirements)
```

### Azure Test Plans Sync

1. Map Tosca Requirements → Azure Test Cases
2. Execution results update test points
3. Traceability matrix in Azure Boards

---

## 8.5 Distributed Execution

### When to Scale Out

| Symptom | Solution |
|---------|----------|
| EL takes > 8 hours | Split EL + parallel engines |
| SAP user lock conflicts | More SAP users + engines |
| Release window too short | N engines × M users |

### Architecture

```
Jenkins Master
    ├── Engine VM 1 → SAP User AUTO01 → EL_SD_Part1
    ├── Engine VM 2 → SAP User AUTO02 → EL_SD_Part2
    ├── Engine VM 3 → SAP User AUTO03 → EL_MM_Part1
    └── Engine VM 4 → API-only EL (no GUI)
```

### Coordination Rules

- No two engines same SAP user
- Separate test data per engine (TestSheet row ranges)
- Central results aggregation
- Shared Git workspace import

---

## 8.6 ALM Integrations

| ALM | Integration |
|-----|-------------|
| **Micro Focus ALM / QC** | Native Tosca connector — requirements, runs, defects |
| **Jira** | Xray or custom webhook — test execution sync |
| **Azure DevOps** | Test Plans + Boards |
| **qTest** | Tricentis ecosystem integration |

### Traceability Report

```
Requirement REQ_SD_001: Create Standard Sales Order
  ├── TC_SD_BP_001 → Last run: PASS (2025-06-20)
  ├── TC_SD_BP_002 → Last run: FAIL (2025-06-20) → Defect SD-4521
  Coverage: 2/2 automated (100%)
```

---

## 8.7 Reporting & Metrics (Senior)

### Operational Metrics

| Metric | Target | Action if Bad |
|--------|--------|---------------|
| Pass rate | > 95% smoke | Block release |
| Flaky rate | < 3% | Quarantine + fix |
| Avg execution time | Trend down | Optimize/API replace |
| Mean time to repair (MTTR) | < 24h for smoke | Prioritize module fix |
| Automation coverage | > 70% regression | Backlog new TCs |

### Stakeholder Dashboard

```
Release 2025.06 — Automation Summary
├── Smoke: 142/145 passed (97.9%)
├── Full regression: 1,204/1,280 passed (94.1%)
├── New failures: 12 (8 module, 4 data)
├── Cycle time: 6.2 hrs (was 14 hrs manual)
└── Defects found: 3 P1, 7 P2
```

---

## 8.8 Engine Infrastructure

### VM Sizing (SAP GUI)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Disk | 100 GB SSD | 200 GB |
| OS | Windows Server 2019+ | Same |
| Resolution | 1920×1080 | Fixed — no scaling |

### Engine Health Checks

```
Daily:
  □ SAP GUI launches
  □ Scripting enabled
  □ Engine service running
  □ License available
  □ Disk space > 20%
  □ Test login succeeds
```

---

## 8.9 Secrets Management

| Secret | Storage |
|--------|---------|
| SAP passwords | Azure Key Vault / Jenkins credentials |
| OAuth client secrets | CI secret store |
| API keys | Never in Git or TestSheets |

Reference in TestConfiguration via CI injection:

```
TestConfiguration SAP_Password = ${SAP_AUTO_PASSWORD}  // from env var
```

---

## 8.10 Release Gate Pattern

```
Transport ready for QAS → PRD
    ↓
Gate 1: EL_Smoke_Mandatory (30 min) — must 100% pass
    ↓
Gate 2: EL_Regression_Module (4 hr) — > 95% pass
    ↓
Gate 3: Manual exploratory (parallel)
    ↓
Approve transport
```

Failed gate → auto-create Jira defect with Tosca execution link + screenshots.

---

## 8.11 Knowledge Check (Senior)

1. What triggers Tosca execution in CI?
2. Why separate engines per SAP user?
3. Name three metrics you'd report to a release manager.
4. Where store SAP automation passwords?
5. What is a release gate ExecutionList?

<details>
<summary>Answers</summary>

1. Git commit/PR merge, scheduled cron, or manual pipeline trigger → Tosca CI CLI.
2. SAP document locks and session conflicts — one user = one session.
3. Pass rate, cycle time vs manual, flaky rate, defects found pre-UAT.
4. CI secret store / Key Vault — injected as env vars, never in Git.
5. Mandatory suite that must pass before transport/promotion (e.g., EL_Smoke_Mandatory).

</details>

---

> **Next:** [Part 9: Maintenance, Vision AI & Self-Healing]({{< relref "09-maintenance-vision-ai" >}})
