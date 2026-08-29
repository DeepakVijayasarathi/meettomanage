import type { ApiBlogPostDetail, ApiBlogPostSummary } from "@/api/marketing";

/**
 * Demo-mode fallback for the public blog — mirrors the shape the real /api/blog
 * endpoints return. Content is markdown-lite: a blank line starts a new paragraph,
 * and a line starting with "## " is a heading (see parseMarkdownLite in BlogPost.tsx).
 */
export const DEMO_BLOG_POSTS: ApiBlogPostDetail[] = [
  {
    title: "5 signs your academy has outgrown spreadsheets",
    slug: "signs-academy-outgrown-spreadsheets",
    excerpt:
      "Spreadsheets and a WhatsApp group get a small academy through its first year. Here's how to tell you've outgrown them.",
    readMinutes: 5,
    publishedAtUtc: "2026-07-14T00:00:00Z",
    content: `Every academy starts the same way: a spreadsheet for fees, a WhatsApp group for parents, and a notebook for who's teaching what. It works — until it doesn't. The signs are usually small at first, and then all at once you're spending more time managing the tools than managing the teaching.

## 1. Fee reminders live in someone's memory, not a system

If the question "did we remind the Sharmas about this month's fee?" can only be answered by asking a specific person, you don't have a billing process — you have a person who hasn't taken a day off in months. Reminders, invoices and fee-suspension need to happen the same way every time, whether or not that person is online.

## 2. A demo booking depends on one person checking their inbox

A prospective family books a demo. It sits in an inbox. Someone eventually notices, assigns a teacher, and hopes the parent still wants it. Every hour that booking sits unassigned is an hour a competing academy might answer first.

## 3. You can't answer "which classes are struggling" without a meeting

By the time attendance problems or disengaged students show up in a status meeting, they've usually been visible in the room for weeks. If finding that out requires asking around rather than looking at a dashboard, you're managing reactively.

## 4. Every new teacher gets onboarded differently

Without a shared system, each teacher learns scheduling, attendance and reporting from whoever trained them — which means everyone does it slightly differently, and nobody's fully sure what "correct" looks like.

## 5. Parents ask questions your team can't answer without digging

"Has my child's fee been paid?" "When's the next class?" "What did the teacher say after the demo?" These should be one-lookup answers. If they require checking three different places, the gap is felt by the people you're trying to keep happiest.

None of this means the spreadsheet era was a mistake — it's just a stage. Meet to Manage exists for the next one: live teaching, scheduling, admissions, billing and reporting in a single role-based system, so the answer to all five questions above is "check the dashboard," not "let me ask around."`,
  },
  {
    title: "What actually happens between a demo booking and an enrolled family",
    slug: "demo-booking-to-enrolled-family",
    excerpt:
      "A demo booking is the start of a pipeline, not a one-off event. Here's every step that has to work for it to end in an enrolled family.",
    readMinutes: 4,
    publishedAtUtc: "2026-07-28T00:00:00Z",
    content: `A "book a free demo" button looks simple from the outside. Behind it is a small pipeline with several places a family can quietly fall through — and most academies never see exactly where it happens, because they're only tracking the two ends: bookings in, enrollments out.

## 1. The booking itself

A parent picks a time. If that time isn't checked against a teacher's real availability, the academy either double-books a slot or has to call back and renegotiate — the first friction point, and an easy one to remove by only ever offering times a teacher can actually take.

## 2. Assigning a teacher

Someone has to match the booking to a teacher who's free, qualified for the subject, and not already overloaded that day. Done manually, this is where bookings sit unassigned the longest — and where an automatic assignment rule removes the single biggest delay in the pipeline.

## 3. Running the demo, and capturing what happened

The demo happens. What the teacher observed — engagement, fit, any concerns — needs to reach whoever follows up with the family, in writing, not as a verbal aside days later.

## 4. The follow-up window

Families who don't hear back within a day or two start looking elsewhere. A conversion pipeline with a visible status (new → contacted → converted → closed) means a stalled follow-up is visible to a manager, not just invisible to everyone until the family is gone.

## 5. Turning "converted" into an actual enrollment

Interest still has to become a package selection, a payment, and a first scheduled class — the handoff from admissions to billing to scheduling, which is exactly where three separate tools tend to lose a family in the cracks between them.

Every one of these steps is a real feature in Meet to Manage's admissions CRM: real-availability booking, automatic teacher assignment, structured demo feedback, and a conversion pipeline that carries a family all the way to enrollment — instead of ending, quietly, at step two.`,
  },
  {
    title: "How automatic fee-suspension turns an awkward conversation into a non-event",
    slug: "automatic-fee-suspension-payment-conversations",
    excerpt:
      "Chasing a late fee is uncomfortable for everyone. Here's why automating the suspension — and the restoration — removes the discomfort entirely.",
    readMinutes: 4,
    publishedAtUtc: "2026-08-11T00:00:00Z",
    content: `Nobody who runs an academy enjoys the fee conversation. It's awkward to chase a payment from a family you have a warm relationship with, and it's awkward to let it slide indefinitely because chasing it feels worse than the lost revenue. Most academies end up doing a bit of both, inconsistently, depending on who's asking.

## The manual version has two failure modes

Chase too hard, too early, and you strain a relationship over what might just be a missed notification. Chase too late or too rarely, and fees quietly go uncollected for months because the person responsible for follow-up has forty other things to do.

## Automation removes the judgment call, on both sides

A subscription with an unpaid invoice past its due date gets an automatic reminder, then — if it's still unpaid — an automatic suspension. Nobody on the team had to decide to be the one who follows up, and nobody had to guess how many days is "enough" before acting.

## The restoration matters as much as the suspension

The moment the parent pays — through either of two supported payment gateways — access is restored automatically, immediately, without anyone on staff needing to notice the payment came in and manually flip the switch back. The family experiences a brief pause, not a punitive process someone has to intervene to end.

The result isn't a harsher policy — it's a consistent one, applied the same way to every family, every time, without anyone on the team having to be the one who enforces it. That's the difference between a fee policy and a fee conversation, and it's exactly what Meet to Manage's billing automation is built to remove.`,
  },
];

export const DEMO_BLOG_SUMMARIES: ApiBlogPostSummary[] = DEMO_BLOG_POSTS.map((p, i) => ({
  id: `demo-${i}`,
  title: p.title,
  slug: p.slug,
  excerpt: p.excerpt,
  readMinutes: p.readMinutes,
  publishedAtUtc: p.publishedAtUtc,
}));

export function getDemoBlogPost(slug: string): ApiBlogPostDetail | undefined {
  return DEMO_BLOG_POSTS.find((p) => p.slug === slug);
}
