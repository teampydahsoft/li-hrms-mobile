# Mobile Role QA Checklist

Use this sheet to validate role behavior in `li-hrms-mobile` for Employee, HOD, and Manager.

## Build / Environment

- [ ] App launches cleanly
- [ ] API base URL points to correct backend
- [ ] Test accounts ready: Employee, HOD, Manager

Notes:
- 

## A) Employee Login Flow

| ID | Test | Expected | Result | Notes |
|---|---|---|---|---|
| E1 | Login with Employee | Lands in tabs without error |  |  |
| E2 | Logout -> Login again | Session transitions are clean |  |  |
| E3 | Leaves tab open | Can see own requests |  |  |
| E4 | Leaves apply buttons | Visible only if write permission granted |  |  |
| E5 | Leave/OD detail actions | Withdraw only for pending/in_progress |  |  |
| E6 | Team inbox controls | Not shown for Employee |  |  |
| E7 | Finance tab open | Own loans/guarantor flows only |  |  |
| E8 | Loan detail actions | No unauthorized approve/reject controls |  |  |

## B) HOD Login Flow

| ID | Test | Expected | Result | Notes |
|---|---|---|---|---|
| H1 | Login with HOD | Lands in tabs without error |  |  |
| H2 | Leaves mode switch | `My requests` and `Team inbox` both available |  |  |
| H3 | Team pending count (Leaves/OD) | Count loads and updates after actions |  |  |
| H4 | Approve from list (Leave/OD) | Action succeeds, row status updates |  |  |
| H5 | Approve from detail (Leave/OD) | Action succeeds, detail refreshes |  |  |
| H6 | Reject from list/detail | Rejection works with proper status update |  |  |
| H7 | Team mode apply button | Disabled in Team mode |  |  |
| H8 | Finance mode switch | `My requests` and `Team inbox` available |  |  |
| H9 | Loan approve/reject list | Actions work for actionable statuses |  |  |
| H10 | Loan approve/reject detail | Works and refreshes correctly |  |  |

## C) Manager Login Flow

| ID | Test | Expected | Result | Notes |
|---|---|---|---|---|
| M1 | Login with Manager | Lands in tabs without error |  |  |
| M2 | Leaves team inbox | Scoped team requests visible |  |  |
| M3 | Leaves actions | Approve/reject works per workflow |  |  |
| M4 | Finance team inbox | Scoped team loan requests visible |  |  |
| M5 | Finance actions | Approve/reject works per workflow |  |  |
| M6 | No cross-scope leakage | Only permitted records are visible |  |  |

## D) Permission / Feature-Control Checks

| ID | Test | Expected | Result | Notes |
|---|---|---|---|---|
| P1 | Role with leaves read-only | Leaves visible, apply disabled |  |  |
| P2 | Role with loans read-only | Finance visible, apply disabled |  |  |
| P3 | No leaves module access | Leaves hidden or access denied panel shown |  |  |
| P4 | No loans module access | Finance hidden or access denied panel shown |  |  |
| P5 | Dev build permission label | Debug label appears and matches role/feature permissions |  |  |

## E) Error Handling / Stability

| ID | Test | Expected | Result | Notes |
|---|---|---|---|---|
| S1 | Network offline during fetch | Friendly alert/no crash |  |  |
| S2 | Token expiry / 401 | Logout + redirect to login |  |  |
| S3 | Rapid tab switching | No UI freeze/crash |  |  |
| S4 | Refresh actions | Pull-to-refresh works in leaves/loans |  |  |

## Sign-off

- Overall status: `PASS / FAIL`
- Blockers:
- Minor issues:
- Ready for release branch: `Yes / No`
