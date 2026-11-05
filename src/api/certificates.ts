import { apiFetch, downloadFile } from "@/lib/api";

export interface ApiCertificate {
  id: string;
  childId: string;
  batchId: string | null;
  code: string;
  studentName: string;
  courseName: string;
  teacherName: string | null;
  batchName: string | null;
  issuedAtUtc: string;
  revokedAtUtc: string | null;
  revokedReason: string | null;
}

export interface ApiCertificateCheck {
  valid: boolean;
  revoked: boolean;
  code: string;
  studentName: string;
  courseName: string;
  issuedAtUtc: string;
  academyName: string;
}

const fileName = (c: ApiCertificate) => `certificate-${`${c.studentName}-${c.courseName}`.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;

// Staff
export const listCertificates = () => apiFetch<ApiCertificate[]>("/api/certificates");
export const issueDueCertificates = () => apiFetch<{ issued: number }>("/api/certificates/issue-due", { method: "POST" });
export const revokeCertificate = (id: string, reason: string) =>
  apiFetch<ApiCertificate>(`/api/certificates/${id}/revoke`, { method: "POST", body: JSON.stringify({ reason: reason.trim() || null }) });
export const reissueCertificate = (c: ApiCertificate) =>
  apiFetch<ApiCertificate>("/api/certificates", { method: "POST", body: JSON.stringify({ childId: c.childId, batchId: c.batchId, courseName: c.batchId ? null : c.courseName }) });
export const downloadCertificate = (c: ApiCertificate) => downloadFile(`/api/certificates/${c.id}/pdf`, fileName(c));

// Families
export const listMyCertificates = () => apiFetch<ApiCertificate[]>("/api/certificates/mine");
export const downloadMyCertificate = (c: ApiCertificate) => downloadFile(`/api/certificates/mine/${c.id}/pdf`, fileName(c));

// Public
export const verifyCertificate = (code: string) => apiFetch<ApiCertificateCheck>(`/api/certificates/verify/${encodeURIComponent(code)}`);

/** The public link printed in the QR code: same academy path as the current page. */
export function verifyUrl(code: string): string {
  const tenant = window.location.pathname.match(/^\/t\/[a-z][a-z0-9-]{2,49}/)?.[0] ?? "";
  return `${window.location.origin}${tenant}/verify/${code}`;
}
