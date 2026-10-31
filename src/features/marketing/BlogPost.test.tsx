import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import type { ApiBlogPostDetail } from "@/api/marketing";
import { ApiError } from "@/lib/api";
import BlogPost from "./BlogPost";

const mocks = vi.hoisted(() => ({ getBlogPost: vi.fn(), apiEnabled: vi.fn(() => true) }));
vi.mock("@/api/marketing", () => ({ getBlogPost: mocks.getBlogPost, listBlogPosts: vi.fn() }));
vi.mock("@/api/hooks", () => ({ useApiData: () => ({ data: [] }) }));
vi.mock("@/lib/api", () => ({
  apiEnabled: mocks.apiEnabled,
  ApiError: class extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));
vi.mock("@/lib/theme", () => ({ useLightBrandScope: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ useLang: () => ["en"] }));
vi.mock("@/components/Seo", () => ({
  Seo: ({ title, path, noindex = false }: { title: string; path: string; noindex?: boolean }) => (
    <div data-testid="seo" data-title={title} data-path={path} data-noindex={String(noindex)} />
  ),
}));
vi.mock("./MarketingNav", () => ({ MarketingNav: () => null }));
vi.mock("./MarketingFooter", () => ({ MarketingFooter: () => null }));
vi.mock("./PricingLink", () => ({ PricingLink: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function post(slug: string): ApiBlogPostDetail {
  return { slug, title: `Article ${slug}`, excerpt: `Summary ${slug}`, content: `Body ${slug}`,
    readMinutes: 2, publishedAtUtc: "2026-10-01T00:00:00Z" };
}

function renderPost() {
  return render(
    <MemoryRouter initialEntries={["/blog/first"]}>
      <Link to="/blog/second">Next post</Link>
      <Routes><Route path="/blog/:slug" element={<BlogPost />} /></Routes>
    </MemoryRouter>,
  );
}

describe("blog post navigation", () => {
  beforeEach(() => {
    mocks.getBlogPost.mockReset();
    mocks.apiEnabled.mockReturnValue(true);
  });

  it("clears the previous article while loading and noindexes a confirmed missing post", async () => {
    const next = deferred<ApiBlogPostDetail>();
    mocks.getBlogPost.mockResolvedValueOnce(post("first")).mockReturnValueOnce(next.promise);
    renderPost();
    expect(await screen.findByRole("heading", { name: "Article first" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Next post" }));
    expect(screen.queryByRole("heading", { name: "Article first" })).not.toBeInTheDocument();
    expect(screen.queryByText("Body first")).not.toBeInTheDocument();
    expect(screen.getByTestId("seo")).toHaveAttribute("data-path", "/blog/second");
    expect(screen.getByTestId("seo")).not.toHaveAttribute("data-title", expect.stringContaining("Article first"));
    expect(screen.getByTestId("seo")).toHaveAttribute("data-noindex", "false");
    await act(async () => next.reject(new ApiError(404, "Not found")));
    expect(screen.getByText("Couldn't find that post")).toBeInTheDocument();
    expect(screen.getByTestId("seo")).toHaveAttribute("data-noindex", "true");
    expect(screen.queryByText("Body first")).not.toBeInTheDocument();
  });

  it("ignores a response from the previous route after the new article has loaded", async () => {
    const first = deferred<ApiBlogPostDetail>();
    const second = deferred<ApiBlogPostDetail>();
    mocks.getBlogPost.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    renderPost();
    fireEvent.click(screen.getByRole("link", { name: "Next post" }));
    await act(async () => second.resolve(post("second")));
    expect(screen.getByRole("heading", { name: "Article second" })).toBeInTheDocument();
    await act(async () => first.resolve(post("first")));
    expect(screen.getByRole("heading", { name: "Article second" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Article first" })).not.toBeInTheDocument();
    expect(screen.getByTestId("seo")).toHaveAttribute("data-path", "/blog/second");
    expect(screen.getByTestId("seo")).toHaveAttribute("data-title", expect.stringContaining("Article second"));
  });

  it("does not treat a temporary request failure as a confirmed missing post", async () => {
    mocks.getBlogPost.mockResolvedValueOnce(post("first")).mockRejectedValueOnce(new ApiError(503, "Temporarily unavailable"));
    renderPost();
    await screen.findByRole("heading", { name: "Article first" });
    fireEvent.click(screen.getByRole("link", { name: "Next post" }));
    expect(await screen.findByText("Couldn't load this post (Temporarily unavailable).")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Article first" })).not.toBeInTheDocument();
    expect(screen.getByTestId("seo")).toHaveAttribute("data-noindex", "false");
  });
});
