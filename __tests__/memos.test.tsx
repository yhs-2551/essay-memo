import { vi } from "vitest";

// Mock dependencies
vi.mock("@/components/background", () => ({
    Background: ({ children }: { children: React.ReactNode }) => <div data-testid='background'>{children}</div>,
}));

vi.mock("next/link", () => ({
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("next-themes", () => ({
    useTheme: () => ({ theme: "dark" }),
}));
