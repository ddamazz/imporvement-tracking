import { requireSession } from "@/lib/session";
import { getPages } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  const pages = await getPages();

  return <AppShell pages={pages}>{children}</AppShell>;
}
