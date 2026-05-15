export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
