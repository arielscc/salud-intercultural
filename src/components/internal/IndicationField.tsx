"use client";

import {
  CatalogLinesField,
  type CatalogOption
} from "@/components/internal/CatalogLinesField";
import { deleteIndicationCatalogItemAction } from "@/features/clinical-care/actions";

export type IndicationCatalogOption = CatalogOption;

/**
 * Campo de indicaciones: envoltorio del genérico `CatalogLinesField` con el copy
 * propio de indicaciones. El médico busca en el catálogo de frecuentes (ej. "agua"
 * → "Tomar 2 litros de agua al día") y agrega líneas, o escribe nuevas; el catálogo
 * crece con el uso al guardar. name="indications".
 */
export function IndicationField({
  name,
  value,
  onValueChange,
  catalog
}: {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  catalog: IndicationCatalogOption[];
}) {
  return (
    <CatalogLinesField
      name={name}
      value={value}
      onValueChange={onValueChange}
      catalog={catalog}
      itemNoun="indicación"
      searchPlaceholder="Busca una indicación frecuente (ej. agua) o escribe una nueva"
      textareaPlaceholder="Una indicación por línea. Puedes editarlas libremente."
      hint="Cada indicación se guarda en el catálogo para reutilizarla después."
      onDeleteOption={(id) => deleteIndicationCatalogItemAction(id)}
    />
  );
}
