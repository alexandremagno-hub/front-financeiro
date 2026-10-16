import { RequireAuth } from "@/components/require-auth";

import { AppNav } from "./app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppNav />
      <main className="w-full px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </RequireAuth>
  );
}
