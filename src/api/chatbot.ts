import { apiFetch } from "@/lib/api";

export interface ApiChatFaq {
  id: string;
  question: string;
  answer: string;
  keywords: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface SaveChatFaqRequest {
  question: string;
  answer: string;
  keywords: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
}

export type ChatMessageSender = "User" | "Bot";

export interface ApiChatMessage {
  id: string;
  sender: ChatMessageSender;
  text: string;
  matchedFaqId: string | null;
  /** Null until rated; only meaningful on a Bot message that matched an FAQ. */
  wasHelpful: boolean | null;
  createdAtUtc: string;
}

export interface AskChatbotResponse {
  userMessage: ApiChatMessage;
  botMessage: ApiChatMessage;
  matched: boolean;
  escalated: boolean;
}

export type ChatEscalationStatus = "Pending" | "Resolved";

export interface ApiChatEscalation {
  id: string;
  userId: string;
  userName: string;
  status: ChatEscalationStatus;
  question: string;
  resolutionNote: string | null;
  resolvedByUserId: string | null;
  resolvedByName: string | null;
  resolvedAtUtc: string | null;
  createdAtUtc: string;
}

export interface ApiChatbotUsageStats {
  totalQuestions: number;
  answeredByBot: number;
  escalatedToTeacher: number;
  pendingEscalations: number;
  activeUsers: number;
  markedUnhelpful: number;
  topUnansweredQuestions: string[];
}

export interface AiChatConfiguration {
  enabled: boolean;
  endpoint: string;
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  hasApiKey: boolean;
  maskedApiKey: string;
  inputCostPerMillionTokensUsd: number;
  outputCostPerMillionTokensUsd: number;
  monthlyBudgetUsd: number;
}

export interface UpdateAiChatConfiguration extends Omit<AiChatConfiguration, "hasApiKey" | "maskedApiKey"> {
  apiKey?: string;
  clearApiKey?: boolean;
}

export async function getAiChatConfiguration(): Promise<AiChatConfiguration> {
  return apiFetch<AiChatConfiguration>("/api/chatbot/admin/ai-configuration");
}

export async function updateAiChatConfiguration(request: UpdateAiChatConfiguration): Promise<AiChatConfiguration> {
  return apiFetch<AiChatConfiguration>("/api/chatbot/admin/ai-configuration", { method: "PUT", body: JSON.stringify(request) });
}

export async function testAiChat(message: string): Promise<{ answer: string }> {
  return apiFetch<{ answer: string }>("/api/chatbot/admin/ai-configuration/test", { method: "POST", body: JSON.stringify({ message }) });
}

export async function listAiModels(): Promise<string[]> {
  return (await apiFetch<{ models: string[] }>("/api/chatbot/admin/ai-configuration/models")).models;
}

export interface AiCostMonitor {
  periodLabel: string; requests: number; successfulRequests: number; failedRequests: number;
  inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd: number;
  monthlyBudgetUsd: number; budgetUsedPercent: number; pricingConfigured: boolean; generatedAtUtc: string;
}

export async function getAiCostMonitor(): Promise<AiCostMonitor> {
  return apiFetch<AiCostMonitor>("/api/chatbot/admin/ai-cost-monitor");
}

export interface BusinessAiBrief {
  executiveSummary: string;
  aiPowered: boolean;
  generatedAtUtc: string;
  costSnapshot: {
    periodLabel: string;
    collectedRevenue: number;
    outstandingRevenue: number;
    overdueRevenue: number;
    overdueInvoiceCount: number;
    teacherPayoutCost: number;
    staffPayrollCost: number;
    totalPeopleCost: number;
    estimatedContribution: number;
    estimatedMarginPercent: number | null;
    projectedMonthRevenue: number;
    projectedMonthContribution: number;
    forecastBasis: string;
    costPerActiveEnrollment: number | null;
    activeEnrollmentCount: number;
    eligibleStaffCount: number;
    configuredStaffCount: number;
    hasRecordedPeopleCosts: boolean;
    coverageNote: string;
  };
  studentProgressInsights: { childId: string; childName: string; attendancePercent: number | null; engagementScore: number; priority: "Action needed" | "Monitor" | "On track"; insight: string }[];
  recentClassSummaries: { sessionId: string; className: string; teacherName: string; completedAtUtc: string; summary: string }[];
}

export async function getBusinessAiBrief(): Promise<BusinessAiBrief> {
  return apiFetch<BusinessAiBrief>("/api/chatbot/business-brief");
}

export interface BusinessCopilotMessage { role: "user" | "assistant"; content: string }
export async function askBusinessCopilot(question: string, history: BusinessCopilotMessage[]): Promise<{ answer: string; aiPowered: boolean; generatedAtUtc: string }> {
  return apiFetch("/api/chatbot/business-copilot", { method: "POST", body: JSON.stringify({ question, history }) });
}

/** Active FAQs — every signed-in role, used by the widget's browse view and local matching. */
export async function listActiveFaqs(): Promise<ApiChatFaq[]> {
  return apiFetch<ApiChatFaq[]>("/api/chatbot/faqs");
}

/** Asks the bot a question; records both turns and escalates to a teacher when nothing matches. */
export async function askChatbot(message: string): Promise<AskChatbotResponse> {
  return apiFetch<AskChatbotResponse>("/api/chatbot/ask", { method: "POST", body: JSON.stringify({ message }) });
}

/** The signed-in user's own chat history — private to them, like FloatingNotes. */
export async function listMyChatHistory(): Promise<ApiChatMessage[]> {
  return apiFetch<ApiChatMessage[]>("/api/chatbot/history");
}

/**
 * Rates a bot answer. Marking it unhelpful escalates the original question to a teacher —
 * a matched FAQ isn't automatically the right answer, so this is a second escalation path
 * alongside "nothing matched at all".
 */
export async function submitChatFeedback(messageId: string, helpful: boolean, originalQuestion: string): Promise<ApiChatMessage> {
  return apiFetch<ApiChatMessage>(`/api/chatbot/messages/${messageId}/feedback`, {
    method: "PUT",
    body: JSON.stringify({ helpful, originalQuestion }),
  });
}

/** All FAQs including inactive ones — admin/sub-admin FAQ management. */
export async function listAllFaqs(): Promise<ApiChatFaq[]> {
  return apiFetch<ApiChatFaq[]>("/api/chatbot/admin/faqs");
}

export async function createChatFaq(request: SaveChatFaqRequest): Promise<ApiChatFaq> {
  return apiFetch<ApiChatFaq>("/api/chatbot/admin/faqs", { method: "POST", body: JSON.stringify(request) });
}

export async function updateChatFaq(id: string, request: SaveChatFaqRequest): Promise<ApiChatFaq> {
  return apiFetch<ApiChatFaq>(`/api/chatbot/admin/faqs/${id}`, { method: "PUT", body: JSON.stringify(request) });
}

export async function deleteChatFaq(id: string): Promise<void> {
  await apiFetch<void>(`/api/chatbot/admin/faqs/${id}`, { method: "DELETE" });
}

/** Doubts the bot escalated — admin/sub-admin/teacher triage. Omit status for every escalation. */
export async function listChatEscalations(status?: ChatEscalationStatus): Promise<ApiChatEscalation[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<ApiChatEscalation[]>(`/api/chatbot/escalations${query}`);
}

export async function resolveChatEscalation(id: string, resolutionNote: string): Promise<ApiChatEscalation> {
  return apiFetch<ApiChatEscalation>(`/api/chatbot/escalations/${id}/resolve`, {
    method: "PUT",
    body: JSON.stringify({ resolutionNote }),
  });
}

export async function getChatbotUsageStats(): Promise<ApiChatbotUsageStats> {
  return apiFetch<ApiChatbotUsageStats>("/api/chatbot/usage-stats");
}
