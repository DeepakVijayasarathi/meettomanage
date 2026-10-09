import { apiFetch } from "@/lib/api";
import type { DemoFeedback } from "@/types";
import type { ConversionStage, Lead } from "@/features/admission/data";

export type ApiConversionStatus =
  | "DemoScheduled"
  | "DemoCompleted"
  | "FollowUpInProgress"
  | "PaymentPending"
  | "PartiallyPaid"
  | "Enrolled"
  | "NotInterested"
  /** Choosing this auto-creates the parent's login (welcome-credentials email with a
   *  temporary PIN) if one doesn't already exist for their email — see ConversionStatus's
   *  own doc comment on the backend. */
  | "ReadyForEnrollment"
  /** Portal admission flow: paid in full, waiting for the counsellor to verify and click Enroll. */
  | "PaymentReceived";

export interface ApiDemoParticipant {
  /** Set on reads; send it back on an edit so the invitee keeps their own join link. */
  id?: string | null;
  name: string;
  /** Adults carry an email for the confirmation; additional children don't. */
  email: string | null;
  phone: string | null;
  /** True marks an additional child attending the demo. */
  isChild?: boolean;
}

export interface ApiDemoBooking {
  id: string;
  classSessionId: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  childName: string;
  childAge: number | null;
  departmentId: string | null;
  departmentName: string | null;
  conversionStatus: ApiConversionStatus;
  followUpNotes: string | null;
  nextFollowUpOn: string | null;
  scheduledStartAtUtc: string | null;
  scheduledEndAtUtc: string | null;
  meetingRoomId: string | null;
  /** The demo class's own status — TeacherNoShow/StudentNoShow means it was missed and waits
   *  for the counselor to reschedule or cancel it (it is no longer re-booked automatically). */
  sessionStatus?: string | null;
  /** Teacher conducting (or who conducted) the demo. */
  teacherProfileId: string | null;
  teacherName: string | null;
  /** Auto-calculated demo fee: ₹50 per demo, ₹100 once Enrolled. */
  payableAmount: number;
  participants: ApiDemoParticipant[];
  // Portal admission flow (payment link -> counsellor verification -> Enroll).
  courseId?: string | null;
  courseName?: string | null;
  /** Parent-facing payment page (/pay/{token}) the counsellor shares. */
  paymentLinkUrl?: string | null;
  invoiceId?: string | null;
  /** The agreed (possibly discounted) amount the link bills. */
  invoiceAmount?: number | null;
  invoiceAmountPaid?: number | null;
  termsAcceptedAtUtc?: string | null;
  paymentVerifiedAtUtc?: string | null;
  /** Only on the move to "Ready for enrollment" that just created a no-email parent's login. */
  issuedLogin?: ApiIssuedParentLogin | null;
}

/** A no-email parent's new mobile-number login, for staff to send on WhatsApp (shown once). */
export interface ApiIssuedParentLogin {
  loginId: string;
  temporaryPin: string;
  loginUrl: string;
  whatsAppMessage: string;
}

/** Per-parent demo record: every demo this parent has taken, with fee totals. */
export interface ApiParentDemoHistory {
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  totalDemos: number;
  enrolledCount: number;
  lastDemoAtUtc: string | null;
  totalPayable: number;
  bookings: ApiDemoBooking[];
}

export async function listParentDemoHistory(search?: string): Promise<ApiParentDemoHistory[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<ApiParentDemoHistory[]>(`/api/demo-bookings/parent-history${query}`);
}

const STAGE_FROM_API: Record<ApiConversionStatus, ConversionStage> = {
  DemoScheduled: "Demo Scheduled",
  DemoCompleted: "Demo Completed",
  ReadyForEnrollment: "Ready for Enrollment",
  FollowUpInProgress: "Follow-up",
  PaymentPending: "Payment Pending",
  PartiallyPaid: "Partially Paid",
  PaymentReceived: "Payment Received",
  Enrolled: "Enrolled",
  NotInterested: "Not Interested",
};

const STAGE_TO_API: Record<ConversionStage, ApiConversionStatus> = {
  "Demo Scheduled": "DemoScheduled",
  "Demo Completed": "DemoCompleted",
  "Ready for Enrollment": "ReadyForEnrollment",
  "Follow-up": "FollowUpInProgress",
  "Payment Pending": "PaymentPending",
  "Partially Paid": "PartiallyPaid",
  "Payment Received": "PaymentReceived",
  Enrolled: "Enrolled",
  "Not Interested": "NotInterested",
};

export function toApiConversionStatus(stage: ConversionStage): ApiConversionStatus {
  return STAGE_TO_API[stage];
}

export function toFrontendLead(booking: ApiDemoBooking): Lead {
  const demoDate = booking.scheduledStartAtUtc ? booking.scheduledStartAtUtc.slice(0, 10) : "";
  return {
    id: booking.id,
    childName: booking.childName,
    childAge: booking.childAge ?? 0,
    parentName: booking.parentName,
    phone: booking.parentPhone ?? "—",
    email: booking.parentEmail,
    // CRM provenance fields are not tracked by the API yet
    source: "Website Enquiry",
    teacherId: booking.teacherProfileId ?? "",
    teacherName: booking.teacherName ?? "",
    demoDate,
    demoSessionId: booking.classSessionId ?? undefined,
    extraChildren: booking.participants.filter((p) => p.isChild).map((p) => p.name),
    recommendedCourse: booking.departmentName ?? "—",
    conversionStage: STAGE_FROM_API[booking.conversionStatus],
    lastContactedOn: demoDate,
    nextFollowUpOn: booking.nextFollowUpOn ?? undefined,
    assignedTo: "",
    createdOn: demoDate,
    courseId: booking.courseId ?? undefined,
    paymentLinkUrl: booking.paymentLinkUrl ?? undefined,
    invoiceAmount: booking.invoiceAmount ?? undefined,
    invoiceAmountPaid: booking.invoiceAmountPaid ?? undefined,
    termsAcceptedAtUtc: booking.termsAcceptedAtUtc ?? undefined,
    paymentVerifiedAtUtc: booking.paymentVerifiedAtUtc ?? undefined,
    // Real per-note date/author history is fetched separately (see getDemoFollowUpNotes) once a
    // lead is opened -- the API no longer collapses every note ever logged into a single string.
    notes: [],
  };
}

export async function listDemoBookings(status?: ApiConversionStatus): Promise<ApiDemoBooking[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<ApiDemoBooking[]>(`/api/demo-bookings${query}`);
}

export async function getDemoBooking(id: string): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>(`/api/demo-bookings/${id}`);
}

/** One active teacher's load around a booking's slot — powers the reassignment page's availability view. */
export interface ApiTeacherWorkload {
  teacherProfileId: string;
  teacherName: string;
  departmentId: string | null;
  departmentName: string | null;
  /** True if this teacher already has an overlapping session at the booking's slot. */
  isBusyAtSlot: boolean;
  sessionsToday: number;
  sessionsThisWeek: number;
}

export async function getDemoTeacherWorkload(bookingId: string): Promise<ApiTeacherWorkload[]> {
  return apiFetch<ApiTeacherWorkload[]>(`/api/demo-bookings/${bookingId}/teacher-workload`);
}

/** One manual teacher reassignment on a demo booking, newest first. */
export interface ApiDemoReassignmentHistory {
  id: string;
  atUtc: string;
  actorName: string | null;
  oldTeacherName: string | null;
  newTeacherName: string;
  reason: string | null;
}

export async function getDemoReassignmentHistory(bookingId: string): Promise<ApiDemoReassignmentHistory[]> {
  return apiFetch<ApiDemoReassignmentHistory[]>(`/api/demo-bookings/${bookingId}/reassignment-history`);
}

/** Manually override the teacher assigned to a demo booking. */
export async function reassignDemoTeacher(bookingId: string, teacherProfileId: string, reason?: string): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>(`/api/demo-bookings/${bookingId}/teacher`, {
    method: "PUT",
    body: JSON.stringify({ teacherProfileId, reason: reason || undefined }),
  });
}

/** Moves a still-scheduled demo to a new date/time — re-checks the teacher's availability and
 *  the holiday calendar server-side, then re-sends the confirmation emails with the new time. */
export async function rescheduleDemoBooking(
  bookingId: string,
  scheduledStartAtUtc: string,
  scheduledEndAtUtc: string
): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>(`/api/demo-bookings/${bookingId}/reschedule`, {
    method: "PUT",
    body: JSON.stringify({ scheduledStartAtUtc, scheduledEndAtUtc }),
  });
}

export interface UpdateDemoBookingPayload {
  parentName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  childName: string;
  childAge: number | null;
  departmentId: string | null;
  /** Replaces the extra-invitee list: entries with an id are updated, new ones added, missing ones removed. */
  participants: ApiDemoParticipant[];
}

/** Corrects a booking's parent/child details (e.g. a mistyped email) without touching its slot,
 *  teacher or stage. The API emails the join link to any new or changed address while the demo
 *  is still upcoming. */
export async function updateDemoBooking(bookingId: string, payload: UpdateDemoBookingPayload): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>(`/api/demo-bookings/${bookingId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** Re-sends the demo's join link to the parent, every extra invitee, and the assigned teacher. */
export async function resendDemoLink(bookingId: string): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>(`/api/demo-bookings/${bookingId}/resend-link`, {
    method: "POST",
  });
}

/** The parent's join link for this demo, to copy and share manually (e.g. WhatsApp). Never expires. */
/** The full stable join URL and a genuinely short /m/{slug} form of the same link (for
 *  WhatsApp/SMS where every character counts) — both never expire on their own. */
export async function getDemoJoinLink(bookingId: string): Promise<{ joinUrl: string; shortUrl: string }> {
  return apiFetch<{ joinUrl: string; shortUrl: string }>(`/api/demo-bookings/${bookingId}/join-link`);
}

/** Permanently removes a demo booking (a test entry, a mistaken double-booking) and frees the
 *  teacher's slot. The API refuses this once the lead is already invoiced or Enrolled. */
export async function deleteDemoBooking(bookingId: string): Promise<void> {
  await apiFetch<void>(`/api/demo-bookings/${bookingId}`, { method: "DELETE" });
}

export async function createDemoBooking(input: {
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  childName: string;
  childAge?: number;
  departmentId?: string;
  /** Omit to auto-assign the least-loaded available teacher. */
  teacherProfileId?: string;
  scheduledStartAtUtc: string;
  scheduledEndAtUtc: string;
  participants?: ApiDemoParticipant[];
}): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>("/api/demo-bookings", {
    method: "POST",
    body: JSON.stringify({ participants: [], ...input }),
  });
}

/** A lead with no demo class, ready for a payment link: a family enrolling directly, or (with
 *  siblingOfBookingId, which copies the parent) a second child who sat in on a sibling's demo. */
export async function createDirectAdmissionLead(input: {
  siblingOfBookingId?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  childName: string;
  childAge?: number;
}): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>("/api/demo-bookings/direct-admission", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateConversionStatus(
  id: string,
  conversionStatus: ApiConversionStatus,
  note?: string,
  nextFollowUpOn?: string
): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>(`/api/demo-bookings/${id}/conversion-status`, {
    method: "PUT",
    body: JSON.stringify({ conversionStatus, note, nextFollowUpOn }),
  });
}

/** One follow-up note logged on a booking, with the actual logging user and timestamp. */
export interface ApiDemoBookingFollowUp {
  id: string;
  atUtc: string;
  loggedByName: string | null;
  note: string;
  nextFollowUpOn: string | null;
}

/** Every follow-up note ever logged on this booking, newest first. */
export async function listDemoFollowUpNotes(bookingId: string): Promise<ApiDemoBookingFollowUp[]> {
  return apiFetch<ApiDemoBookingFollowUp[]>(`/api/demo-bookings/${bookingId}/follow-up-notes`);
}

export interface ApiDemoFeedback {
  id: string;
  demoBookingId: string;
  childName: string;
  parentName: string;
  teacherProfileId: string;
  teacherName: string;
  academicLevel: string;
  strengths: string;
  improvementAreas: string;
  recommendedCourseId: string | null;
  recommendedCourseName: string | null;
  suggestedBatchType: "Individual" | "Group";
  remarks: string | null;
  submittedAtUtc: string;
}

/** Mandatory post-demo feedback; moves the booking to DemoCompleted. */
export async function submitDemoFeedback(
  demoBookingId: string,
  input: {
    academicLevel: string;
    strengths: string;
    improvementAreas: string;
    recommendedCourseId?: string;
    suggestedBatchType: "Individual" | "Group";
    remarks?: string;
  }
): Promise<ApiDemoFeedback> {
  return apiFetch<ApiDemoFeedback>(`/api/demo-bookings/${demoBookingId}/feedback`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listDemoFeedback(): Promise<ApiDemoFeedback[]> {
  return apiFetch<ApiDemoFeedback[]>("/api/demo-bookings/feedback");
}

/** Demo bookings assigned to the signed-in teacher. */
export async function listMyDemoBookings(): Promise<ApiDemoBooking[]> {
  return apiFetch<ApiDemoBooking[]>("/api/demo-bookings/mine");
}

/** The signed-in teacher's own submitted feedback. */
export async function listMyDemoFeedback(): Promise<ApiDemoFeedback[]> {
  return apiFetch<ApiDemoFeedback[]>("/api/demo-bookings/feedback/mine");
}

export function toFrontendFeedback(feedback: ApiDemoFeedback): DemoFeedback {
  return {
    id: feedback.id,
    childName: feedback.childName,
    parentName: feedback.parentName,
    teacherName: feedback.teacherName,
    demoDate: feedback.submittedAtUtc.slice(0, 10),
    academicLevel: feedback.academicLevel,
    strengths: feedback.strengths,
    improvementAreas: feedback.improvementAreas,
    recommendedCourse: feedback.recommendedCourseName ?? "—",
    suggestedBatchType: feedback.suggestedBatchType === "Individual" ? "1:1" : "group",
    remarks: feedback.remarks ?? "",
    submitted: true,
  };
}

/** Bookings still waiting on the teacher's mandatory feedback, as placeholder cards. */
export function toAwaitingFeedback(booking: ApiDemoBooking): DemoFeedback {
  return {
    id: booking.id,
    childName: booking.childName,
    parentName: booking.parentName,
    teacherName: "",
    demoDate: booking.scheduledStartAtUtc?.slice(0, 10) ?? "",
    academicLevel: "",
    strengths: "",
    improvementAreas: "",
    recommendedCourse: booking.departmentName ?? "—",
    suggestedBatchType: "1:1",
    remarks: "",
    submitted: false,
  };
}

/** "Admit manually": counselor completes admission for a parent who shares nothing by email. */
export interface ManualAdmissionPayload {
  parentName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  childFirstName: string;
  childLastName: string | null;
  childDateOfBirth: string;
  /** Recurring plan, where the org uses plans; otherwise null and courseId + amount bill a one-off course fee. */
  packagePlanId: string | null;
  courseId: string | null;
  /** Course fee to invoice; null uses the course price. */
  amount: number | null;
  batchId: string | null;
}

export interface AdmissionPaymentLink {
  booking: ApiDemoBooking;
  /** Parent-facing payment page to share; it shows the Terms & Conditions before paying. */
  paymentUrl: string;
  courseName: string;
  listPrice: number;
  amount: number;
  currency: string;
  /** Ready-to-copy text for the counsellor to send with the link. */
  shareMessage: string;
}

/** Counsellor issues the parent's payment link for a course at the agreed (discounted) amount. */
export async function sendAdmissionPaymentLink(
  bookingId: string,
  payload: { courseId: string; amount?: number }
): Promise<AdmissionPaymentLink> {
  return apiFetch<AdmissionPaymentLink>(`/api/demo-bookings/${bookingId}/payment-link`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Counsellor verified the payment: emails the parent's login automatically and moves the lead on. */
export async function verifyAndEnrollLead(bookingId: string): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>(`/api/demo-bookings/${bookingId}/enroll`, { method: "POST" });
}

export interface PublicAdmissionPayment {
  parentName: string;
  childName: string;
  courseName: string;
  amount: number;
  amountPaid: number;
  currency: string;
  isPaid: boolean;
  /** Only the parent's first payment asks for the Terms & Conditions. */
  termsRequired: boolean;
  termsUrl: string | null;
  termsText: string | null;
}

/** Anonymous: the /pay/{token} page's data. */
export async function getPublicAdmissionPayment(token: string): Promise<PublicAdmissionPayment> {
  return apiFetch<PublicAdmissionPayment>(`/api/public/admission-payments/${encodeURIComponent(token)}`);
}

/** Anonymous: records the Terms & Conditions acceptance and returns the gateway checkout URL. */
export async function startPublicAdmissionPayment(token: string, termsAccepted: boolean): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(`/api/public/admission-payments/${encodeURIComponent(token)}/start`, {
    method: "POST",
    body: JSON.stringify({ termsAccepted }),
  });
}

export interface ManualAdmissionOptions {
  plans: { id: string; name: string; courseName: string | null; price: number }[];
  courses: { id: string; name: string; departmentName: string; price: number }[];
  batches: { id: string; courseId: string; name: string; courseName: string; teacherName: string; seatsLeft: number }[];
}

export interface ManualAdmissionResult {
  booking: ApiDemoBooking;
  parentUserId: string;
  childId: string;
  /** What the parent types in the login box: email, or mobile number when they have none. */
  loginId: string;
  /** Only when this admission created the account; an existing parent keeps their PIN. */
  temporaryPin: string | null;
  loginUrl: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  amountDue: number;
  currency: string;
  paymentLinkUrl: string | null;
  paymentLinkError: string | null;
  whatsAppMessage: string;
}

export async function getManualAdmissionOptions(): Promise<ManualAdmissionOptions> {
  return apiFetch<ManualAdmissionOptions>("/api/demo-bookings/manual-admission/options");
}

export async function admitManually(bookingId: string, payload: ManualAdmissionPayload): Promise<ManualAdmissionResult> {
  return apiFetch<ManualAdmissionResult>(`/api/demo-bookings/${bookingId}/manual-admission`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
