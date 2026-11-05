import { apiFetch } from "@/lib/api";
import type { ApiInvoice } from "@/api/billing";

export interface ApiDiscountCode {
  id: string;
  code: string;
  description: string | null;
  percentOff: number | null;
  amountOff: number | null;
  validFromUtc: string | null;
  validUntilUtc: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  oncePerFamily: boolean;
  courseId: string | null;
  courseName: string | null;
  isActive: boolean;
  totalDiscounted: number;
}

export interface SaveDiscountCode {
  code: string;
  description?: string | null;
  percentOff?: number | null;
  amountOff?: number | null;
  validFromUtc?: string | null;
  validUntilUtc?: string | null;
  maxRedemptions?: number | null;
  oncePerFamily: boolean;
  courseId?: string | null;
  isActive: boolean;
}

export const SIBLING_DISCOUNT_SETTING = "billing.siblingDiscountPercent";

export const listDiscountCodes = () => apiFetch<ApiDiscountCode[]>("/api/discount-codes");
export const createDiscountCode = (body: SaveDiscountCode) =>
  apiFetch<ApiDiscountCode>("/api/discount-codes", { method: "POST", body: JSON.stringify(body) });
export const updateDiscountCode = (id: string, body: SaveDiscountCode) =>
  apiFetch<ApiDiscountCode>(`/api/discount-codes/${id}`, { method: "PUT", body: JSON.stringify(body) });
export const applyDiscountToMyInvoice = (invoiceId: string, code: string) =>
  apiFetch<ApiInvoice>(`/api/discount-codes/mine/invoices/${invoiceId}`, { method: "POST", body: JSON.stringify({ code: code.trim() }) });

/** "10% off" or "₹500 off". */
export function describeDiscount(c: Pick<ApiDiscountCode, "percentOff" | "amountOff">): string {
  if (c.percentOff != null) return `${Number(c.percentOff)}% off`;
  if (c.amountOff != null) return `₹${Number(c.amountOff).toLocaleString("en-IN")} off`;
  return "—";
}
