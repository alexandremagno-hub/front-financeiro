import { Suspense } from "react";

import { EmptyState } from "@/components/ui";

import { Dashboard } from "./dashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={<EmptyState>Carregando…</EmptyState>}>
      <Dashboard />
    </Suspense>
  );
}
