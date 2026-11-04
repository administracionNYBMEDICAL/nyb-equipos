import { AppShell } from "@/components/app-shell";
import { requireStaff } from "@/lib/auth";
import { dashboardStats } from "@/lib/data";
import { logout } from "@/app/login/actions";

export default async function InternalLayout({ children }: LayoutProps<"/">) {
  const staff = await requireStaff();
  const stats = await dashboardStats(staff.id);
  return (
    <AppShell user={staff} counts={{ tickets: stats.new_tickets }} signOut={logout}>
      {children}
    </AppShell>
  );
}
