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
  | "NotInterested";

export interface ApiDemoParticipant {
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
  scheduledStartAtUtc: string | null;
  meetingRoomId: string | null;
  /** Teacher conducting (or who conducted) the demo. */
  teacherProfileId: string | null;
  teacherName: string | null;
  /** Auto-calculated demo fee: ₹50 per demo, ₹100 once Enrolled. */
  payableAmount: number;
  participants: ApiDemoParticipant[];
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
  FollowUpInProgress: "Follow-up",
  PaymentPending: "Payment Pending",
  PartiallyPaid: "Partially Paid",
  Enrolled: "Enrolled",
  NotInterested: "Not Interested",
};

const STAGE_TO_API: Record<ConversionStage, ApiConversionStatus> = {
  "Demo Scheduled": "DemoScheduled",
  "Demo Completed": "DemoCompleted",
  "Follow-up": "FollowUpInProgress",
  "Payment Pending": "PaymentPending",
  "Partially Paid": "PartiallyPaid",
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
    recommendedCourse: booking.departmentName ?? "—",
    conversionStage: STAGE_FROM_API[booking.conversionStatus],
    lastContactedOn: demoDate,
    assignedTo: "",
    createdOn: demoDate,
    notes: booking.followUpNotes
      ? [{ id: `${booking.id}-notes`, date: demoDate, note: booking.followUpNotes, loggedBy: "Admission team" }]
      : [],
  };
}

export async function listDemoBookings(status?: ApiConversionStatus): Promise<ApiDemoBooking[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<ApiDemoBooking[]>(`/api/demo-bookings${query}`);
}

export async function createDemoBooking(input: {
  parentName: string;
  parentEmail: string;
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

export async function updateConversionStatus(
  id: string,
  conversionStatus: ApiConversionStatus,
  followUpNotes?: string
): Promise<ApiDemoBooking> {
  return apiFetch<ApiDemoBooking>(`/api/demo-bookings/${id}/conversion-status`, {
    method: "PUT",
    body: JSON.stringify({ conversionStatus, followUpNotes }),
  });
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
