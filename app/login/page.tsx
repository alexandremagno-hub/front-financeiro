import { Suspense } from "react";

import { FullScreenMessage } from "@/components/ui";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<FullScreenMessage>Carregando…</FullScreenMessage>}>
      <LoginForm />
    </Suspense>
  );
}
