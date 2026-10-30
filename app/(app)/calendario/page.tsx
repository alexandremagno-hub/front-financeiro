import { Suspense } from "react";

import { EmptyState } from "@/components/ui";

import { Calendario } from "./calendario";

export default function CalendarioPage() {
  return (
    <Suspense fallback={<EmptyState>Carregando…</EmptyState>}>
      <Calendario />
    </Suspense>
  );
}
