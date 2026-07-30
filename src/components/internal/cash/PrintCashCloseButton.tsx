"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/internal/ui/Button";

export function PrintCashCloseButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Imprimir
    </Button>
  );
}
