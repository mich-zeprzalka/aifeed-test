import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders title", () => {
    render(<EmptyState title="Brak wyników" />);
    expect(screen.getByText("Brak wyników")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<EmptyState title="Brak" description="Spróbuj ponownie" />);
    expect(screen.getByText("Spróbuj ponownie")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    const { container } = render(<EmptyState title="Brak" />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
  });

  it("renders icon when provided", () => {
    const { container } = render(<EmptyState icon={FileQuestion} title="Brak" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders action link when both label and href provided", () => {
    render(
      <EmptyState
        title="Brak"
        actionLabel="Strona główna"
        actionHref="/"
      />
    );
    const link = screen.getByText("Strona główna");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/");
  });
});
