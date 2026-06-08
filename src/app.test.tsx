// biome-ignore-all lint/performance/useTopLevelRegex: This doesn't get called often to be a performance bottleneck
// biome-ignore-all lint/style/useThrowOnlyError: Tauri IPC requires throwing strings
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./app";

describe("App", () => {
  beforeEach(() => {
    mockIPC((cmd, args) => {
      if (cmd === "plugin:log|log") {
        return;
      }

      if (cmd === "greet") {
        const name = (args as { name: string }).name;

        if (!name?.trim()) {
          throw "Name cannot be empty";
        }

        if (name.length > 100) {
          throw "Name is too long (max 100 characters)";
        }

        return `Hello, ${name.trim()}! You've been greeted from Rust!`;
      }
      throw `Unknown command: ${cmd}`;
    });
  });

  afterEach(() => {
    clearMocks();
  });

  it("renders the welcome heading", () => {
    render(<App />);
    expect(screen.getByText(/Welcome to Tauri \+ React/i)).toBeInTheDocument();
  });

  it("renders the logo links", () => {
    render(<App />);
    expect(screen.getByAltText("Vite logo")).toBeInTheDocument();
    expect(screen.getByAltText("Tauri logo")).toBeInTheDocument();
    expect(screen.getByAltText("React logo")).toBeInTheDocument();
  });

  it("greets the user when form is submitted with a valid name", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByPlaceholderText(/Enter a name/i);
    const button = screen.getByRole("button", { name: /Greet/i });

    await user.type(input, "World");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Hello, World!/i)).toBeInTheDocument();
    });
  });

  it("shows error when submitting empty name", async () => {
    const user = userEvent.setup();
    render(<App />);

    const button = screen.getByRole("button", { name: /Greet/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Error:/i)).toBeInTheDocument();
    });
  });

  it("trims whitespace from name input", async () => {
    const user = userEvent.setup();
    render(<App />);

    const input = screen.getByPlaceholderText(/Enter a name/i);
    const button = screen.getByRole("button", { name: /Greet/i });

    await user.type(input, "  Alice  ");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Hello, Alice!/i)).toBeInTheDocument();
    });
  });
});
