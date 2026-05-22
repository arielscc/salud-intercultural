import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistedLead, validLeadInput } from "../../../../tests/fixtures/leads";
import { createLeadRecord } from "@/modules/database/queries/leads";
import { POST } from "@/app/api/leads/route";

vi.mock("@/modules/database/queries/leads", () => ({
  createLeadRecord: vi.fn()
}));

const createLeadRecordMock = vi.mocked(createLeadRecord);

function createJsonRequest(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost:3000/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  createLeadRecordMock.mockReset();
  delete (globalThis as typeof globalThis & {
    __saludInterculturalLeadRateLimit?: unknown;
  }).__saludInterculturalLeadRateLimit;
});

describe("POST /api/leads", () => {
  it("validates and persists a sanitized lead", async () => {
    createLeadRecordMock.mockResolvedValue(persistedLead);

    const response = await POST(
      createJsonRequest({
        ...validLeadInput,
        name: "  Paciente   Test  ",
        email: "PACIENTE@EXAMPLE.COM"
      })
    );
    const body = await readJson(response);

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      ok: true,
      message: "Consulta registrada correctamente.",
      lead: {
        id: persistedLead.id,
        status: persistedLead.status,
        createdAt: persistedLead.createdAt.toISOString()
      }
    });
    expect(createLeadRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Paciente Test",
        email: "paciente@example.com",
        status: "new"
      })
    );
  });

  it("returns field errors for invalid payloads", async () => {
    const response = await POST(createJsonRequest({ name: "A", phone: "abc" }));
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.errors).toMatchObject({
      name: expect.any(Array),
      phone: expect.any(Array)
    });
    expect(createLeadRecordMock).not.toHaveBeenCalled();
  });

  it("blocks honeypot submissions before persistence", async () => {
    const response = await POST(
      createJsonRequest({
        ...validLeadInput,
        website: "https://spam.example"
      })
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      ok: false,
      message: "Revisa los datos del formulario.",
      errors: {
        website: expect.any(Array)
      }
    });
    expect(createLeadRecordMock).not.toHaveBeenCalled();
  });

  it("rate limits repeated submissions from the same ip and phone", async () => {
    createLeadRecordMock.mockResolvedValue(persistedLead);

    for (let index = 0; index < 10; index += 1) {
      const response = await POST(createJsonRequest(validLeadInput));
      expect(response.status).toBe(201);
    }

    const response = await POST(createJsonRequest(validLeadInput));
    const body = await readJson(response);

    expect(response.status).toBe(429);
    expect(body.ok).toBe(false);
    expect(createLeadRecordMock).toHaveBeenCalledTimes(10);
  });

  it("returns a generic error when persistence fails", async () => {
    createLeadRecordMock.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(createJsonRequest(validLeadInput));
    const body = await readJson(response);

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      ok: false,
      message: "No pudimos registrar la consulta. Inténtalo nuevamente."
    });
  });
});
