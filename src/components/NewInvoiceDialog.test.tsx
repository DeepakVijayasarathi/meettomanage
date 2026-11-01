import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NewInvoiceDialog } from "./NewInvoiceDialog";

// Behave as with a live API (tests otherwise run in demo mode, where data hooks never fetch).
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), apiEnabled: () => true }));
vi.mock("@/api/users", () => ({ listStudents: vi.fn(async () => [{ id: "c1", parentId: "p1", name: "Aarav QA", parentName: "QA Parent" }]) }));
vi.mock("@/api/courses", () => ({ listCourses: vi.fn(async () => [{ id: "k1", name: "Phonics", departmentId: "d1", isActive: true }]) }));
vi.mock("@/api/departments", () => ({ listDepartments: vi.fn(async () => [{ id: "d1", name: "Languages", description: null, isActive: true }]) }));
vi.mock("@/api/billing", () => ({ createInvoice: vi.fn() }));

describe("NewInvoiceDialog", () => {
  it("loads students, courses and departments when it is opened", async () => {
    const { listStudents } = await import("@/api/users");
    const { rerender } = render(<NewInvoiceDialog open={false} onOpenChange={() => {}} onCreated={() => {}} />);
    expect(listStudents).not.toHaveBeenCalled();
    rerender(<NewInvoiceDialog open onOpenChange={() => {}} onCreated={() => {}} />);
    await waitFor(() => expect(listStudents).toHaveBeenCalled());
    // the first department is pre-selected once the list arrives
    await waitFor(() => expect(screen.getByText("Languages")).toBeTruthy());
  });
});
