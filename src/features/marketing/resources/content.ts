export interface ResourceGuide {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: string;
  intro: string[];
  download: {
    href: string;
    filename: string;
    label: string;
    format: "CSV" | "TXT";
  };
  sections: {
    id: string;
    title: string;
    paragraphs: string[];
    bullets?: string[];
  }[];
  table?: {
    caption: string;
    columns: string[];
    rows: string[][];
  };
  faq: { q: string; a: string }[];
  related: { to: string; label: string }[];
}

export const RESOURCE_GUIDES: ResourceGuide[] = [
  {
    slug: "coaching-centre-fee-tracker",
    title: "Free coaching centre fee tracker template",
    seoTitle: "Free Coaching Centre Fee Tracker Template | Meet to Manage",
    description: "Download a free CSV fee tracker for your coaching centre. Track invoices, partial payments, outstanding fees and credits with a worked example.",
    category: "Fees and collections",
    intro: [
      "A useful fee tracker answers three questions: what was billed, what has actually arrived, and what needs attention next. This starter template keeps those answers together, with one row per invoice rather than one row per family.",
      "Download the CSV and open it in Excel, Google Sheets or another spreadsheet app. No account is required. The sample records are fictional and use INR only to illustrate the workflow; replace them with your centre's own currency and billing details."
    ],
    download: {
      href: "/templates/coaching-centre-fee-tracker.csv",
      filename: "coaching-centre-fee-tracker.csv",
      label: "Download the fee tracker",
      format: "CSV"
    },
    sections: [
      {
        id: "set-up",
        title: "1. Set up one record for each invoice",
        paragraphs: [
          "Give each invoice a unique ID, link it to a learner ID, and record the batch, billing period, due date and currency. A family with two children may need two records. A learner billed monthly needs a new record for each month's invoice.",
          "Use a consistent billing-period format such as 2026-10 and an unambiguous due date such as 2026-10-10. Keep personal contact details in your existing family record rather than repeating them throughout the tracker."
        ]
      },
      {
        id: "payments",
        title: "2. Record confirmed payments and part payments",
        paragraphs: [
          "Enter the fee amount and the total confirmed payments allocated to that invoice. A payment promise or checkout attempt is not a received payment. Check the payment record before changing the total.",
          "For SAMPLE-001, a fee of INR 3,000 with INR 1,000 received leaves INR 2,000 outstanding. When the next instalment arrives, update the received total on that same invoice. Keep individual transaction references in a separate payment log so each receipt remains traceable."
        ]
      },
      {
        id: "balances",
        title: "3. Keep outstanding fees separate from credits",
        paragraphs: [
          "The download contains plain sample values, not formulas or automatic payment reconciliation. Calculate outstanding as the larger of zero and fee amount minus amount received. In the supplied column order, a spreadsheet formula for cell I2 is =MAX(0,G2-H2).",
          "Record an overpayment separately as credit. For a fee of INR 2,000 with INR 2,200 received, outstanding is zero and credit is INR 200. The equivalent formula for J2 is =MAX(0,H2-G2). Agree whether to refund or allocate that credit before changing another invoice."
        ]
      },
      {
        id: "follow-up",
        title: "4. Review the next action before sending a reminder",
        paragraphs: [
          "Filter for positive outstanding balances, then review due dates and the last reminder. Use the next-action field to distinguish a payment check, a scheduled instalment and a reminder. An overpaid invoice needs a credit decision rather than a collection message."
        ],
        bullets: [
          "Confirm the amount, invoice reference and due date before contacting a family.",
          "Use the family's agreed contact channel and keep messages specific to their invoice.",
          "Reconcile the tracker against receipts regularly, with one named person responsible for updates."
        ]
      }
    ],
    table: {
      caption: "Fictional examples from the CSV. All amounts below are in INR; none are customer records.",
      columns: ["Invoice", "Fee", "Received", "Outstanding", "Credit", "Status"],
      rows: [
        ["SAMPLE-001", "3,000", "1,000", "2,000", "0", "Part-paid"],
        ["SAMPLE-002", "2,500", "2,500", "0", "0", "Paid"],
        ["SAMPLE-003", "2,000", "2,200", "0", "200", "Overpaid"]
      ]
    },
    faq: [
      {
        q: "Does the CSV calculate balances or send reminders?",
        a: "No. It is a downloadable starting record with fictional values. Add your own spreadsheet formulas and update statuses yourself. It does not connect to a payment gateway or send messages."
      },
      {
        q: "When should a centre move beyond a spreadsheet?",
        a: "Consider a connected billing workflow when several people edit the record, receipts are hard to reconcile, or reminders depend on someone remembering each family. Compare your actual process with the platform's fee-management tools before choosing a plan."
      }
    ],
    related: [
      { to: "/solutions/fee-management-software-for-coaching-centres", label: "Explore connected fee management" },
      { to: "/pricing", label: "Compare platform plans" },
      { to: "/customers/the-reader-nest", label: "Read The Reader Nest's customer story" }
    ]
  },
  {
    slug: "teacher-handover-checklist",
    title: "Teacher leave handover checklist for coaching centres",
    seoTitle: "Teacher Handover Checklist for Coaching Centres | Meet to Manage",
    description: "Download a practical teacher handover checklist for coaching classes. Prepare a substitute teacher, confirm the lesson and record what happened afterwards.",
    category: "Teaching and scheduling",
    intro: [
      "A substitute teacher should be able to answer what to teach, when to join, and who can resolve a problem without searching through an entire chat history. Use this checklist when a teacher takes leave or another educator covers a scheduled class.",
      "The downloadable text file is editable in a document or notes app. Complete one handover for each affected session, then keep it with the class record. It includes prompts for preparation, the live lesson and the return to the regular teacher."
    ],
    download: {
      href: "/templates/teacher-handover-checklist.txt",
      filename: "teacher-handover-checklist.txt",
      label: "Download the handover checklist",
      format: "TXT"
    },
    sections: [
      {
        id: "confirm-session",
        title: "1. Confirm the session before changing the schedule",
        paragraphs: [
          "Record the batch, subject, session date, start and end time, time zone, regular teacher and covering teacher. A date without a time zone is easy to misread when an online class includes families or staff in different locations.",
          "Confirm the covering teacher's availability and subject fit before notifying families. Check whether the class time stays the same or changes. If it changes, identify who will update the timetable and who will confirm the change with families."
        ],
        bullets: [
          "Name the coordinator who owns the handover and record a work contact for questions.",
          "Specify whether this is one session or a series, including the regular teacher's return date."
        ]
      },
      {
        id: "prepare-lesson",
        title: "2. Leave a lesson brief the next teacher can use",
        paragraphs: [
          "Write the last completed topic, today's learning objective and the next task in the programme. Link the precise worksheet or slide deck, including its version or page range. A folder labelled phonics is less helpful than the exact activity and where to begin.",
          "For example, a fictional brief might say: Phonics A, 18:00-18:45 Asia/Kolkata; revise short a; use worksheet Short Vowels v2, pages 3-4; finish with the matching activity. This is an illustration, not a customer's lesson record."
        ],
        bullets: [
          "List essential materials and a short backup activity if the class finishes early.",
          "Include only teaching adjustments the covering teacher needs for this session."
        ]
      },
      {
        id: "check-access",
        title: "3. Check access and communication before class",
        paragraphs: [
          "Ask the covering teacher to open the classroom and teaching materials before the session. Use their own authorised staff account. Keep passwords, payment information and unnecessary family records out of the handover.",
          "Tell families who is covering the lesson and whether the time or joining process changes. Share only the relevant update through the centre's usual channel; the handover document itself is for the staff who need it."
        ]
      },
      {
        id: "during-class",
        title: "4. Keep a short record during the lesson",
        paragraphs: [
          "Check who has joined, follow the agreed lesson objective and note any changes to the plan. Record completed pages, activities and practice assigned. If a learner cannot join, send the issue to the named coordinator instead of including private troubleshooting in a group message."
        ]
      },
      {
        id: "close-handover",
        title: "5. Close the loop after class",
        paragraphs: [
          "Before the next session, send the regular teacher a concise summary of what was covered, what remains unfinished and any follow-up needed. Keep attendance notes in the appropriate class record. Ask the coordinator to confirm that the handover is complete.",
          "A useful handover ends with a clear next step: start worksheet page 5, revisit one concept, or contact a family about a missed session. Store the brief where authorised staff can find it, and remove access that is no longer needed."
        ]
      }
    ],
    faq: [
      {
        q: "Should the checklist contain family phone numbers or passwords?",
        a: "Do not include passwords or a whole contact list. Point the covering teacher to the authorised class record and give them a coordinator's work contact. Include only information needed to run the session."
      },
      {
        q: "Does completing the checklist reassign the teacher automatically?",
        a: "No. This is a planning document. Your coordinator must update the actual timetable and teacher assignment in the system your centre uses, then confirm that the covering teacher can access the class."
      }
    ],
    related: [
      { to: "/solutions/live-class-software-for-institutes", label: "Explore the live classroom" },
      { to: "/solutions/online-attendance-software-for-institutes", label: "See how class attendance works" },
      { to: "/resources/coaching-centre-fee-tracker", label: "Download the coaching centre fee tracker" }
    ]
  }
];
