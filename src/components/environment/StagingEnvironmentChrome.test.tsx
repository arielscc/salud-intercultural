import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StagingEnvironmentChrome } from "@/components/environment/StagingEnvironmentChrome";

describe("StagingEnvironmentChrome", () => {
  it("stays hidden outside staging", () => {
    render(<StagingEnvironmentChrome enabled={false} />);
    expect(screen.queryByTestId("staging-environment-banner")).not.toBeInTheDocument();
  });

  it("shows a persistent marker and blocks real contact links", () => {
    render(
      <>
        <StagingEnvironmentChrome enabled />
        <a href="https://wa.me/59164175822">WhatsApp</a>
      </>
    );

    const link = screen.getByRole("link", { name: "WhatsApp" });
    const clickResult = fireEvent.click(link);

    expect(clickResult).toBe(false);
    expect(screen.getByText("CONTACTO REAL BLOQUEADO")).toBeInTheDocument();
  });
});
