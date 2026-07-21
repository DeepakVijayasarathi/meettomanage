/**
 * Local mock data for the Admission Team Portal.
 *
 * Everything here is fabricated for demo purposes but stays internally
 * consistent, and cross-references real parent/child/teacher records from
 * `@/data/children`, `@/data/users` and `@/data/sessions` wherever a lead's
 * demo maps to a session that already exists in the shared mock universe
 * (Ishaan Singh · s-11, Kabir Kapoor · s-12, the Reddy family enquiry · s-25).
 *
 * "Today" in this mock universe is 2026-07-09.
 */

export type ConversionStage =
  | "Demo Scheduled"
  | "Demo Completed"
  | "Follow-up"
  | "Payment Pending"
  | "Partially Paid"
  | "Enrolled"
  | "Not Interested";
export type PaymentStatus = "Pending" | "Paid" | "Partially Paid";
export type LeadSource = "Website Enquiry" | "Referral" | "Walk-in" | "Social Media Ad" | "Phone Enquiry";

export interface FollowUpNote {
  id: string;
  date: string;
  note: string;
  loggedBy: string;
  nextFollowUpDate?: string;
}

export interface Lead {
  id: string;
  childName: string;
  childAge: number;
  childId?: string;
  parentName: string;
  parentId?: string;
  phone: string;
  email: string;
  source: LeadSource;
  teacherId: string;
  teacherName: string;
  demoDate: string;
  demoSessionId?: string;
  recommendedCourse: string;
  conversionStage: ConversionStage;
  lastContactedOn: string;
  nextFollowUpOn?: string;
  assignedTo: string;
  createdOn: string;
  notes: FollowUpNote[];
}

export interface PaymentLink {
  id: string;
  leadId: string;
  childName: string;
  parentName: string;
  courseName: string;
  department: "Phonics" | "Maths";
  amount: number;
  amountPaid: number;
  status: PaymentStatus;
  linkSharedOn: string;
  lastReminderOn?: string;
  paidOn?: string;
  paymentLinkUrl: string;
}

export const ADMISSION_TEAM_NAMES = ["Priya Menon", "Farhan Ali"];

export const LEADS: Lead[] = [
  {
    id: "lead-1",
    childName: "Ishaan Singh",
    childAge: 8,
    childId: "c-4",
    parentName: "Vikram Singh",
    parentId: "p-2",
    phone: "+91 99000 22222",
    email: "vikram.singh@gmail.com",
    source: "Website Enquiry",
    teacherId: "t-6",
    teacherName: "Sneha Kulkarni",
    demoDate: "2026-07-11",
    demoSessionId: "s-11",
    recommendedCourse: "Math Explorers Jr",
    conversionStage: "Follow-up",
    lastContactedOn: "2026-07-08",
    nextFollowUpOn: "2026-07-13",
    assignedTo: "Priya Menon",
    createdOn: "2026-07-02",
    notes: [
      {
        id: "n-1a",
        date: "2026-07-08",
        note: "Shared demo feedback highlights with dad — he liked that Ishaan was placed in a peer group batch. Waiting on his wife's confirmation before picking a slot.",
        loggedBy: "Priya Menon",
        nextFollowUpDate: "2026-07-13",
      },
    ],
  },
  {
    id: "lead-2",
    childName: "Kabir Kapoor",
    childAge: 4,
    childId: "c-3",
    parentName: "Rhea Kapoor",
    parentId: "p-1",
    phone: "+91 99000 11111",
    email: "rhea.kapoor@gmail.com",
    source: "Referral",
    teacherId: "t-1",
    teacherName: "Karan Mehta",
    demoDate: "2026-07-12",
    demoSessionId: "s-12",
    recommendedCourse: "Awaiting teacher feedback",
    conversionStage: "Demo Scheduled",
    lastContactedOn: "2026-07-06",
    nextFollowUpOn: "2026-07-12",
    assignedTo: "Priya Menon",
    createdOn: "2026-07-04",
    notes: [
      {
        id: "n-2a",
        date: "2026-07-06",
        note: "Referred by Rhea's older child Aarav's teacher. Confirmed demo slot for Kabir on Sun 12 Jul, 4:00 PM with Karan.",
        loggedBy: "Priya Menon",
        nextFollowUpDate: "2026-07-12",
      },
    ],
  },
  {
    id: "lead-3",
    childName: "Aisha Reddy",
    childAge: 5,
    parentName: "Pooja Reddy",
    parentId: "p-7",
    phone: "+91 99000 77777",
    email: "pooja.reddy@gmail.com",
    source: "Referral",
    teacherId: "t-3",
    teacherName: "Rohan Verma",
    demoDate: "2026-07-21",
    demoSessionId: "s-25",
    recommendedCourse: "Awaiting teacher feedback",
    conversionStage: "Demo Scheduled",
    lastContactedOn: "2026-07-07",
    nextFollowUpOn: "2026-07-21",
    assignedTo: "Farhan Ali",
    createdOn: "2026-07-07",
    notes: [
      {
        id: "n-3a",
        date: "2026-07-07",
        note: "Pooja (already a Reader Nest parent for Reyansh) enquired about a demo for her younger daughter Aisha. Booked a flexible slot with Rohan; Pooja and grandmother will both join the demo.",
        loggedBy: "Farhan Ali",
        nextFollowUpDate: "2026-07-21",
      },
    ],
  },
  {
    id: "lead-4",
    childName: "Advait Nair",
    childAge: 5,
    parentName: "Sunita Nair",
    phone: "+91 97010 11223",
    email: "sunita.nair@yahoo.com",
    source: "Social Media Ad",
    teacherId: "t-1",
    teacherName: "Karan Mehta",
    demoDate: "2026-06-18",
    recommendedCourse: "Phonics Foundations",
    conversionStage: "Enrolled",
    lastContactedOn: "2026-07-02",
    assignedTo: "Priya Menon",
    createdOn: "2026-06-15",
    notes: [
      {
        id: "n-4a",
        date: "2026-06-20",
        note: "Great demo — Advait loved the rhyme-based warm-up. Recommended Phonics Foundations group batch.",
        loggedBy: "Priya Menon",
      },
      {
        id: "n-4b",
        date: "2026-07-02",
        note: "Payment received in full, enrollment confirmed and handed off to the coordinator team for batch placement.",
        loggedBy: "Priya Menon",
      },
    ],
  },
  {
    id: "lead-5",
    childName: "Ira Joshi",
    childAge: 6,
    parentName: "Meenal Joshi",
    phone: "+91 97010 22334",
    email: "meenal.joshi@outlook.com",
    source: "Website Enquiry",
    teacherId: "t-3",
    teacherName: "Rohan Verma",
    demoDate: "2026-06-22",
    recommendedCourse: "Reading Adventures",
    conversionStage: "Enrolled",
    lastContactedOn: "2026-07-04",
    assignedTo: "Priya Menon",
    createdOn: "2026-06-19",
    notes: [
      {
        id: "n-5a",
        date: "2026-06-24",
        note: "Ira read two sentences unaided during the demo — strong fit for Reading Adventures.",
        loggedBy: "Priya Menon",
      },
      {
        id: "n-5b",
        date: "2026-07-04",
        note: "Full payment received. Enrolled — moving to batch scheduling.",
        loggedBy: "Priya Menon",
      },
    ],
  },
  {
    id: "lead-6",
    childName: "Vihaan Rao",
    childAge: 9,
    parentName: "Arvind Rao",
    phone: "+91 97010 33445",
    email: "arvind.rao@gmail.com",
    source: "Referral",
    teacherId: "t-4",
    teacherName: "Meera Iyer",
    demoDate: "2026-06-14",
    recommendedCourse: "Math Champions",
    conversionStage: "Enrolled",
    lastContactedOn: "2026-06-19",
    assignedTo: "Farhan Ali",
    createdOn: "2026-06-10",
    notes: [
      {
        id: "n-6a",
        date: "2026-06-15",
        note: "Confident with mental math already — recommended the 1:1 Math Champions track over group batch.",
        loggedBy: "Farhan Ali",
      },
      {
        id: "n-6b",
        date: "2026-06-19",
        note: "Full payment settled same week. Enrolled.",
        loggedBy: "Farhan Ali",
      },
    ],
  },
  {
    id: "lead-7",
    childName: "Zoya Sheikh",
    childAge: 4,
    parentName: "Fatima Sheikh",
    phone: "+91 97010 44556",
    email: "fatima.sheikh@gmail.com",
    source: "Social Media Ad",
    teacherId: "t-1",
    teacherName: "Karan Mehta",
    demoDate: "2026-06-29",
    recommendedCourse: "Phonics Foundations",
    conversionStage: "Follow-up",
    lastContactedOn: "2026-07-07",
    nextFollowUpOn: "2026-07-14",
    assignedTo: "Priya Menon",
    createdOn: "2026-06-24",
    notes: [
      {
        id: "n-7a",
        date: "2026-07-02",
        note: "Sent payment link for Phonics Foundations. Mom asked for a few days to decide on weekday slot.",
        loggedBy: "Priya Menon",
      },
      {
        id: "n-7b",
        date: "2026-07-07",
        note: "Partial payment received (₹1,000 of ₹2,500). Following up for the balance and batch confirmation.",
        loggedBy: "Priya Menon",
        nextFollowUpDate: "2026-07-14",
      },
    ],
  },
  {
    id: "lead-8",
    childName: "Aarohi Kulkarni",
    childAge: 7,
    parentName: "Deepak Kulkarni",
    phone: "+91 97010 55667",
    email: "deepak.kulkarni@gmail.com",
    source: "Website Enquiry",
    teacherId: "t-2",
    teacherName: "Isha Sharma",
    demoDate: "2026-07-01",
    recommendedCourse: "Creative Writing Workshop",
    conversionStage: "Follow-up",
    lastContactedOn: "2026-07-06",
    nextFollowUpOn: "2026-07-15",
    assignedTo: "Farhan Ali",
    createdOn: "2026-06-27",
    notes: [
      {
        id: "n-8a",
        date: "2026-07-06",
        note: "Payment link shared for Creative Writing Workshop. Dad wants to check the batch timing against school hours before paying.",
        loggedBy: "Farhan Ali",
        nextFollowUpDate: "2026-07-15",
      },
    ],
  },
  {
    id: "lead-9",
    childName: "Rishaan Chatterjee",
    childAge: 9,
    parentName: "Priyanka Chatterjee",
    phone: "+91 97010 66778",
    email: "priyanka.chatterjee@gmail.com",
    source: "Phone Enquiry",
    teacherId: "t-6",
    teacherName: "Sneha Kulkarni",
    demoDate: "2026-06-27",
    recommendedCourse: "Public Speaking Sparks",
    conversionStage: "Follow-up",
    lastContactedOn: "2026-07-08",
    nextFollowUpOn: "2026-07-16",
    assignedTo: "Priya Menon",
    createdOn: "2026-06-23",
    notes: [
      {
        id: "n-9a",
        date: "2026-07-03",
        note: "Partial payment of ₹1,500 towards Public Speaking Sparks received. Sent a reminder for the balance on the 8th.",
        loggedBy: "Priya Menon",
      },
      {
        id: "n-9b",
        date: "2026-07-08",
        note: "Reminder sent again — mom confirmed she'll clear the balance this weekend.",
        loggedBy: "Priya Menon",
        nextFollowUpDate: "2026-07-16",
      },
    ],
  },
  {
    id: "lead-10",
    childName: "Tara Menon",
    childAge: 5,
    parentName: "Harish Menon",
    phone: "+91 97010 77889",
    email: "harish.menon@gmail.com",
    source: "Referral",
    teacherId: "t-2",
    teacherName: "Isha Sharma",
    demoDate: "2026-07-05",
    recommendedCourse: "Math Explorers Jr",
    conversionStage: "Demo Completed",
    lastContactedOn: "2026-07-09",
    nextFollowUpOn: "2026-07-11",
    assignedTo: "Priya Menon",
    createdOn: "2026-06-30",
    notes: [
      {
        id: "n-10a",
        date: "2026-07-09",
        note: "Demo feedback received — Tara is a strong fit for Math Explorers Jr group batch. Payment link shared today.",
        loggedBy: "Priya Menon",
        nextFollowUpDate: "2026-07-11",
      },
    ],
  },
  {
    id: "lead-11",
    childName: "Kian Desai",
    childAge: 6,
    parentName: "Swati Desai",
    phone: "+91 97010 88990",
    email: "swati.desai@gmail.com",
    source: "Website Enquiry",
    teacherId: "t-1",
    teacherName: "Karan Mehta",
    demoDate: "2026-07-06",
    recommendedCourse: "Phonics Foundations",
    conversionStage: "Demo Completed",
    lastContactedOn: "2026-07-09",
    nextFollowUpOn: "2026-07-12",
    assignedTo: "Farhan Ali",
    createdOn: "2026-07-01",
    notes: [
      {
        id: "n-11a",
        date: "2026-07-09",
        note: "Positive demo — recommended Phonics Foundations. Payment link sent, awaiting response.",
        loggedBy: "Farhan Ali",
        nextFollowUpDate: "2026-07-12",
      },
    ],
  },
  {
    id: "lead-12",
    childName: "Sara Iyer",
    childAge: 7,
    parentName: "Naveen Iyer",
    phone: "+91 97010 99001",
    email: "naveen.iyer@gmail.com",
    source: "Referral",
    teacherId: "t-3",
    teacherName: "Rohan Verma",
    demoDate: "2026-06-28",
    recommendedCourse: "Reading Adventures",
    conversionStage: "Demo Completed",
    lastContactedOn: "2026-07-06",
    nextFollowUpOn: "2026-07-13",
    assignedTo: "Priya Menon",
    createdOn: "2026-06-24",
    notes: [
      {
        id: "n-12a",
        date: "2026-07-03",
        note: "Partial payment of ₹1,400 received towards Reading Adventures. Balance reminder sent on the 6th.",
        loggedBy: "Priya Menon",
        nextFollowUpDate: "2026-07-13",
      },
    ],
  },
  {
    id: "lead-13",
    childName: "Aryan Bhatia",
    childAge: 8,
    parentName: "Rakesh Bhatia",
    phone: "+91 97011 00112",
    email: "rakesh.bhatia@gmail.com",
    source: "Social Media Ad",
    teacherId: "t-4",
    teacherName: "Meera Iyer",
    demoDate: "2026-06-20",
    recommendedCourse: "Math Champions",
    conversionStage: "Not Interested",
    lastContactedOn: "2026-06-25",
    assignedTo: "Farhan Ali",
    createdOn: "2026-06-16",
    notes: [
      {
        id: "n-13a",
        date: "2026-06-25",
        note: "Dad felt the 1:1 pricing was above budget and enrolled Aryan in a neighbourhood tuition instead. Marking as not interested for now — flagged for a re-engagement email next term.",
        loggedBy: "Farhan Ali",
      },
    ],
  },
  {
    id: "lead-14",
    childName: "Gurleen Kaur",
    childAge: 5,
    parentName: "Simran Kaur",
    phone: "+91 97011 11223",
    email: "simran.kaur@gmail.com",
    source: "Walk-in",
    teacherId: "t-6",
    teacherName: "Sneha Kulkarni",
    demoDate: "2026-07-15",
    recommendedCourse: "Awaiting teacher feedback",
    conversionStage: "Demo Scheduled",
    lastContactedOn: "2026-07-09",
    nextFollowUpOn: "2026-07-15",
    assignedTo: "Priya Menon",
    createdOn: "2026-07-09",
    notes: [
      {
        id: "n-14a",
        date: "2026-07-09",
        note: "Walked into the centre this morning — booked a demo for Gurleen with Sneha on Wed 15 Jul.",
        loggedBy: "Priya Menon",
        nextFollowUpDate: "2026-07-15",
      },
    ],
  },
];

export const PAYMENT_LINKS: PaymentLink[] = [
  {
    id: "PAY-2601",
    leadId: "lead-1",
    childName: "Ishaan Singh",
    parentName: "Vikram Singh",
    courseName: "Math Explorers Jr",
    department: "Maths",
    amount: 3200,
    amountPaid: 0,
    status: "Pending",
    linkSharedOn: "2026-07-05",
    lastReminderOn: "2026-07-08",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2601",
  },
  {
    id: "PAY-2602",
    leadId: "lead-4",
    childName: "Advait Nair",
    parentName: "Sunita Nair",
    courseName: "Phonics Foundations",
    department: "Phonics",
    amount: 2500,
    amountPaid: 2500,
    status: "Paid",
    linkSharedOn: "2026-06-28",
    paidOn: "2026-07-02",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2602",
  },
  {
    id: "PAY-2603",
    leadId: "lead-5",
    childName: "Ira Joshi",
    parentName: "Meenal Joshi",
    courseName: "Reading Adventures",
    department: "Phonics",
    amount: 2800,
    amountPaid: 2800,
    status: "Paid",
    linkSharedOn: "2026-06-30",
    paidOn: "2026-07-04",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2603",
  },
  {
    id: "PAY-2604",
    leadId: "lead-6",
    childName: "Vihaan Rao",
    parentName: "Arvind Rao",
    courseName: "Math Champions",
    department: "Maths",
    amount: 5200,
    amountPaid: 5200,
    status: "Paid",
    linkSharedOn: "2026-06-14",
    paidOn: "2026-06-19",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2604",
  },
  {
    id: "PAY-2605",
    leadId: "lead-7",
    childName: "Zoya Sheikh",
    parentName: "Fatima Sheikh",
    courseName: "Phonics Foundations",
    department: "Phonics",
    amount: 2500,
    amountPaid: 1000,
    status: "Partially Paid",
    linkSharedOn: "2026-07-02",
    paidOn: "2026-07-04",
    lastReminderOn: "2026-07-07",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2605",
  },
  {
    id: "PAY-2606",
    leadId: "lead-8",
    childName: "Aarohi Kulkarni",
    parentName: "Deepak Kulkarni",
    courseName: "Creative Writing Workshop",
    department: "Phonics",
    amount: 3000,
    amountPaid: 0,
    status: "Pending",
    linkSharedOn: "2026-07-06",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2606",
  },
  {
    id: "PAY-2607",
    leadId: "lead-9",
    childName: "Rishaan Chatterjee",
    parentName: "Priyanka Chatterjee",
    courseName: "Public Speaking Sparks",
    department: "Phonics",
    amount: 3400,
    amountPaid: 1500,
    status: "Partially Paid",
    linkSharedOn: "2026-07-03",
    paidOn: "2026-07-05",
    lastReminderOn: "2026-07-08",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2607",
  },
  {
    id: "PAY-2608",
    leadId: "lead-10",
    childName: "Tara Menon",
    parentName: "Harish Menon",
    courseName: "Math Explorers Jr",
    department: "Maths",
    amount: 3200,
    amountPaid: 0,
    status: "Pending",
    linkSharedOn: "2026-07-09",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2608",
  },
  {
    id: "PAY-2609",
    leadId: "lead-11",
    childName: "Kian Desai",
    parentName: "Swati Desai",
    courseName: "Phonics Foundations",
    department: "Phonics",
    amount: 2500,
    amountPaid: 0,
    status: "Pending",
    linkSharedOn: "2026-07-09",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2609",
  },
  {
    id: "PAY-2610",
    leadId: "lead-12",
    childName: "Sara Iyer",
    parentName: "Naveen Iyer",
    courseName: "Reading Adventures",
    department: "Phonics",
    amount: 2800,
    amountPaid: 1400,
    status: "Partially Paid",
    linkSharedOn: "2026-06-30",
    paidOn: "2026-07-03",
    lastReminderOn: "2026-07-06",
    paymentLinkUrl: "https://pay.readernest.com/rn/PAY-2610",
  },
];

/** Monthly demo-to-enrollment conversion rate, fabricated but trending consistent with ADMIN_KPIS.conversionRate (42%). */
export const CONVERSION_RATE_TREND = [
  { month: "Feb", rate: 34 },
  { month: "Mar", rate: 37 },
  { month: "Apr", rate: 33 },
  { month: "May", rate: 39 },
  { month: "Jun", rate: 41 },
  { month: "Jul", rate: 44 },
];

export function getLeadById(id: string) {
  return LEADS.find((l) => l.id === id);
}

export function getPaymentLinksForLead(leadId: string) {
  return PAYMENT_LINKS.filter((p) => p.leadId === leadId);
}

/** Cumulative pass-through funnel derived from the current LEADS snapshot. */
export function getConversionFunnel() {
  const total = LEADS.length;
  const stillAtDemoScheduled = LEADS.filter((l) => l.conversionStage === "Demo Scheduled").length;
  const demoCompletedOrBeyond = total - stillAtDemoScheduled;
  const followUpOrBeyond = LEADS.filter(
    (l) => l.conversionStage === "Follow-up" || l.conversionStage === "Enrolled" || l.conversionStage === "Not Interested"
  ).length;
  const enrolled = LEADS.filter((l) => l.conversionStage === "Enrolled").length;
  const notInterested = LEADS.filter((l) => l.conversionStage === "Not Interested").length;

  return [
    { stage: "Demo Scheduled", value: total },
    { stage: "Demo Completed", value: demoCompletedOrBeyond },
    { stage: "Follow-up", value: followUpOrBeyond },
    { stage: "Enrolled", value: enrolled },
    { stage: "Not Interested", value: notInterested },
  ];
}

export function getDemosPerTeacher() {
  const counts = new Map<string, number>();
  for (const lead of LEADS) counts.set(lead.teacherName, (counts.get(lead.teacherName) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([teacher, demos]) => ({ teacher, demos }))
    .sort((a, b) => b.demos - a.demos);
}

export function getConversionRate() {
  const enrolled = LEADS.filter((l) => l.conversionStage === "Enrolled").length;
  return Math.round((enrolled / LEADS.length) * 100);
}

export function getRevenueThisMonth(monthPrefix = "2026-07") {
  return PAYMENT_LINKS.filter((p) => p.paidOn?.startsWith(monthPrefix)).reduce((sum, p) => {
    // Only count the portion actually collected — approximate as amountPaid for simplicity
    // since each record here reflects a single payment event in this mock universe.
    return sum + p.amountPaid;
  }, 0);
}
