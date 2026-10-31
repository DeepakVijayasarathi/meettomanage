import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LiteracyGame } from "./LiteracyGame";

function start() {
  fireEvent.click(screen.getByRole("button", { name: "Start playing" }));
}

function alphabetAnswer() {
  const prompt = screen.getByRole("heading", { name: /Which lowercase letter matches/ }).textContent ?? "";
  const capital = prompt.match(/matches ([A-Z])\?/i)?.[1];
  if (!capital) throw new Error("An uppercase prompt should be present");
  return capital.toLowerCase();
}

function chooseAlphabetAnswer() {
  fireEvent.click(within(screen.getByRole("group", { name: "Choose your answer" })).getByRole("button", { name: alphabetAnswer() }));
}

describe("LiteracyGame", () => {
  beforeEach(() => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts only on request and gives no first-try point after a wrong answer", () => {
    render(<LiteracyGame mode="alphabet" />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    start();
    const choices = within(screen.getByRole("group", { name: "Choose your answer" }));
    const correct = alphabetAnswer();
    const wrong = choices.getAllByRole("button").find(button => button.textContent !== correct)!;
    expect(screen.getByRole("button", { name: "Next question" })).toBeDisabled();
    fireEvent.click(wrong);
    expect(screen.getByText("Good try. Take another look and choose again.")).toBeInTheDocument();
    expect(screen.getByText("First-try score: 0")).toBeInTheDocument();
    chooseAlphabetAnswer();
    expect(screen.getByText("You found it! Practice helps us learn.")).toBeInTheDocument();
    expect(screen.getByText("First-try score: 0")).toBeInTheDocument();
    expect(choices.getAllByRole("button").every(button => button.hasAttribute("disabled"))).toBe(true);
    fireEvent.click(choices.getByRole("button", { name: correct }));
    expect(screen.getByText("First-try score: 0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByText("Question 2 of 8")).toBeInTheDocument();
    chooseAlphabetAnswer();
    expect(screen.getByText("First-try score: 1")).toBeInTheDocument();
  });

  it("finishes eight distinct alphabet questions and resets the score on replay", () => {
    render(<LiteracyGame mode="alphabet" />);
    start();
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      seen.add(alphabetAnswer());
      chooseAlphabetAnswer();
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(i + 1));
      fireEvent.click(screen.getByRole("button", { name: i === 7 ? "See how you did" : "Next question" }));
    }
    expect(seen.size).toBe(8);
    expect(screen.getByRole("heading", { name: "You finished all 8 questions!" })).toHaveFocus();
    expect(screen.getByText("First-try score: 8 out of 8")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    expect(screen.getByText("Question 1 of 8")).toBeInTheDocument();
    expect(screen.getByText("First-try score: 0")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("allows the listening game to continue using a written clue without speech support", () => {
    render(<LiteracyGame mode="sounds" />);
    start();
    expect(screen.getByRole("status")).toHaveTextContent("Audio is unavailable here");
    const clue = screen.getByRole("status").textContent?.match(/Find: ([a-z]+)/)?.[1];
    if (!clue) throw new Error("The answer should be available as a text clue");
    fireEvent.click(screen.getByRole("button", { name: clue }));
    fireEvent.click(screen.getByRole("button", { name: "Next question" }));
    expect(screen.getByText("Question 2 of 8")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Find:");
  });

  it("never autoplays and falls back to a clue if speech reports an error", () => {
    class FakeUtterance {
      text: string;
      onerror: (() => void) | null = null;
      constructor(value: string) { this.text = value; }
    }
    const speak = vi.fn((utterance: FakeUtterance) => utterance.onerror?.());
    const cancel = vi.fn();
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("speechSynthesis", { speak, cancel, getVoices: () => [] });
    render(<LiteracyGame mode="sounds" />);
    start();
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Hear the word" }));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Audio is unavailable here");
    const clue = screen.getByRole("status").textContent?.match(/Find: ([a-z]+)/)?.[1];
    expect(clue).toBe(speak.mock.calls[0][0].text);
  });

  it("cancels active audio and resets the session when changing modes", () => {
    class FakeUtterance { constructor(public text: string) {} }
    const cancel = vi.fn();
    const speak = vi.fn();
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("speechSynthesis", { speak, cancel, getVoices: () => [{ lang: "en-GB" }] });
    const { rerender } = render(<LiteracyGame mode="sounds" />);
    start();
    fireEvent.click(screen.getByRole("button", { name: "Hear the word" }));
    expect(speak).toHaveBeenCalledTimes(1);
    rerender(<LiteracyGame mode="phonics" />);
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Start playing" })).toBeInTheDocument();
    start();
    const prompt = screen.getByRole("heading", { name: /Which letter starts the word/ }).textContent ?? "";
    const word = prompt.match(/word ([a-z]+)\?/)?.[1];
    expect(word).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: word![0] }));
    expect(screen.getByText("First-try score: 1")).toBeInTheDocument();
  });

  it("speaks the whole example word in phonics mode, never an isolated letter", () => {
    class FakeUtterance { constructor(public text: string) {} }
    const speak = vi.fn();
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn(), getVoices: () => [] });
    render(<LiteracyGame mode="phonics" />);
    start();
    const prompt = screen.getByRole("heading", { name: /Which letter starts the word/ }).textContent ?? "";
    const word = prompt.match(/word ([a-z]+)\?/)?.[1];
    expect(speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Hear the word" }));
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe(word);
    expect(speak.mock.calls[0][0].text.length).toBeGreaterThan(1);
  });
});
