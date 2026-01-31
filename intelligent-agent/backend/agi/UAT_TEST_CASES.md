# ✅ UAT Test Cases

حالات اختبار قبول المستخدم

**Document Type**: UAT Test Suite  
**Version**: 1.0.0  
**Created**: January 30, 2026  
**Owner**: Product Manager + QA Lead

---

## 🎯 Purpose

Provide a structured set of user acceptance tests to validate business workflows
and stakeholder expectations.

---

## 📌 UAT Scope

```
- Beneficiary Management
- Program Recommendations
- AI Analysis Workflow
- Reports & Exports
- Administration & Access Control
```

---

## 📋 UAT Test Cases

### A) Authentication & Access

| ID     | Test Case                      | Steps                          | Expected Result | Status |
| ------ | ------------------------------ | ------------------------------ | --------------- | ------ |
| UAT-01 | Login with valid credentials   | Login as standard user         | Access granted  | [ ]    |
| UAT-02 | Login with invalid credentials | Login with wrong password      | Error shown     | [ ]    |
| UAT-03 | Role-based access enforcement  | Access admin page as non-admin | Access denied   | [ ]    |
| UAT-04 | Session timeout                | Stay idle 30 min               | Auto logout     | [ ]    |

---

### B) Beneficiary Management

| ID     | Test Case          | Steps               | Expected Result  | Status |
| ------ | ------------------ | ------------------- | ---------------- | ------ |
| UAT-05 | Create beneficiary | Add new beneficiary | Record created   | [ ]    |
| UAT-06 | Edit beneficiary   | Update details      | Changes saved    | [ ]    |
| UAT-07 | Delete beneficiary | Remove record       | Record removed   | [ ]    |
| UAT-08 | Search beneficiary | Search by name/ID   | Results filtered | [ ]    |
| UAT-09 | Pagination works   | Navigate pages      | Correct results  | [ ]    |

---

### C) AI Analysis Workflow

| ID     | Test Case               | Steps                           | Expected Result         | Status |
| ------ | ----------------------- | ------------------------------- | ----------------------- | ------ |
| UAT-10 | Run AI analysis         | Submit beneficiary for analysis | Analysis completes      | [ ]    |
| UAT-11 | Analysis accuracy       | Compare output to expected      | >95% match              | [ ]    |
| UAT-12 | Analysis history        | View history list               | Previous analyses shown | [ ]    |
| UAT-13 | Analysis error handling | Submit invalid data             | Clear error message     | [ ]    |

---

### D) Program Recommendations

| ID     | Test Case              | Steps                   | Expected Result    | Status |
| ------ | ---------------------- | ----------------------- | ------------------ | ------ |
| UAT-14 | Generate program list  | Request recommendations | List returned      | [ ]    |
| UAT-15 | Filter recommendations | Apply filters           | Results refined    | [ ]    |
| UAT-16 | Save recommendation    | Save selected plan      | Saved successfully | [ ]    |
| UAT-17 | Edit recommendation    | Modify plan             | Changes saved      | [ ]    |

---

### E) Reports & Exports

| ID     | Test Case             | Steps                          | Expected Result    | Status |
| ------ | --------------------- | ------------------------------ | ------------------ | ------ |
| UAT-18 | Generate PDF report   | Select beneficiary -> generate | PDF created        | [ ]    |
| UAT-19 | Generate Excel export | Export dataset                 | Excel file created | [ ]    |
| UAT-20 | Report accuracy       | Validate report data           | Accurate output    | [ ]    |
| UAT-21 | Download history      | View past reports              | History shown      | [ ]    |

---

### F) Administration & Configuration

| ID     | Test Case    | Steps                | Expected Result       | Status |
| ------ | ------------ | -------------------- | --------------------- | ------ |
| UAT-22 | Create user  | Add new user         | User created          | [ ]    |
| UAT-23 | Disable user | Disable account      | User cannot login     | [ ]    |
| UAT-24 | Update role  | Change role          | Permissions updated   | [ ]    |
| UAT-25 | Audit log    | Perform admin action | Logged in audit trail | [ ]    |

---

### G) Performance & Usability

| ID     | Test Case              | Steps               | Expected Result | Status |
| ------ | ---------------------- | ------------------- | --------------- | ------ |
| UAT-26 | UI response time       | Open main pages     | < 2 seconds     | [ ]    |
| UAT-27 | Mobile view            | Open on tablet      | Layout correct  | [ ]    |
| UAT-28 | Error message clarity  | Trigger error       | Clear guidance  | [ ]    |
| UAT-29 | Navigation consistency | Navigate system     | No broken links | [ ]    |
| UAT-30 | Accessibility check    | Keyboard navigation | Usable          | [ ]    |

---

## ✅ UAT Sign-off

**Stakeholder Name**: ********\_\_\_\_********  
**Role**: ********\_\_\_\_********  
**Signature**: ********\_\_\_\_********  
**Date**: ********\_\_\_\_********

---

## 🔗 References

- PHASE_4_WEEK3_PROCEDURES.md
- TESTING_METRICS_DASHBOARD.md
- TEAM_ROLES_IMPLEMENTATION_GUIDE.md
