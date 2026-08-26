"use client";

import { useState } from "react";
import { ChipOption } from "@/components/internal/ChipOption";
import { internalInputClassName } from "@/components/internal/Field";

const ROUTES = ["IV", "IM", "SC", "VO", "Inhalatoria", "Tópica"];

// Vía de administración con las mismas "cápsulas" (ChipOption) que usa el
// funnel de recepción + "Otro" que habilita un campo de texto. Emite un input
// oculto name="route".
export function NursingRouteField() {
  const [selected, setSelected] = useState<string>("");
  const [otherText, setOtherText] = useState("");

  const isOther = selected === "__otro__";
  const routeValue = isOther ? otherText : selected;

  return (
    <div className="grid gap-2">
      <span className="text-[13px] font-medium text-text">Vía</span>
      <div className="flex flex-wrap gap-2">
        {ROUTES.map((route) => (
          <ChipOption
            key={route}
            selected={selected === route}
            onClick={() => setSelected((current) => (current === route ? "" : route))}
          >
            {route}
          </ChipOption>
        ))}
        <ChipOption selected={isOther} onClick={() => setSelected("__otro__")}>
          Otro
        </ChipOption>
      </div>

      <input type="hidden" name="route" value={routeValue} />
      {isOther ? (
        <input
          className={internalInputClassName}
          value={otherText}
          onChange={(event) => setOtherText(event.target.value)}
          placeholder="Especifica la vía"
          aria-label="Otra vía"
        />
      ) : null}
    </div>
  );
}
