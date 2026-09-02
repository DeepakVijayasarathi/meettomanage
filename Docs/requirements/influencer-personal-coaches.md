# Requirements: Influencer & Personal-Brand Coaches Segment

**Status:** Draft
**Owner:** TBD
**Related:** Marketing "Solutions" card added in [src/features/marketing/Home.tsx](../../src/features/marketing/Home.tsx) (`SOLUTIONS` array, "Influencers & personal-brand coaches")

## 1. Background

Meet to Manage currently targets **coaching/tutoring institutes and academies** — the product is built around an 8-role portal model (Admin, Relationship Manager, Admission Team, Teacher, Parent, Student, Coordinator, Management) and a sales-assisted onboarding flow (`/get-started`, a "Request a Demo" form).

We've now added marketing copy for a new segment on the homepage: **solo coaches with a personal following** (social media, YouTube, a paid community) who run a **single online master class** to convert their audience into paying clients. This doc defines what — beyond the marketing card — is actually needed to serve that segment.

## 2. Target persona

| | Coaching institute (existing) | Influencer / personal-brand coach (new) |
|---|---|---|
| Team size | Multiple teachers, admin staff, branches | Just the coach — no staff |
| What they sell | Ongoing batches/courses to enrolled students | A master class / cohort that converts attendees into 1:1 or group clients |
| How they get customers | Admissions team runs demos, follow-ups | Their own audience (Instagram, YouTube, community) |
| Buying process | Sales-assisted, custom quote | Wants to sign up and go live same day |
| Reporting needs | Attendance, teacher performance, branch KPIs | Attendees, conversion, revenue from one class |

## 3. Problem statement

The current product has real gaps for this persona, confirmed in code:

1. **Forced "academy" framing.** [GetStarted.tsx](../../src/features/marketing/GetStarted.tsx) requires `academyName` to submit a demo request (`if (!form.fullName.trim() || !form.academyName.trim())`). A solo coach doesn't have an academy name and has to invent one.
2. **No self-serve path.** The only entry point is a sales-assisted demo request — there's no signup or pricing page. That's reasonable friction for an institute-level deal, but too heavy for a single coach who wants to run one class this week.
3. **Portal model is institute-shaped.** [roles.ts](../../src/lib/roles.ts) defines 8 roles (admin, subadmin, admission, teacher, parent, student, coordinator, management). A solo coach needs one identity that can schedule a class, take payment and see who signed up — not eight portals built for org-chart-sized teams.
4. **No public "register for a class" flow.** [Smart Scheduling](../../src/features/marketing/Home.tsx) is built for internal batch/1:1 scheduling by staff, not a shareable public link an audience can self-register through.

## 4. Functional requirements

### 4.1 Onboarding
- Make `academyName` optional on the demo/signup form, or relabel it "Brand or coach name" so it fits a solo identity.
- Offer a self-serve signup path for this segment (no sales call required to run a first class), separate from the institute demo-request flow.

### 4.2 Solo coach account
- A single account type that combines the admin + teacher capabilities a solo coach actually needs, without exposing institute-only roles (coordinator, management, multi-branch admin).

### 4.3 Master-class / public registration flow
- A shareable public link where the coach's audience can register for a specific live session, distinct from the existing internal batch-scheduling flow.
- Registration captures name, email/phone (feeds the existing Admissions CRM pipeline as leads, not enrolled students).

### 4.4 Monetization
- Reuse the existing Razorpay/Cashfree billing rails ([Billing & Payments](../../src/features/marketing/Home.tsx)) for a simple one-time or per-client charge, rather than the institute subscription/invoice model.

### 4.5 Conversion follow-up
- Reuse existing Email/SMS/WhatsApp notifications to follow up with master-class attendees post-session — this is the "convert attendees into paying clients" step the persona is defined by.

### 4.6 Reporting
- A simplified view for one coach: attendees, show-up rate, conversion to paying client, revenue — not the full institute Analytics & Reports dashboard (teacher performance, branch KPIs, etc.).

## 5. Non-functional requirements

- **Time to first class:** a solo coach should be able to sign up and have a bookable class link live same-day, without a sales call.
- **Mobile-first:** individual coaches are more likely to manage bookings/payments from a phone than institute admin staff are.
- **Coach-branded, not academy-branded:** the coach's own name/photo on the registration page, not generic "academy" branding.

## 6. Out of scope (v1)

- Multi-teacher or multi-branch support for this segment.
- Coordinator and Management portals.
- Complex admissions pipeline (this segment needs lead capture from one class, not a full conversion team workflow).

## 7. Success metrics

- Number of solo coaches signed up through the new self-serve path.
- Master-class attendee → paying-client conversion rate.
- Time from signup to first live class.

## 8. Pricing

Two plans, live on [/pricing](../../src/features/marketing/Pricing.tsx) and linked from the homepage nav, priced in ₹ or $ via a currency toggle (USD is a rounded quoted equivalent, not a live FX conversion — see open questions):

| Plan | Model | Rate | Fits |
|---|---|---|---|
| **Pay As You Grow** | Subscription | ₹100 / $1.20 per active student / month (₹1,000 / $12 annual — 2 months free); first 10 students free | Solo/influencer coaches, small tutoring setups, growing academies — usage-based, nothing to commit to upfront |
| **Own Brand, Own Software** | One-time license + AMC | Custom-quoted; billed once + an Annual Maintenance Contract for updates/support | Multi-branch institutes that want their own brand/domain on the platform and no recurring per-student cost |

This resolves the open question below on pricing for the solo-coach segment: they're expected to land on **Pay As You Grow**, since it has no minimum team size or setup cost, unlike the sales-quoted ownership plan aimed at larger institutes. The free-first-10-students threshold specifically targets that segment's impulse-buyer profile — see §9.

**Volume pricing** (Pay As You Grow, steps down automatically, no renegotiation needed):

| Active students | Rate / student / month |
|---|---|
| First 10 | Free |
| 11–200 | ₹100 / $1.20 |
| 201–500 | ₹85 / $1.00 |
| 501+ | ₹70 / $0.85 |

**Add-ons** (billed only to accounts that use them, keeps the headline rate low):
- Extended recording retention, 60 days instead of the standard 15 — ₹499 / $6 per month
- Extra WhatsApp/SMS notification credits, 1,000-pack — ₹299 / $3.50

## 9. Go-to-market / funnel strategy

The marketing surfaces (Solutions card, Pricing page) point at a fast, self-serve experience — but until this section's changes, every path funneled into [GetStarted.tsx](../../src/features/marketing/GetStarted.tsx): badged "For academy owners," requiring an `academyName`, ending in "our team will reach out shortly." Right for an institute (high ACV, worth a sales touch); wrong for a solo coach who wants to run a class this week, not wait on a callback.

**Strategy: fork the funnel by intent, don't just reskin the marketing copy.**

1. **Shipped now** — cheap, no new infrastructure:
   - The Solutions card and the Pricing page's **Pay As You Grow** CTA both link to `/get-started?for=coach`.
   - `GetStarted.tsx` reads that flag and swaps the eyebrow badge, headline, included-list copy and confirmation message to coach-appropriate language (no "branches," no "admissions team").
   - The `academyName` field becomes **optional**, relabeled "Brand or coach name," for the coach variant — an institute visitor still sees it as required. If left blank, the lead is recorded as "Independent coach" rather than forcing a fake academy name.
2. **Next** — the real product gap: a "master class" scheduling type — one shareable public link, self-registration, no batches/teachers/admission-team concepts — built on the existing Smart Scheduling and Live Classroom rather than a new subsystem.
3. **Roadmap bet** — true self-serve signup that creates the account instantly instead of routing through "our team will reach out." At solo-coach scale (₹100/student × ~20–50 clients = ₹2,000–5,000/month), the deal is too small to justify a human sales touch — a multi-day callback cycle will lose exactly the impulse-driven, audience-first buyer this segment represents.

**Validation metric:** not signups off the Solutions card, but **time from click to first live class**. If it's still a multi-day sales cycle, the segment strategy hasn't actually shipped — only the marketing has.

## 10. Open questions

- Does the public registration page need social/Instagram-bio-link integration, or is a plain shareable URL enough for v1?
- Should leads captured through a master-class registration flow into the same Admissions CRM institutes use, or a lighter-weight version of it?
- What's the actual license fee and AMC rate for the ownership plan? The pricing page currently shows "Custom" — needs a real number or a quoting process once decided.
- The ₹100 = $1.20 USD rate on the pricing page is a rounded, manually-set equivalent, not a live FX conversion — needs a real policy (fixed quarterly rate? live conversion? Stripe/Paddle for USD billing alongside Razorpay/Cashfree for ₹?) before it's charged for real.
- None of the free-first-10-students threshold, the volume-tier step-downs, or the add-on charges are enforced anywhere in billing yet ([AdminBilling.tsx](../../src/features/admin/Billing.tsx) handles course fees to parents, not platform-level SaaS billing to the academy/coach) — this is marketing/pricing-page content today, not a working meter.
