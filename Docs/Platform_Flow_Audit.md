# Reader Nest — Platform Flow Audit & Payment Fix

**Date:** 2026-07-18
**Scope:** Cross-check of `Reader_Nest_LMS (1).pdf` (proposal + WBS) against the live codebase (`reader-nest-backend/`, `the-reader-nest-frontend/`), triggered by two reported bugs:

1. Parents cannot pay via Razorpay from the Parent Portal.
2. Cash payments a parent declares from their portal are never confirmed on the admin/admission/management side, even though Settings → Integrations is where the payment methods are configured.

Both are now root-caused and fixed (code changes summarized in [Fixes applied](#fixes-applied)). The rest of this document is the full flow audit requested: every login's flow checked against the PDF, and a consolidated list of what the PDF/WBS describes that the codebase doesn't implement yet.

> The day-to-day task backlog already lives in `Reader_Nest_Sprint_Plan_and_Task_Backlog_3mo.xlsx` (source of truth per the team's process) — this document does not duplicate it. It instead lists the gaps this audit surfaced that are **not** just "not due yet on the sprint plan": broken wiring, dead code, permission gaps and mock-only screens masquerading as live ones.

---

## 1. The payment bug, root-caused

### 1a. "Parent cannot pay via Razorpay"

The backend's payment routing (`PaymentGatewayDispatcher.ResolveAdapter`) picked a gateway adapter by matching the **department's `PaymentAccount.GatewayProvider`** string against each adapter's key (`"razorpay"`, `"cashfree"`). It ignored which method the parent actually clicked in the Pay Now popup. Two things then combined to break it:

- The seeded `PaymentAccount` rows shipped with `GatewayProvider = "pending-client-decision"` — a placeholder that matches neither adapter.
- Because that match failed, every single payment — regardless of Razorpay being fully configured and enabled in Settings → Integrations — silently fell back to `SimulatedPaymentGateway`, which hands back a fake `SIM-…` link instead of a real Razorpay checkout page. No error was shown; the parent just never reached Razorpay.

This is a two-step, undocumented configuration dependency: an admin could fill in Razorpay's `keyId`/`keySecret`/`webhookSecret` in Settings → Integrations, enable it, and payments would *still* be simulated unless they separately also went to **Admin → Payment Gateway Mapping** and set the department account's provider string to contain `"razorpay"`. Nothing in the UI links those two screens, and it isn't in `docs/ADMIN_GUIDE.md` or `docs/INTEGRATIONS.md` either. It's also untested — `SmokeTests.cs` always constructs accounts with `GatewayProvider = "razorpay"` directly, never the actual seeded default, so the gap was invisible to CI.

**Fix:** the parent's explicit method choice (the `methodKey` sent from the Pay Now popup) now routes gateway selection first; the department account's `GatewayProvider` is only the fallback for callers that don't carry a method (e.g. an admin-generated share link). The seeded defaults were also corrected to `razorpay` (Phonics) / `cashfree` (Maths) so a fresh install routes correctly out of the box once credentials are entered, matching the WBS's "Phonics account + Maths account" dual-gateway requirement.

### 1b. Cash payment confirmation (parent → admission/admin/management)

The flow the PDF describes (parent pays cash at the centre → the team confirms it → invoice/access updates) is mostly built but had two breaks:

- **No confirmation screen existed anywhere.** The parent-side "declare cash" call (`POST /api/parent-portal/invoices/{id}/pay` with `methodKey: "cash"`) correctly wrote a `Pending` `PaymentTransaction`, but no admin/admission/management page ever listed or acted on it. The only staff-facing payment endpoint, `POST /api/invoices/{id}/payments`, existed but was never called from any UI component — dead code. The Admission "Payment Tracking" page (`src/features/admission/Payments.tsx`) was 100% local mock data (`PAYMENT_LINKS` array) with no API calls at all; its only actions were "Copy link" and "Remind," neither of which touches a real invoice.
- **Even a correctly-built confirm screen would have gotten 403s for the Admission Team login.** Permission claims (`perm:Module:Action` JWT claims) are only ever computed for `UserRole.SubAdmin` in `AuthService.LoadPermissionClaimsAsync`; a real `UserRole.AdmissionTeam` login always got an empty claim set. `UserService.SetPermissionsAsync` also explicitly blocks granting module permissions to any role other than SubAdmin. So Admission Team accounts — who the WBS explicitly gives "Payment links and payment status," a "Payment Tracking" menu item, and ownership of the demo-to-enrollment/payment pipeline — could never be granted `BillingFinance` access. Only `Admin` (implicit full access) or a `SubAdmin` explicitly hand-granted `BillingFinance:Edit` could confirm anything.
- **Minor:** had a confirm screen called the existing `RecordPaymentAsync`, it would have inserted a *second*, brand-new `PaymentTransaction` row rather than settling the parent's original `Pending` cash-intent row — leaving a permanently-orphaned Pending transaction sitting next to the real Success one in every transaction list.

**Fix:**
- Added a proper cash-confirmation API: `GET /api/invoices/cash-intents` (list pending), `POST /api/invoices/cash-intents/{id}/confirm` (settles the *same* transaction row, generates the receipt, applies the payment to the invoice, auto-lifts fee suspension on full payment, emails the parent), `POST /api/invoices/cash-intents/{id}/reject`.
- `RecordPaymentAsync` (the existing manual-entry endpoint) now also looks up and settles a matching pending cash-intent instead of always inserting a duplicate row.
- Admission Team logins now get a baseline permission grant at login (`Admission` full, `BillingFinance View/Edit`, `ReportsAnalytics View`) — matching what their portal's own menu already assumes they can do. This does **not** touch the existing rule that admins can't hand-assign module permissions to Admission Team accounts via the Roles UI (that UI is Sub-Admin-only by design); it only fixes the login-time baseline so the role works as the WBS describes it.
- Cash-intent notifications now go to Admin **and** Admission Team (previously Admin only), matching who the WBS says owns payment follow-up.
- Added a real, wired "Pending Cash Confirmations" panel (`src/components/CashConfirmationsPanel.tsx`) to both **Admin → Billing & Finance** and **Admission → Payment Tracking**, so whichever login has the right sees the same live queue and can confirm or reject with one click, optionally overriding the collected amount.

### On "Management" login and cash confirmation

You asked whether Management should also be able to confirm cash. Per the PDF (page 11) and the seeded `"management"` Sub-Admin role preset (`DatabaseInitializer.cs`, `Grant(PermissionModule.ReportsAnalytics, view: true)` only, described as *"Read-only executive dashboards and reports"*), Management is intentionally **view-only** — revenue, conversion, occupancy, KPIs. It's not modeled as a transactional role anywhere in the spec or the existing role design, so it was left out of `BillingFinance` access; giving it edit rights would contradict the platform's own stated design for that role. If the business actually wants Management to confirm cash too, that's a one-line permission grant on the `"management"` role preset (`Grant(PermissionModule.BillingFinance, view: true, edit: true)`), not a structural change — flag it if that's wanted.

---

## 2. Flow-by-flow audit against the PDF

Legend: ✅ works as specified · ⚠️ partially works / has a gap · ❌ not implemented (mock/dead-end only)

### Admin Portal
| PDF flow step | Status | Notes |
|---|---|---|
| Login, user/role management | ✅ | Wired to `/api/auth`, `/api/users`. |
| Course & batch management | ⚠️ | Sprint-tracked "In Progress" per the Excel — Courses/Batches screens exist, wiring is partial. |
| Academic calendar / session scheduling | ✅ | `AcademicCalendar.tsx`, `Sessions.tsx` wired. |
| Billing & Finance (invoices, packages, payment mapping) | ✅ (after fix) | Payment Gateway Mapping and Settings → Integrations now actually connect (§1a). Pending Cash Confirmations panel added (§1b). |
| Reports & CSV export, bulk email | ⚠️ | Present but several report widgets are Sprint-4 "Not Started" per the backlog. |
| Enrollment review/approve/download | ✅ | `Enrollments.tsx` wired. |
| Settings → Integrations (generic key/value credential editor) | ⚠️ | Functionally correct CRUD, but secret fields render as plain `<Input>` (not `type="password"`), so a typed Razorpay key/secret is visible in the DOM/state rather than masked while editing. Worth a follow-up fix — flagged, not changed here to keep this fix scoped to the reported bug. |

### Sub Admin Portal
| PDF flow step | Status | Notes |
|---|---|---|
| Login, module-scoped dashboard | ✅ | |
| Permission management (view/add/edit/delete per module) | ✅ | Backed by `SubAdminPermission`; this is the one role the existing permission UI correctly targets. |
| Settings → Integrations access | ❌ | No Integrations screen exists under `/subadmin/*` at all — a Sub Admin granted `Settings:Edit` has no UI to use it, only the Admin portal route does. Not in scope of the reported bug; noting for completeness. |
| Audit trail | ⚠️ | `AuditLog.tsx` exists; backlog still lists "Audit trail for sub-admin actions" as Not Started for Sprint 2. |

### Admission Team Portal
| PDF flow step | Status | Notes |
|---|---|---|
| Login | ✅ | |
| Demo scheduling, teacher feedback review | ✅ | `DemoScheduling.tsx`, `DemoFeedback.tsx` wired to real APIs. |
| Payment links & payment status (pending/paid/partial) | ❌ → ✅ (partial) | The page was pure mock data end-to-end (§1b). The Pending Cash Confirmations queue is now real and wired; the rest of the page (payment-link table, "Remind," partial-payment tracking) is still mock — flagged as a genuine gap below, not something this fix covers. |
| Conversion pipeline (Demo Completed / Follow-up / Enrolled / Not Interested) | ✅ | `Conversion.tsx` wired to `updateConversionStatus`; note the "Enrolled" column's "payment received" subtitle is descriptive text only, not tied to an actual payment check. |
| Cash confirmation authority | ❌ → ✅ | Fixed (§1b) — was previously impossible for this role (403 on every billing endpoint) regardless of UI. |

### Teacher Portal
| PDF flow step | Status | Notes |
|---|---|---|
| Login, today's/upcoming classes | ✅ | |
| Live class delivery, whiteboard, screen share | ✅ (core) | Jitsi-backed; teacher controls (mute/waiting room) still "In Progress" per backlog. |
| Mandatory demo feedback | ✅ | |
| Leave with 6-hour rule | ✅ | Implemented in `AcademicOpsService`/`LeaveRequest` (backend) — ahead of the Excel, which still lists this Sprint-2 row as "Not Started"; worth a status update there. |
| Gamification tools (quizzes, drag&drop, badges) | ❌ | Not implemented per backlog (Sprint 3–4, Not Started) — matches this audit's own grep of the codebase; no whiteboard-activity or quiz components found beyond scaffolding. |

### Parent Portal
| PDF flow step | Status | Notes |
|---|---|---|
| Login, mandatory first-login child enrollment form | ✅ | |
| Multiple children under one account | ✅ | |
| Dashboard: classes completed/remaining, attendance %, fee status | ⚠️ | Fee status now reflects real invoice/cash-confirmation state (§1b fix); `childName`/`courseName` on invoices are still hardcoded `"—"` placeholders in `api/billing.ts` (`toFrontendInvoice`) pending a lookup endpoint — a real display-quality gap, not a payment-correctness one. |
| Pay Now (gateway + cash) | ❌ → ✅ | Fixed (§1a, §1b). Razorpay now actually receives the checkout when configured; cash intents are now confirmable. |
| Worksheets, recordings (15-day view window) | ⚠️ | Recording view works; the 15-day auto-expiry job is listed Not Started in the backlog — recordings may not currently expire. |
| Fee suspension popup + Pay Now redirect | ✅ | `ParentPortalController.Resources` returns 400 with the Pay Now message while suspended; `ApplyPaymentToInvoiceAsync` auto-lifts suspension on full payment (including cash confirmation, after this fix). |

### Academic Coordinator / Management (Sub Admin presets)
| PDF flow step | Status | Notes |
|---|---|---|
| Coordinator: calendar, reschedule, availability | ⚠️ | Role preset exists (`"coordinator"`); UI (`src/features/coordinator/*`) present, backend calendar-conflict check listed Not Started in backlog. |
| Management: executive KPI dashboards | ✅ | `Dashboard.tsx`/`Revenue.tsx`/`Performance.tsx`/`Reports.tsx` all use `useApiData` (real API when configured), matching the "read-only" design intent (see §1b note above). |

### Student Experience
| PDF flow step | Status | Notes |
|---|---|---|
| Join via parent account, quizzes, whiteboard interaction, rewards | ❌ | Per PDF this rides inside the Parent Portal's live-class view; gamification layer is confirmed Not Started in the backlog and no quiz/reward components were found in `src/features/student/`. |

---

## 3. Missing / broken items found in this audit (beyond normal sprint backlog)

These are defects or scope gaps this audit surfaced by reading the actual code — distinct from "not yet due" backlog rows, which stay tracked in the Excel. **All ten are now fixed** (§5 has the detail on each):

1. **~~Razorpay routing ignored the parent's chosen method~~ — fixed** (§1a).
2. **~~No cash-confirmation UI/permissions~~ — fixed** (§1b).
3. **~~Admission "Payment Links" table was fully mock data~~ — fixed** (§5).
4. **~~`recordPayment()` / `createPaymentLink()` were unused~~ — `createPaymentLink()` now has a real caller** (§5).
5. **~~Invoice `childName`/`courseName` were hardcoded placeholders~~ — fixed** (§5).
6. **`Invoice.Cancelled` status is silently mapped to `"pending"`** on the frontend (`INVOICE_STATUS_FROM_API` in `api/billing.ts`) — a cancelled invoice currently displays as if it's still awaiting payment. **Still open** — wasn't in this round's requested list; needs a `FeeStatusBadge` variant before it can be surfaced properly.
7. **~~Settings → Integrations secret fields weren't masked~~ — fixed** (§5).
8. **~~No Sub Admin Integrations screen~~ — fixed** (§5).
9. **~~Stale doc comment on `Integration.cs`~~ — fixed** (previous round).
10. **~~Refund gateway disbursement was a no-op~~ — fixed** (§5).

Everything else the PDF/WBS describes that isn't built yet (gamification, 15-day recording expiry job, white-label branding/domain, CRM/calendar-sync integrations, teacher payout engine, AI reports, full regression/UAT) is already correctly tracked as "Not Started"/future-sprint work in `Reader_Nest_Sprint_Plan_and_Task_Backlog_3mo.xlsx` and isn't duplicated here.

---

## 4. Fixes applied

**Backend** (`reader-nest-backend/`):
- `iucs.readernest.application/Common/Interfaces/IPaymentGateway.cs` — `CreatePaymentLinkAsync` takes an optional `preferredMethodKey`.
- `iucs.readernest.api/Services/Payments/PaymentGatewayDispatcher.cs` — resolves the gateway adapter by the payer's method choice first, falling back to the account's `GatewayProvider`.
- `iucs.readernest.api/Services/SimulatedPaymentGateway.cs` — signature updated to match; logs the requested method too.
- `iucs.readernest.application/Services/BillingService.cs` — `InitiateParentPaymentAsync` passes the parent's `methodKey` through; `RecordPaymentAsync` settles an existing pending cash intent instead of duplicating it; added `ListPendingCashIntentsAsync` / `ConfirmCashIntentAsync` / `RejectCashIntentAsync`; cash-intent notifications now reach Admission Team too (`NotifyBillingStaffAsync`).
- `iucs.readernest.application/Services/IBillingService.cs`, `iucs.readernest.application/Dto/Billing/ParentPaymentDtos.cs` — new cash-intent contract (`CashIntentDto`, `ConfirmCashIntentRequest`, `RejectCashIntentRequest`).
- `iucs.readernest.api/Controllers/InvoicesController.cs` — `GET/POST /api/invoices/cash-intents*` endpoints, gated by the existing `BillingFinance` permission.
- `iucs.readernest.application/Services/AuthService.cs` — Admission Team logins get a baseline permission claim set (`Admission` full, `BillingFinance` view/edit, `ReportsAnalytics` view) at login. *(Superseded in the next round — see §5: this became a live lookup against the "admission" system role instead of a hardcoded list.)*
- `iucs.readernest.api/Data/DatabaseInitializer.cs` — seeded `PaymentAccount.GatewayProvider` corrected to `razorpay`/`cashfree` (was the non-matching placeholder `"pending-client-decision"`).
- `iucs.readernest.domain/Entities/Integrations/Integration.cs` — corrected stale doc comment.
- `iucs.readernest.tests/TestFixture.cs` — `FakePaymentGateway` updated to the new interface signature.
- Verified: `dotnet build` clean, `dotnet test` → **37/37 passing**.

**Frontend** (`the-reader-nest-frontend/`):
- `src/api/billing.ts` — added `Cash` to `ApiPaymentMethod`; added `listCashIntents`/`confirmCashIntent`/`rejectCashIntent` clients.
- `src/components/CashConfirmationsPanel.tsx` — new shared panel (list, confirm with optional amount override, reject).
- `src/features/admin/Billing.tsx`, `src/features/admission/Payments.tsx` — panel wired in under a "Pending Cash Confirmations" section.
- Verified: `tsc -b` clean, `vite build` succeeds.

No database migration was needed — the fix is entirely in routing/authorization/service logic and reuses the existing `PaymentTransaction`/`Integration`/`PaymentAccount` tables.

---

## 5. Round 2 — Approve-gated cash confirmation, menu-driven permissions for every login, and the five remaining pending items

**Date:** 2026-07-18 (same day, follow-up pass)

### 5a. Cash confirmation now requires Approve specifically, not just Edit

Previously the Confirm/Reject buttons only checked `BillingFinance:Edit`. Per your request, they now require `BillingFinance:Approve` — a login with only View/Edit sees the pending-cash queue read-only, with a lock icon and a note to ask their Admin for Approve access; the Confirm/Reject buttons themselves don't render at all without it.

- Backend: `InvoicesController.ConfirmCashIntent`/`RejectCashIntent` now gated by `[HasPermission(BillingFinance, Approve)]` (was `Edit`).
- Frontend: built the permission-check plumbing that didn't exist before — `LoginResponse.permissions` was fetched at login but discarded everywhere. `SessionProvider` (`src/state/session.tsx`) now stores it, refreshes it from `GET /api/auth/me` on load (so a permission change while a tab is open doesn't leave a stale cached grant), and exposes `hasPermission(module, action)`. `CashConfirmationsPanel` uses it to conditionally render the Confirm/Reject controls.

### 5b. Roles & Permissions now covers every real menu, for every login type — not just a 7-module Sub Admin subset

Two structural gaps made "menu-driven, works for every login" impossible before:

1. **The "Relationship Managers" tab only showed 7 of the 11 backend modules** via a hand-picked `MODULE_TO_API` map that even collapsed Courses+Batches into one row — `Payouts`, `Admission`, `LeaveManagement`, `Communication` and `Settings` were never editable there (the separate "Role Presets" tab did cover all 11, inconsistently).
2. **Teacher, Parent and Admission Team logins never resolved permissions from an editable place at all.** Admin is implicit (fine). But Teacher and Parent always got an empty claim set (hardcoded in `AuthService`), and Admission Team's grant was a hardcoded C# list — none of the three read from the "teacher"/"parent"/"admission" `RoleDefinition` rows that were already seeded and already shown (unused) on the Role Presets tab.

**Fix:**
- `AuthService.LoadPermissionClaimsAsync` now resolves every non-SubAdmin, non-Admin role (Teacher, Parent, Admission Team) by looking up its matching system `RoleDefinition`'s `RolePermission` rows at login — the same table the Role Presets tab already edits. Editing the "teacher" role's matrix now changes what every Teacher account can do, immediately, the same way it already worked for Coordinator/Management (which are Sub Admin presets under the hood). The old hardcoded Admission Team baseline is gone.
- `DatabaseInitializer`: the "admission" role gained `BillingFinance: View, Edit, Approve` (needed for cash confirmation + the new Approve gate); "teacher" gained `Payouts: View`; "parent" gained `SessionCalendarManagement`, `ContentAccessManagement`, `BillingFinance`, `Communication: View`. An additive-only backfill (`BackfillSystemRolePermissionsAsync`) applies these to already-seeded databases without touching any grant an admin has since hand-edited.
- Every seeded menu item (48 across 8 portals) now carries a `RequiredModule` gate mapped to whichever module actually governs it (e.g. Admission's "Payment Tracking" → `BillingFinance`), applied via the same additive-only backfill pattern (`BackfillMenuRequiredModulesAsync`) so existing databases pick it up too. Menus genuinely core to a portal (dashboards, Parent's "Add Child") stay ungated by design.
- `the-reader-nest-frontend/src/features/admin/Permissions.tsx` — both tabs rewritten around a new shared `PermissionMatrix` component (`src/components/PermissionMatrix.tsx`) that always shows all 11 modules and, under each module name, the actual menu labels across every portal that depend on it (fetched via a new `groupMenusByModule()` helper in `src/api/menus.ts`) — so granting/revoking a module now visibly tells you which real screens it affects.
- `src/features/subadmin/Permissions.tsx` ("My Permissions") was previously 100% static mock data with no relation to the signed-in user at all. It now renders the real, live permission set from session state (all 11 modules, same menu captions) whenever the API is connected; the original mock view is kept only as the demo-mode fallback.

### 5c. Sub Admin Integrations page

A Sub Admin granted `Settings` access had no page to use it on — Integrations was Admin-portal-only. Added `src/features/subadmin/Integrations.tsx`, reusing the Admin portal's `IntegrationsManager` directly (now exported) rather than duplicating it, gated the same way as everything else (`hasPermission("Settings", "View")`). Backend: new seeded/backfilled menu item `/subadmin/integrations`, gated on the `Settings` module.

### 5d. Integration secret fields masked while typing

`src/features/admin/Settings.tsx`'s `IntegrationsManager` config editor now renders any field whose name contains "secret", "key", "token" or "password" (matching the backend's own `IsSecretField` heuristic) as a `type="password"` input with a show/hide toggle, instead of plain text. Values were already masked on read; they weren't while being typed in.

### 5e. Invoice child/course names resolved for real

`InvoiceDto` gained `ChildName`/`CourseName`, populated via `Invoice.Child` and `Invoice.Subscription.PackagePlan.Course` (with the necessary `.Include()`s added to every query that returns an invoice: `ListInvoicesAsync`, `ParentPortalService.GetInvoicesAsync`, `GetParentInvoiceAsync`). The frontend's `toFrontendInvoice()` no longer hardcodes `"—"` — it uses the resolved names, falling back to `"—"` only when an invoice genuinely has no child/course linked.

### 5f. Admission "Payment Tracking" table wired to real invoices

`src/features/admission/Payments.tsx` no longer runs entirely on the mock `PAYMENT_LINKS` array. It now loads real invoices (`listInvoices()`) in API mode, with a demo-mode fallback derived from the same mock data for parity when no backend is configured. The fake "Remind" button (which only mutated local state — no email/SMS was ever sent) was removed rather than kept as a decorative no-op; "Copy link" became "Generate & copy payment link", which now calls the previously-dead `POST /api/invoices/{id}/payment-link` endpoint for real and copies the resulting live gateway URL.

### 5g. Refund gateway disbursement is now a real API call

`ReviewRefundAsync` used to mark an approved refund `Processed` without ever contacting Razorpay/Cashfree. `IPaymentGateway`/`IGatewayAdapter` gained a `RefundAsync` method; `RazorpayGateway` calls the real Refunds API (`POST /v1/payments/{id}/refund`), `CashfreeGateway` calls its order-refund endpoint (documented in-code as needing verification against Cashfree's current API once real production credentials exist, since our data model only ever captures a settled transaction id, not a separate order id). Cash-paid transactions still skip the gateway call entirely (nothing to refund through a gateway). The resulting gateway refund id is stored on a new `Refund.GatewayRefundId` column (migration `AddRefundGatewayRefundId` generated and included).

### Verification

- Backend: `dotnet build` clean, `dotnet test` → **37/37 passing**, EF migration generated cleanly against the real model.
- Frontend: `tsc --noEmit` clean, `vite build` succeeds.

### Still open (not part of this round's requested list)

- `Invoice.Cancelled` still displays as `"pending"` on the frontend (item 6 in §3) — needs a `FeeStatusBadge` variant, not just a data fix.
- Whether **Management** should also get `BillingFinance:Approve` for cash confirmation is a policy call, not a bug — see the note at the end of §1b. Currently it stays read-only per the PDF's own description of that role.
