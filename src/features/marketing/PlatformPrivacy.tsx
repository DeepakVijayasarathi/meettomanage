import { LegalPage, type LegalSection } from "./LegalPage";

/**
 * Privacy Policy for the Meet to Manage learning platform (academies, teachers, parents and
 * students). DRAFT written for the product as built — it needs a lawyer's review, and the
 * operator must confirm each factual commitment (no sale of data, no training on student data,
 * card details handled only by the payment gateway, biometric data staying on the device, the
 * retention periods) before relying on it. /policy is a different document: it covers the
 * Infinity Client Finder tool and is the URL used for Meta's app review, so it is left as is.
 */
const SECTIONS: LegalSection[] = [
  {
    h2: "1. Who is responsible for your information",
    blocks: [
      { p: "Meet to Manage is operated by Infinity Uniquers (“we”, “us”). The platform is used by academies, schools and independent educators (each an “Academy”). For information about an Academy's students, parents and staff, the Academy decides why and how it is used and we process it on the Academy's behalf. For our own website, sign-up, billing and support, we decide, and we are responsible for that information ourselves." },
      { p: "If you are a parent, student or teacher, your Academy is your first contact for questions about your child's records. We will help the Academy respond." },
    ],
  },
  {
    h2: "2. Information we process",
    blocks: [
      {
        ul: [
          "Account details: names, email addresses, phone numbers, role, time zone and sign-in PINs",
          "Student and family details: child's name, age or grade, course and batch, parent or guardian contact details, and details the Academy chooses to record",
          "Learning records: class schedules, attendance, progress reports, feedback, quiz and activity results and certificates",
          "Class content: live audio and video, whiteboard content, chat messages and, where the Academy turns them on, recordings",
          "Billing information: invoices, amounts, payment status and gateway references. Card and bank details are entered with the payment gateway and are not stored by us",
          "Messages and support: tickets, enquiries, demo bookings and conversations with our assistants",
          "AI features: the questions typed or spoken to the Mito study companion, the doubt chatbot or the website assistant",
          "Device and usage data: app version, device type, IP address, log and error data, and security events",
        ],
      },
    ],
  },
  {
    h2: "3. How we use it",
    blocks: [
      {
        ul: [
          "To run classes, schedules, attendance, reports, fee collection and notifications for the Academy",
          "To provide the parent mobile app and the other portals",
          "To create and secure accounts, prevent fraud and abuse, and keep the platform reliable",
          "To bill Academies for their subscription and answer support requests",
          "To produce AI replies when someone uses an AI feature",
          "To improve the platform using aggregated or de-identified usage information",
          "To meet legal obligations",
        ],
      },
      { p: "We do not sell personal information and we do not use children's information for advertising." },
    ],
  },
  {
    h2: "4. Children",
    blocks: [
      { p: "Most students on the platform are children. Their information is added by the Academy or by their parent or guardian, and the Academy is responsible for obtaining the consent of a parent or guardian that the law requires before a child's information is collected or a class is recorded." },
      { p: "We do not show advertising to children, do not build profiles of children for marketing, and do not track or monitor children's behaviour except as needed to deliver the learning service (for example attendance, progress and safety)." },
      { p: "A parent or guardian can ask the Academy, or us, to access, correct or delete their child's information." },
    ],
  },
  {
    h2: "5. Lawful grounds",
    blocks: [
      { p: "Where data-protection law requires a lawful ground, we rely on: the performance of our contract with the Academy; the consent of the parent, guardian or individual where consent is needed; our legitimate interests in securing and improving the service, balanced against your rights; and compliance with legal obligations." },
    ],
  },
  {
    h2: "6. Who we share it with",
    blocks: [
      { p: "Information is visible to the people the Academy gives access to, according to their role: for example a teacher sees their own batches, and a parent sees only their own children." },
      { p: "We use service providers that process information for us, under written terms, for:" },
      {
        ul: [
          "Cloud hosting and storage",
          "Live video (the classroom uses Jitsi)",
          "Payment collection (Razorpay and Cashfree)",
          "Email, SMS and WhatsApp messages",
          "AI language models that generate assistant replies",
          "Error monitoring and basic analytics",
        ],
      },
      { p: "We may also disclose information when the law requires it, to protect safety or rights, or as part of a merger or sale of the business, in which case the new owner must honour this policy." },
    ],
  },
  {
    h2: "7. International transfers",
    blocks: [
      { p: "Our providers may process information in countries other than where you live. Where the law requires it, we use safeguards such as contractual protections so that your information is handled to a comparable standard." },
    ],
  },
  {
    h2: "8. How long we keep it",
    blocks: [
      {
        ul: [
          "Academy and student records are kept while the Academy's subscription is active, and the Academy can delete them",
          "Class recordings are deleted at the end of the retention period of the Academy's plan",
          "After a subscription ends, the Academy can export its data for 30 days, after which we may delete it",
          "Billing and tax records are kept for as long as the law requires",
          "Security and error logs are kept for a limited period",
        ],
      },
    ],
  },
  {
    h2: "9. Security",
    blocks: [
      { p: "We use technical and organisational measures that include role-based access control, encrypted connections, activity logging and, in the parent mobile app, an optional biometric lock. Biometric checks are done by your phone's operating system and your fingerprint or face data does not leave your device. No online service can be completely secure, so please keep your PIN private and tell us if you suspect misuse." },
    ],
  },
  {
    h2: "10. Your rights",
    blocks: [
      { p: "Depending on where you live (for example India's Digital Personal Data Protection Act, 2023, or the GDPR in Europe and the UK), you may have the right to:" },
      {
        ul: [
          "Know what information we hold about you or your child and get a copy",
          "Correct inaccurate information",
          "Ask for deletion, or restrict or object to certain processing",
          "Withdraw consent you gave, without affecting what happened before",
          "Receive your information in a portable form",
          "Nominate someone to exercise your rights, and make a complaint to the data-protection authority where you live",
        ],
      },
      { p: "To use these rights, contact your Academy or write to us at the address below. We may need to verify your identity, and will answer within the time the law allows." },
    ],
  },
  {
    h2: "11. Cookies and similar technologies",
    blocks: [
      { p: "Our website and portals use cookies and similar storage to keep you signed in, remember your language and theme, keep the platform secure and understand how it is used. You can control cookies in your browser, but some features may stop working if you block them." },
    ],
  },
  {
    h2: "12. Other policies",
    blocks: [
      { p: "Our Terms of Service explain the contract with an Academy. Infinity Client Finder, another product from Infinity Uniquers, has its own policy at https://meettomanage.cloud/policy. An Academy may also publish its own terms and privacy notice for its families." },
    ],
  },
  {
    h2: "13. Changes to this policy",
    blocks: [
      { p: "We may update this policy as the platform or the law changes. We will change the “Last updated” date and, for material changes, notify Academy administrators." },
    ],
  },
  {
    h2: "14. Contact and grievances",
    blocks: [
      { p: "For privacy questions, requests or complaints, contact Infinity Uniquers at info@infinityuniquers.com. Please say which Academy you are connected with and include enough detail for us to find the record." },
    ],
  },
];

export default function PlatformPrivacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="How Meet to Manage collects, uses, shares and protects information about academies, teachers, parents and students."
      path="/privacy"
      updated="October 28, 2026"
      intro={[
        "This Privacy Policy explains how Meet to Manage handles information when academies, teachers, parents and students use our website, web portals and parent mobile app.",
        "We take care with children's information. Please read the section on children, and contact us if anything is unclear.",
      ]}
      sections={SECTIONS}
    />
  );
}
