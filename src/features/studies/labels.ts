import type { StudyStatus, StudyType } from "@/generated/prisma/client";

export const studyTypeLabels: Record<StudyType, string> = {
  laboratory: "Laboratorio",
  ultrasound: "Ecografía",
  resonance: "Resonancia",
  imaging: "Imagenología",
  other: "Otro"
};

export const studyStatusLabels: Record<StudyStatus, string> = {
  requested: "Solicitado",
  performed: "Realizado",
  reviewed: "Revisado",
  cancelled: "Cancelado"
};
