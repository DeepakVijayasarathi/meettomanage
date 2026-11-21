import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const createQuizQuestion = vi.fn().mockResolvedValue({});
vi.mock("@/api/quizQuestions", () => ({ createQuizQuestion: (...a: unknown[]) => createQuizQuestion(...a) }));
vi.mock("@/api/departments", () => ({ listDepartments: () => Promise.resolve([{ id: "d1", name: "Phonics", description: null, isActive: true }]) }));
vi.mock("@/api/courses", () => ({ listCourses: () => Promise.resolve([]) }));
import { RichBlock } from "./richBlocks";

describe("RichBlock", () => {
  it("renders a table and filters rows", () => {
    render(<RichBlock lang="table" raw={JSON.stringify({ title: "Overdue", columns: ["Parent", "Amount"], rows: [["A. Rao", "1500"], ["B. Khan", "900"]] })} />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Filter"), { target: { value: "khan" } });
    expect(screen.queryByText("A. Rao")).not.toBeInTheDocument();
    expect(screen.getByText("B. Khan")).toBeInTheDocument();
  });

  it("renders a class plan timeline", () => {
    render(<RichBlock lang="classplan" raw={JSON.stringify({ title: "Short vowels", subject: "Phonics", duration: "45 min", steps: [{ time: "0-5", title: "Warm-up", activity: "Song" }], homework: "Read 5 words" })} />);
    expect(screen.getByText("Warm-up")).toBeInTheDocument();
    expect(screen.getByText(/Read 5 words/)).toBeInTheDocument();
  });

  it("scores a quiz", () => {
    render(<RichBlock lang="quiz" raw={JSON.stringify({ title: "Vowels", questions: [{ q: "Pick cat", options: ["cake", "cat"], answer: 1 }] })} />);
    fireEvent.click(screen.getByText("cat"));
    fireEvent.click(screen.getByText(/Check answers/));
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("shows an error for invalid JSON instead of crashing", () => {
    render(<RichBlock lang="chart" raw="{not json" />);
    expect(screen.getByText(/Couldn't display this chart block/)).toBeInTheDocument();
  });

  it("pushes every quiz question to the live quiz bank after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<RichBlock lang="quiz" raw={JSON.stringify({ title: "Vowels", questions: [{ q: "Pick cat", options: ["cake", "cat"], answer: 1 }, { q: "Pick hot", options: ["hot", "hope", "boat"], answer: 0 }] })} />);
    fireEvent.click(screen.getByText("Save to bank"));
    fireEvent.change(await screen.findByLabelText("Department"), { target: { value: "d1" } });
    fireEvent.click(screen.getByText("Push 2 questions"));
    await waitFor(() => expect(createQuizQuestion).toHaveBeenCalledTimes(2));
    expect(createQuizQuestion).toHaveBeenNthCalledWith(1, {
      departmentId: "d1",
      prompt: "Pick cat",
      options: [{ text: "cake", isCorrect: false }, { text: "cat", isCorrect: true }],
    });
    expect(await screen.findByText("2 saved")).toBeInTheDocument();
  });
});
