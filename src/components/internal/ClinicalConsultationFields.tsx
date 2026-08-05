"use client";

import { useState } from "react";
import { Field, internalInputClassName } from "@/components/internal/Field";
import {
  DiagnosisField,
  type DiagnosisCatalogOption
} from "@/components/internal/DiagnosisField";
import {
  IndicationField,
  type IndicationCatalogOption
} from "@/components/internal/IndicationField";
import {
  CatalogLinesField,
  type CatalogOption
} from "@/components/internal/CatalogLinesField";

type Defaults = {
  primaryDiagnosis?: string | null;
  secondaryDiagnosis?: string | null;
  findings?: string | null;
  observations?: string | null;
  treatmentPlanText?: string | null;
  indications?: string | null;
};

/** Agrega una plantilla de plan al texto actual sin sobrescribir ni duplicar. */
function appendPlanTemplate(current: string, template: string): string {
  const clean = template.trim();
  if (!clean) return current;
  if (current.trim().length === 0) return clean;
  if (current.toLowerCase().includes(clean.toLowerCase())) return current;
  return `${current.replace(/\s+$/, "")}\n${clean}`;
}

/** Agrega las líneas de una plantilla de indicaciones que aún no estén presentes. */
function appendIndicationTemplate(current: string, template: string): string {
  const existing = new Set(
    current
      .split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean)
  );
  const additions = template
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !existing.has(line.toLowerCase()));
  if (additions.length === 0) return current;
  const base = current.replace(/\s+$/, "");
  return base ? `${base}\n${additions.join("\n")}` : additions.join("\n");
}

/**
 * Reúne los campos clínicos que comparten estado en el cliente (diagnósticos, plan
 * e indicaciones) para que las plantillas por diagnóstico puedan prellenar el plan
 * y las indicaciones al elegir un diagnóstico. Hallazgos y Observaciones quedan
 * colapsados por defecto para simplificar el formulario.
 */
export function ClinicalConsultationFields({
  diagnosisCatalog,
  indicationCatalog,
  findingCatalog,
  observationCatalog,
  defaults
}: {
  diagnosisCatalog: DiagnosisCatalogOption[];
  indicationCatalog: IndicationCatalogOption[];
  findingCatalog: CatalogOption[];
  observationCatalog: CatalogOption[];
  defaults: Defaults;
}) {
  const [plan, setPlan] = useState(defaults.treatmentPlanText ?? "");
  const [indications, setIndications] = useState(defaults.indications ?? "");
  const [findings, setFindings] = useState(defaults.findings ?? "");
  const [observations, setObservations] = useState(defaults.observations ?? "");
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(defaults.findings?.trim() || defaults.observations?.trim())
  );

  function applyTemplate(template: { plan?: string | null; indications?: string | null }) {
    if (template.plan) setPlan((current) => appendPlanTemplate(current, template.plan!));
    if (template.indications) {
      setIndications((current) => appendIndicationTemplate(current, template.indications!));
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Diagnóstico principal">
          <DiagnosisField
            name="primaryDiagnosis"
            defaultValue={defaults.primaryDiagnosis}
            catalog={diagnosisCatalog}
            onApplyTemplate={applyTemplate}
            required
          />
        </Field>
        <Field label="Diagnóstico secundario">
          <DiagnosisField
            name="secondaryDiagnosis"
            defaultValue={defaults.secondaryDiagnosis}
            catalog={diagnosisCatalog}
            onApplyTemplate={applyTemplate}
          />
        </Field>
      </div>

      <Field label="Plan de tratamiento">
        <textarea
          className={`${internalInputClassName} min-h-28 py-3`}
          name="treatmentPlanText"
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
        />
      </Field>

      <Field label="Indicaciones">
        <IndicationField
          name="indications"
          value={indications}
          onValueChange={setIndications}
          catalog={indicationCatalog}
        />
      </Field>

      <div className="rounded-[9px] border border-border">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] font-semibold text-text"
          aria-expanded={detailsOpen}
        >
          <span>Hallazgos y observaciones</span>
          <span className="text-xs font-normal text-muted">
            {detailsOpen ? "Ocultar" : "Mostrar"}
          </span>
        </button>
        <div className={detailsOpen ? "grid gap-4 border-t border-border p-3.5" : "hidden"}>
          <Field label="Hallazgos">
            <CatalogLinesField
              name="findings"
              value={findings}
              onValueChange={setFindings}
              catalog={findingCatalog}
              itemNoun="hallazgo"
              searchPlaceholder="Busca un hallazgo frecuente o escribe uno nuevo"
              textareaPlaceholder="Un hallazgo por línea. Puedes editarlos libremente."
              hint="Cada hallazgo se guarda en el catálogo para reutilizarlo después."
            />
          </Field>
          <Field label="Observaciones">
            <CatalogLinesField
              name="observations"
              value={observations}
              onValueChange={setObservations}
              catalog={observationCatalog}
              itemNoun="observación"
              searchPlaceholder="Busca una observación frecuente o escribe una nueva"
              textareaPlaceholder="Una observación por línea. Puedes editarlas libremente."
              hint="Cada observación se guarda en el catálogo para reutilizarla después."
            />
          </Field>
        </div>
      </div>
    </>
  );
}
