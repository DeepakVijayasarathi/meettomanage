import { LegalPage, type LegalSection } from "./LegalPage";

/**
 * Terms of Service between Infinity Uniquers (the operator of Meet to Manage) and the academies,
 * schools and coaches that subscribe to it. DRAFT written for the product as built — it needs a
 * lawyer's review (jurisdiction, liability cap, refund position, registered office) before it is
 * relied on. It is not the parent-facing T&C an academy shows its own families (see /terms, which
 * is The Reader Nest's own text), and it does not replace /policy, the Infinity Client Finder policy.
 */
const SECTIONS: LegalSection[] = [
  {
    h2: "1. Who we are and what this covers",
    blocks: [
      { p: "Meet to Manage is a learning management and virtual classroom platform operated by Infinity Uniquers (“we”, “us”). These terms form the agreement between us and the academy, school, institute, tutor or coach that subscribes to the platform (the “Academy”). They apply to the website, the web portals, the parent mobile app and any related service." },
      { p: "Parents, guardians, students and teachers use the platform through an Academy. Their relationship with the Academy (fees, refunds, class rules) is governed by the Academy's own terms, not these. We are not a party to those terms." },
    ],
  },
  {
    h2: "2. Accounts and access",
    blocks: [
      { p: "The person who signs up on behalf of the Academy must be authorised to bind it. The Academy is responsible for every account it creates, for keeping sign-in details and PINs confidential, and for removing access for people who leave." },
      { p: "Information you give us during sign-up must be accurate and kept up to date. Tell us at once if you suspect unauthorised use of an account." },
    ],
  },
  {
    h2: "3. Plans, fees and taxes",
    blocks: [
      { p: "The Academy chooses a plan and a billing interval (monthly or yearly). Prices and plan limits (such as active students, staff accounts, storage, live-class hours and recording retention) are shown on our pricing page and in the Academy's subscription screen. Prices exclude applicable taxes such as GST, which are added to each invoice." },
      { p: "Subscriptions renew automatically at the end of each billing period until cancelled. We invoice in advance. If a plan limit is reached, we may ask the Academy to move to a higher plan; we will not delete data because a limit was reached." },
      { p: "We may change prices or plan limits for future billing periods. We will give at least 30 days' notice by email or in the admin portal, and a change will not apply to a period that has already been paid." },
      { p: "If a payment is overdue we may send reminders, and after the grace period shown in your subscription screen we may restrict or suspend access until the invoice is paid. Access is restored once payment is received." },
    ],
  },
  {
    h2: "4. Cancellation and refunds",
    blocks: [
      { p: "The Academy can cancel at any time from the admin portal. Cancellation takes effect at the end of the paid period and the Academy keeps access until then." },
      { p: "Fees already paid are not refundable, except where applicable law requires it or where we agree otherwise in writing, for example if we are unable to provide the service for a sustained period." },
      { p: "After cancellation or expiry, the Academy can export its data for 30 days. After that we may delete it in line with our Privacy Policy." },
    ],
  },
  {
    h2: "5. Acceptable use",
    blocks: [
      { p: "The Academy and its users must not:" },
      {
        ul: [
          "Break any law, or upload content that is unlawful, abusive, harassing, hateful or sexually explicit, or that exploits or endangers a child",
          "Use the platform to send spam or unsolicited promotional messages",
          "Attempt to gain unauthorised access to the platform, other Academies' data or our systems, or probe, scan or overload them",
          "Reverse engineer, copy or resell the platform, except where a separate written agreement allows it",
          "Share accounts or let people outside the Academy use staff accounts",
          "Upload malicious code or use the platform to build a competing service",
        ],
      },
      { p: "We may remove content or suspend accounts that break these rules, and will tell the Academy when we do unless the law or an investigation prevents it." },
    ],
  },
  {
    h2: "6. The Academy's responsibilities for students' data",
    blocks: [
      { p: "Academies teach children. Before adding a child or recording a class, the Academy must have the permission it needs: where a student is a minor, that means the consent of a parent or guardian, collected in a form that meets the law that applies to them." },
      { p: "The Academy is responsible for telling parents, students and teachers how their information is used, for the content it uploads, and for the terms it agrees with families, including its own fee and refund rules." },
      { p: "The Academy must tell participants that live classes may be recorded and must use recordings only for teaching, safeguarding and legitimate administrative purposes." },
    ],
  },
  {
    h2: "7. Data and data processing",
    blocks: [
      { p: "The Academy owns the data it and its users put into the platform (“Academy Data”). We act on the Academy's instructions to process it so that the platform works. For most Academy Data, the Academy decides why and how it is used and we process it on its behalf, as described in our Privacy Policy." },
      { p: "We process Academy Data only to provide, secure, support and improve the service, and as the law requires. We do not sell it. We use other companies for hosting, video, payments, messaging and AI features, and we require them to protect the data." },
      { p: "If the Academy needs a written data processing agreement, for example because it serves families in the European Economic Area or the UK, contact us and we will provide one." },
    ],
  },
  {
    h2: "8. Recordings",
    blocks: [
      { p: "Class recordings are kept for the retention period of the Academy's plan and then deleted. The Academy can delete a recording sooner. We are not responsible for recordings that the Academy or its users download and keep elsewhere." },
    ],
  },
  {
    h2: "9. Third-party services",
    blocks: [
      { p: "The platform works with third-party services such as video conferencing, payment gateways and messaging providers. Their own terms apply to their services, and payment, email, SMS and WhatsApp features depend on those providers being available." },
    ],
  },
  {
    h2: "10. AI features",
    blocks: [
      { p: "Some features, such as the Mito study companion, the doubt chatbot and the website assistant, use artificial intelligence to generate replies. Answers can be wrong or incomplete, are not professional, medical or legal advice, and should be checked by a teacher or parent. Children should use these features under adult supervision." },
    ],
  },
  {
    h2: "11. Our intellectual property",
    blocks: [
      { p: "We own the platform, its software, designs and trademarks. We give the Academy a limited, non-exclusive, non-transferable right to use it during the subscription. The Academy keeps its own content and brand, and gives us permission to host and display them as needed to run the service." },
    ],
  },
  {
    h2: "12. Availability and support",
    blocks: [
      { p: "We work to keep the platform available and will announce planned maintenance where we can, but we do not promise uninterrupted service unless a separate written agreement says so. Support is provided through the channels and hours that apply to the Academy's plan." },
    ],
  },
  {
    h2: "13. Disclaimers and limit of liability",
    blocks: [
      { p: "The platform is provided “as is” and “as available”. To the extent the law allows, we do not give any warranty that it will be error-free, secure at all times or fit for a particular purpose." },
      { p: "To the extent the law allows, we are not liable for indirect, incidental or consequential loss, or for loss of profit, enrolment, goodwill or data. Our total liability for any claim relating to the service is limited to the fees the Academy paid us in the 12 months before the event that gave rise to the claim. Nothing in these terms limits liability that cannot be limited by law." },
    ],
  },
  {
    h2: "14. Indemnity",
    blocks: [
      { p: "The Academy will cover us for claims, losses and costs arising from content it uploads, from its breach of these terms, or from its failure to obtain consents it was required to obtain for its students' data." },
    ],
  },
  {
    h2: "15. Suspension and termination",
    blocks: [
      { p: "We may suspend or end an Academy's access if it seriously or repeatedly breaks these terms, if its account is used unlawfully, or if an invoice stays unpaid after the grace period. We will give notice where reasonably possible. Terms that by their nature should continue after termination, such as payment, liability and governing law, will continue." },
    ],
  },
  {
    h2: "16. Changes to these terms",
    blocks: [
      { p: "We may update these terms. For material changes we will notify the Academy's administrator by email or in the admin portal at least 30 days ahead. If the Academy keeps using the service after the effective date, it accepts the updated terms." },
    ],
  },
  {
    h2: "17. Governing law and disputes",
    blocks: [
      { p: "These terms are governed by the laws of India. The Academy and Infinity Uniquers will first try to settle any dispute in good faith. Failing that, the courts at the location of Infinity Uniquers' registered office in India have exclusive jurisdiction, except where the law of the Academy's own country gives it non-waivable rights to bring a claim elsewhere." },
    ],
  },
  {
    h2: "18. Contact",
    blocks: [
      { p: "Infinity Uniquers, email info@infinityuniquers.com, website https://meettomanage.cloud/." },
    ],
  },
];

export default function PlatformTerms() {
  return (
    <LegalPage
      title="Terms of Service"
      description="The terms that apply when an academy, school or coach subscribes to Meet to Manage: plans and billing, cancellation, acceptable use and data."
      path="/legal/terms"
      updated="October 28, 2026"
      intro={[
        "These Terms of Service apply when an academy, school, institute or independent educator (the Academy) uses Meet to Manage. By creating an account, accepting an invitation or using the platform, you confirm that you are authorised to accept them for the Academy.",
        "If you are a parent or student, please read the terms and privacy information that your Academy provides. This page governs the Academy's relationship with us.",
      ]}
      sections={SECTIONS}
    />
  );
}
