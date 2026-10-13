import { RequireAuth } from "@/components/require-auth";

import { AppNav } from "./app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </RequireAuth>
  );
}
