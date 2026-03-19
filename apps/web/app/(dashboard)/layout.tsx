import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { cookies } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get('sidebar_state')?.value;
  // Match the client default (true = expanded) when cookie is absent
  const defaultOpen = sidebarState !== 'false';

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="h-screen min-h-screen overflow-hidden"
    >
      <AppSidebar />
      <SidebarInset className="h-screen max-h-screen overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
