"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/internal/ui/Button";

export function PrintContingencyButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      Imprimir ficha en blanco
    </Button>
  );
}
