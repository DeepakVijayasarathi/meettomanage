# Meet to Manage: Product Knowledge Base

Everything about the product in one file: what it is, who it's for, every portal and feature, how the main flows work, plans and pricing, the mobile app, the technology and the known limits. Use it for sales calls, demos, onboarding new team members, support answers and writing marketing content.

- **Website:** https://meettomanage.cloud/
- **Book a walkthrough:** https://meettomanage.cloud/get-started
- **Product docs page:** https://meettomanage.cloud/docs
- **Last updated:** 11 Nov 2026
- **Companion file:** [SOCIAL_MEDIA_PLAYBOOK.md](SOCIAL_MEDIA_PLAYBOOK.md) covers marketing and content.

> **Rule for anyone using this file in public content:** only claim what is listed here as live. Items under [Known limits](#16-known-limits-and-roadmap) are not built yet. Never invent customers, numbers or quotes.

---

## Contents

1. [The product in one minute](#1-the-product-in-one-minute)
2. [Who it is for](#2-who-it-is-for)
3. [The problem we solve and how we position it](#3-the-problem-we-solve-and-how-we-position-it)
4. [Plans and pricing](#4-plans-and-pricing)
5. [Roles and portals](#5-roles-and-portals)
6. [End-to-end flows](#6-end-to-end-flows)
7. [Live classroom](#7-live-classroom)
8. [Admissions and demo pipeline](#8-admissions-and-demo-pipeline)
9. [Scheduling, attendance and leave](#9-scheduling-attendance-and-leave)
10. [Fees, billing and payouts](#10-fees-billing-and-payouts)
11. [Learning tools, gamification and Mito AI](#11-learning-tools-gamification-and-mito-ai)
12. [Communication, reports and analytics](#12-communication-reports-and-analytics)
13. [Parent mobile app](#13-parent-mobile-app)
14. [Multi-academy (SaaS), white label and integrations](#14-multi-academy-saas-white-label-and-integrations)
15. [Technology, security and data](#15-technology-security-and-data)
16. [Known limits and roadmap](#16-known-limits-and-roadmap)
17. [Sales FAQ and objection handling](#17-sales-faq-and-objection-handling)
18. [Demo script (30 minutes)](#18-demo-script-30-minutes)
19. [Glossary](#19-glossary)
20. [Source file map](#20-source-file-map)

---

## 1. The product in one minute

**Meet to Manage** is one platform for online coaching centres, academies, schools and coaches. It replaces the usual mix of a meeting app, spreadsheets, a payment link tool, WhatsApp groups and a separate CRM.

In one system an academy can:

- run **live classes** in its own branded classroom, with whiteboard, quizzes, recordings and attendance captured automatically
- take a family from **enquiry → free demo → feedback → enrolment → payment**
- plan **batches, sessions and teacher availability** with clash detection
- send **invoices automatically**, collect fees online (Razorpay / Cashfree) or in cash, and **pause class access for overdue fees**
- calculate **teacher payouts** from classes taught, with management approval
- give parents a **web portal and mobile app** for schedule, join, recordings, payments and support
- give each team member a **portal built for their job** (11 roles), with permissions the admin controls
- see **dashboards, reports and AI summaries** of the business

**One-line pitch:** *Running a coaching centre should not mean juggling five different tools.*

---

## 2. Who it is for

| Segment | Typical size | Why they buy |
|---|---|---|
| Online coaching centres / tuition academies (core) | 20–500 students, 3–50 staff | Live classes + fees + admissions in one place |
| Phonics, maths, language and skill academies for children | 20–300 students | Parent portal, demo-to-enrolment pipeline, gamified classes |
| Multi-branch / multi-department institutes | 300+ students | Departments with separate payment accounts, role-based team, white label |
| Personal coaches and influencer educators (new segment) | Solo to small team | Personal meeting room, payments, branded experience. See `Docs/requirements/influencer-personal-coaches.md` |
| Institutes wanting their own software | Any | "Own Brand, Own Software" licence on their domain and hosting |

**Buyer:** owner / founder / director. **Daily users:** admin, admission team, teachers, coordinators, parents and students.

**Markets:** India first (INR pricing, Razorpay/Cashfree, GST), with USD pricing for other countries and other currencies (for example AED) on request.

---

## 3. The problem we solve and how we position it

**Before Meet to Manage** an academy usually runs on:

- Zoom / Google Meet links pasted into WhatsApp
- an attendance register or spreadsheet
- manual fee reminders and payment-link screenshots
- enquiries in a notebook or a separate CRM
- teacher pay worked out by hand at month end

**What changes:** one login per person, one source of truth, and automation for the repetitive work (invoices, reminders, attendance, fee suspension, payouts, batch schedules).

### Key differentiators

1. **Built-in live classroom, not a meeting link.** Whiteboard, slides with annotation, live quizzes, stars and leaderboard, raise hand, lobby, recordings, guest links. Classes run in the browser.
2. **Attendance without a register.** It is recorded when the student joins the class.
3. **Fees that collect themselves.** Automatic invoices, reminders, online or cash payment, part payments, refunds, and automatic class pause for overdue fees, lifted on full payment.
4. **Admissions in the same system.** Demo booking, teacher assignment, mandatory teacher feedback and a conversion board.
5. **A portal for every role.** 11 roles with permission control per module.
6. **Your brand.** Logo, colours, name and (on higher plans) your own domain. No vendor branding in the classroom.
7. **Free plan forever** for small academies, and a 14-day trial with every module unlocked.

### Competitive positioning

- **vs Classplus and similar app builders:** we include a real live classroom, admissions CRM, teacher payouts and role portals in the same product (see `/classplus-alternative` page).
- **vs Zoom/Meet + spreadsheets:** one system instead of five; attendance, fees and recordings link to each student automatically.
- **vs generic LMS:** built for live, scheduled, fee-paying batches, not self-paced courses.

### Proof we can use

- Published case studies: **The Reader Nest** (`/customers/the-reader-nest`) and **Alphabet** (`/customers/alphabet`).
- Customers page: `/customers`.

---

## 4. Plans and pricing

> Prices below are the defaults shipped in the product (pricing page fallback and plan seed). The live prices are managed in **Platform console → Plans** and shown at `/pricing`. Check there before quoting. All prices exclude GST (18%).

| | **Free** | **Starter** | **Growth** (most popular) | **Enterprise** | **Own Brand, Own Software** |
|---|---|---|---|---|---|
| Price (India) | ₹0 forever | ₹2,999 / month or ₹29,990 / year | ₹7,999 / month or ₹79,990 / year | Contact sales | Custom quote: one-time licence + annual maintenance |
| Students | 20 | 100 | 500 | Unlimited | Unlimited |
| Staff accounts | 3 | 15 | 50 | Unlimited | Unlimited |
| Storage | 1 GB | 20 GB | 200 GB | Unlimited | Your hosting |
| Live class minutes / month | 1,200 | 6,000 | 30,000 | Unlimited | Your hosting |
| Class recordings | No | Yes, kept 16 days | Yes, kept 30 days | Yes | Yes |
| Online fee collection (Razorpay / Cashfree) | No | Yes | Yes | Yes | Yes |
| Academy branding (white label) | No | Yes | Yes | Yes | Yes |
| WhatsApp notifications | No | No | Yes | Yes | Yes |
| API access | No | No | Yes | Yes | Yes |
| Custom domain | No | No | No | Yes | Yes |

**Free plan modules:** users, courses and batches, live classes and calendar, content and resources, parent communication, settings, support tickets.
**Paid-only modules:** fees and finance, teacher payouts, reports and analytics, admissions, leave and class logs.

**Free trial:** 14 days, every module unlocked, no card needed. After the trial the academy drops to Free unless it upgrades. (Trial limits: 25 students, 5 staff, 2 GB, 600 class minutes.)

**Billing rules (for the academy's own subscription):**

- Pay yearly to save (about 2 months free).
- Renewal invoice is sent 7 days before the period ends. If unpaid, there are 7 days of grace, then the workspace is suspended until payment.
- Upgrade any time (charged the difference for the unused period). Downgrades apply at the next renewal and only if current usage fits the smaller plan.
- Student and staff limits are enforced. Storage and class-minute limits are soft: the academy is warned at 80% and 100%.
- Change or cancel from **Admin → My Subscription**.

**How to start:** `/signup` → pick Free or the trial → choose the academy's web address, admin e-mail and a 4-digit PIN → sign in and add students and batches. ("Your academy is ready in 2 minutes.")

---

## 5. Roles and portals

Everyone signs in at **/login** with e-mail (or mobile) and a **PIN**. One sign-in page serves every academy: the system finds the right academy from the e-mail. People with access to more than one portal choose one on the portal-select page.

| Role | Portal | What they do |
|---|---|---|
| **Admin** | `/admin` | Full control: academics, people, content, finance, reports, settings |
| **IT Admin** | `/itadmin` | Same breadth as admin plus technical views (server monitoring, class session logs) |
| **Founder / Executive** | `/executive` | Business dashboard plus every admin permission |
| **Management** | `/management` | Read-only executive view: revenue, performance, reports, payout approvals |
| **Relationship Manager** (sub-admin) | `/subadmin` | Only the modules the admin grants: parent tickets, calendar, reports, integrations, audit log |
| **Admission Team** | `/admission` | Demo scheduling, teacher assignment, feedback, conversion board, leads, payment tracking |
| **Academic Coordinator** | `/coordinator` | Calendar, teacher availability, sessions, recordings |
| **Teacher** | `/teacher` | Classes, students, attendance, homework, recordings, demo feedback, doubts, leave, payout |
| **Parent** | `/parent` + mobile app | Children, schedule, join class, recordings, payments, support, Mito |
| **Student** | `/student` | Child-friendly learning screen, stars, games, Mito |
| **Marketing** (platform owner) | `/marketing` | Website demo requests, chats, cold email, blog, visitors, SEO, tracking tags |
| **Platform owner** | `/platform` | All client academies, plans, subscriptions, revenue, menus, parent app |

### Permissions

- 15 permission modules: User Management, Courses & Batches, Sessions & Calendar, Content, Billing & Finance, Payouts, Reports & Analytics, Admission, Leave, Communication, Settings, System Monitoring, Marketing, Class Session Logs, Support Tickets.
- Each module has View / Create / Edit / Delete / Approve.
- Admins grant these from **Roles & Permissions** (a matrix that shows which screens each module controls). Sidebars only show what a person is allowed to see.
- Editing a role preset (for example "teacher") changes every account with that role straight away.
- Cash confirmation needs **Billing & Finance: Approve** specifically.
- **View as:** authorised staff can open exactly what another user sees, for support.
- **Audit log:** who changed what and when.

### Portal menus (as built)

**Admin:** Dashboard · Courses · Departments · Batches · Academic Calendar · Sessions · Recordings · Quiz Bank · Homework & Tests · Certificates · Activity Bank · Learning Games & Activities · Users · Search Users · Roles & Permissions · Enrollment Review · Store Inquiries · Parent Feedback · Parent Tickets · Leave Management · Staff Leave · Teacher Availability · Content & Resources · Billing & Finance · Packages & Subscriptions · Payment Gateway Mapping · Teacher Payouts · Payout Approvals · Fee Suspension · My Subscription · Reports & Analytics · AI Insights · Mito Insights · Bulk Email (+ History) · Email Templates · Progress Reports · Doubt Chatbot · Settings & Branding · Server Monitoring

**Teacher:** Dashboard · My Classes · My Students · Attendance & Records · Homework & Tests · Mito Review · Recordings · Demo Feedback · Student Doubts · Learning Games & Activities · Leave Management · My Payout · Resources (+ personal meeting room)

**Parent:** Dashboard (multi-child switcher) · Schedule & Live Class · Homework & Tests · Certificates · Resources · Recordings · Student View · Mito AI Companion · Payments & Billing · Notifications & Reports · Help & Support · Add Child

**Admission Team:** Dashboard · Demo Scheduling · Teacher Assignment · Demo Feedback · Conversion Board · Academic Calendar · Sessions · My Leave · Leads & Parents · Search Users · Payment Tracking · Reports · Parent Feedback

**Coordinator:** Dashboard · Academic Calendar · Teacher Availability · Sessions · My Leave · Recordings

**Management:** Executive Overview · Revenue & Courses · Teacher & Batch Performance · Academic Calendar · Sessions · My Leave · Recordings · Payout Approvals · Reports

**Relationship Manager:** Dashboard · My Permissions · Integrations · Academic Calendar · Sessions · My Leave · Search Users · Parent Tickets · Assigned Reports · Audit Log · Content & Resources (+ a menu item for each module granted)

---

## 6. End-to-end flows

### 6a. The whole academy journey

```
Enquiry ──► Free demo booked ──► Teacher assigned ──► Demo class
   │                                                     │
   │                                     Teacher submits feedback (mandatory)
   ▼                                                     ▼
Conversion board: Demo Completed → Follow-up → Enrolled / Not Interested
                                                         │
                                         Payment link / invoice → paid
                                                         ▼
           Parent account → enrolment form → child approved → added to batch
                                                         ▼
     Batch schedule generated → live classes → attendance → recordings
                                                         ▼
   Auto invoices & reminders → overdue = class paused → paid = access back
                                                         ▼
     Teacher payout from classes taught → management approval → statement
```

### 6b. Admission funnel (status by status)

1. **Demo booked** by the admission team or the parent (once). Extra parents can be invited to the same demo. Status: *Demo Scheduled*.
2. **Teacher assigned** by availability, or left blank to auto-assign the least-loaded teacher.
3. **Demo delivered** in the live classroom. Attendance is captured on join.
4. **Feedback gate:** the teacher must submit feedback (level, strengths, areas to improve, recommended course, suggested batch type). Status: *Demo Completed*.
5. **Follow-up:** the admission team reviews feedback and shares a payment link. Status: *Follow-up In Progress*.
6. **Conversion:** on payment the parent account is created (credentials e-mailed), the parent fills the mandatory enrolment form, the admin approves, the child joins a batch. Status: *Enrolled* (or *Not Interested*).

### 6c. Teacher's daily loop

1. See today's and upcoming classes on the dashboard.
2. **Start Class** with one click (no meeting links to manage).
3. Teach with whiteboard, slides, quizzes and stars. Attendance is automatic.
4. Complete the session with an optional summary. Payout earnings build up.
5. When all sessions of a course are done, the batch moves to **Dormant** automatically.

### 6d. Fee lifecycle

1. Fee package attached to the batch → **invoices generated automatically** (hourly billing job for recurring plans).
2. **Reminder e-mails** before and after the due date.
3. Parent clicks **Pay Now** → chooses Razorpay, Cashfree or cash → pays in full or in parts.
4. Cash → team confirms in **Pending Cash Confirmations** → receipt issued and e-mailed.
5. **Overdue → parent account suspended** for classes and content (Pay Now pop-up shown).
6. **Full payment → access restored automatically**, or manually from **Fee Suspension**.
7. Refund requests reviewed by staff; approved refunds go back through the gateway.

---

## 7. Live classroom

Runs in the browser for teachers, students, parents and staff observers. No separate video tool.

| Feature | What it does |
|---|---|
| Video and audio | Tiles for everyone, mic/camera toggles, pinned speaker |
| Lobby | People wait and the teacher admits them; waiting count shown |
| Raise hand | Students raise or lower a hand |
| Screen share | Share a screen or window (desktop) |
| Presentation viewer | Upload slides and annotate on top |
| Whiteboard | Shared whiteboard with drawing tools, switch from video |
| Whiteboard activities | Interactive activities from the Activity Bank |
| Live quiz | Launch Quiz Bank questions, watch answers come in |
| Stars and leaderboard | Points and stars with a leaderboard panel |
| Celebrate | Confetti and sound for a win |
| Chat | Class chat panel |
| Participants panel | See who is present; mute, remove, admit |
| Recording | Start/stop from the toolbar; a server-side recorder captures the room without relying on the teacher's browser |
| Picture-in-picture | Keep the class visible while using other pages |
| Light/dark call theme | Toggle |
| Blocked-class screens | Clear message when a class can't be joined (fees overdue, not started yet) |
| Staff live view | Coordinators and managers can observe a class |
| Guest join | Invite someone with a guest link, no account needed |
| Network banner | Shows when the connection drops |
| Session logs | Every join, leave and recording event logged for support |
| Personal meeting room | Each teacher has a permanent room for 1:1 or ad-hoc meetings, with guest links and recordings |

**Security:** rooms are private. Only people with a token issued by the system can join; teachers and admins get moderator rights, parents and students do not.

**Recordings:** parents can watch for **15 days** (plan retention: Starter 16 days, Growth 30). Expired recordings disappear from parent lists automatically.

**Class length:** 30, 45 or 60 minute classes are standard; there is no platform cap on meeting length.

---

## 8. Admissions and demo pipeline

- **Free demo booking** on the academy's site (`/demo`), or an embeddable button/iframe for any website.
- **Store / course catalogue** where families can enquire about courses (leads show under **Store Inquiries**).
- **Demo Scheduling:** see bookings, set date, time and teacher.
- **Teacher Assignment:** pick by availability; auto-assign to the least-loaded teacher.
- **Demo Feedback:** teacher feedback is mandatory before the demo is closed.
- **Conversion Board:** kanban from demo to enrolled.
- **Leads & Parents:** contact details, notes, history.
- **Payment Tracking:** generate and copy live payment links, see status, confirm cash.
- **Enrollment Review:** parent's mandatory first-login enrolment form → admin approves → child record created and dashboard unlocked. Downloadable for records.
- **CRM webhook:** every new lead and status change can be pushed to Zoho, HubSpot, Salesforce etc.

---

## 9. Scheduling, attendance and leave

- **Courses** grouped under **Departments** (for example Phonics, Maths), with duration (30/45/60 min), price and total sessions.
- **Batches:** course, teacher, capacity, payment plan. **Generate Schedule** from start date, weekdays and time: every session is placed automatically, **skipping holidays**.
- **Academic Calendar:** colour-coded view of sessions, holidays and events.
- **Conflict detection:** a teacher cannot be double-booked; clashes shown in the schedule-conflicts panel.
- **Reschedule / cancel / no-show** with notices to the people affected. A no-show moves the class forward one week and applies the payout rule.
- **Schedule preference:** families state preferred days and times.
- **Parent cancellation** within the allowed window.
- **Calendar sync:** an iCalendar feed per teacher or batch that Google Calendar and Outlook can subscribe to.
- **Automatic attendance** from class joins, with manual correction; parents see attendance %.
- **Teacher availability** feeds scheduling and demo assignment.
- **Leave:** teachers and staff apply; **leave is blocked within 6 hours of a scheduled class**; approval updates availability and the calendar.

---

## 10. Fees, billing and payouts

**For families**

- Fee **packages**: subscription, per-session or one-time.
- **Automatic invoices** from the batch payment plan.
- **Pay Now** with the academy's enabled methods: **Razorpay**, **Cashfree** or **cash**.
- **Separate payment accounts per department** (for example Phonics money to one account, Maths to another).
- **Part payments** with balance tracking.
- **Payment links** (`/pay/:token`) so a family can pay admission fees without signing in.
- **Receipts** generated automatically; printable invoice and receipt views.
- **Discount codes / promo codes.**
- **Refund requests** reviewed by staff; approved refunds are sent back through Razorpay/Cashfree.
- **Automatic reminders** before and after due dates.
- **Automatic fee suspension** for overdue invoices; restored on full payment.
- **Monthly numbers:** collections, dues and refunds by month.

**For teachers and staff**

- **Teacher payouts** calculated from sessions taught at configured rates, including no-show rules (student no-show = waiting amount to teacher; teacher no-show = deduction).
- **Payout approvals** by management, with a dashboard banner when approvals are waiting.
- **Monthly statements** e-mailed when the admin finalises the month.
- **Staff payroll** and "My Salary" views.

---

## 11. Learning tools, gamification and Mito AI

- **Content & Resources:** folders and files shared with batches or people; rich-text notes; floating notes while working.
- **Homework & Tests:** assign, submit and review.
- **Quiz Bank** and **Activity Bank:** reusable questions and whiteboard activities.
- **Learning Games & Activities:** a catalogue in 10 categories: Teaching & Child Development, Language & Communication, Maths & Brain Development, Art & Creative Skills, Computer & Technology, Personal Development, Performing Arts, Vocational Skills, Academic & Language Skills, Professional Trainer Training.
- **Gamification:** stars, points, leaderboard, celebrations.
- **Certificates:** issued to students, with a public **verify certificate** page.
- **Progress reports:** created by staff and sent to parents.
- **Doubt Chatbot:** answers common student and parent questions; teachers see **Student Doubts**.

### Mito, the AI learning companion

- A friendly AI helper for children and parents, inside the parent portal, student view and app.
- Knows the child's name, level and progress, and helps with **today's classes and homework**.
- **Practice quizzes** drawn from the academy's own Quiz Bank, with instant feedback.
- **Progress** summary for the child.
- Families can **flag a wrong or unhelpful answer**; teachers review it in **Mito Review**.
- Admins see usage in **Mito Insights**. Usage is rate-limited.

### AI Insights

Plain-language summaries and suggestions drawn from the academy's data, for the admin.

---

## 12. Communication, reports and analytics

**Communication**

- In-app **notifications** for every role.
- **Bulk e-mail** to all active parents or a batch, with send history.
- **Editable e-mail templates** (reminders, receipts, welcome messages).
- **Support tickets** with threaded replies.
- **Parent feedback** prompts after classes (rate class and teacher).
- **WhatsApp notifications** on the Growth plan and above.
- Website **chat** for visitors.

**Reports & dashboards**

| KPI | Meaning |
|---|---|
| Total / active students | Children with an active batch enrolment |
| Revenue, course-wise revenue | Successful payments, by period and department |
| Enrolments | New batch enrolments per period |
| Conversion rate | Enrolled ÷ demos completed |
| Renewal rate | Re-enrolments after batch completion |
| Refund rate | Refunds ÷ revenue |
| Teacher utilisation | Hours taught ÷ hours available (leave-adjusted) |
| Attendance rate | Present ÷ expected |
| Batch occupancy | Enrolled ÷ capacity |
| Active vs dormant batches | Batch status split |

- **CSV exports:** attendance, revenue, payouts, conversion.
- **Management views:** Revenue & Courses, Teacher & Batch Performance, Management Reports.
- **Data tools everywhere:** filters, sorting, paging, bulk import from spreadsheet, export.

---

## 13. Parent mobile app

- Android and iOS app for **parents and students** (Expo / React Native).
- Families sign in with e-mail or mobile and PIN. The app finds their academy automatically.
- Features: schedule, **one-tap join** of live classes, attendance and progress, recordings and resources, enrolment, support, fee payment (opens the web portal), Mito.
- The academy controls from the admin side, with no app update needed: announcement banner, support e-mail/phone, web portal address, branding.
- The platform owner can turn app access on or off per academy and edit/publish each academy's app from **Platform → Parent app**.

---

## 14. Multi-academy (SaaS), white label and integrations

**One workspace per academy**

- Each academy gets its **own database**: its own users, courses, batches, payment accounts, menus and branding. Data is never shared between academies.
- One sign-in page for all academies; e-mail decides which academy you land in.
- Platform owner console (`/platform`): create academies, shape menus, configure branding and integrations, plans, subscriptions & invoices, revenue (MRR, churn, collections), auto-reminders, operations, audit log, parent app editor.

**White label**

- Academy name, logo, colours and fonts on login, portals, e-mails and the classroom.
- No vendor watermark in the live classroom.
- Custom domain on Enterprise / Own Brand.

**Integrations**

| Integration | What it does |
|---|---|
| Razorpay, Cashfree | Online fee collection, payment links, refunds |
| Self-hosted video (Jitsi-based) | Live classroom, private rooms, recording |
| Website embed | Demo-booking iframe or button for any website |
| CRM webhook | Push `lead.created` and `lead.status-changed` to any CRM |
| Calendar feed (.ics) | Google Calendar / Outlook subscription per teacher or batch |
| E-mail (SMTP) | All system e-mails from the academy's identity |
| File storage | S3-compatible object storage or local server storage, switchable by the admin |
| WhatsApp | Notifications (Growth+) |
| Analytics / ad tags | Added from Marketing → Tracking tags |

**Languages and accessibility:** English plus 22 language files (Hindi, Tamil, Telugu, Bengali, Urdu, Spanish, French, German, Portuguese, Italian, Dutch, Polish, Russian, Turkish, Chinese, Japanese, Korean, Thai, Vietnamese, Indonesian, Malay, Swahili), Arabic on the pricing page, light and dark themes, keyboard navigation and screen-reader labels.

---

## 15. Technology, security and data

| Layer | Technology |
|---|---|
| Web app | React + TypeScript + Vite + Tailwind |
| API | .NET 9 (C#) |
| Database | PostgreSQL 17, one database per academy plus a master directory |
| Live video | Self-hosted Jitsi stack with token-secured rooms; server-side recording |
| Files | S3-compatible object storage (or local) |
| Mobile | Expo / React Native |
| Deploy | Docker, Jenkins CI/CD |

**Security points for buyers**

- Sign-in with e-mail/mobile + PIN. PINs stored only as secure hashes (BCrypt), with lockout.
- Every request is tied to one academy; it can't reach another academy's data.
- Role- and permission-based access on every screen and API call; audit log of admin actions.
- Classroom rooms require a system-issued token; only teachers/admins are moderators.
- Payment gateway secrets are masked; webhooks are signature-checked.
- Recordings expire automatically (15-day parent window), which also keeps storage cost low.
- If billing checks are unavailable, teaching is never stopped (fail-open for limits).
- Hosted in the cloud by us, or on the client's own infrastructure with the Own Brand licence.

---

## 16. Known limits and roadmap

Do **not** promise these as live today:

- Self-signup has no e-mail verification or CAPTCHA yet (rate-limited; one trial per e-mail).
- Platform subscription reminders are **e-mail only** (no SMS/WhatsApp for those yet).
- No auto-debit mandates for subscriptions; it is invoice per cycle.
- GST is a single rate; no CGST/SGST/IGST split by state yet.
- No coupons/add-ons/usage overage for the academy's own SaaS subscription.
- The mobile app receives the academy's branding but still shows its built-in orange theme.
- A cancelled invoice currently shows as "pending" in the parent view.
- Deeper student analytics (talk-time, attention signals, engagement score) are planned, not live.
- Management is read-only by design; it can't confirm cash unless the admin grants it.

---

## 17. Sales FAQ and objection handling

**"We already use Zoom/Google Meet."**
Keep teaching the same way, but the class, attendance, recording and fee status now live on the student's record automatically. No more pasting links into WhatsApp.

**"Is it hard to set up?"**
Free account in about 2 minutes. Add courses and batches, generate the schedule, invite teachers and parents. We also offer a free 30-minute walkthrough.

**"What does it cost?"**
Free forever for up to 20 students. Starter ₹2,999/month (100 students), Growth ₹7,999/month (500 students), yearly saves about 2 months. Plus GST. Enterprise and own-brand on quote.

**"Can parents pay online?"**
Yes, through Razorpay or Cashfree on paid plans, with part payments, payment links, receipts and refunds. Cash can be declared and confirmed by staff.

**"What happens when fees are late?"**
Reminders go out automatically. If still overdue, class access pauses and the parent sees a Pay Now prompt; it reopens as soon as the full amount is paid.

**"Will our families see your brand?"**
No. Your name, logo and colours on paid plans; your own domain on Enterprise/Own Brand.

**"Is there an app?"**
Yes, an Android/iOS app for parents and students: schedule, one-tap join, recordings, payments, support.

**"Is our data safe and separate?"**
Each academy has its own database. Access is role-based with an audit log, PINs are hashed and classroom rooms are private.

**"We have several departments / branches."**
Departments can each have their own payment account; roles and permissions let you split work across teams. Multi-branch institutes can take the Own Brand licence.

**"Do you support languages other than English?"**
Yes, the portals ship with 22+ language files plus light/dark themes.

---

## 18. Demo script (30 minutes)

1. **(3 min) Problem:** ask what tools they use today and where it hurts (fees? attendance? demos?).
2. **(5 min) Admissions:** book a demo → assign teacher → teacher feedback → conversion board → payment link.
3. **(7 min) Live class:** start a class as teacher → whiteboard, slide annotation, live quiz, stars and leaderboard → show attendance captured.
4. **(5 min) Fees:** auto invoice → Pay Now (Razorpay) → cash confirmation → fee suspension and auto-restore.
5. **(4 min) Parent view:** dashboard, multi-child switcher, recordings, Mito, mobile app.
6. **(3 min) Owner view:** dashboard KPIs, reports, teacher payouts and approvals.
7. **(3 min) Close:** plan fit by student count → start Free or the 14-day trial today.

Demo accounts: the login page has role tabs that fill in a demo account for each role.

---

## 19. Glossary

| Term | Meaning |
|---|---|
| Academy / tenant / workspace | One client business with its own data and branding |
| Department | A subject area (Phonics, Maths) that can have its own payment account |
| Batch | A group of students taking one course with one teacher on a schedule |
| Session | One scheduled class of a batch |
| Demo | A free trial class for a prospective family |
| Conversion board | Kanban of leads from demo to enrolled |
| Cash intent | A parent's declaration that they paid cash, waiting for staff confirmation |
| Fee suspension | Automatic pause of class/content access for overdue fees |
| Dormant batch | A batch whose course sessions are all complete |
| Relationship Manager | Sub-admin with only the permissions granted to them |
| Mito | The AI learning companion for children and parents |
| Platform console | The owner's console that runs every academy |
| Own Brand, Own Software | One-time licence to run the platform under your own name and hosting |

---

## 20. Source file map

| Topic | Where it lives |
|---|---|
| Public product docs (feature list) | `meettomanage/src/features/marketing/docsContent.ts` |
| Pricing page and fallback plans | `meettomanage/src/features/marketing/Pricing.tsx` |
| Plan seed (limits, prices) | `meettomanagebackend/iucs.meettomanage.api/Saas/SaasSeeder.cs` |
| Portal menus | `meettomanage/src/lib/nav.ts` |
| Admin user guide | `meettomanagebackend/docs/ADMIN_GUIDE.md` |
| Workflows | `meettomanagebackend/docs/WORKFLOWS.md` |
| SaaS billing | `meettomanagebackend/docs/SAAS_BILLING.md` |
| Multi-tenancy | `meettomanagebackend/docs/MULTI_TENANCY.md` |
| Integrations | `meettomanagebackend/docs/INTEGRATIONS.md` |
| Parent app | `meettomanagebackend/docs/PARENT_APP.md`, `meettomanage-student/README.md` |
| Live classroom architecture | `meettomanagebackend/docs/JITSI_ARCHITECTURE.md`, `LONG_DURATION_SESSIONS.md` |
| KPIs | `meettomanagebackend/docs/ANALYTICS_KPIS.md` |
| White label | `meettomanagebackend/docs/WHITE_LABEL_BRANDING.md` |
| Payment flow audit | `meettomanage/Docs/Platform_Flow_Audit.md` |
| Influencer coach segment | `meettomanage/Docs/requirements/influencer-personal-coaches.md` |
| Marketing playbook | `meettomanage/marketing/SOCIAL_MEDIA_PLAYBOOK.md` |
