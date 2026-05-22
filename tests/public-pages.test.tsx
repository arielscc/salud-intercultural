import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/(public)/page";
import ContactoPage from "@/app/(public)/contacto/page";

vi.mock("@/lib/cms/public-content", async () => {
  const fixtures = await import("./fixtures/public-content");

  return {
    getFeaturedFaqs: (faqs: typeof fixtures.publicFaqsFixture.data) =>
      faqs.filter((faq) => faq.active && faq.featured),
    getFeaturedTestimonials: (testimonials: typeof fixtures.publicTestimonialsFixture.data) =>
      testimonials.filter((testimonial) => testimonial.active && testimonial.featured),
    getPublicFaqs: vi.fn(async () => fixtures.publicFaqsFixture),
    getPublicHomeContent: vi.fn(async () => fixtures.publicHomeFixture),
    getPublicPageMetadata: vi.fn(async () => ({
      title: "Mock metadata",
      description: "Mock metadata description"
    })),
    getPublicServices: vi.fn(async () => fixtures.publicServicesFixture),
    getPublicTestimonials: vi.fn(async () => fixtures.publicTestimonialsFixture),
    getSiteSettings: vi.fn(async () => fixtures.siteSettingsFixture)
  };
});

describe("public page renders", () => {
  it("renders the home page shell with fallback content", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /medicina natural y tradicional para cuidar tu salud/i
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Contenido administrable")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "contenido-principal");
  });

  it("renders the contact page shell and lead form", async () => {
    render(await ContactoPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /comunícate con salud intercultural/i
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: /formulario principal de contacto/i
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });
});
