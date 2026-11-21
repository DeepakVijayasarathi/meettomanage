import { afterEach, describe, expect, it, vi } from "vitest";
import { askSalesAssistant } from "./marketing";

describe("website sales chat logging", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the stable conversation id and visitor attribution used by the Chats console", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ reply: "Hello" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await askSalesAssistant(
      [{ role: "user", text: "What is included?" }],
      { visitorId: "visitor-123", source: "google", campaign: "launch", landingPath: "/pricing" },
      "conversation-123",
    );

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/marketing/chat");
    expect(JSON.parse(String(init.body))).toEqual({
      messages: [{ role: "user", text: "What is included?" }],
      attribution: { visitorId: "visitor-123", source: "google", campaign: "launch", landingPath: "/pricing" },
      conversationId: "conversation-123",
    });
  });
});
