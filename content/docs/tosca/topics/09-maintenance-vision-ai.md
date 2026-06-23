---
title: "Part 9: Maintenance, Vision AI & Self-Healing"
weight: 9
---

# Part 9: Maintenance, Vision AI & Self-Healing

> **Level:** Senior | **Prerequisite:** [Part 8]({{< relref "08-cicd-devops-reporting" >}}) | **Next:** [Part 10: Staff Architecture]({{< relref "10-staff-level-architecture" >}})

---

## 9.1 Why Tests Break

| Cause | Frequency | Fix Effort |
|-------|-----------|------------|
| SAP UI field moved/resized | High | Re-scan attribute |
| Table column order changed | High | Update steering |
| New mandatory popup | Medium | New Recovery |
| Test data exhausted/invalid | Medium | Refresh TestSheet/TDMS |
| SAP note/upgrade | Medium | Impact analysis + re-scan |
| Engine/infra issue | Low | DevOps |
| Flaky timing | Medium | WaitUntil, not sleep |

---

## 9.2 Maintenance Workflow

```
1. Execution fails
2. Triage: data vs module vs infra vs real defect
3. If module: re-scan → verify in isolation → commit to Git
4. If data: update TestSheet / TDS regenerate
5. If real defect: log SAP defect, mark test as expected fail
6. Regression: re-run EL subset before full suite
```

### Triage Decision Tree

```
Failure
├── Login failed? → Infra / password / SAP down
├── Object not found? → Module / Vision AI
├── Verify failed (wrong value)? → Data or real SAP bug
├── Timeout? → Performance / wait strategy
└── Intermittent? → Flaky — quarantine + investigate
```

---

## 9.3 SAP Upgrade Impact Analysis

### Pre-Upgrade

```
1. Export list of all Modules by T-code
2. Map to SAP simplification list / release notes
3. Identify deprecated T-codes → plan API replacement
4. Baseline ExecutionList results on old version
5. Freeze new TestCase development
```

### Post-Upgrade

```
Week 1: Re-scan all affected Modules (priority: smoke EL)
Week 2: Fix Recovery Scenarios for new popups
Week 3: Full regression compare to baseline
Week 4: Sign-off automation health report
```

### S/4 Conversion Specifics

| Area | Action |
|------|--------|
| BP instead of customer | Update TestSheets + master data setup |
| MATDOC | Update API validation queries |
| Fiori rollout | New Web Modules, reduce GUI scope |
| Deprecated T-codes | Replace with API or new T-code Modules |

---

## 9.4 Tosca Vision AI

### What Vision AI Does

Uses **optical/AI recognition** to find controls when technical ID changes:

- Button by label text
- Field by adjacent label
- Table cell by content

### When to Enable

| Scenario | Vision AI |
|----------|-----------|
| Fiori dynamic IDs | ✅ Enable |
| Stable SAP GUI IDs | ⚠️ Optional |
| API tests | ❌ N/A |
| Highly stable ECC screens | ❌ Technical ID sufficient |

### Configuration Tips

```
- Set confidence threshold (e.g., 85%)
- Combine Vision + technical ID fallback
- Review Vision AI logs for false matches
- Re-train after major theme/UI changes
```

### Vision AI Limitations

- Similar-looking buttons (Save vs Save As)
- Language change (EN → DE labels)
- Resolution/scaling differences between dev and CI
- Performance overhead vs pure scripting

---

## 9.5 Self-Healing Strategy

```
Layer 1: Technical ID (fastest, most precise)
    ↓ fail
Layer 2: Alternative technical properties (name, class)
    ↓ fail
Layer 3: Vision AI (label, image)
    ↓ fail
Layer 4: Recovery Scenario (popup unexpected)
    ↓ fail
Alert + quarantine test
```

---

## 9.6 Flaky Test Management

### Quarantine Process

```
1. Test fails 2/5 runs without code change → mark FLAKY
2. Move from EL_Smoke to EL_Quarantine
3. Create ticket: fix root cause within sprint
4. Do not block release on quarantined tests (with PM approval)
```

### Common Flaky Fixes

| Root Cause | Fix |
|------------|-----|
| Fixed delay too short | WaitUntil on status bar |
| Race on table edit | WaitOn row editable |
| Shared test data collision | Unique refs per run |
| Parallel EL same user | Separate users |
| SAP modal unhandled | Recovery Scenario |

---

## 9.7 Module Versioning

```
M_SAP_VA01_Header_v2023.2.1    ← current
M_SAP_VA01_Header_v2022.1.0    ← archived, reference only
```

After re-scan:

1. Clone module with version suffix OR Git tag
2. Update TestCases to point to new module
3. Run smoke EL
4. Delete old module after full regression pass

---

## 9.8 Impact Analysis Tools

### Tosca Analytics

- Which TestCases use Module X?
- Failure trend per Module
- Highest maintenance cost modules

### Manual Impact Query

Before changing Module `M_SAP_VA01_Header`:

```
Search workspace: all TestCases referencing M_SAP_VA01_Header
Run affected TestCases subset
Estimate: 47 TestCases impacted
```

---

## 9.9 Technical Debt Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Maintenance ratio | Hours fixing / hours new automation | < 40% |
| Module reuse | TestCases / Modules | > 5:1 |
| Duplicate modules | Count same T-code duplicates | 0 |
| Orphan modules | Modules with 0 references | Delete quarterly |
| Avg re-scan time | Minutes per module | Track trend |

---

## 9.10 Knowledge Check (Senior)

1. First step when nightly EL fails 15 tests after SAP patch?
2. When enable Vision AI vs rely on technical ID?
3. What is quarantine policy for flaky tests?
4. How track which TestCases use a Module?
5. What maintenance ratio target for healthy framework?

<details>
<summary>Answers</summary>

1. Triage smoke subset — re-scan affected Modules per simplification list; don't fix all 15 blindly.
2. **Vision AI** for dynamic web/Fiori; **technical ID** for stable SAP GUI.
3. Move to EL_Quarantine after 2/5 intermittent fails; fix within sprint; don't block release without approval.
4. Tosca Analytics or workspace search for Module references.
5. **< 40%** maintenance vs new development time.

</details>

---

> **Next:** [Part 10: Staff-Level Architecture & Strategy]({{< relref "10-staff-level-architecture" >}})
