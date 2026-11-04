"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button variant="accent" onClick={() => window.print()}>
      <Printer aria-hidden className="size-4" /> Imprimir
    </Button>
  );
}
