/**
 * The Reader Nest Terms & Conditions and Refund Policy, as supplied by the client (Sep 2026).
 * Rendered in full at /terms (features/public/Terms.tsx) and linked from every payment screen.
 * Too long for the admin "Terms text" setting (2000 characters), which stays for a short summary.
 */

export interface TermsSection {
  title: string;
  /** Plain lines shown as a bulleted list. */
  points: string[];
  /** Optional titled sub-part (e.g. "Worksheet Access" under Class Recordings). */
  sub?: { title: string; points: string[] };
}

export const TERMS_INTRO = [
  "Welcome to The Reader Nest!",
  "These Terms & Conditions explain the rules for using our courses, classes, learning materials, and parent dashboard. Please read them carefully before making your first payment.",
  "By clicking “I have read and accepted the Terms & Conditions”, you confirm that you understand and agree to all the terms below.",
];

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: "About The Reader Nest",
    points: [
      "The Reader Nest provides educational courses and learning programs for children.",
      "Our services may include online classes, phonics, public speaking, books, worksheets, recordings, and other educational resources.",
      "The exact services available to your child will depend on the course you enrol in.",
    ],
  },
  {
    title: "Parent Dashboard",
    points: [
      "Your child's learning journey will be managed through The Reader Nest Parent Dashboard.",
      "Course details, class schedules, worksheets, recordings, attendance, and other important information will be available on the dashboard.",
      "Parents are responsible for regularly checking the dashboard for updates.",
      "All important actions related to the child's classes should be completed through the dashboard.",
    ],
  },
  {
    title: "First Payment & Enrolment",
    points: [
      "Your child's enrolment will begin after the applicable course fee has been successfully paid.",
      "Before making the first payment, the parent/guardian must read and accept these Terms & Conditions.",
      "Enrolment becomes active only after the required payment and acceptance of these Terms & Conditions.",
      "Course access and other services will be provided according to the selected program.",
    ],
  },
  {
    title: "Course Fees & Payments",
    points: [
      "Course fees must be paid through the available payment method on the portal.",
      "The applicable fee must be paid before access to the relevant course or services is provided.",
      "Prices and offers may be changed by The Reader Nest from time to time.",
      "Once a payment has been made, refund eligibility will be governed by the Refund Policy mentioned below.",
    ],
  },
  {
    title: "Batch Assignment & Class Schedule",
    points: [
      "After enrolment, The Reader Nest will assign the child to the appropriate batch or individual class.",
      "The class schedule will be shared through the dashboard.",
      "Parents are responsible for checking the assigned schedule.",
      "Once the batch has been assigned and the schedule has been shared, no refund will be processed, except where specifically allowed under the Learning Guarantee Refund Policy.",
    ],
  },
  {
    title: "Individual One-to-One Classes",
    points: [
      "Parents can cancel an individual one-to-one class through the dashboard.",
      "The cancellation must be made at least 1 hour before the scheduled class time.",
      "The cancellation must be done through the dashboard.",
      "No cancellation will be considered through WhatsApp or other informal communication.",
      "A class cancelled by the parent within the permitted time will be adjusted at the end of the course.",
      "The cancelled class will not be lost.",
      "It will be adjusted as an additional/remaining class according to the applicable course schedule.",
    ],
  },
  {
    title: "Group Classes",
    points: [
      "Parents cannot individually cancel a group class.",
      "If a child cannot attend a group class, the parent may mark the child's absence through the dashboard.",
      "The group class will continue as scheduled for the other children.",
      "A group class can be cancelled only when all children enrolled in that particular group class cancel the class.",
      "Individual absence from a group class will not result in cancellation of the group session.",
      "Parents should regularly check the dashboard for group-class updates.",
    ],
  },
  {
    title: "No-Show Policy",
    points: [
      "If the child does not attend a scheduled class and the parent has not given prior information through the dashboard, the class will be treated as completed.",
      "The class will not be rescheduled in case of an unreported no-show.",
      "Parents are therefore requested to inform the team through the proper dashboard process whenever cancellation or absence is required.",
    ],
  },
  {
    title: "Worksheets & Learning Materials",
    points: [
      "Worksheets and other learning materials will be made available on the child's dashboard.",
      "Parents can access the materials after the applicable payment has been completed.",
      "Parents should regularly check the dashboard for new worksheets and learning resources.",
      "Learning materials provided by The Reader Nest are for the enrolled child only.",
    ],
  },
  {
    title: "Class Recordings",
    points: [
      "Where recordings are provided for a particular course or class, they will be available on the child's dashboard for 15 days after the class only.",
      "Parents can access the recordings through the dashboard for 15 days.",
      "Recordings and other digital learning resources are provided for the enrolled child's learning purposes only.",
      "Recordings must not be shared, copied, distributed, uploaded, or resold without written permission from The Reader Nest.",
    ],
    sub: {
      title: "Worksheet Access",
      points: [
        "Access to worksheets will remain available only for the duration of the child’s active enrolment with The Reader Nest.",
        "Once the child’s enrolment ends and the dashboard access is discontinued, access to the worksheets will also be discontinued.",
        "Parents are requested to download and save all required worksheets before the child’s enrolment period ends.",
        "The Reader Nest may not be able to provide access to worksheets after the dashboard has been discontinued.",
        "Parents are therefore advised to download and securely save any worksheets they may need for future reference in advance.",
      ],
    },
  },
  {
    title: "Communication Policy",
    points: [
      "Official communication with parents will be through email and The Reader Nest dashboard.",
      "WhatsApp will not be used for official communication regarding classes, cancellations, complaints, refunds, or other service-related matters.",
      "Parents should regularly check their registered email address and dashboard notifications.",
      "Parents are responsible for keeping their registered contact details updated.",
    ],
  },
  {
    title: "Support Tickets & Complaints",
    points: [
      "Parents can raise a support ticket directly through the dashboard for any concern or issue.",
      "The support team will review the ticket and try to resolve it within 48 hours of the ticket being raised.",
      "Parents should provide all necessary details when raising a ticket.",
      "Parents can track their concerns through the dashboard.",
      "WhatsApp messages will not be treated as official support requests.",
    ],
  },
  {
    title: "Attendance & Participation",
    points: [
      "Parents are responsible for ensuring that the child attends scheduled classes regularly.",
      "The child is expected to actively participate in classes and learning activities.",
      "Attendance and participation records will be maintained by The Reader Nest.",
      "These records may be considered while reviewing any refund request under the Learning Guarantee.",
    ],
  },
  {
    title: "Learning Guarantee Refund",
    points: [
      "A refund under the Learning Guarantee will be considered only when all of the following conditions are met:",
      "The child has completed the entire enrolled course.",
      "The child has maintained at least 95% attendance.",
      "The child has actively participated in classes and learning activities.",
      "The child has completed the required assignments and learning tasks.",
      "Despite meeting all these requirements, the child has not achieved the intended learning outcomes of the enrolled program.",
      "Meeting only one or some of these conditions will not make the child eligible for a refund.",
      "Refund eligibility will be checked using The Reader Nest's records.",
    ],
  },
  {
    title: "Learning Guarantee Refund Deduction",
    points: [
      "If a refund is approved under the Learning Guarantee, a mandatory 25% deduction will be made from the eligible refund amount.",
      "The deduction covers costs already incurred by The Reader Nest, including: software and platform usage; initial consultation and assessment; demo class/classes; administrative and onboarding work; worksheets and study materials; class recordings; other digital learning resources provided.",
      "The remaining 75% may be refunded after verification and approval.",
    ],
  },
  {
    title: "Refund Before Classes Start",
    points: [
      "A refund request made before the child's classes begin will be considered only if The Reader Nest is unable to start the child's classes within 15–20 working days from the date of enrolment and receipt of the applicable course fee.",
      "If the refund is approved, a mandatory 25% deduction will apply.",
      "This deduction covers costs such as: software and platform setup; consultation and assessment; demo class/classes, where applicable; administrative and onboarding costs.",
      "The remaining amount may be refunded after review and approval.",
    ],
  },
  {
    title: "When Pre-Commencement Refund Does Not Apply",
    points: [
      "The pre-commencement refund provision will not apply if the delay is caused by the parent or student. This includes:",
      "Parent or child not being available for classes.",
      "Repeated changes in preferred timings.",
      "Failure to finalise a suitable class schedule.",
      "Failure to provide required information or documents.",
      "Delay in responding to scheduling or onboarding communication.",
      "Any other delay caused by the parent or student.",
    ],
  },
  {
    title: "No Refund After Batch & Schedule Confirmation",
    points: [
      "Once the child's batch has been assigned and the class schedule has been shared with the parent, the enrolment will be considered active.",
      "After this point, no refund will be processed except where specifically allowed under the Learning Guarantee conditions.",
      "Parents should therefore check the schedule carefully before confirming their enrolment.",
    ],
  },
  {
    title: "Course Access & Personal Use",
    points: [
      "Enrolment gives the child a personal right to access the selected course.",
      "Course access is non-transferable.",
      "Course login details must not be shared with another person.",
      "Course materials, worksheets, recordings, videos, books, and other resources must not be copied, resold, redistributed, or shared publicly.",
    ],
  },
  {
    title: "Intellectual Property",
    points: [
      "All course content and materials created or provided by The Reader Nest belong to The Reader Nest or its authorised content providers.",
      "This includes text, images, videos, worksheets, books, recordings, course content, logos, and educational resources.",
      "These materials must not be reproduced, modified, distributed, or commercially used without written permission.",
    ],
  },
  {
    title: "Website & Portal Use",
    points: [
      "The website and dashboard should be used only for genuine educational and service-related purposes.",
      "Users must not use the website or portal for fraudulent, unlawful, harmful, or prohibited activities.",
      "Parents must provide correct information during registration and enrolment.",
    ],
  },
  {
    title: "Account Security",
    points: [
      "Parents are responsible for keeping their login details safe.",
      "Login credentials should not be shared with other people.",
      "Parents should immediately inform The Reader Nest if they believe their account has been accessed without permission.",
    ],
  },
  {
    title: "Learning Outcomes",
    points: [
      "The Reader Nest aims to provide structured and outcome-focused learning.",
      "Every child learns at a different pace.",
      "Specific learning outcomes may vary from child to child.",
      "Except for the conditions specifically mentioned under the Learning Guarantee, The Reader Nest does not guarantee a particular result within a specific period.",
    ],
  },
  {
    title: "External Links",
    points: [
      "The website or dashboard may sometimes contain links to third-party websites or services.",
      "These links may be provided for convenience.",
      "The Reader Nest does not control or take responsibility for the content or services provided by external websites.",
    ],
  },
  {
    title: "Privacy",
    points: [
      "The Reader Nest may collect and use information required to provide its services.",
      "Parents should refer to the Privacy Policy for details about how personal information is handled.",
    ],
  },
  {
    title: "Limitation of Liability",
    points: [
      "The Reader Nest works to provide safe, structured, and high-quality educational services.",
      "However, The Reader Nest will not be responsible for indirect or incidental losses arising from the use of the website, dashboard, or services, to the extent permitted by applicable law.",
    ],
  },
  {
    title: "Changes to These Terms",
    points: [
      "The Reader Nest may update these Terms & Conditions from time to time.",
      "Updated terms may be published on the website or dashboard.",
      "Continued use of the services after an update will mean that the updated terms are accepted.",
    ],
  },
  {
    title: "No Exceptions",
    points: [
      "Refunds, cancellations, attendance, and other service-related matters will be handled according to these Terms & Conditions.",
      "No exceptions will be entertained beyond the conditions expressly mentioned in this policy.",
      "All decisions regarding refund eligibility will be made after checking the relevant records and applicable terms.",
    ],
  },
  {
    title: "Parent's Responsibility",
    points: [
      "Parents are responsible for:",
      "Checking the child's dashboard regularly.",
      "Checking the registered email regularly.",
      "Checking the class schedule.",
      "Managing cancellations through the dashboard.",
      "Marking absence for group classes when required.",
      "Ensuring regular attendance.",
      "Ensuring that the child participates in classes and completes learning activities.",
      "Keeping login details secure.",
      "Raising concerns through the dashboard ticket system.",
      "Reading important updates shared by The Reader Nest.",
    ],
  },
  {
    title: "Acceptance of Terms",
    points: [
      "By proceeding with the enrolment and making the first payment, the parent/guardian confirms that:",
      "I have read these Terms & Conditions.",
      "I understand the class cancellation and attendance rules.",
      "I understand the refund policy.",
      "I understand that official communication will be through the dashboard and email.",
      "I understand that WhatsApp will not be used for official communication.",
      "I understand that worksheets and recordings will be available through the child's dashboard.",
      "I understand the Learning Guarantee conditions.",
      "I understand the 25% refund deduction where applicable.",
      "I agree to follow all the terms stated above.",
      "By selecting “I Have Read & Accepted”, I confirm that I have read, understood, and agreed to The Reader Nest Terms & Conditions and Refund Policy.",
    ],
  },
];

export const TERMS_CONTACT = [
  "For any concern or support request, please raise a ticket through the parent dashboard.",
  "The Reader Nest team will try to resolve the concern within 48 hours of the ticket being raised.",
];

export const TERMS_EMAILS = ["support@thereadernest.com", "info@thereadernest.com"];

/** The checkbox wording the client asked for, used on every payment screen. */
export const TERMS_ACCEPT_LABEL = "I have read and accepted the Terms & Conditions and Refund Policy.";

/** In-portal page with the full text; an admin-set Terms link (Settings) still takes priority. */
export const TERMS_PAGE_PATH = "/terms";
