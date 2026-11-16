import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RouteErrorBoundary } from "@/components/shared/route-error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function Boom(): React.ReactElement {
  throw new Error("Broken route");
}

describe("controls", () => {
  it("clicks a button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Primary</Button>);
    await user.click(screen.getByRole("button", { name: "Primary" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("associates an input with its label and error", () => {
    render(<Input label="Email" error="Enter a valid email address." />);
    const field = screen.getByLabelText("Email");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a valid email address.");
  });

  it("renders a table", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Primary</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole("columnheader", { name: "Token" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Primary" })).toBeInTheDocument();
  });

  it("renders the route error boundary with a retry control", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <Boom />,
          errorElement: <RouteErrorBoundary />,
        },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Broken route");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
