---
title: "Exercise 8: CI/CD Pipeline"
weight: 8
---

# Exercise 8: CI/CD Pipeline

> **Level:** Senior | **Time:** 4–6 hours | **Prerequisite:** [Exercise 7]({{< relref "07-framework-refactor" >}}), Git repo access

## Objectives

- Export Tosca subset to Git
- Run ExecutionList via Tosca CI CLI
- Create Jenkins or local script pipeline
- Publish results and configure failure notification

---

## Part A — Git Export

1. Initialize Git repo: `tosca-automation-lab`.
2. Export from Commander or CLI:

```bat
tosca_ci.cmd ^
  -project "D:\Tosca\Workspace.tws" ^
  -export "04_ExecutionLists/EL_Regression_SD_Lab" ^
  -target ".\git\suites\sd-lab"
```

3. Also export dependencies:

```bat
tosca_ci.cmd -export "02_Components" -target ".\git\components"
tosca_ci.cmd -export "01_Modules" -target ".\git\modules"
tosca_ci.cmd -export "05_Infrastructure" -target ".\git\infrastructure"
```

4. Commit and push to GitHub/GitLab.

---

## Part B — CLI Execution

On Engine VM:

```bat
tosca_ci.cmd ^
  -project "D:\Tosca\Workspace.tws" ^
  -import ".\git" ^
  -executionList "EL_Regression_SD_Lab" ^
  -config "TCFG_QAS" ^
  -results "D:\Results\lab_%DATE%.xml"
```

Verify:

- Exit code 0 on pass
- Exit code 1 on intentional failure
- Results XML generated

---

## Part C — Jenkins Pipeline (Minimal)

Create `Jenkinsfile`:

```groovy
pipeline {
    agent { label 'tosca-engine' }
    stages {
        stage('Checkout') {
            steps { git url: 'https://github.com/arunm1407/tosca-automation-lab.git' }
        }
        stage('Import') {
            steps {
                bat 'tosca_ci.cmd -project "%WORKSPACE%\\Workspace.tws" -import ".\\git"'
            }
        }
        stage('Execute') {
            steps {
                bat '''
                  tosca_ci.cmd ^
                    -project "%WORKSPACE%\\Workspace.tws" ^
                    -executionList "EL_Regression_SD_Lab" ^
                    -config "TCFG_QAS" ^
                    -results "%WORKSPACE%\\results\\junit.xml"
                '''
            }
        }
        stage('Publish') {
            steps { junit 'results/junit.xml' }
        }
    }
    post {
        failure {
            echo 'Notify team — Tosca lab pipeline failed'
        }
    }
}
```

**No Jenkins?** Wrap the same commands in a `.bat` or `.sh` script and schedule with cron.

---

## Part D — Release Gate Simulation

1. Define gate rule: `EL_Regression_SD_Lab` must be 100% pass to "approve transport".
2. Introduce intentional failure → pipeline red → fix → green.
3. Document gate in `FRAMEWORK_README.txt`.

See [CI/CD diagram]({{< relref "../diagrams" >}}#8-cicd-pipeline).

---

## Validation Criteria

| # | Criterion | Pass? |
|---|-----------|-------|
| 1 | Git repo contains modules, components, EL | ☐ |
| 2 | CLI execution runs headless without Commander UI | ☐ |
| 3 | Results file published or archived | ☐ |
| 4 | Failure triggers notification (email/log/Teams) | ☐ |
| 5 | SAP passwords not in Git | ☐ |
| 6 | Can explain pipeline in interview (2 min) | ☐ |

---

## Extension Challenges

1. Split EL into two parallel jobs with different SAP users ([distributed diagram]({{< relref "../diagrams" >}}#9-distributed-execution)).
2. Add nightly cron + smoke EL separate from full regression.
3. Sync results to Jira/Xray or ALM if available.

---

## Graduation

If all 8 exercises and checklist phases are complete, you are ready for:

- [Part 10: Staff Architecture]({{< relref "../topics/10-staff-level-architecture" >}})
- [Part 11: Interview Bank]({{< relref "../topics/11-interview-questions" >}}) — mock interview with peer

---

> **Checklist:** [Mark all items complete]({{< relref "../tosca-checklist" >}})
