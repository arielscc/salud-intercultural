import { describe, expect, it } from "vitest";
import {
  isPriorityVisit,
  isWaitingForDoctor,
  sortConsultationQueue,
  type ConsultationQueueVisit
} from "@/features/clinical-care/queue";

function visit(overrides: Partial<ConsultationQueueVisit> = {}): ConsultationQueueVisit {
  return {
    attendingUserId: null,
    attendingAt: null,
    derivedToDoctorAt: new Date("2026-08-19T02:00:00.000Z"),
    derivedFromArea: "recepcion",
    paidCents: 0,
    ...overrides
  };
}

describe("isWaitingForDoctor", () => {
  it("incluye a quien todavía no fue tomado por un médico", () => {
    expect(isWaitingForDoctor(visit())).toBe(true);
  });

  it("excluye a quien está siendo atendido ahora", () => {
    expect(
      isWaitingForDoctor(
        visit({
          attendingUserId: "doc-1",
          attendingAt: new Date("2026-08-19T02:10:00.000Z")
        })
      )
    ).toBe(false);
  });

  it("vuelve a incluir a quien fue derivado otra vez después de ser tomado", () => {
    expect(
      isWaitingForDoctor(
        visit({
          attendingUserId: "doc-1",
          attendingAt: new Date("2026-08-19T02:10:00.000Z"),
          derivedToDoctorAt: new Date("2026-08-19T03:45:00.000Z"),
          derivedFromArea: "enfermeria"
        })
      )
    ).toBe(true);
  });
});

describe("isPriorityVisit", () => {
  it("prioriza a quien vuelve de otra área", () => {
    expect(isPriorityVisit(visit({ derivedFromArea: "enfermeria" }))).toBe(true);
    expect(isPriorityVisit(visit({ derivedFromArea: "administracion" }))).toBe(true);
  });

  it("prioriza a quien ya pagó un servicio de la visita", () => {
    expect(isPriorityVisit(visit({ paidCents: 47000 }))).toBe(true);
  });

  it("no prioriza una primera llegada de Recepción sin cobro", () => {
    expect(isPriorityVisit(visit())).toBe(false);
  });
});

describe("sortConsultationQueue", () => {
  it("pone primero al paciente del médico, luego los prioritarios y después las llegadas recientes", () => {
    const mine = visit({
      attendingUserId: "doc-1",
      attendingAt: new Date("2026-08-19T02:10:00.000Z"),
      derivedToDoctorAt: new Date("2026-08-19T03:00:00.000Z"),
      derivedFromArea: "enfermeria"
    });
    const otherDoctorReturning = visit({
      attendingUserId: "doc-2",
      attendingAt: new Date("2026-08-19T02:05:00.000Z"),
      derivedToDoctorAt: new Date("2026-08-19T03:30:00.000Z"),
      derivedFromArea: "administracion",
      paidCents: 47000
    });
    const newest = visit({ derivedToDoctorAt: new Date("2026-08-19T03:50:00.000Z") });
    const oldest = visit({ derivedToDoctorAt: new Date("2026-08-19T01:00:00.000Z") });

    expect(sortConsultationQueue([oldest, newest, otherDoctorReturning, mine], "doc-1")).toEqual([
      mine,
      otherDoctorReturning,
      newest,
      oldest
    ]);
  });

  it("no modifica el arreglo original", () => {
    const first = visit({ derivedToDoctorAt: new Date("2026-08-19T01:00:00.000Z") });
    const second = visit({ derivedToDoctorAt: new Date("2026-08-19T03:00:00.000Z") });
    const queue = [first, second];
    sortConsultationQueue(queue, "doc-1");
    expect(queue).toEqual([first, second]);
  });
});
