import { apiFetch } from "@/lib/api";

const J = (body: unknown) => JSON.stringify(body);

// ===== Types =====

export type ReviewSource = "internal" | "capterra" | "g2" | "google" | "linkedin" | "whatsapp";
export type ReviewStatus = "pending" | "sent" | "replied" | "declined" | "expired";
export type ReviewPlatform = "capterra" | "g2" | "google" | "linkedin" | "website";

export interface Review {
  id: string;
  source: ReviewSource;
  rating: number;
  authorName: string;
  authorRole?: string;
  text: string;
  response?: string;
  reviewUrl?: string;
  isVisible: boolean;
  academyTenantId?: string | null;
  createdAtUtc: string;
}

export interface AggregateRating {
  averageRating: number;
  totalReviews: number;
  visibleReviews: number;
  ratingBreakdown: Record<string, number>;
  reviewsBySource: Record<string, number>;
}

export interface CreateReviewInput {
  source: ReviewSource;
  rating: number;
  authorName: string;
  authorRole?: string;
  text: string;
  response?: string;
  reviewUrl?: string;
  isVisible?: boolean;
  academyTenantId?: string | null;
}

export interface UpdateReviewInput {
  rating?: number;
  authorName?: string;
  authorRole?: string;
  text?: string;
  response?: string;
  reviewUrl?: string;
  isVisible?: boolean;
}

export interface ReviewRequest {
  id: string;
  contactName: string;
  contactMethod: string; // "email" | "whatsapp"
  contactValue: string;
  platform: ReviewPlatform;
  status: ReviewStatus;
  sentUrl?: string;
  sentAtUtc?: string | null;
  expiresAtUtc?: string | null;
  academyTenantId?: string | null;
  createdAtUtc: string;
}

export interface CreateReviewRequestInput {
  contactName: string;
  contactMethod: string;
  contactValue: string;
  platform: ReviewPlatform;
  academyTenantId?: string | null;
}

// ===== API Functions =====

export const getAggregateRating = () =>
  apiFetch<AggregateRating>("/api/reviews/aggregate-rating");

export const listPublicReviews = (page = 1, pageSize = 10) =>
  apiFetch<{ items: Review[]; totalCount: number; page: number; pageSize: number }>(
    `/api/reviews/public?page=${page}&pageSize=${pageSize}`
  );

export const getLatestReview = () =>
  apiFetch<Review | null>("/api/reviews/latest");

// Admin: CRUD reviews
export const listAdminReviews = () =>
  apiFetch<{ items: Review[]; totalCount: number }>("/api/reviews");

export const createReview = (input: CreateReviewInput) =>
  apiFetch<{ review: Review }>("/api/reviews", {
    method: "POST",
    body: J(input),
  });

export const updateReview = (id: string, input: UpdateReviewInput) =>
  apiFetch<{ review: Review }>(`/api/reviews/${id}`, {
    method: "PUT",
    body: J(input),
  });

export const deleteReview = (id: string) =>
  apiFetch<void>(`/api/reviews/${id}`, { method: "DELETE" });

export const getReview = (id: string) =>
  apiFetch<Review>(`/api/reviews/${id}`);

// Admin: Review requests
export const listReviewRequests = () =>
  apiFetch<{ items: ReviewRequest[]; count: number }>("/api/reviews/requests");

export const createReviewRequest = (input: CreateReviewRequestInput) =>
  apiFetch<{ result: ReviewRequest }>("/api/reviews/requests", {
    method: "POST",
    body: J(input),
  });

export const sendReviewRequest = (id: string) =>
  apiFetch<{ result: ReviewRequest; sentUrl: string }>(
    `/api/reviews/requests/${id}/send`,
    { method: "POST" }
  );

export const updateReviewRequestStatus = (id: string, status: ReviewStatus) =>
  apiFetch<{ result: ReviewRequest }>(`/api/reviews/requests/${id}`, {
    method: "PUT",
    body: J({ status }),
  });
